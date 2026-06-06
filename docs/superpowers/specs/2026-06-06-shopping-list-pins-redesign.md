# Shopping List Redesign — Pinterest-Style Pins

**Date:** 2026-06-06
**Status:** Approved design, pending implementation plan

## Problem

The current Shopping List tab is functional but visually cluttered: every field
(option name, price, size, colour, links, reactions) is an always-on input box.
Images "don't work" because the only way to get an image is to paste a *direct*
image URL or upload a file — but people naturally paste a **product page URL**
(e.g. a DFS sofa page), which renders nothing.

## Goal

Paste a product URL → auto-extract image, title, and price → render the option
as a clean, Pinterest-style **pin** in a responsive grid. Editing happens in a
modal so pins stay visually clean.

## Decisions (from brainstorming)

- **Extraction:** Firebase Cloud Function (`extractProduct`) on the Blaze plan.
  Robust server-side scraping, no CORS/proxy fragility. Realistically $0 at this
  usage but requires a card on file + a deploy step.
- **Layout:** Pinterest grid of pins (responsive, masonry-ish).
- **Edit model:** Clean read-only pins; edit via a modal. Reactions clickable
  directly on the pin.
- **Pin model:** One pin = one product URL (drops the old multi-link-per-option
  model).
- **Migration:** Fresh start — clear existing `shoppingList` data.

## Architecture

### 1. Cloud Function — `extractProduct`

- Location: new `functions/` directory (`index.js`, `package.json`).
- HTTPS **callable** function (`functions.https.onCall`), so Firebase Auth
  context and CORS are handled by the SDK.
- Input: `{ url: string }`.
- Behaviour:
  1. Validate `url` is http(s). Reject otherwise.
  2. `fetch` the page server-side (Node 18+ global fetch) with a browser-like
     `User-Agent` and a timeout (~8s).
  3. Parse metadata in priority order:
     - Open Graph: `og:image`, `og:title`, `og:site_name`,
       `product:price:amount`, `og:price:amount`.
     - Twitter cards: `twitter:image`, `twitter:title`.
     - JSON-LD `<script type="application/ld+json">` with `@type: Product` →
       `image`, `name`, `offers.price`.
     - `<title>` tag as last-resort title.
  4. Return `{ image, title, price, siteName }` — any field may be empty.
- **Graceful failure:** never throw to the client for a parse miss; return
  whatever was found (often just the image). Network/timeout errors return a
  structured `{ error }` the client shows as "couldn't fetch — fill in manually".
- Parsing: lightweight regex/string extraction of meta tags (avoid heavy deps);
  optionally `cheerio` if it simplifies JSON-LD parsing. Keep dependencies
  minimal.

### 2. Data model

Old `shoppingList` data is cleared (fresh start). New shapes:

**Item type** (mostly unchanged):
```js
{ id, name, budgetMin, budgetMax, notesDani, notesKen, collapsed, options: [pin] }
```

**Pin** (replaces the old "option"):
```js
{
  id,
  url,            // product URL (may be empty for manual pins)
  image,          // image URL (from extraction, manual paste, or Storage upload)
  storagePath,    // set only for uploaded images, for deletion
  title,          // product name
  price,          // number, 0 if unset
  size,           // free text (e.g. "240×90cm")
  colourNotes,    // free text
  reactionDani,   // '' | 'love' | 'like' | 'neutral' | 'dislike'
  reactionKen,    // same
  favourite       // bool
}
```

### 3. Pin card (read-only, in a grid)

- Responsive grid container (`.shopping-pins-grid`), CSS columns or
  `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`.
- Card contents:
  - Product image at top. If `image` missing or fails to load (`onerror`),
    show a neutral placeholder box (no broken-image icon).
  - Title (clamped to ~2 lines).
  - Price badge (e.g. `£1,999`); hidden if 0/unset.
  - Colour notes / size line (muted).
  - Reactions: compact icon buttons for Dani & Ken, clickable in place
    (reuse `setShoppingReaction`). Show as small emoji toggles, no text labels,
    grouped/labelled D / K.
  - Footer actions: ⭐ favourite toggle, "Open ↗" (if url), ✎ edit, ✕ delete.
- Favourite pins get a subtle highlight (border/ring).
- The existing reaction **filter** dropdown continues to work against the pin
  grid.

### 4. Add / edit modal (`modal-shopping-pin`)

- **Add:** "+ Add pin" button under each item's pin grid opens the modal empty.
  - URL field + "Fetch" button. On Fetch: call `extractProduct`, show a spinner,
    then populate image/title/price. User can edit any field.
  - Manual fallback within the same modal: paste image URL **or** upload photo
    (preserve current Storage upload path → `storagePath`), and hand-enter
    title/price/size/colour.
- **Edit:** ✎ opens the same modal pre-filled with the pin's values.
- Save writes the pin into the item's `options` array; Cancel discards.
- Image preview shown in the modal so the user sees what will be saved.

### 5. Functions to add / change (in `index.html`)

- Replace `renderShoppingOptionCard` → `renderShoppingPin` (grid card markup).
- Replace `addShoppingOption` / option-edit flow → modal-driven
  `openPinModal(itemId, pinId?)`, `fetchPinMetadata()`, `savePin()`.
- Keep `setShoppingReaction`, `deleteShoppingOption` (rename concept to pin but
  keep working), `toggleShoppingLinkFav` → `togglePinFavourite`.
- Remove link-row functions (`addShoppingLink`, `updateShoppingLink`,
  `deleteShoppingLink`) and the separate images section functions, folding the
  one image into the pin/modal. Keep `uploadShoppingImage` logic (adapted to
  write into the pin), and Storage deletion on pin delete/replace.
- Add a callable-function client: `const extractProduct =
  firebase.functions().httpsCallable('extractProduct')` (load the
  firebase-functions compat SDK script).

### 6. Styling

Reuse existing tokens (`--white`, `--cream-dark`, `--sage-dark`, `--border`,
`--muted`, `--space-*`, radius 12px). New classes: `.shopping-pins-grid`,
`.shopping-pin`, `.pin-image`, `.pin-image-placeholder`, `.pin-title`,
`.pin-price`, `.pin-meta`, `.pin-reactions`, `.pin-actions`, `.pin-fav`.
Modal reuses existing `.modal-overlay` / `.modal` styling.

## Error handling

- Invalid/non-http URL → modal shows inline message, no fetch.
- Fetch failure/timeout → modal shows "Couldn't fetch automatically — add details
  manually"; image/fields stay editable.
- Broken image URL at render → placeholder via `onerror`.
- All URLs sanitised via existing `safeHref` / `safeSrc`.
- Edits gated by existing `ensureCanEdit()`.

## Out of scope

- Multi-shop price comparison per product (dropped with one-URL-per-pin).
- Drag-to-reorder pins.
- Importing/migrating the existing single test entry (fresh start).

## Deployment notes

- Auto-extract works **only after** the Cloud Function is deployed: requires the
  user to upgrade Firebase to Blaze and run `firebase deploy --only functions`.
- Until deployed, pins work fully via manual entry; the Fetch button will error
  gracefully.
