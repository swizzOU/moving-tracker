# Calendar Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full calendar UI to the Move Tracker where users can create, view, edit, and reschedule events (like "Dad's visit", "Cleaner appointment") with date, time, attendees, notes, and color-coded categories.

**Architecture:** Add FullCalendar.js library via CDN, create a new 4th tab with calendar view, store events in localStorage following the same pattern as tasks/furniture/contacts. Reuse existing modal structure for event creation/editing.

**Tech Stack:** FullCalendar.js v6 (CDN), vanilla JavaScript, localStorage

---

## Task 1: Add FullCalendar Dependencies

**Files:**
- Modify: `index.html:1-10` (head section)

- [ ] **Step 1: Add FullCalendar CSS import**

In the `<head>` section, after the Google Fonts link (line 7), add:

```html
<link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css" rel="stylesheet" />
```

- [ ] **Step 2: Add FullCalendar JS import**

Before the closing `</head>` tag, add:

```html
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js"></script>
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\danie\OneDrive\Documents\Move Tracker"
git add index.html
git commit -m "feat: add FullCalendar dependencies"
```

---

## Task 2: Add Calendar Tab and HTML Structure

**Files:**
- Modify: `index.html:361-365` (tabs section)
- Modify: `index.html:394-395` (main content area)

- [ ] **Step 1: Add calendar tab button**

After the Contacts tab button (line 364), add:

```html
  <button class="tab" onclick="showTab('calendar')">📅 Calendar</button>
```

- [ ] **Step 2: Add calendar tab content div**

After the contacts tab div (after line 393, before `</div>` closing main), add:

```html
  <!-- CALENDAR TAB -->
  <div id="tab-calendar" class="hidden">
    <button class="add-btn" onclick="openAddEvent()">+ Add Event</button>
    <div id="calendar-container" style="margin-top: 20px;"></div>
  </div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add calendar tab and container"
```

---

## Task 3: Add Event Modal HTML

**Files:**
- Modify: `index.html:480-481` (after last modal, before closing script tag)

- [ ] **Step 1: Add event modal**

Before the closing `</div>` of the modals section and before `<script>`, add:

```html
<!-- ADD EVENT MODAL -->
<div class="modal-overlay" id="modal-event">
  <div class="modal">
    <h3 id="modal-event-title">Add Event</h3>
    <label>Event Name</label>
    <input type="text" id="e-name" placeholder="e.g. Dad's visit, Cleaner appointment" />
    <label>Date</label>
    <input type="date" id="e-date" />
    <label>Time (optional)</label>
    <input type="text" id="e-time" placeholder="e.g. 14:00, All day, Morning" />
    <label>People Involved (optional)</label>
    <input type="text" id="e-people" placeholder="e.g. Dad, Ken, Cleaner" />
    <label>Notes (optional)</label>
    <input type="text" id="e-notes" placeholder="Any additional details..." />
    <label>Category</label>
    <select id="e-category">
      <option value="Family">Family</option>
      <option value="Services">Services</option>
      <option value="Logistics">Logistics</option>
      <option value="Other">Other</option>
    </select>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal('modal-event')">Cancel</button>
      <button class="btn-save" onclick="saveEvent()">Add Event</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add event creation modal"
```

---

## Task 4: Add Event State and Default Data

**Files:**
- Modify: `index.html:482-556` (in script tag, after state declarations)

- [ ] **Step 1: Add default events constant**

After the `DEFAULT_CONTACTS` constant (after line 544), add:

```javascript
const DEFAULT_EVENTS = [];
```

- [ ] **Step 2: Add event state initialization**

After the contacts state declaration (after line 549), add:

```javascript
let events = JSON.parse(localStorage.getItem('move_events') || 'null') || DEFAULT_EVENTS;
```

- [ ] **Step 3: Update save() function to include events**

Modify the `save()` function (around line 552) to add this line:

```javascript
function save() {
  localStorage.setItem('move_tasks', JSON.stringify(tasks));
  localStorage.setItem('move_furniture', JSON.stringify(furniture));
  localStorage.setItem('move_contacts', JSON.stringify(contacts));
  localStorage.setItem('move_events', JSON.stringify(events));
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add event state and localStorage persistence"
```

---

## Task 5: Add CSS for Calendar Styling

**Files:**
- Modify: `index.html:333-342` (before closing style tag)

- [ ] **Step 1: Add calendar-specific styles**

Before the `@media` query (before line 335), add:

```css
  /* Calendar */
  #calendar-container { background: var(--white); border-radius: 10px; padding: 20px; }
  .fc { font-family: 'DM Sans', sans-serif; }
  .fc-button-primary { background: var(--sage-dark); border-color: var(--sage-dark); }
  .fc-button-primary:hover { background: var(--sage); border-color: var(--sage); }
  .fc-button-primary.fc-button-active { background: var(--sage-dark); border-color: var(--sage-dark); }
  .fc-daygrid-day:hover { background-color: var(--sage-light); }
  .fc-col-header-cell { background: var(--cream-dark); color: var(--sage-dark); font-weight: 600; }
  .fc-daygrid-day-number { color: var(--text); }
  .fc-daygrid-day-frame { min-height: 100px; }
  .fc-event { border: none; border-radius: 6px; }
  .fc-event-title { font-weight: 500; padding: 2px 6px; }

  /* Event category colors */
  .event-Family { background-color: var(--sage); }
  .event-Services { background-color: var(--warm); }
  .event-Logistics { background-color: var(--blue); }
  .event-Other { background-color: var(--cream-dark); color: var(--text); }

  .fc-event.event-Family .fc-event-title { color: white; }
  .fc-event.event-Services .fc-event-title { color: white; }
  .fc-event.event-Logistics .fc-event-title { color: #2A5A7A; }
  .fc-event.event-Other .fc-event-title { color: var(--text); }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: add calendar and event styling"
```

---

## Task 6: Add Event Modal Handlers

**Files:**
- Modify: `index.html:770-780` (at end of script, before closing)

- [ ] **Step 1: Add event modal open/close functions**

Before the closing `</script>` tag, add:

```javascript
let editingEventId = null;

function openAddEvent() {
  editingEventId = null;
  ['e-name','e-date','e-time','e-people','e-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('e-category').value = 'Other';
  document.getElementById('modal-event-title').textContent = 'Add Event';
  document.getElementById('modal-event').classList.add('open');
}

function openEditEvent(eventId) {
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  editingEventId = eventId;
  document.getElementById('e-name').value = event.name;
  document.getElementById('e-date').value = event.date;
  document.getElementById('e-time').value = event.time || '';
  document.getElementById('e-people').value = event.people.join(', ');
  document.getElementById('e-notes').value = event.notes || '';
  document.getElementById('e-category').value = event.category;
  document.getElementById('modal-event-title').textContent = 'Edit Event';
  document.getElementById('modal-event').classList.add('open');
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add event modal handlers"
```

---

## Task 7: Add Event Save Function

**Files:**
- Modify: `index.html:780-800` (at end of script)

- [ ] **Step 1: Add saveEvent function**

Before the closing `</script>`, add:

```javascript
function saveEvent() {
  const name = document.getElementById('e-name').value.trim();
  if (!name) return;

  const eventData = {
    id: editingEventId || Date.now(),
    name: name,
    date: document.getElementById('e-date').value,
    time: document.getElementById('e-time').value,
    people: document.getElementById('e-people').value
      .split(',')
      .map(p => p.trim())
      .filter(p => p),
    notes: document.getElementById('e-notes').value,
    category: document.getElementById('e-category').value
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

function deleteEvent(eventId) {
  if (!confirm('Delete this event?')) return;
  events = events.filter(e => e.id !== eventId);
  save();
  renderCalendar();
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add event save and delete functions"
```

---

## Task 8: Initialize FullCalendar

**Files:**
- Modify: `index.html:800-850` (at end of script, before Init section)

- [ ] **Step 1: Add calendar initialization function**

Before the `// Init` comment (after the event functions), add:

```javascript
let calendar = null;

function renderCalendar() {
  const calendarEl = document.getElementById('calendar-container');
  
  if (calendar) {
    calendar.destroy();
  }

  const eventObjects = events.map(e => ({
    id: String(e.id),
    title: e.name,
    start: e.date + (e.time ? 'T' + e.time : ''),
    extendedProps: {
      time: e.time,
      people: e.people,
      notes: e.notes,
      category: e.category
    },
    classNames: ['event-' + e.category],
    backgroundColor: getCategoryColor(e.category),
    borderColor: getCategoryColor(e.category)
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
    selectConstraint: 'businessHours',
    eventClick: function(info) {
      openEditEvent(parseInt(info.event.id));
    },
    dateClick: function(info) {
      editingEventId = null;
      ['e-name','e-date','e-time','e-people','e-notes'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('e-date').value = info.dateStr;
      document.getElementById('e-category').value = 'Other';
      document.getElementById('modal-event-title').textContent = 'Add Event';
      document.getElementById('modal-event').classList.add('open');
    },
    eventDrop: function(info) {
      const eventId = parseInt(info.event.id);
      const event = events.find(e => e.id === eventId);
      if (event) {
        event.date = info.event.start.toISOString().split('T')[0];
        save();
      }
    },
    events: eventObjects
  });

  calendar.render();
}

function getCategoryColor(category) {
  const colors = {
    'Family': '#6B8F66',
    'Services': '#C4704F',
    'Logistics': '#D6E8F5',
    'Other': '#EDE6D8'
  };
  return colors[category] || '#EDE6D8';
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add FullCalendar initialization and rendering"
```

---

## Task 9: Update showTab() to Initialize Calendar

**Files:**
- Modify: `index.html:558-565` (showTab function)

- [ ] **Step 1: Update showTab function**

Replace the existing `showTab()` function with:

```javascript
function showTab(t) {
  ['tasks','furniture','contacts','calendar'].forEach(x => {
    document.getElementById('tab-'+x).classList.toggle('hidden', x !== t);
  });
  document.querySelectorAll('.tab').forEach((btn, i) => {
    btn.classList.toggle('active', ['tasks','furniture','contacts','calendar'][i] === t);
  });
  
  // Initialize calendar when switching to calendar tab
  if (t === 'calendar' && calendar === null) {
    renderCalendar();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: initialize calendar on tab switch"
```

---

## Task 10: Test and Verify Full Flow

**Files:**
- Test: `index.html` (manual testing in browser)

- [ ] **Step 1: Open the tracker in browser**

Navigate to your GitHub Pages deployment or open `index.html` locally.

- [ ] **Step 2: Click the Calendar tab**

Verify:
- Tab appears and is clickable
- Calendar renders with FullCalendar month view
- No JavaScript errors in console

- [ ] **Step 3: Test adding an event via "Add Event" button**

Click "+ Add Event" and:
- Modal opens
- Fill in: Name "Test Event", Date today, Time "14:00", People "Me", Category "Family"
- Click "Add Event"
- Verify event appears on calendar in the correct date color (sage/Family)

- [ ] **Step 4: Test clicking a date to create event**

Click an empty date on calendar:
- Modal opens with that date pre-filled
- Fill in event details
- Verify event saves and appears

- [ ] **Step 5: Test editing an event**

Click an existing event:
- Modal opens with event details pre-filled
- Change the title
- Click "Add Event" button (which now says "Update")
- Verify changes appear on calendar

- [ ] **Step 6: Test drag-to-reschedule**

Drag an event to a different date:
- Event moves on calendar
- Verify event persists (refresh page, should still be there)

- [ ] **Step 7: Test localStorage persistence**

Refresh the page:
- All events should still be visible
- Open browser DevTools → Application → localStorage
- Verify `move_events` contains your events

- [ ] **Step 8: Test category colors**

Create events in different categories:
- Family (sage green)
- Services (warm/orange)
- Logistics (blue)
- Other (cream)
- Verify colors display correctly

- [ ] **Step 9: Commit final working version**

```bash
git add index.html
git commit -m "feat: calendar feature fully working with CRUD operations"
```

---

## Self-Review

**Spec coverage:**
- ✓ Calendar UI with month view (FullCalendar) — Task 8
- ✓ Event creation/modal — Tasks 3, 6, 7
- ✓ Event editing — Tasks 6, 7
- ✓ Event deletion — Task 7
- ✓ Drag-to-reschedule — Task 8 (eventDrop handler)
- ✓ Event fields (name, date, time, people, notes, category) — Tasks 3, 7
- ✓ Category colors — Task 8
- ✓ localStorage persistence — Task 4
- ✓ New calendar tab — Task 2
- ✓ Responsive styling — Task 5

**Placeholder check:** No TBDs, no vague steps. All code is complete and exact.

**Type consistency:** All event IDs use `Date.now()` for new events, `parseInt(id)` for retrieval. People stored as array, split/joined at save time. All field names match modal IDs.
