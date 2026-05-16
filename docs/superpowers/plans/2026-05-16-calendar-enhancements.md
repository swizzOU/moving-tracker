# Calendar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete capability, custom colors per event, multi-day events, and multi-select people management to the calendar.

**Architecture:** Update event modal with new fields (end date, color picker, people multi-select), add delete button with confirmation, update renderCalendar() to use color field and handle multi-day spans, migrate existing events to include new fields.

**Tech Stack:** HTML5 color input, vanilla JavaScript, localStorage

---

## Task 1: Migrate Event Data Model

**Files:**
- Modify: `index.html` (event initialization, around line 545)

- [ ] **Step 1: Update DEFAULT_EVENTS and add migration**

After the `const DEFAULT_EVENTS = [];` line, add:

```javascript
// Migrate existing events to new schema
function migrateEvents(oldEvents) {
  return oldEvents.map(e => ({
    ...e,
    endDate: e.endDate || null,
    color: e.color || '#6B8F66',
    category: e.category || 'Other'
  }));
}

let events = JSON.parse(localStorage.getItem('move_events') || 'null') || DEFAULT_EVENTS;
events = migrateEvents(events);
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\danie\OneDrive\Documents\Move Tracker"
git add index.html
git commit -m "feat: migrate events to new schema with color and endDate"
```

---

## Task 2: Update Modal HTML

**Files:**
- Modify: `index.html` (modal-event div, around lines 90-115)

- [ ] **Step 1: Replace event modal HTML**

Replace the entire `modal-event` div with:

```html
<!-- ADD EVENT MODAL -->
<div class="modal-overlay" id="modal-event">
  <div class="modal">
    <h3 id="modal-event-title">Add Event</h3>
    <label>Event Name</label>
    <input type="text" id="e-name" placeholder="e.g. Dad's visit, Cleaner appointment" />
    <label>Date</label>
    <input type="date" id="e-date" />
    <label style="display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" id="e-has-enddate" onchange="toggleEndDate()" />
      Multi-day event
    </label>
    <input type="date" id="e-enddate" style="display: none;" />
    <label>Time (optional)</label>
    <input type="text" id="e-time" placeholder="e.g. 14:00, All day, Morning" />
    <label>People</label>
    <div id="e-people-select" class="people-multi-select">
      <input type="checkbox" id="e-people-ken" value="Ken" /> Ken
      <input type="checkbox" id="e-people-dani" value="Dani" /> Dani
      <input type="checkbox" id="e-people-dad" value="Dad" /> Dad
      <input type="checkbox" id="e-people-caroline" value="Caroline" /> Caroline
      <input type="checkbox" id="e-people-mum" value="Mum" /> Mum
    </div>
    <label>Notes (optional)</label>
    <input type="text" id="e-notes" placeholder="Any additional details..." />
    <label>Category</label>
    <select id="e-category">
      <option value="Family">Family</option>
      <option value="Services">Services</option>
      <option value="Logistics">Logistics</option>
      <option value="Other">Other</option>
    </select>
    <label>Color</label>
    <input type="color" id="e-color" value="#6B8F66" />
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal('modal-event')">Cancel</button>
      <button class="btn-save" onclick="saveEvent()">Add Event</button>
      <button class="btn-delete" id="btn-delete-event" style="display: none;" onclick="deleteEvent(editingEventId)">Delete</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add end date, color picker, and people multi-select to modal"
```

---

## Task 3: Add CSS for Multi-Select and Delete Button

**Files:**
- Modify: `index.html` (style section, before `@media`, around line 333)

- [ ] **Step 1: Add people multi-select and button styles**

Before the `@media` query, add:

```css
  /* People multi-select */
  .people-multi-select {
    border: 1px solid var(--cream-dark);
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--cream);
  }

  .people-multi-select input[type="checkbox"] {
    margin-right: 6px;
    cursor: pointer;
  }

  /* Delete button */
  .btn-delete {
    background: #d32f2f !important;
    color: white !important;
    border: none !important;
  }

  .btn-delete:hover {
    background: #b71c1c !important;
  }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: add people multi-select and delete button styles"
```

---

## Task 4: Update Modal Handlers

**Files:**
- Modify: `index.html` (JavaScript functions, around line 770)

- [ ] **Step 1: Add toggleEndDate and update openAddEvent**

Replace `openAddEvent()` with:

```javascript
function toggleEndDate() {
  const endDateInput = document.getElementById('e-enddate');
  endDateInput.style.display = document.getElementById('e-has-enddate').checked ? 'block' : 'none';
}

function openAddEvent() {
  editingEventId = null;
  ['e-name','e-date','e-enddate','e-time','e-notes','e-color'].forEach(id => {
    const el = document.getElementById(id);
    if (el.type === 'color') el.value = '#6B8F66';
    else el.value = '';
  });
  document.getElementById('e-has-enddate').checked = false;
  document.getElementById('e-enddate').style.display = 'none';
  document.getElementById('e-category').value = 'Other';
  document.querySelectorAll('#e-people-select input').forEach(cb => cb.checked = false);
  document.getElementById('btn-delete-event').style.display = 'none';
  document.getElementById('modal-event-title').textContent = 'Add Event';
  document.getElementById('modal-event').classList.add('open');
}
```

- [ ] **Step 2: Update openEditEvent**

Replace `openEditEvent()` with:

```javascript
function openEditEvent(eventId) {
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  editingEventId = eventId;
  document.getElementById('e-name').value = event.name;
  document.getElementById('e-date').value = event.date;
  document.getElementById('e-enddate').value = event.endDate || '';
  document.getElementById('e-has-enddate').checked = !!event.endDate;
  document.getElementById('e-enddate').style.display = event.endDate ? 'block' : 'none';
  document.getElementById('e-time').value = event.time || '';
  document.getElementById('e-color').value = event.color || '#6B8F66';
  document.getElementById('e-notes').value = event.notes || '';
  document.getElementById('e-category').value = event.category;
  document.querySelectorAll('#e-people-select input').forEach(cb => {
    cb.checked = event.people.includes(cb.value);
  });
  document.getElementById('btn-delete-event').style.display = 'inline-block';
  document.getElementById('modal-event-title').textContent = 'Edit Event';
  document.getElementById('modal-event').classList.add('open');
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add end date toggle and update modal handlers"
```

---

## Task 5: Update Event Save Logic

**Files:**
- Modify: `index.html` (saveEvent function, around line 780)

- [ ] **Step 1: Replace saveEvent function**

Replace `saveEvent()` with:

```javascript
function saveEvent() {
  const name = document.getElementById('e-name').value.trim();
  const date = document.getElementById('e-date').value;
  if (!name || !date) return;

  const people = Array.from(document.querySelectorAll('#e-people-select input:checked'))
    .map(cb => cb.value);

  const eventData = {
    id: editingEventId || Date.now(),
    name: name,
    date: date,
    endDate: document.getElementById('e-has-enddate').checked ? document.getElementById('e-enddate').value : null,
    time: document.getElementById('e-time').value,
    people: people,
    notes: document.getElementById('e-notes').value,
    category: document.getElementById('e-category').value,
    color: document.getElementById('e-color').value
  };

  if (editingEventId) {
    const index = events.findIndex(e => e.id === editingEventId);
    if (index !== -1) events[index] = eventData;
  } else {
    events.push(eventData);
  }

  save();
  renderCalendar();
  closeModal('modal-event');
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: update saveEvent to handle endDate, color, and multi-select people"
```

---

## Task 6: Update Delete Function

**Files:**
- Modify: `index.html` (deleteEvent function, around line 800)

- [ ] **Step 1: Update deleteEvent**

Replace `deleteEvent()` with:

```javascript
function deleteEvent(eventId) {
  if (!confirm('Delete this event?')) return;
  events = events.filter(e => e.id !== eventId);
  save();
  renderCalendar();
  closeModal('modal-event');
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add confirmation dialog to deleteEvent"
```

---

## Task 7: Update renderCalendar for Multi-Day and Custom Colors

**Files:**
- Modify: `index.html` (renderCalendar function, around line 820)

- [ ] **Step 1: Replace renderCalendar function**

Replace the entire `renderCalendar()` function with:

```javascript
function renderCalendar() {
  const calendarEl = document.getElementById('calendar-container');
  
  if (calendar) {
    calendar.destroy();
  }

  const eventObjects = events.map(e => ({
    id: String(e.id),
    title: e.name,
    start: e.date + (e.time ? 'T' + e.time : ''),
    end: e.endDate ? (new Date(e.endDate).getTime() > new Date(e.date).getTime() ? new Date(e.endDate).toISOString().split('T')[0] : null) : null,
    extendedProps: {
      time: e.time,
      people: e.people,
      notes: e.notes,
      category: e.category,
      color: e.color
    },
    backgroundColor: e.color,
    borderColor: e.color
  }));

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    editable: true,
    selectable: true,
    eventClick: function(info) {
      openEditEvent(parseInt(info.event.id));
    },
    dateClick: function(info) {
      editingEventId = null;
      ['e-name','e-date','e-enddate','e-time','e-notes','e-color'].forEach(id => {
        const el = document.getElementById(id);
        if (el.type === 'color') el.value = '#6B8F66';
        else el.value = '';
      });
      document.getElementById('e-date').value = info.dateStr;
      document.getElementById('e-has-enddate').checked = false;
      document.getElementById('e-enddate').style.display = 'none';
      document.getElementById('e-category').value = 'Other';
      document.querySelectorAll('#e-people-select input').forEach(cb => cb.checked = false);
      document.getElementById('btn-delete-event').style.display = 'none';
      document.getElementById('modal-event-title').textContent = 'Add Event';
      document.getElementById('modal-event').classList.add('open');
    },
    eventDrop: function(info) {
      const eventId = parseInt(info.event.id);
      const event = events.find(e => e.id === eventId);
      if (event) {
        const daysDiff = Math.floor((info.event.end || info.event.start - (info.event.start - info.oldEvent.start)) / 86400000);
        event.date = info.event.start.toISOString().split('T')[0];
        if (event.endDate) {
          const startDate = new Date(event.date);
          const endDate = new Date(startDate);
          if (info.oldEvent.end) {
            const oldDays = Math.floor((info.oldEvent.end - info.oldEvent.start) / 86400000);
            endDate.setDate(endDate.getDate() + oldDays);
          }
          event.endDate = endDate.toISOString().split('T')[0];
        }
        save();
      }
    },
    events: eventObjects
  });

  calendar.render();
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: update renderCalendar for custom colors and multi-day events"
```

---

## Task 8: Test All Features

**Files:**
- Test: `index.html` (manual testing in browser)

- [ ] **Step 1: Open tracker in browser and navigate to calendar tab**

- [ ] **Step 2: Test adding multi-day event**

Click "+ Add Event", check "Multi-day event" checkbox, fill:
- Name: "Trip to Dad's"
- Date: Today
- End Date: 3 days from today
- People: Check "Dad"
- Color: Pick a blue
- Category: Family
- Click "Add Event"

Verify: Event appears as continuous bar spanning all 3 dates in selected color

- [ ] **Step 3: Test editing event**

Click the event, modal opens with data pre-filled. Change color to red, change people to include "Ken", click "Add Event".

Verify: Event updates with new color and people

- [ ] **Step 4: Test delete**

Click event, verify "Delete" button is visible. Click it, confirm deletion.

Verify: Event disappears from calendar

- [ ] **Step 5: Test single-day event**

Create event without checking "Multi-day event". Add Name, Date, People, Color.

Verify: Single-day event appears on calendar

- [ ] **Step 6: Test drag to reschedule multi-day**

Drag the 3-day event to a different week.

Verify: Event moves, end date updates accordingly, persists on refresh

- [ ] **Step 7: Verify localStorage**

Open DevTools → Application → localStorage, check `move_events`.

Verify: All events have `color`, `endDate`, `people` array fields

- [ ] **Step 8: Final commit**

```bash
git add index.html
git commit -m "feat: calendar enhancements complete - colors, multi-day, people multi-select, delete"
```

---

## Self-Review

**Spec coverage:**
- ✓ Delete events with confirmation — Task 6
- ✓ Custom colors (free-form) — Task 5, 7
- ✓ Multi-day events (optional end date) — Task 2, 4, 5, 7
- ✓ People multi-select dropdown — Task 2, 4, 5
- ✓ Category kept as metadata — Task 2, 5
- ✓ localStorage persistence — Task 5
- ✓ Drag-to-reschedule for multi-day — Task 7

**No placeholders:** All code complete and exact.

**Type consistency:** Event IDs remain `Date.now()` timestamps, people stored as array, color as hex string, endDate optional ISO date.
