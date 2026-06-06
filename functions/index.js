const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const logger = require('firebase-functions/logger');
const dns = require('dns').promises;
const net = require('net');

initializeApp();

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap on fetched HTML
const MAX_REDIRECTS = 5;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, '/');
}

function metaContent(html, patterns) {
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return '';
}

// Builds a pair of regexes matching <meta property|name="KEY" content="..."> in either attribute order.
function metaPatterns(key) {
  const k = key.replace(/[:]/g, '\\:');
  return [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${k}["']`, 'i'),
  ];
}

function parsePrice(raw) {
  if (!raw) return 0;
  const m = String(raw).replace(/,/g, '').match(/[\d]+(?:\.[\d]+)?/);
  return m ? Math.round(parseFloat(m[0])) : 0;
}

function parseJsonLd(html) {
  const out = { image: '', title: '', price: 0 };
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
    if (!Array.isArray(nodes)) continue;
    for (const node of nodes) {
      const type = node && node['@type'];
      const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      if (!isProduct) continue;
      if (!out.title && node.name) out.title = String(node.name);
      if (!out.image) {
        const img = Array.isArray(node.image) ? node.image[0] : node.image;
        if (img) out.image = typeof img === 'string' ? img : (img.url || '');
      }
      if (!out.price) {
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offers && offers.price) out.price = parsePrice(offers.price);
      }
    }
  }
  return out;
}

// --- SSRF protection ---

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 127 || p[0] === 10) return true;              // 0/8, loopback, 10/8
    if (p[0] === 169 && p[1] === 254) return true;                            // link-local 169.254/16
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;                // 172.16/12
    if (p[0] === 192 && p[1] === 168) return true;                            // 192.168/16
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;               // CGNAT 100.64/10
    return false;
  }
  if (net.isIPv6(ip)) {
    const a = ip.toLowerCase();
    if (a === '::1' || a === '::') return true;                               // loopback / unspecified
    if (a.startsWith('fe80') || a.startsWith('fc') || a.startsWith('fd')) return true; // link-local / ULA
    if (a.startsWith('::ffff:')) return isPrivateIp(a.slice(7));              // IPv4-mapped
    return false;
  }
  return true; // unknown form: treat as unsafe
}

// Validates the URL's scheme, port, and that the host resolves only to public addresses.
async function assertPublicUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new HttpsError('invalid-argument', 'Invalid URL.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpsError('invalid-argument', 'Only http(s) URLs are allowed.');
  }
  if (u.port && u.port !== '80' && u.port !== '443') {
    throw new HttpsError('invalid-argument', 'Only default ports are allowed.');
  }
  const host = u.hostname;
  // Reject literal IPs that are private; otherwise resolve and check every address.
  let addrs;
  if (net.isIP(host)) {
    addrs = [host];
  } else {
    try {
      const results = await dns.lookup(host, { all: true });
      addrs = results.map((r) => r.address);
    } catch {
      throw new HttpsError('invalid-argument', 'Could not resolve host.');
    }
  }
  if (!addrs.length || addrs.some(isPrivateIp)) {
    throw new HttpsError('invalid-argument', 'URL host is not allowed.');
  }
  return u;
}

// Reads at most MAX_BYTES from the response body.
async function readCapped(resp) {
  const reader = resp.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { try { await reader.cancel(); } catch {} break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

// Fetches with manual redirect handling, re-validating each hop against SSRF rules.
async function safeFetch(startUrl) {
  let current = await assertPublicUrl(startUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(current.href, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
      const next = new URL(resp.headers.get('location'), current.href);
      current = await assertPublicUrl(next.href);
      continue;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const ctype = resp.headers.get('content-type') || '';
    if (ctype && !/text\/html|application\/xhtml|text\/plain/i.test(ctype)) {
      throw new Error(`Unexpected content-type: ${ctype}`);
    }
    return await readCapped(resp);
  }
  throw new Error('Too many redirects');
}

exports.extractProduct = onCall({ region: 'us-central1' }, async (request) => {
  logger.info('extractProduct called');
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use this feature.');
  }
  const url = request.data && request.data.url;
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new HttpsError('invalid-argument', 'A valid http(s) URL is required.');
  }

  logger.info('Starting product extraction', { url });
  let html = '';
  try {
    html = await safeFetch(url);
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.warn('extractProduct fetch failed', { url, message: err && err.message });
    throw new HttpsError('unavailable', 'Could not fetch the page.');
  }

  const ld = parseJsonLd(html);

  const image =
    metaContent(html, metaPatterns('og:image')) ||
    metaContent(html, metaPatterns('twitter:image')) ||
    metaContent(html, metaPatterns('twitter:image:src')) ||
    ld.image || '';

  let title =
    metaContent(html, metaPatterns('og:title')) ||
    metaContent(html, metaPatterns('twitter:title')) ||
    ld.title || '';
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) title = decodeEntities(t[1].trim());
  }

  const priceRaw =
    metaContent(html, metaPatterns('product:price:amount')) ||
    metaContent(html, metaPatterns('og:price:amount'));
  const price = parsePrice(priceRaw) || ld.price || 0;

  const siteName = metaContent(html, metaPatterns('og:site_name'));

  return { image, title, price, siteName };
});
