# To Pack Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "To Pack" top-level tab that lets Dani and Ken track what still needs to be packed, organised by room in the current house, with quick-add, inline editing, and duplicate support.

**Architecture:** All data lives in a new `toPackItems` array on the shared Firestore document (same `exportStatePayload` / `applyPayload` / `persistLocalState` pattern used by every other tab). The tab renders items grouped by room with collapsible sections. No new files — everything goes in `index.html` following the single-file pattern of the whole app.

**Tech Stack:** Vanilla JS, HTML/CSS, Firebase Firestore (compat SDK), localStorage for offline persistence.

---

## Rooms Reference

Ground Floor: Hallway, Kitchen, Living Room  
First Floor: Main Bedroom, Spare Room, Bathroom, Hallway (Upstairs)

## Data Shape

Each item:
```js
{
  id: string,          // crypto.randomUUID()
  room: string,        // one of the 7 rooms above
  task: string,        // e.g. "Kitchen cupboards"
  who: string,         // 'Dani' | 'Ken' | 'Dani & Ken'
  when: string,        // 'Anytime' | 'Moving Date Confirmed' | 'Week Of' | 'Day Before' | 'Night Before' | 'Moving Day'
  status: string,      // 'Not Started' | 'In Progress' | 'Done'
  notes: string,       // optional free text
}
```

---

## Task 1: Add state, storage key, and sync wiring

**Files:**
- Modify: `index.html` — STORAGE_KEYS, global state, exportStatePayload, applyPayload, persistLocalState

- [ ] **Step 1: Add storage key**

Find the `STORAGE_KEYS` object (around line 2702) and add:
```js
toPackItems: 'move_to_pack_items',
```

- [ ] **Step 2: Initialise global state variable**

After `let boxes = ...` (around line 2798), add:
```js
let toPackItems = readStoredJson(STORAGE_KEYS.toPackItems, []);
```

- [ ] **Step 3: Add to exportStatePayload**

In `exportStatePayload()`, add `toPackItems` to the returned object:
```js
function exportStatePayload() {
  return {
    tasks,
    // ... existing fields ...
    boxes,
    boxTypes,
    toPackItems,   // ADD THIS
  };
}
```

- [ ] **Step 4: Add to applyPayload**

In `applyPayload(payload)`, after the `boxTypes` line, add:
```js
toPackItems = Array.isArray(payload.toPackItems) ? payload.toPackItems : [];
```

- [ ] **Step 5: Add to persistLocalState**

In `persistLocalState()`, add:
```js
localStorage.setItem(STORAGE_KEYS.toPackItems, JSON.stringify(toPackItems));
```

- [ ] **Step 6: Commit**
```bash
git add index.html
git commit -m "feat: add toPackItems state, storage key, and sync wiring"
```

---

## Task 2: Add tab button and empty tab panel

**Files:**
- Modify: `index.html` — tab nav, showTab(), tab panel HTML

- [ ] **Step 1: Add tab button**

In the `.tabs` div (around line 1710), add after the Packing button:
```html
<button class="tab" onclick="showTab('topack')">📋 To Pack</button>
```

- [ ] **Step 2: Add to showTab tabs array**

In `showTab(t)` (around line 4549), update the tabs array:
```js
const tabs = ['tasks','furniture','contacts','budget','savings','calendar','files','packing','topack'];
```

- [ ] **Step 3: Add empty tab panel**

After the closing `</div>` of `<!-- PACKING TAB -->`, add:
```html
<!-- TO PACK TAB -->
<div id="tab-topack" class="hidden">
  <div id="topack-panel" class="task-panel"></div>
</div>
```

- [ ] **Step 4: Verify tab switches without errors**

Open the app, click "To Pack" — panel appears empty with no console errors.

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "feat: add To Pack tab button and empty panel"
```

---

## Task 3: Add CSS styles for To Pack tab

**Files:**
- Modify: `index.html` — `<style>` block

- [ ] **Step 1: Add styles**

Find the end of the main `<style>` block (before `</style>`) and add:

```css
/* ── To Pack Tab ──────────────────────────────────────────── */
.topack-room-section { margin-bottom: 18px; }
.topack-room-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 14px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 6px;
  user-select: none;
}
.topack-room-header:hover { background: var(--sage-light); }
.topack-room-title {
  font-weight: 600;
  font-size: 0.95rem;
  flex: 1;
}
.topack-room-count {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
}
.topack-room-chevron {
  font-size: 0.75rem;
  color: var(--muted);
  transition: transform 0.2s;
}
.topack-room-chevron.open { transform: rotate(90deg); }
.topack-room-body { display: none; padding: 0 2px; }
.topack-room-body.open { display: block; }
.topack-item {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
}
.topack-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
}
.topack-item-row:hover { background: var(--panel-bg); }
.topack-item-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  transition: background 0.15s, border-color 0.15s;
}
.topack-item-check.done {
  background: var(--sage);
  border-color: var(--sage);
  color: var(--white);
}
.topack-item-name {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 500;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topack-item.done-item .topack-item-name {
  text-decoration: line-through;
  color: var(--muted);
  opacity: 0.7;
}
.topack-item-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}
.topack-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sage-light);
  color: var(--sage-dark);
  font-weight: 500;
  white-space: nowrap;
}
.topack-badge.status-done { background: #d1e8d0; color: #2d6a2a; }
.topack-badge.status-inprogress { background: #fff3cd; color: #856404; }
.topack-item-expand {
  display: none;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--border);
  background: var(--panel-bg);
  gap: 10px;
  flex-direction: column;
}
.topack-item-expand.open { display: flex; }
.topack-expand-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.topack-expand-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  flex: 1;
}
.topack-expand-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}
.topack-expand-select,
.topack-expand-input {
  padding: 5px 8px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
}
.topack-expand-select:focus,
.topack-expand-input:focus { outline: none; border-color: var(--sage); }
.topack-expand-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.topack-quick-add {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  margin-bottom: 2px;
  padding: 0 2px;
}
.topack-quick-input {
  flex: 1;
  padding: 7px 11px;
  border: 1.5px dashed var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
}
.topack-quick-input:focus {
  outline: none;
  border-color: var(--sage);
  border-style: solid;
}
.topack-quick-input::placeholder { color: var(--muted); }
```

- [ ] **Step 2: Commit**
```bash
git add index.html
git commit -m "feat: add To Pack tab CSS styles"
```

---

## Task 4: Implement renderToPackTab()

**Files:**
- Modify: `index.html` — JS section, add `renderToPackTab()` and helpers

- [ ] **Step 1: Add constants and helpers**

Find the `// ── Files Tab ───` comment and insert the To Pack section above it:

```js
// ── To Pack Tab ──────────────────────────────────────────────────────────────

const TOPACK_ROOMS = [
  { floor: 'Ground Floor', rooms: ['Hallway', 'Kitchen', 'Living Room'] },
  { floor: 'First Floor', rooms: ['Main Bedroom', 'Spare Room', 'Bathroom', 'Hallway (Upstairs)'] },
];
const TOPACK_ALL_ROOMS = TOPACK_ROOMS.flatMap((g) => g.rooms);

const TOPACK_WHO_OPTIONS = ['Dani', 'Ken', 'Dani & Ken'];
const TOPACK_WHEN_OPTIONS = ['Anytime', 'Moving Date Confirmed', 'Week Of', 'Day Before', 'Night Before', 'Moving Day'];
const TOPACK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Done'];

const toPackCollapsed = {};

function toPackStatusBadgeClass(status) {
  if (status === 'Done') return 'topack-badge status-done';
  if (status === 'In Progress') return 'topack-badge status-inprogress';
  return 'topack-badge';
}
```

- [ ] **Step 2: Add renderToPackTab()**

Immediately after the constants/helpers above:

```js
function renderToPackTab() {
  const panel = document.getElementById('topack-panel');
  if (!panel) return;
  panel.innerHTML = '';

  TOPACK_ROOMS.forEach(({ floor, rooms }) => {
    const floorLabel = document.createElement('div');
    floorLabel.style.cssText = 'font-size:0.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 6px 2px;';
    floorLabel.textContent = floor;
    panel.appendChild(floorLabel);

    rooms.forEach((room) => {
      const items = toPackItems.filter((i) => i.room === room);
      const doneCount = items.filter((i) => i.status === 'Done').length;
      const isOpen = !toPackCollapsed[room];

      const section = document.createElement('div');
      section.className = 'topack-room-section';

      const header = document.createElement('div');
      header.className = 'topack-room-header';
      header.innerHTML = `
        <span class="topack-room-chevron${isOpen ? ' open' : ''}">▶</span>
        <span class="topack-room-title">${escapeHtml(room)}</span>
        <span class="topack-room-count">${doneCount}/${items.length} done</span>`;
      header.addEventListener('click', () => {
        toPackCollapsed[room] = isOpen;
        renderToPackTab();
      });

      const body = document.createElement('div');
      body.className = `topack-room-body${isOpen ? ' open' : ''}`;

      items.forEach((item) => {
        body.appendChild(buildToPackItem(item));
      });

      const quickAdd = document.createElement('div');
      quickAdd.className = 'topack-quick-add';
      const qInput = document.createElement('input');
      qInput.type = 'text';
      qInput.className = 'topack-quick-input';
      qInput.placeholder = `+ Add item to ${room}…`;
      qInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && qInput.value.trim()) {
          addToPackItem(room, qInput.value.trim());
          qInput.value = '';
        }
      });
      quickAdd.appendChild(qInput);
      body.appendChild(quickAdd);

      section.appendChild(header);
      section.appendChild(body);
      panel.appendChild(section);
    });
  });
}
```

- [ ] **Step 3: Add buildToPackItem()**

Immediately after `renderToPackTab()`:

```js
function buildToPackItem(item) {
  const isDone = item.status === 'Done';
  const wrapper = document.createElement('div');
  wrapper.className = `topack-item${isDone ? ' done-item' : ''}`;
  wrapper.dataset.id = item.id;

  const row = document.createElement('div');
  row.className = 'topack-item-row';

  const check = document.createElement('div');
  check.className = `topack-item-check${isDone ? ' done' : ''}`;
  check.innerHTML = isDone ? '✓' : '';
  check.title = isDone ? 'Mark not started' : 'Mark done';
  check.addEventListener('click', (e) => {
    e.stopPropagation();
    updateToPackItem(item.id, { status: isDone ? 'Not Started' : 'Done' });
  });

  const name = document.createElement('div');
  name.className = 'topack-item-name';
  name.textContent = item.task;

  const badges = document.createElement('div');
  badges.className = 'topack-item-badges';
  if (item.who) {
    const b = document.createElement('span');
    b.className = 'topack-badge';
    b.textContent = item.who;
    badges.appendChild(b);
  }
  if (item.when && item.when !== 'Anytime') {
    const b = document.createElement('span');
    b.className = 'topack-badge';
    b.textContent = item.when;
    badges.appendChild(b);
  }
  const statusBadge = document.createElement('span');
  statusBadge.className = toPackStatusBadgeClass(item.status);
  statusBadge.textContent = item.status;
  badges.appendChild(statusBadge);

  row.appendChild(check);
  row.appendChild(name);
  row.appendChild(badges);

  const expand = document.createElement('div');
  expand.className = 'topack-item-expand';

  expand.innerHTML = `
    <div class="topack-expand-row">
      <div class="topack-expand-group">
        <label class="topack-expand-label">Task name</label>
        <input class="topack-expand-input" id="tp-name-${item.id}" value="${escapeHtml(item.task)}">
      </div>
    </div>
    <div class="topack-expand-row">
      <div class="topack-expand-group">
        <label class="topack-expand-label">Room</label>
        <select class="topack-expand-select" id="tp-room-${item.id}">
          ${TOPACK_ALL_ROOMS.map((r) => `<option${r === item.room ? ' selected' : ''}>${escapeHtml(r)}</option>`).join('')}
        </select>
      </div>
      <div class="topack-expand-group">
        <label class="topack-expand-label">Who</label>
        <select class="topack-expand-select" id="tp-who-${item.id}">
          ${TOPACK_WHO_OPTIONS.map((w) => `<option${w === item.who ? ' selected' : ''}>${escapeHtml(w)}</option>`).join('')}
        </select>
      </div>
      <div class="topack-expand-group">
        <label class="topack-expand-label">When</label>
        <select class="topack-expand-select" id="tp-when-${item.id}">
          ${TOPACK_WHEN_OPTIONS.map((w) => `<option${w === item.when ? ' selected' : ''}>${escapeHtml(w)}</option>`).join('')}
        </select>
      </div>
      <div class="topack-expand-group">
        <label class="topack-expand-label">Status</label>
        <select class="topack-expand-select" id="tp-status-${item.id}">
          ${TOPACK_STATUS_OPTIONS.map((s) => `<option${s === item.status ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="topack-expand-row">
      <div class="topack-expand-group" style="flex:1 1 100%;">
        <label class="topack-expand-label">Notes</label>
        <input class="topack-expand-input" id="tp-notes-${item.id}" placeholder="Optional notes…" value="${escapeHtml(item.notes || '')}">
      </div>
    </div>
    <div class="topack-expand-actions">
      <button class="file-btn" style="background:var(--sage-light);color:var(--sage-dark);" onclick="duplicateToPackItem('${item.id}')">Duplicate</button>
      <button class="file-btn" style="background:#fdecea;color:#b71c1c;" onclick="deleteToPackItem('${item.id}')">Delete</button>
      <button class="file-btn" style="background:var(--sage-dark);color:var(--white);" onclick="saveToPackItemFromExpand('${item.id}')">Save</button>
    </div>`;

  row.addEventListener('click', () => {
    const isExpanded = expand.classList.contains('open');
    expand.classList.toggle('open', !isExpanded);
  });

  wrapper.appendChild(row);
  wrapper.appendChild(expand);
  return wrapper;
}
```

- [ ] **Step 4: Add CRUD functions**

Immediately after `buildToPackItem()`:

```js
function addToPackItem(room, taskName) {
  if (!ensureCanEdit()) return;
  toPackItems.push({
    id: crypto.randomUUID(),
    room,
    task: taskName,
    who: 'Dani & Ken',
    when: 'Anytime',
    status: 'Not Started',
    notes: '',
  });
  save();
  renderToPackTab();
}

function updateToPackItem(id, changes) {
  if (!ensureCanEdit()) return;
  const idx = toPackItems.findIndex((i) => i.id === id);
  if (idx === -1) return;
  toPackItems[idx] = { ...toPackItems[idx], ...changes };
  save();
  renderToPackTab();
}

function saveToPackItemFromExpand(id) {
  const item = toPackItems.find((i) => i.id === id);
  if (!item) return;
  const changes = {
    task: document.getElementById(`tp-name-${id}`)?.value.trim() || item.task,
    room: document.getElementById(`tp-room-${id}`)?.value || item.room,
    who: document.getElementById(`tp-who-${id}`)?.value || item.who,
    when: document.getElementById(`tp-when-${id}`)?.value || item.when,
    status: document.getElementById(`tp-status-${id}`)?.value || item.status,
    notes: document.getElementById(`tp-notes-${id}`)?.value || '',
  };
  updateToPackItem(id, changes);
}

function duplicateToPackItem(id) {
  if (!ensureCanEdit()) return;
  const original = toPackItems.find((i) => i.id === id);
  if (!original) return;
  toPackItems.push({ ...original, id: crypto.randomUUID(), status: 'Not Started' });
  save();
  renderToPackTab();
}

function deleteToPackItem(id) {
  if (!confirm('Delete this item?')) return;
  if (!ensureCanEdit()) return;
  toPackItems = toPackItems.filter((i) => i.id !== id);
  save();
  renderToPackTab();
}
```

- [ ] **Step 5: Call renderToPackTab() at boot**

Find the boot block near line 5669 where `renderPacking()` is called and add:
```js
renderToPackTab();
```

- [ ] **Step 6: Also call it when the tab is shown**

In `showTab(t)`, find where the tab is switched and add a re-render call. After the `tabs.forEach(...)` loop, add:
```js
if (t === 'topack') renderToPackTab();
```

- [ ] **Step 7: Test the tab**

Open the app → click "To Pack" → verify rooms and floors appear, quick-add an item, check it off, expand it, edit and save, duplicate, delete.

- [ ] **Step 8: Commit**
```bash
git add index.html
git commit -m "feat: implement To Pack tab with rooms, quick-add, inline edit, and duplicate"
```

---

## Task 5: Migrate existing Packing tasks out of task tracker

**Files:**
- Modify: `index.html` — default tasks data

- [ ] **Step 1: Find the Packing category tasks**

Search for `cat:"Packing"` in index.html — these are the hardcoded default tasks seeded on first load.

- [ ] **Step 2: Remove Packing default tasks**

Delete every object with `cat:"Packing"` from the default tasks array. These items are now represented by the To Pack tab. Do not touch tasks with other category values.

- [ ] **Step 3: Verify no "Packing" category tasks remain in the defaults**

Search for `cat:"Packing"` — should return no results in the default tasks array.

- [ ] **Step 4: Commit**
```bash
git add index.html
git commit -m "chore: remove Packing category from default tasks (replaced by To Pack tab)"
```

---

## Self-Review

**Spec coverage:**
- ✅ New top-level tab
- ✅ 7 rooms across 2 floors with floor labels
- ✅ Each item: task name, who, when, status, notes
- ✅ Collapsible room sections with done count
- ✅ Quick-add per room (Enter to submit)
- ✅ Inline expand to edit all fields
- ✅ Duplicate button (clones item, resets status to Not Started)
- ✅ Delete button with confirm
- ✅ Check circle to toggle done
- ✅ Firebase sync via existing exportStatePayload/applyPayload
- ✅ localStorage persistence
- ✅ Packing default tasks removed from task tracker

**Placeholder scan:** None found.

**Type consistency:** `toPackItems` used consistently throughout. `item.id` is always `crypto.randomUUID()`. `escapeHtml()` already exists in the codebase.
