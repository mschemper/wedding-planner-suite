# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 23 Oct 2026 (v9 shipped: Claude API features removed, Jungalow look, People review items; ideas F23–F25 queued).

---

## Mark's actions (data, not code)

### D1. Link the unplaced cousins to their parents (People → Family → "Not placed yet")
Import couldn't tell which aunt/uncle household they belong to. `data/private/import-review.json` lists them by id.

### D2. Decide the 42 undecided households (People → Decide)
Pricing defaults to "incl. undecided" until they're decided.

### D4. Delete the 3 Firehouse test quotes (Venues → Firehouse → Quotes)
docs/STATE.md "Quotes". Until then Firehouse reads ≈ $7,600 low.

### D5. Place the unplaced relatives; set local / away (People → Family tray; household sheets)
44 not placed (live, 22 Oct); 113 of 117 guests have locality "unknown" (blanket 0.78 attendance).

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

### F18. Quote sweep from email + Drive — S (REVIEW-v6 E1)
`docs/skills/quote-sweep.md` + "Paste quotes" sheet (preview vs estimate, one save). PDFs from the Drive folder in STATE "Quotes".

### F19. Vendors table + quote fields — M (REVIEW-v6 E2, Q2)
Migration 0004: `vendors` (category, email domains), quote `source`, `valid_until`, `deposit`, `vendor_id`, status `excluded` ("not needed"; needs a quotes table rebuild: CHECK constraint).

### F20. Email inbox in the app — L (REVIEW-v6 E3)
D1 `inbox` of proposals written via /api/write with an Access service token; daily scheduled sweep; Accept / Dismiss on Today.

### F22. Data health card — S (REVIEW-v6 I2; per-household cost shipped v9 in one-by-one Decide; bulk edit v7)

### F23. Date heatmap — M (v9 review I3, Mark: yes)
Every Saturday in both date windows coloured by venue season price, holidays, sunset time and historic Chicago weather (Open-Meteo archive, free, fetched once into a data file). Planned v10.

### F24. Seating chart — L (v9 review I9, Mark: yes)
Drag households onto tables; starting plan from the family tree keeps branches together; flagged pairs apart. Needs a tables migration. Overlaps F17.

### F25. Inspiration board — M (v9 review I15, Mark: yes)
Photo uploads to an R2 bucket (new binding + Worker route; size limit), pinned to venues/vendors. Needs Mark's OK to create the bucket.

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

### B10. Relationship words from the workbook ("Niece/nephew", "Uncle / father's sibling") — XS
Show derived words, or edit labels in the person sheet.

### B8. Vite dev on /mnt/c misses file changes — XS
Set `server.watch.usePolling` when running under WSL on a Windows drive, or restart `npm run dev` after edits.

### B4. Attendance ignores vendors and a plus-one acceptance rate (REVIEW-v3 R15) — S
v4 excludes the couple. Vendors (photographer, band, coordinator meals) and plus-ones at the host's rate are still not modelled. Decide with Mark.
