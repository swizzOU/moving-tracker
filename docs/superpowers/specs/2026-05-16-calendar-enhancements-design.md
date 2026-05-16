# Calendar Enhancements Design
**Date:** 2026-05-16  
**Project:** Move Tracker  
**Scope:** Add delete capability, custom colors, multi-day events, and multi-select people management

---

## Overview

Enhance the existing calendar feature with four capabilities:
1. Delete events with confirmation
2. Custom color selection (free-form, replaces category-based coloring)
3. Multi-day events (optional end date)
4. Multi-select people dropdown (fixed list: Ken, Dani, Dad, Caroline, Mum)

---

## Event Data Model (Updated)

Each calendar event now contains:
- `id` (number) — unique identifier (timestamp)
- `name` (string) — event title
- `date` (ISO date string) — start date (YYYY-MM-DD)
- `endDate` (ISO date string, optional) — end date for multi-day events
- `time` (string, optional) — time of day
- `people` (array of strings) — selected attendees from fixed list
- `notes` (string, optional) — additional details
- `category` (string) — Family / Services / Logistics / Other (metadata only, no color control)
- `color` (hex string) — event color on calendar (e.g., `#6B8F66`), defaults to sage

**Storage:** `localStorage` key `move_events` as JSON array

---

## Modal Form (Updated)

Fields in order:
- Name (required, text)
- Date (required, date picker)
- End Date (optional, revealed by checkbox, date picker)
- Time (optional, text)
- People (multi-select dropdown with checkboxes: Ken, Dani, Dad, Caroline, Mum)
- Notes (optional, text)
- Category (dropdown: Family / Services / Logistics / Other)
- Color (HTML color picker, default `#6B8F66`)

**Delete button:** Red text button in modal footer, asks "Delete this event?" on click

---

## Calendar Rendering

- Multi-day events render as continuous bars spanning all dates (FullCalendar `end` property)
- Event color controlled by `color` field, not category
- Drag to reschedule: updates `date` and `endDate` proportionally
- Click event or date to open modal
- Category field displayed in modal but not visible on calendar

---

## Data Migration

Existing events from initial calendar feature:
- Add `endDate: null` to all events
- Add `color: "#6B8F66"` to all events
- Keep `category` as-is
- Keep `people` array as-is

---

## Success Criteria

- [x] Delete events with confirmation modal
- [x] Pick custom colors with HTML color picker
- [x] Create multi-day events (optional end date)
- [x] Select multiple people from dropdown
- [x] Events persist in localStorage with all fields
- [x] Multi-day events render as continuous bars
- [x] Drag to reschedule works for single and multi-day events
