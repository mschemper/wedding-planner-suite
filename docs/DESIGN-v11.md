# DESIGN-v11 -- Day tab (The Joinery, Sat May 29 2027). Agent-facing.
Mark picked (9 Nov 2026): new 5th tab "Day" with sections Our venue | Vendors | Timeline; Today shows the wedding countdown + an Our venue card; milestones become Plan tasks. Look unchanged (DESIGN-v9 Jungalow Lounge). Data layer shipped first (commit 82fbb4d): `src/plan/day.ts`, `src/data/venueFacts.ts`, D1 `vendors` + `timeline` (0006), `useData().vendors/.timeline`.

## Shell (lead)
- `Tab` adds "day"; TABS: Today ✿, Venues ⌂, People ❦, Plan ✓, Day ❀. Bottom bar < 640px holds 5 tabs (labels may shrink, targets stay >= 44px).
- `Nav.openDay(section?)`; `src/ui/day/DayScreen.tsx`: Segmented "Our venue | Vendors | Timeline" (section kept in prefs `daySection`), renders `<OurVenue/>`, `<Vendors/>`, `<Timeline/>`.
- DayScreen already handles no wedding venue and offline (EmptyStates). Sections receive `{ venueId, date }`, keep the stub export names/props (`OurVenue`, `Vendors`, `Timeline`), never repeat those empty/offline states.
- Review fixes (Opus, 9 Nov) landed in the data layer: vendors `deposit_paid`/`balance_paid`; `vendorSummary(vendors, today)` returns `next`, `overdue`, unpaid `payments` only; `roomCheck(hc, scenario)`; `barMinimum(scenario, guests, opts, season)`; `useWeddingSummary()` in src/ui/compare.ts (summary at expected guests on heldDate + `rentalQuote` + `unmatched`); sunset on the right day; `sunsetIndex` = first step starting after sunset.

## Our venue (builder A: src/ui/day/OurVenue.tsx, ourVenue.css, ourVenueModel.ts; src/ui/today/*; tests/day-venue-ui.test.ts)
1. Header card: venue name, date `fmtDay(heldDate, true)`, status chip, countdown (`weddingCountdown`), Memorial Day weekend note, sunset `clock(sunsetLocal(date))`.
2. Money card: `useWeddingSummary()` only (no own maths): total, guestsLabel, confidence %, ≈ when extrapolated; "Rental quoted $X" from `rentalQuote`; `unmatched` quotes → warning text. Bar line from `barMinimum(scenario, guests, defaultOpts(scenario), seasonOf(scenario, date))`: "Bar minimum $4,000 ≈ $53 pp at 75 guests" when binding.
3. Room card: `roomCheck(headcount, scenario)`: "≈ 64 expected of 160 seats (kids included)", invited-if-all-come, spare; over = icon + text, never colour alone.
4. Photos: grid of `VENUE_FACTS[id].photos` (`import.meta.env.BASE_URL + src`), lazy, alt = caption, credit under each; tap opens a Sheet with the large image. Hidden offline.
5. Facts: rules, included, lodging (lists, max 5 visible + "Show all").
6. Open questions: `VENUE_FACTS.questions` + open tasks with scenario_id = venue (TaskRow, openTask).
7. Planning milestones: `milestoneDrafts(heldDate, chicagoToday(), tasks)`; list first 5 with due + "late" chip; one button "Add N milestones to Plan" → ONE `save()` of task creates {title, detail, due, category, owner: "Both", source}; done state "All milestones are in Plan".
- Today: replace the held-venue lookup with `weddingVenue()`. When card big = `weddingCountdown(...).big` + sub "to Sat May 29, 2027 · The Joinery" when a wedding venue exists (else the window countdown as now); new card "Our venue" (span-6 next to Shortlist or above it): name, budget, N/160, vendors booked x/10 (`vendorSummary`), button "Open Day" → `openDay("venue")`. Offline: hide the vendors line and the Open Day button.
- Milestone ops: build creates with `createTaskOp` from src/ui/plan/model.ts (read-only) in ourVenueModel.ts.

## Vendors (builder B: src/ui/day/Vendors.tsx, VendorSheet.tsx, vendors.css, vendorsModel.ts)
- Summary strip: `vendorSummary(vendors, chicagoToday())`: "x of 10 booked", committed $, `next` payment, overdue count (icon + "overdue" text).
- List grouped by `vendorSummary().byCategory`: category label, best vendor + status chip (text + shape, never colour alone), amount; empty core categories show "Add" + up to 3 suggestions from `VENUE_FACTS[venue].recommended[category]` (tap = prefill name).
- VendorSheet: fields category, name, status (Segmented), amount, deposit, deposit due, deposit paid, balance due, balance paid, contact, notes; payment rows get a one-tap "Mark paid" (sets *_paid = today via `edit`, Undo); draft + Save (create via `save`, update via `edit` with Undo); delete with confirm. Number inputs: draft strings, commit on Save (REVIEW-v3 R1).
- Payments list: upcoming deposits/balances with due labels (overdue in peony + "overdue" text).

## Timeline (builder C: src/ui/day/Timeline.tsx, TimelineSheet.tsx, timeline.css, timelineModel.ts)
- Empty: "Start from the Joinery template" → ONE `save()` creating `TIMELINE_TEMPLATE` rows; or "Add step".
- List `sortTimeline`: time `clock(start)`–`clock(endOf)`, title, place, who; issue text from `timelineIssues(rows, VENUE_FACTS[id].hours)` inline (icon + text). Sunset marker row at `sunsetIndex` ("Sunset 8:20 PM").
- Header facts: venue hours from `VENUE_FACTS[id].hours`, bar 5 h max, sunset "≈ " + `clock(sunsetLocal(date))` (never a literal time).
- TimelineSheet: start (type="time"), minutes, title, place, who, notes; save/edit/delete as Vendors. "Shift later steps" not in v11.
- Print: `@media print` shows the list only.

## Rules for builders
- Compose kit (`Card, Chip, Button, Segmented, Sheet, Field, EmptyState, Stat`) + motifs; no new colours; CSS in own folder; tokens only; 44px targets; 360px works.
- Hooks above early returns. UI never computes money/headcount: use engine/plan helpers.
- Tests: pure model fns (op builders, validation) in `tests/day-<area>-ui.test.ts`.
