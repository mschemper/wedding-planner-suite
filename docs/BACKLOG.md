# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 10 Nov 2026 (v13 shipped; F27 live).

---

## Mark's actions (data, not code)

### D6. Reply to Shay before the free May 29 hold ends (â‰ˆ 10 Nov 2026)
Then sign + pay the deposit; set The Joinery to "booked" (Venues). Release the Firehouse Jun 12 hold once signed.

### D7. Day â†’ Our venue â†’ "Add milestones to Plan"; Day â†’ Timeline â†’ "Start from the Joinery template"

### D1. Link the unplaced cousins to their parents (People â†’ Family â†’ "Not placed yet")
Import couldn't tell which aunt/uncle household they belong to. `data/private/import-review.json` lists them by id.

### D2. Decide the 42 undecided households (People â†’ Decide)
Pricing defaults to "incl. undecided" until they're decided.

### D4. Delete the 3 Firehouse test quotes (Venues â†’ Firehouse â†’ Quotes)
docs/STATE.md "Quotes". Until then Firehouse reads â‰ˆ $7,600 low.

### D5. Place the unplaced relatives; set local / away (People â†’ Family tray; household sheets)
44 not placed (live, 22 Oct); 113 of 117 guests have locality "unknown" (blanket 0.78 attendance).

### D3. Venue answers (tasks T001â€“T007 in the app)
Each price answer replaces an estimate in `src/data/scenarios.ts` â†’ golden + HISTORY entry (or a quote in the app).

---

## Requested / planned (features)

### F27. Plan on the Bauhaus wall -- M
Released in v13: `/api/feed/plan` + service-token auth (docs/FEED.md); wall side = bauhaus-dashboard v80 Wedding page. Live 10 Nov 2026 (FEED.md Setup done; Pi: feed 200, `/api/data` 403). Left: renew token `bauhaus-wall` before 11 Nov 2027.

### P1. Angela's first sign-in â€” XS
Angela opens the link and enters her email for the PIN. Not yet confirmed.

### F15. Firehouse unknowns â€” XS
F&B minimum, service/tax, insurance/security fees, linens, 2027 availability. Model assumes $160/guest catering, 22% tax+service, $14/guest linens.

### F8. Port missing v1 pieces â€” size on arrival
The mobile companion isn't in this repo. Mark supplies the files â†’ review first.

### F11. Promontory package price check â€” XS
Park District lists $3,679 for the weekend 11-hour package; the doc itemises $3,179 (probably the $500 deposit). Confirm, then golden + HISTORY.

### F18. Quote sweep from email + Drive â€” S (REVIEW-v6 E1)
`docs/skills/quote-sweep.md` + "Paste quotes" sheet (preview vs estimate, one save). PDFs from the Drive folder in STATE "Quotes".

### F19. Quote fields + vendor link â€” M (REVIEW-v6 E2, Q2)
v11 shipped D1 `vendors` (0006: category, status, amounts, payment dates). Still open: vendor email domains, quote `source`, `valid_until`, `vendor_id`, status `excluded` (quotes table rebuild: CHECK constraint).

### F20. Email inbox in the app â€” L (REVIEW-v6 E3)
D1 `inbox` of proposals written via /api/write with an Access service token; daily scheduled sweep; Accept / Dismiss on Today.

### F22. Data health card â€” S (REVIEW-v6 I2; per-household cost shipped v9 in one-by-one Decide; bulk edit v7)

### F23. Date heatmap â€” M (v9 review I3, Mark: yes; ask again: date now likely May 29)
Every Saturday in both date windows coloured by venue season price, holidays, sunset time and historic Chicago weather (Open-Meteo archive, free, fetched once into a data file). Next release.

### F24. Seating chart â€” L (v9 review I9, Mark: yes; Joinery floor plan in public/venues/joinery/, 22 tables 3Ã—8 ft)
Drag households onto tables; starting plan from the family tree keeps branches together; flagged pairs apart. Needs a tables migration. Overlaps F17.

### F25. Inspiration board â€” M (v9 review I15, Mark: yes)
Photo uploads to an R2 bucket (new binding + Worker route; size limit), pinned to venues/vendors. Needs Mark's OK to create the bucket.

### F16. Automatic Gmail sync for tasks â€” L (out of v4 scope)
Needs a Google OAuth app + stored tokens. Today: docs/skills/email-sweep.md â†’ Plan "Paste tasks".

### F17. Seating chart, RSVP site, mailing addresses â€” L
Addresses need a DATA_MODEL plan first (AGENTS "Private data").

### F26. Vendor booked vs estimate â€” S (v11)
Compare each booked vendor's amount with the matching budget line (catering, photo, floralsâ€¦) on Day â†’ Vendors and feed booked amounts into the Joinery budget as quotes.

---

## Bugs / debt

### B5. Drop v3 tables (migration 0003) â€” XS
households / individuals / friends are unused since v4. Drop in a later release once rollback to v3 is no longer wanted.

### B6. Date settings: concurrent edit overwrites (integration review #9) â€” XS
`src/ui/venues/Assumptions.tsx` reads `version()` at save time. Capture versions when the sheet opens so a parallel change returns 409.

### B7. "All must-haves" link uses sessionStorage â€” XS
`src/ui/today` sets `wps.planSection`; add a nav field (e.g. `openPlan(section)`) instead.

### B10. Relationship words from the workbook ("Niece/nephew", "Uncle / father's sibling") â€” XS
Show derived words, or edit labels in the person sheet.

### B8. Vite dev on /mnt/c misses file changes â€” XS
Set `server.watch.usePolling` when running under WSL on a Windows drive, or restart `npm run dev` after edits.

### B4. Attendance ignores vendors and a plus-one acceptance rate (REVIEW-v3 R15) â€” S
v4 excludes the couple. Vendors (photographer, band, coordinator meals) and plus-ones at the host's rate are still not modelled. Decide with Mark.

### B11. Rank collisions on "if room" reorder â€” XS (v10 review)
`src/ui/people/model.ts` `moveRank` renumbers only the ranked rows passed in; parties with no if-room heads can keep a rank. Rank over every `ifroom` party.

### B12. Scenario data guard â€” XS (v10 review)
`interp` / `stepVal` assume ascending, distinct anchors. Add a scenarios test that asserts it (no live bug: custom venues can't produce them).

### B13. Tour mode has no Undo â€” XS
Tour mode saves with `save()` (one batch, creates allowed) so there is no Undo toast; changes are fixed by re-opening tour mode.
