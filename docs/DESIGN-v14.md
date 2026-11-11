# DESIGN-v14 -- Production release: Joinery booked, checklist + calendar, addresses
Agent-facing. Mark's request 10 Nov 2026; choices from his AskUserQuestion answers the same day. Rationale -> HISTORY.md "v14".

## Decisions (Mark, 10 Nov 2026)
- Venue: **The Joinery (scenario 5), Sat 29 May 2027, signed, deposit paid.** Venue selection leaves the app.
- One big release (v14), Large setup.
- Venues tab -> **Budget** tab (Joinery only). Venue facts stay on Day.
- Calendar = **month agenda** in Plan (List | Calendar); decisions marked ◆; Ready / Waiting on.
- Addresses = **one mailing address per household**, D1 only. No export, no guest form, no emails/phones (BACKLOG).

## 1. Hosting (verdict: keep)
Cloudflare Workers + Static Assets + D1 + Access stays: $0, Access login for two people, no server, Time Travel restore. Alternatives in PLATFORMS.md stay rejected.
Production additions this release:
- CI: `.github/workflows/check.yml` runs `npm ci && npm run check` on push/PR (Node 24). No deploy from CI (no token in GitHub).
- Security headers on static assets: `public/_headers` (CSP self + Google Fonts if used, `frame-ancestors 'none'`, nosniff, referrer no-referrer, permissions-policy). Worker JSON responses get nosniff + no-store (worker/api.ts).
- UI error boundary: a crash in one screen shows "Something broke on this tab · Reload" instead of a blank page.
- Backups: keep pre-deploy export + Time Travel. Automated weekly export to R2 -> BACKLOG (needs Mark's OK for a bucket).
- Custom domain: optional, BACKLOG; workers.dev + Access is fine.

## 2. Project setup + docs
- Keep: AGENTS.md index + hard rules, CLAUDE.md = `@AGENTS.md`, STATE/BACKLOG/RELEASE session start, docs gate.
- Move superseded design/review docs and mockups to `docs/archive/` (DESIGN-v3..v8, REVIEW-*, mockups/). Current docs in `docs/`: DESIGN-v9 (Look), DESIGN-v11 (Day), DESIGN-v14 (this).
- README: current commands, link to AGENTS.md.
- AGENTS.md: venue decided; drop venue-shortlist rules; addresses rule; CI; branch rule (main + tags; worktree for parallel builders).

## 3. Joinery booked
Data (scripts/v14-live-data.sql, idempotent): venues 5 status booked active 1; every other active venue active 0 status passed; venue-hunt tasks already done stay; vendor row "The Joinery" category `venue`, amount 7000, deposit 3500, deposit_paid 2026-11-11, scenario 5 (balance due unknown).
Code:
- `VENDOR_CATEGORIES` gains `venue` (enum only, no DB CHECK).
- `src/data/venueFacts.ts` [5]: 2027 sheet (180 chairs, 12 highboys), contacts (Shay Schultz, Venue Director; info@; payments by check to The Joinery Studios LLC or Zelle, other methods +3.1%), address 2533 W Homer St; questions = the open contract items (payment schedule, Memorial Day rate in writing, COI, final headcount date, vendor load-in, music/curfew, decor rules, ceremony + rain plan, kids lounge, bar gratuity). Source line: brochure, 2027 pricing sheet, Shay emails 4 + 10 Nov 2026.
- UI removed: Shortlist, FitMatrix, TourMode, CompareBar, Archive, AddVenue, Assumptions (date windows), must-haves section (Plan), venue tiles (Today). Tables musthaves/fit/custom_venues stay in D1 (add-only); pure modules may stay if tests use them.
- Budget tab: Joinery budget on `heldDate` at expected guests (existing BudgetDetail + quotes + prices), guest-count switch (expected / invited / custom) kept.
- Today (v16 order): countdown + **Ready now** (open tasks with no open blockers, decisions first; TaskRow), headcount, Joinery card (status, headline total -> Budget, room check), Next up (minus Ready now), payments due. Budget is the one home of the estimate; Day → Money = bar minimum + link.

## 4. Checklist + calendar
Migration 0008: `tasks.depends_on` (ids JSON, default []), `tasks.kind` (task | decision, default task).
Pure (lead): `src/plan/deps.ts`
- `taskState(t, byId, today)` -> done | overdue | ready | waiting; `waitingOn(t, byId)` -> open blocker tasks.
- `readyNow(tasks, today)`; `monthAgenda(tasks, today)` -> months (YYYY-MM, label) with tasks sorted by due; undated bucket last.
- `depIssues(tasks)` -> warnings: due before a blocker's due; blocker missing.
- `wouldCycle(tasks, id, deps)`; the Worker rejects a save that creates a loop (422).
`src/plan/template.ts`: TEMPLATE (key, title, kind, before days, category, owner, deps keys, detail), Joinery-specific items included. `templateDrafts(wedding, today, tasks)` -> create ops with `tmp:<key>` ids, deps -> tmp ids or the existing task carrying `source = template:<key>`; skips keys already present; ideal date before today -> today (late). Replaces MILESTONES (Day "Add milestones" goes; Plan "Add the wedding checklist").
Write: `depends_on` may reference tmp ids (write.ts remap). Dep/loop errors: only ones the save introduces (422). v11 `milestone:<key>` sources count as their template item (`MILESTONE_ALIAS`).
UI (Plan): List | Calendar segmented; filters All | Ready now | Decisions; row shows ◆ Decision text label, state chip (Ready / Waiting on <title> / Overdue / Done); TaskSheet edits kind + "Waits on" picker (no self, no cycles: `wouldCycle`). Template sheet: preview with untick, one save.

## 5. Addresses
Migration 0008: table `addresses` (id = party id PK, line1, line2, city, region, postal, country default 'US', source, gathered date, verified bool, notes). SPECS create/del true, no prefix; write.ts: id must be an existing party; deleting a party deletes its address in the same batch.
Pure (lead): `src/people/address.ts` `formatAddress`, `addressIssue` (US: region 2 letters, ZIP 5 or 9 digits; required line1/city/postal), `addressProgress(parties, people, addresses, policy)` -> invited households with / without an address.
Never in: the Plan feed, tests (synthetic only), git, docs, chat. Allowed: D1 `addresses` + D1 `audit` (Access-protected), `data/private/`.
Merge: deleting a household whose people all moved to one household without an address carries the address over (write.ts 4c). Re-seed `--replace` refuses while addresses exist (`--no-addresses` override when D1 has none).
Import: `scripts/addresses-sql.ts` reads `data/private/addresses-found.json` (party ids from a fresh D1 export) -> `data/private/addresses.sql`: INSERT ... SELECT WHERE the party exists and has no address; prints counts only; after running, `SELECT COUNT(*) FROM addresses WHERE id NOT IN (SELECT id FROM parties)` = 0. Delete the .sql after.
UI (People): household sheet "Mailing address" section (edit draft, save once); People -> Addresses section: "N of M invited households have an address", list missing first, tap -> household sheet.

## Build plan
1. Lead: this doc, migration 0008, SPECS, types, deps.ts, template.ts, address.ts, write.ts, tests. Commit.
2. Opus design review of this doc + data layer (one).
3. Sonnet builders, disjoint files, same checkout, no commits:
   A Budget + Today + shell: src/ui/venues/*, src/ui/today/*, src/ui/App.tsx, src/ui/prefs.ts (tab "venues" -> "budget" + stored-prefs migration), src/ui/compare.ts (keep exports People/Day use), tests/venues-ui.test.ts, new tests/today-ui.test.ts. Nav contract frozen by lead: `openPlan({mode, filter})`, `TaskRow({task, today, onOpen, highlight})` props stay (B may add optional ones).
   B Plan + calendar: src/ui/plan/*, src/ui/day/OurVenue.tsx + ourVenueModel.ts, tests/plan-ui.test.ts, tests/day-venue-ui.test.ts. Existing Chip tones only (no new tokens).
   C Addresses: src/ui/people/*, tests/people-ui.test.ts or new tests/addresses-ui.test.ts.
   Lead meanwhile: docs move, AGENTS/README/CI/_headers/venueFacts/live-data script.
4. Lead: `npm run check`, screenshots (day, dusk, 360px), Sonnet integration review (A and B both touch shared nav/today links).
