# Shopping List Pinterest-Pins Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Shopping List tab so options are clean Pinterest-style pins, each created by pasting a product URL whose image/title/price is auto-extracted by a Firebase Cloud Function.

**Architecture:** A new HTTPS callable Cloud Function (`extractProduct`) scrapes Open Graph / JSON-LD metadata server-side. The static `index.html` calls it via the firebase-functions compat SDK, renders options as read-only pins in a responsive grid, and edits them through a single modal. Old `shoppingList` data is cleared (fresh start).

**Tech Stack:** Firebase Cloud Functions (Node 20, `firebase-functions` v2 callable), vanilla JS in `index.html`, firebase-*-compat 10.12.5 SDKs.

**Verification note:** This project has no automated test runner. "Tests" are manual: the function is verified via `firebase deploy` + the Firebase console/logs and a real call from the app; the UI is verified by opening `index.html` in a browser. Each task ends with an explicit manual check and a commit.

---

## File Structure

- **Create** `functions/index.js` — the `extractProduct` callable function + metadata parsing.
- **Create** `functions/package.json` — function deps (`firebase-functions`, `firebase-admin`) and Node engine.
- **Create** `firebase.json` — functions config (source dir, runtime).
- **Create** `.firebaserc` — default project `moving-app-bbb0b`.
- **Create** `.gitignore` entry for `functions/node_modules`.
- **Modify** `index.html`:
  - Add firebase-functions-compat script tag (after line 2352).
  - Add `.shopping-pins-grid` + `.shopping-pin*` CSS (in the shopping CSS block ~line 2004+).
  - Replace `renderShoppingOptionCard` → `renderShoppingPin`; update `renderShoppingItemCard` to use a grid + "+ Add pin".
  - Replace option/link/image functions with pin + modal functions.
  - Add the pin edit modal markup (near the file-tags modal ~line 7327).
  - Clear legacy shopping data once on load.

---

## Task 1: Scaffold Firebase CLI + functions project

**Files:**
- Create: `firebase.json`, `.firebaserc`, `functions/package.json`, `functions/index.js` (stub), `.gitignore` (append)

- [ ] **Step 1: Install the Firebase CLI globally**

Run (PowerShell):
```
npm install -g firebase-tools
```
Expected: installs without error. Verify: `firebase --version` prints a version (e.g. `13.x`).

- [ ] **Step 2: Create `.firebaserc`**

```json
{
  "projects": {
    "default": "moving-app-bbb0b"
  }
}
```

- [ ] **Step 3: Create `firebase.json`**

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  }
}
```

- [ ] **Step 4: Create `functions/package.json`**

```json
{
  "name": "functions",
  "description": "Cloud Functions for Move Tracker",
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "private": true
}
```

- [ ] **Step 5: Create `functions/index.js` stub**

```js
const { onCall, HttpsError } = require('firebase-functions/v2/https');

exports.extractProduct = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { image: '', title: '', price: 0, siteName: '' };
});
```

- [ ] **Step 6: Append to `.gitignore`**

```
functions/node_modules/
functions/.env
```
(If `.gitignore` does not exist, create it with these two lines.)

- [ ] **Step 7: Install function deps**

Run (PowerShell): `npm --prefix functions install`
Expected: `node_modules` created under `functions/`, no errors.

- [ ] **Step 8: Commit**

```
git add firebase.json .firebaserc functions/package.json functions/index.js .gitignore
git commit -m "chore: scaffold Firebase functions project for product extraction"
```

---

## Task 2: Implement `extractProduct` metadata parsing

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Replace `functions/index.js` with the full implementation**

```js
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
```

- [ ] **Step 2: Lint-check locally (syntax only)**

Run (PowerShell): `node --check functions/index.js`
Expected: no output, exit 0 (syntax valid).

- [ ] **Step 3: Commit**

```
git add functions/index.js
git commit -m "feat: implement extractProduct OG/JSON-LD metadata scraping"
```

---

## Task 3: Deploy the function

**Files:** none (deploy step)

- [ ] **Step 1: Ensure user is logged in**

The user must run `firebase login` once in their own terminal (interactive browser auth — cannot be automated). Confirm with the user this is done before proceeding.

- [ ] **Step 2: Deploy**

Run (PowerShell): `firebase deploy --only functions`
Expected: ends with `Deploy complete!` and prints the `extractProduct` function URL/region. If it reports the Blaze requirement, the user must confirm the upgrade (already done).

- [ ] **Step 3: Note the region**

Confirm the deployed region is `us-central1` (matches the client `httpsCallable` call in Task 6). If different, record it for Task 6.

- [ ] **Step 4: Commit** (no code change; skip if nothing changed)

---

## Task 4: Clear legacy data + add the firebase-functions SDK

**Files:**
- Modify: `index.html` (script tag ~line 2352; data-load area)

- [ ] **Step 1: Add the functions compat SDK script tag**

After line 2352 (`firebase-storage-compat.js`), add:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-functions-compat.js"></script>
```

- [ ] **Step 2: Force a one-time fresh start of shopping data**

Find `let shoppingList = readStoredJson(STORAGE_KEYS.shoppingList, []);` (~line 3654). Immediately after it, add:
```js
// One-time reset for pins redesign (2026-06-06): legacy option shape is incompatible.
if (!localStorage.getItem('shopping_pins_migrated_v1')) {
  shoppingList = [];
  localStorage.setItem('shopping_pins_migrated_v1', '1');
}
```

- [ ] **Step 3: Manual verify**

Open `index.html` in a browser, go to the Shopping List tab. Expected: empty state ("No items yet…"); no console errors; the functions SDK loaded (in console, `typeof firebase.functions` is `'function'`).

- [ ] **Step 4: Commit**

```
git add index.html
git commit -m "feat: load functions SDK and reset shopping data for pins redesign"
```

---

## Task 5: Pin grid CSS + render pins (read-only)

**Files:**
- Modify: `index.html` (CSS ~line 2004+; `renderShoppingItemCard` ~line 6991; replace `renderShoppingOptionCard` ~line 7047)

- [ ] **Step 1: Add pin CSS**

In the shopping CSS block (after `.shopping-item-meta` rules, ~line 2056), add:
```css
.shopping-pins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.shopping-pin {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.shopping-pin.fav { border-color: var(--sage-dark); box-shadow: 0 0 0 2px var(--sage-dark) inset; }
.pin-image { width: 100%; aspect-ratio: 1/1; object-fit: cover; background: var(--cream-dark); display: block; }
.pin-image-placeholder {
  width: 100%; aspect-ratio: 1/1; background: var(--cream-dark);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 1.6rem;
}
.pin-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.pin-title {
  font-size: 0.9rem; font-weight: 600; color: var(--sage-dark);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pin-price { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.pin-meta { font-size: 0.78rem; color: var(--muted); }
.pin-reactions { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; }
.pin-reaction-row { display: flex; align-items: center; gap: 4px; }
.pin-reaction-row > span { color: var(--muted); width: 16px; }
.pin-react-btn {
  border: 1px solid var(--border); background: var(--white); border-radius: 999px;
  padding: 1px 6px; cursor: pointer; font-size: 0.85rem; line-height: 1.4;
}
.pin-react-btn.active-love { background: #ffe1e6; border-color: #ffb3c0; }
.pin-react-btn.active-like { background: #fff3d6; border-color: #ffd98a; }
.pin-react-btn.active-neutral { background: #eee; }
.pin-react-btn.active-dislike { background: #e8eef0; }
.pin-actions { display: flex; gap: 6px; align-items: center; padding: 8px 12px; border-top: 1px solid var(--border); }
.pin-actions .pin-fav { cursor: pointer; background: none; border: none; font-size: 1rem; opacity: 0.4; }
.pin-actions .pin-fav.on { opacity: 1; }
.pin-actions a, .pin-actions button { font-size: 0.78rem; }
.pin-actions .spacer { flex: 1; }
```
(If `--text` is not a defined token, use `var(--sage-dark)` instead — verify against the `:root` block.)

- [ ] **Step 2: Update `renderShoppingItemCard` options section**

In `renderShoppingItemCard` (~line 7030-7038), replace the `shopping-options-list` block and the "+ Add option" button with:
```js
    <div class="shopping-options-section">
      <h4>Options to consider</h4>
      <div class="shopping-pins-grid">
        ${visibleOptions.length === 0
          ? `<div style="color:var(--muted);font-size:0.85rem;padding:8px 0">No options match the current filter.</div>`
          : visibleOptions.map((opt) => renderShoppingPin(item.id, opt)).join('')}
      </div>
      <button class="btn-sm" style="margin-top:10px;align-self:flex-start" onclick="openPinModal('${item.id}')">+ Add pin</button>
    </div>
```

- [ ] **Step 3: Replace `renderShoppingOptionCard` with `renderShoppingPin`**

Delete the entire `renderShoppingOptionCard` function (~line 7047-7130) and replace with:
```js
function renderShoppingPin(itemId, opt) {
  const reactions = ['love','like','neutral','dislike'];
  const emoji = { love: '❤️', like: '👍', neutral: '😐', dislike: '👎' };
  const safeImg = safeSrc(opt.image || '');
  const imgHtml = safeImg
    ? `<img class="pin-image" src="${escapeHtml(safeImg)}" alt="${escapeHtml(opt.title || 'image')}" onerror="this.outerHTML='<div class=\\'pin-image-placeholder\\'>🛋️</div>'">`
    : `<div class="pin-image-placeholder">🛋️</div>`;

  const reactionRow = (who) => `
    <div class="pin-reaction-row"><span>${who === 'reactionDani' ? 'D' : 'K'}</span>
      ${reactions.map((r) => `<button class="pin-react-btn ${reactionActiveClass(opt[who], r)}"
        title="${r}" onclick="setShoppingReaction('${itemId}','${opt.id}','${who}','${r}')">${emoji[r]}</button>`).join('')}
    </div>`;

  return `
<div class="shopping-pin ${opt.favourite ? 'fav' : ''}" id="sopt-${opt.id}">
  ${imgHtml}
  <div class="pin-body">
    ${opt.title ? `<div class="pin-title">${escapeHtml(opt.title)}</div>` : ''}
    ${opt.price ? `<div class="pin-price">£${Number(opt.price).toLocaleString()}</div>` : ''}
    ${(opt.colourNotes || opt.size) ? `<div class="pin-meta">${escapeHtml([opt.colourNotes, opt.size].filter(Boolean).join(' · '))}</div>` : ''}
    <div class="pin-reactions">${reactionRow('reactionDani')}${reactionRow('reactionKen')}</div>
  </div>
  <div class="pin-actions">
    <button class="pin-fav ${opt.favourite ? 'on' : ''}" title="Favourite" onclick="togglePinFavourite('${itemId}','${opt.id}')">⭐</button>
    ${opt.url ? `<a href="${escapeHtml(safeHref(opt.url))}" target="_blank" rel="noopener">Open ↗</a>` : ''}
    <span class="spacer"></span>
    <button class="btn-sm" onclick="openPinModal('${itemId}','${opt.id}')">✎</button>
    <button class="btn-sm-danger" onclick="deleteShoppingOption('${itemId}','${opt.id}')">✕</button>
  </div>
</div>`;
}
```

- [ ] **Step 4: Manual verify**

In the browser, the tab still loads with no console errors (no pins yet, so just empty grid). `renderShoppingPin` is defined (`typeof renderShoppingPin === 'function'` in console). Full visual check happens after Task 6.

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: render shopping options as Pinterest-style pins"
```

---

## Task 6: Pin modal + add/edit/fetch logic

**Files:**
- Modify: `index.html` (modal markup ~line 7327; replace option/link/image functions ~line 7187-7325)

- [ ] **Step 1: Add the pin modal markup**

Before the `<!-- FILE TAGS MODAL -->` comment (~line 7328), add:
```html
<!-- SHOPPING PIN MODAL -->
<div class="modal-overlay" id="modal-shopping-pin">
  <div class="modal">
    <h3 id="pin-modal-title">Add pin</h3>
    <input type="hidden" id="pin-item-id"><input type="hidden" id="pin-id">
    <input type="hidden" id="pin-storage-path">
    <label>Product URL</label>
    <div style="display:flex;gap:8px;">
      <input type="url" id="pin-url" placeholder="https://www.dfs.co.uk/…" style="flex:1">
      <button class="btn-sm" id="pin-fetch-btn" onclick="fetchPinMetadata()">Fetch</button>
    </div>
    <div id="pin-fetch-status" style="font-size:0.8rem;color:var(--muted);min-height:1.1em;margin:4px 0;"></div>
    <div style="text-align:center;margin:8px 0;">
      <img id="pin-image-preview" src="" alt="" style="max-width:100%;max-height:160px;border-radius:8px;display:none;">
    </div>
    <label>Image URL</label>
    <input type="url" id="pin-image" placeholder="https://…/photo.jpg" onchange="updatePinPreview()">
    <label style="cursor:pointer;display:inline-block;margin:4px 0;" class="btn-sm">
      Upload photo<input type="file" accept="image/*" style="display:none" onchange="uploadPinImage(this)">
    </label>
    <label>Title</label>
    <input type="text" id="pin-title" placeholder="e.g. DFS Ada 3-seater">
    <label>Price (£)</label>
    <input type="number" id="pin-price" min="0" placeholder="0">
    <label>Colour / vibe notes</label>
    <input type="text" id="pin-colour" placeholder="e.g. sage green velvet">
    <label>Size</label>
    <input type="text" id="pin-size" placeholder="e.g. 240×90cm">
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal('modal-shopping-pin')">Cancel</button>
      <button class="btn-save" onclick="savePin()">Save</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace the option/link/image functions**

Delete these functions entirely: `addShoppingOption`, `updateShoppingOption`, `addShoppingLink`, `updateShoppingLink`, `toggleShoppingLinkFav`, `deleteShoppingLink`, `addShoppingImageUrl`, `uploadShoppingImage`, `deleteShoppingImage` (~line 7187-7325). Keep `deleteShoppingOption` and `setShoppingReaction` as-is. In their place add:

```js
function openPinModal(itemId, optId) {
  if (!ensureCanEdit()) return;
  const item = shoppingList.find((i) => i.id === itemId);
  if (!item) return;
  const opt = optId ? item.options.find((o) => o.id === optId) : null;
  document.getElementById('pin-modal-title').textContent = opt ? 'Edit pin' : 'Add pin';
  document.getElementById('pin-item-id').value = itemId;
  document.getElementById('pin-id').value = opt ? opt.id : '';
  document.getElementById('pin-url').value = opt?.url || '';
  document.getElementById('pin-image').value = opt?.image || '';
  document.getElementById('pin-storage-path').value = opt?.storagePath || '';
  document.getElementById('pin-title').value = opt?.title || '';
  document.getElementById('pin-price').value = opt?.price || '';
  document.getElementById('pin-colour').value = opt?.colourNotes || '';
  document.getElementById('pin-size').value = opt?.size || '';
  document.getElementById('pin-fetch-status').textContent = '';
  updatePinPreview();
  document.getElementById('modal-shopping-pin').classList.add('open');
}

function updatePinPreview() {
  const src = safeSrc(document.getElementById('pin-image').value.trim());
  const img = document.getElementById('pin-image-preview');
  if (src) { img.src = src; img.style.display = 'inline-block'; }
  else { img.removeAttribute('src'); img.style.display = 'none'; }
}

async function fetchPinMetadata() {
  const url = document.getElementById('pin-url').value.trim();
  const status = document.getElementById('pin-fetch-status');
  if (!/^https?:\/\//i.test(url)) { status.textContent = 'Enter a valid http(s) URL first.'; return; }
  if (typeof firebase.functions !== 'function') { status.textContent = "Couldn't fetch automatically — add details manually."; return; }
  const btn = document.getElementById('pin-fetch-btn');
  btn.disabled = true; status.textContent = 'Fetching…';
  try {
    const extract = firebase.functions(syncRuntime.app).httpsCallable('extractProduct');
    const { data } = await extract({ url });
    if (data.image && !document.getElementById('pin-image').value) document.getElementById('pin-image').value = data.image;
    if (data.title && !document.getElementById('pin-title').value) document.getElementById('pin-title').value = data.title;
    if (data.price && !document.getElementById('pin-price').value) document.getElementById('pin-price').value = data.price;
    updatePinPreview();
    status.textContent = (data.image || data.title) ? 'Fetched — check the fields below.' : 'No details found — add them manually.';
  } catch (err) {
    status.textContent = "Couldn't fetch automatically — add details manually.";
  } finally {
    btn.disabled = false;
  }
}

async function uploadPinImage(fileInput) {
  if (!ensureCanEdit()) return;
  const file = fileInput.files?.[0];
  if (!file) return;
  if (!syncRuntime.currentUser) { alert('Please sign in to upload images.'); return; }
  const status = document.getElementById('pin-fetch-status');
  status.textContent = 'Uploading…';
  try {
    const path = `shopping-images/${shoppingId()}-${encodeURIComponent(file.name)}`;
    const ref = getStorage().ref(path);
    await ref.put(file);
    const src = await ref.getDownloadURL();
    document.getElementById('pin-image').value = src;
    document.getElementById('pin-storage-path').value = path;
    updatePinPreview();
    status.textContent = 'Photo uploaded.';
  } catch (err) {
    status.textContent = `Upload failed: ${err.message}`;
  }
}

function savePin() {
  if (!ensureCanEdit()) return;
  const itemId = document.getElementById('pin-item-id').value;
  const optId = document.getElementById('pin-id').value;
  const item = shoppingList.find((i) => i.id === itemId);
  if (!item) return;
  const fields = {
    url: document.getElementById('pin-url').value.trim(),
    image: safeSrc(document.getElementById('pin-image').value.trim()),
    storagePath: document.getElementById('pin-storage-path').value,
    title: document.getElementById('pin-title').value.trim(),
    price: +document.getElementById('pin-price').value || 0,
    colourNotes: document.getElementById('pin-colour').value.trim(),
    size: document.getElementById('pin-size').value.trim(),
  };
  if (optId) {
    const opt = item.options.find((o) => o.id === optId);
    if (opt) Object.assign(opt, fields);
  } else {
    item.options.push({
      id: shoppingId(), ...fields,
      reactionDani: '', reactionKen: '', favourite: false,
    });
  }
  saveShoppingList();
  renderShoppingList();
  closeModal('modal-shopping-pin');
}

function togglePinFavourite(itemId, optId) {
  if (!ensureCanEdit()) return;
  const item = shoppingList.find((i) => i.id === itemId);
  const opt = item?.options.find((o) => o.id === optId);
  if (!opt) return;
  opt.favourite = !opt.favourite;
  saveShoppingList();
  renderShoppingList();
}
```

- [ ] **Step 3: Manual verify (manual entry path)**

Open the app. Add an item type (e.g. "Sofa"). Click "+ Add pin". In the modal, leave URL blank, type a title + price + colour, paste a direct image URL (e.g. any `https://…/x.jpg`) → preview shows → Save. Expected: a pin appears in the grid with image/title/price; reactions toggle on click; ⭐ toggles the fav ring; ✎ reopens the modal pre-filled; ✕ deletes after confirm. No console errors.

- [ ] **Step 4: Manual verify (fetch path — requires Task 3 deployed)**

Click "+ Add pin", paste a real product URL (e.g. the DFS sofa), click Fetch. Expected: status shows "Fetching…" then fills image/title/price (or a graceful "add manually" message if the site blocks scraping). Save → pin renders.

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: pin add/edit modal with URL auto-extract and manual fallback"
```

---

## Task 7: Final cleanup + push

**Files:**
- Modify: `index.html` (remove now-dead CSS/markup if any)

- [ ] **Step 1: Remove dead code**

Search `index.html` for now-unused classes/ids from the old option UI: `shopping-option-card`, `shopping-link-row`, `shopping-image-thumb`, `shopping-option-fields`, `imgurl-`, `addShoppingImageUrl`, `addShoppingLink`. Remove orphaned CSS rules and any leftover references. Do NOT remove `setShoppingReaction`, `reactionActiveClass`, `filterOptions`, or `deleteShoppingOption` (still used).

- [ ] **Step 2: Full regression check**

Open the app: add 2 item types, add multiple pins to each (mix of fetched + manual), toggle reactions, favourites, use the reaction filter dropdown, edit a pin, delete a pin, collapse/expand item types, reload the page (data persists). No console errors.

- [ ] **Step 3: Commit + push**

```
git add index.html
git commit -m "chore: remove dead shopping option/link/image code"
git push
```
(Per project convention: always commit + push after editing index.html.)

---

## Self-Review (completed by plan author)

- **Spec coverage:** Cloud Function (Tasks 1-3) ✓; data model fresh start (Task 4) ✓; pin grid read-only cards (Task 5) ✓; add/edit modal + fetch + manual fallback + upload (Task 6) ✓; reactions on pin, favourite, filter compatibility ✓; styling tokens reused (Task 5) ✓; error handling (invalid URL, fetch fail, broken image onerror, safeHref/safeSrc, ensureCanEdit) ✓; deployment notes (Task 3) ✓.
- **Type consistency:** pin fields (`url, image, storagePath, title, price, size, colourNotes, reactionDani, reactionKen, favourite`) are identical across the model, `renderShoppingPin`, `savePin`, and `openPinModal`. `setShoppingReaction`/`reactionActiveClass`/`deleteShoppingOption` reused unchanged with matching signatures. Callable name `extractProduct` + region `us-central1` consistent between function and client.
- **Placeholder scan:** none — all steps contain concrete code/commands.
