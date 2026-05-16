# Calendar Feature Design
**Date:** 2026-05-16  
**Project:** Move Tracker  
**Scope:** Add full calendar UI for tracking move-related events (family visits, cleaner, etc.)

---

## Overview

Add a new "📅 Calendar" tab to the Move Tracker that allows users to create, view, edit, and reschedule calendar events around the move. Events capture name, date/time, attendees, notes, and category/color. No user permissions needed—anyone with access can edit.

---

## Event Data Model

Each calendar event contains:
- `id` (number) — unique identifier (timestamp)
- `name` (string) — event title ("Dad's visit", "Cleaner", etc.)
- `date` (ISO date string) — when the event occurs (YYYY-MM-DD)
- `time` (string, optional) — time of day ("14:00", "All day", "Morning", etc.)
- `people` (array of strings) — attendees involved
- `notes` (string, optional) — additional details
- `category` (string) — one of: "Family", "Services", "Logistics", "Other"

**Storage:** Events stored in `localStorage` under key `move_events` as JSON array. Follows same pattern as existing tasks/furniture/contacts.

---

## UI Architecture

### Calendar Tab
- **Position:** Fourth tab in navigation (Tasks, Furniture, Contacts, **Calendar**)
- **Library:** FullCalendar.js (v6, CDN-hosted)
- **Views:** Month view (default), with option to add week view if needed
- **Styling:** Integrates with existing sage/cream color scheme

### Event Creation & Editing
- **"+ Add Event" button** — top of calendar tab, opens modal
- **Click date or event** — opens modal for creation/editing
- **Drag to reschedule** — drag event to new date, auto-saves
- **Delete option** — right-click or edit button option

### Modal Form
Fields:
- Name (required, text)
- Date (required, date picker)
- Time (optional, text field)
- People (optional, text field — comma-separated names like "Dad, Ken")
- Notes (optional, text area)
- Category dropdown (Family / Services / Logistics / Other)

---

## Color Coding by Category

| Category | Color |
|----------|-------|
| Family | Sage (#6B8F66) |
| Services | Warm (#C4704F) |
| Logistics | Blue (#D6E8F5) |
| Other | Cream-dark (#EDE6D8) |

---

## Data Flow

1. **Load:** On page init, read `move_events` from localStorage
2. **Display:** Render events in FullCalendar
3. **Create:** Modal → save to array → localStorage.setItem() → re-render
4. **Update:** Edit modal → find by ID → update array → localStorage → re-render
5. **Delete:** Confirm → remove from array → localStorage → re-render
6. **Reschedule:** Drag in calendar → update date → localStorage → re-render

---

## Integration with Existing Code

- **Storage pattern:** Follows same `save()` function as tasks/furniture/contacts
- **Modal pattern:** Reuse existing modal overlay CSS/structure
- **State management:** Single `let events = []` with existing save/render pattern
- **Responsive:** Mobile breakpoint already handles calendar gracefully (stacks responsively)

---

## FullCalendar Integration

**CDN imports:**
- CSS: `https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css`
- JS: `https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js`

**Config:**
- Editable: true (allows drag-to-reschedule)
- Selectable: true (allows click-to-create)
- HeaderToolbar: title, today, prev, next, month/week toggle
- EventClick: opens edit modal
- DateClick: opens create modal
- EventDrop: updates date, saves

---

## Success Criteria

- [x] Calendar tab renders with existing events
- [x] Add event via modal and see on calendar
- [x] Edit/delete existing events
- [x] Drag events to reschedule
- [x] Events persist in localStorage
- [x] Responsive on mobile
- [x] Matches existing design (colors, typography, spacing)
