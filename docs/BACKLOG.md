# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 22 Oct 2026 (v4 shipped: family garden (F7), household decisions, must-haves, tasks, shortlist; v3 Guests/Quotes screens retired, so F12/F13 are gone; Rockwell archived by Mark, so F1 is gone).

---

## Mark's actions (data, not code)

### D1. Link the 23 cousins to their parents in the Family garden ("Set parents")
Import couldn't tell which aunt/uncle household they belong to. `data/private/import-review.json` lists them by id.

### D2. Decide the 42 undecided households (People → Decide)
Pricing defaults to "incl. undecided" until they're decided.

### D3. Venue answers (tasks T001–T007 in the app)
Each price answer replaces an estimate in `src/data/scenarios.ts` → golden + HISTORY entry (or a quote in the app).

---

## Requested / planned (features)

### P1. Angela's first sign-in — XS
Angela opens the link and enters her email for the PIN. Not yet confirmed.

### F14. Ravenswood Event Center pricing — S (needs the rate sheet, task T004)
`priced: false` today. Add line items + golden rows when rates arrive.

### F15. Firehouse unknowns — XS
F&B minimum, service/tax, insurance/security fees, linens, 2027 availability. Model assumes $160/guest catering, 22% tax+service, $14/guest linens.

### F8. Port missing v1 pieces — size on arrival
The mobile companion isn't in this repo. Mark supplies the files → review first.

### F11. Promontory package price check — XS
Park District lists $3,679 for the weekend 11-hour package; the doc itemises $3,179 (probably the $500 deposit). Confirm, then golden + HISTORY.

### F16. Automatic Gmail sync for tasks — L (out of v4 scope)
Needs a Google OAuth app + stored tokens. Today: docs/skills/email-sweep.md → Plan "Paste tasks".

### F17. Seating chart, RSVP site, mailing addresses — L
Addresses need a DATA_MODEL plan first (AGENTS "Private data").

---

## Bugs / debt

### B5. Drop v3 tables (migration 0003) — XS
households / individuals / friends are unused since v4. Drop in a later release once rollback to v3 is no longer wanted.

### B6. Date settings: concurrent edit overwrites (integration review #9) — XS
`src/ui/venues/Assumptions.tsx` reads `version()` at save time. Capture versions when the sheet opens so a parallel change returns 409.

### B7. "All must-haves" link uses sessionStorage — XS
`src/ui/today` sets `wps.planSection`; add a nav field (e.g. `openPlan(section)`) instead.

### B8. Vite dev on /mnt/c misses file changes — XS
Set `server.watch.usePolling` when running under WSL on a Windows drive, or restart `npm run dev` after edits.

### B4. Attendance ignores vendors and a plus-one acceptance rate (REVIEW-v3 R15) — S
v4 excludes the couple. Vendors (photographer, band, coordinator meals) and plus-ones at the host's rate are still not modelled. Decide with Mark.
