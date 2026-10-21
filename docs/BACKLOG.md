# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 21 Oct 2026 (v3 built: F2 seasons, F3 params, F4 compare tier, F5 saved state, F10 mobile and B1 a11y shipped; F6/F9 folded into P1/P2). Before: 20 Oct 2026 (v2).

---

## Mark's actions (data, not code)

### D1. Fill the guest workbook (REVIEW G-01–G-04)
Add Angela's side (doc target ~40), the Friends sheet, `Locality` for every person, and `PartnerPersonID`/`ParentPersonIDs`. Review the four placeholder children and the "Cousin child" row. Then run `npm run import:guests -- <xlsx>` and update STATE "Guest data". Changes the venue answer more than any code item.

### D2. Send the five quote requests (STATE "Open quotes")
Each answer replaces an estimate in `src/data/scenarios.ts` → golden + HISTORY entry.

---

## Requested / planned (features)

### P1. Go online, v4 — L (needs Mark's platform "go"; docs/PLATFORMS.md)
D1 schema mirroring `src/guests/schema.ts`; Pages Functions save API that re-runs `validateGuests`; Cloudflare Access for Mark and Angela; guest editor (was F6) with households, filters from the Filter Guide, add/edit, invite status, partner/parent links, and xlsx export. Shared data first: schema + API + tests before screens.

### P2. Quotes and prices editor, v5 — M (after P1)
Per-scenario actual quotes override estimates, with variance against the model (was F9). Edit `Params` (src/data/params.ts) from the UI. Hosting polish.

### F1. Rockwell on the River as scenario 17 — S (needs the tour answers in STATE "Open quotes" #6)

### F7. Family graph — M (needs D1 edges)
A force-directed view built from `PartnerPersonID`/`ParentPersonIDs`. If the v1 graph code exists, put it in `archive/` and port it.

### F8. Port missing v1 pieces — size on arrival
The graph and the mobile companion aren't in this repo. Mark supplies the files → review against REVIEW-v2/v3 conventions first.

### F11. Promontory package price check — XS
The Park District lists $3,679 for the weekend 11-hour package; the doc itemises $3,179. Probably the $500 deposit. Confirm, then update golden + HISTORY if different.

---

## Bugs / debt

### B3. Dev server serves data/private (REVIEW-v3 R18) — XS, before P1
Add `server.fs.deny` for `data/private/**` when going online.

### B4. Attendance doesn't count the couple, vendors or a plus-one rate (REVIEW-v3 R15) — S
Decide with Mark whether to add them.
