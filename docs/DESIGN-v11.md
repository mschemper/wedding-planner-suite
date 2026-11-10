# DESIGN-v11 -- Day tab (The Joinery, Sat May 29 2027). Agent-facing.
Mark picked (9 Nov 2026): new 5th tab "Day" with sections Our venue | Vendors | Timeline; Today shows the wedding countdown + an Our venue card; milestones become Plan tasks. Look unchanged (DESIGN-v9 Jungalow Lounge). Data layer shipped first (commit 82fbb4d): `src/plan/day.ts`, `src/data/venueFacts.ts`, D1 `vendors` + `timeline` (0006), `useData().vendors/.timeline`.

## Shell (lead)
- `Tab` adds "day"; TABS: Today ✿, Venues ⌂, People ❦, Plan ✓, Day ❀. Bottom bar < 640px holds 5 tabs (labels may shrink, targets stay >= 44px).
- `Nav.openDay(section?)`; `src/ui/day/DayScreen.tsx`: Segmented "Our venue | Vendors | Timeline" (section kept in prefs `daySection`), renders `<OurVenue/>`, `<Vendors/>`, `<Timeline/>`.
- No wedding venue (`weddingVenue()` null): each section shows an EmptyState pointing to Venues ("Mark a venue as held on the held date").
- Offline build: Day tab shows EmptyState "The Day tab lives in the online planner." (no photos, no writes).

## Our venue (builder A: src/ui/day/OurVenue.tsx, ourVenue.css; src/ui/today/*)
1. Header card: venue name, date `fmtDay(heldDate, true)`, status chip, countdown (`weddingCountdown`), Memorial Day weekend note, sunset `clock(sunsetLocal(date))`.
2. Money card: budget at expected headcount for heldDate using the same path as Venues (`summarize`/compare helpers, respect quotes); show "Rental quoted $7,000" when a received/accepted quote exists on a Venue & site item; show ≈ and confidence %. Bar minimum line: "Bar minimum $4,000 = $X pp at N guests".
3. Room card: expected adults vs `capacity.hardMax` (160) as text + simple bar; kids count; "Room for ≈ N more".
4. Photos: grid of `VENUE_FACTS[id].photos` (`import.meta.env.BASE_URL + src`), lazy, alt = caption, credit under each; tap opens a Sheet with the large image. Hidden offline.
5. Facts: rules, included, lodging (lists, max 5 visible + "Show all").
6. Open questions: `VENUE_FACTS.questions` + open tasks with scenario_id = venue (TaskRow, openTask).
7. Planning milestones: `milestoneDrafts(heldDate, chicagoToday(), tasks)`; list first 5 with due + "late" chip; one button "Add N milestones to Plan" → ONE `save()` of task creates {title, detail, due, category, owner: "Both", source}; done state "All milestones are in Plan".
- Today: When card big = `weddingCountdown(...).big` + sub "to Sat May 29, 2027 · The Joinery" when a wedding venue exists (else the window countdown as now); new card "Our venue" (span-6 next to Shortlist or above it): name, budget, N/160, vendors booked x/10 (`vendorSummary`), button "Open Day" → `openDay("venue")`.

## Vendors (builder B: src/ui/day/Vendors.tsx, VendorSheet.tsx, vendors.css, vendorsModel.ts)
- Summary strip: "x of 10 booked", committed $ (booked amounts), next payment (first of `payments`).
- List grouped by `vendorSummary().byCategory`: category label, best vendor + status chip (text + shape, never colour alone), amount; empty core categories show "Add" + up to 3 suggestions from `VENUE_FACTS[venue].recommended[category]` (tap = prefill name).
- VendorSheet: fields category, name, status (Segmented), amount, deposit, deposit due, balance due, contact, notes; draft + Save (create via `save`, update via `edit` with Undo); delete with confirm. Number inputs: draft strings, commit on Save (REVIEW-v3 R1).
- Payments list: upcoming deposits/balances with due labels (overdue in peony + "overdue" text).

## Timeline (builder C: src/ui/day/Timeline.tsx, TimelineSheet.tsx, timeline.css, timelineModel.ts)
- Empty: "Start from the Joinery template" → ONE `save()` creating `TIMELINE_TEMPLATE` rows; or "Add step".
- List `sortTimeline`: time `clock(start)`–`clock(endOf)`, title, place, who; issue text from `timelineIssues(rows, VENUE_FACTS[id].hours)` inline (icon + text). Sunset marker row at `sunsetIndex` ("Sunset 8:20 PM").
- Header facts: venue hours 2 PM–midnight (+1.5 h breakdown), bar 5 h max.
- TimelineSheet: start (type="time"), minutes, title, place, who, notes; save/edit/delete as Vendors. "Shift later steps" not in v11.
- Print: `@media print` shows the list only.

## Rules for builders
- Compose kit (`Card, Chip, Button, Segmented, Sheet, Field, EmptyState, Stat`) + motifs; no new colours; CSS in own folder; tokens only; 44px targets; 360px works.
- Hooks above early returns. UI never computes money/headcount: use engine/plan helpers.
- Tests: pure model fns (op builders, validation) in `tests/day-<area>-ui.test.ts`.
