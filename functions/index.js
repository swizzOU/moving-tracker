const { onCall, HttpsError } = require('firebase-functions/v2/https');

const FETCH_TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function metaContent(html, patterns) {
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return '';
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, '/');
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

exports.extractProduct = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  const url = request.data && request.data.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new HttpsError('invalid-argument', 'A valid http(s) URL is required.');
  }

  let html = '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (err) {
    throw new HttpsError('unavailable', `Could not fetch the page: ${err.message}`);
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
