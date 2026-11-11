# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 10 Nov 2026 (v16 shipped, deployed).

---

## Mark's actions (data, not code)

### D9. Save the signed Joinery contract (HoneyBook PDF) to the Drive quote folder
Then an agent fills payment schedule, COI, headcount deadline into venueFacts + vendor row V01.

### D10. Plan → "Add the wedding checklist" (after deploy)
Untick anything already done.

### D1. Link the unplaced cousins to their parents (People â†’ Family â†’ "Not placed yet")
Import couldn't tell which aunt/uncle household they belong to. `data/private/import-review.json` lists them by id.

### D2. Decide the 42 undecided households (People â†’ Decide)
Pricing defaults to "incl. undecided" until they're decided.

### D5. Place the unplaced relatives; set local / away (People â†’ Family tray; household sheets)
44 not placed (live, 22 Oct); 113 of 117 guests have locality "unknown" (blanket 0.78 attendance).

---

## Requested / planned (features)

### F27. Plan on the Bauhaus wall -- M
Released in v13: `/api/feed/plan` + service-token auth (docs/FEED.md); wall side = bauhaus-dashboard v80 Wedding page. Live 10 Nov 2026 (FEED.md Setup done; Pi: feed 200, `/api/data` 403). Left: renew token `bauhaus-wall` before 11 Nov 2027.

### P1. Angela's first sign-in â€” XS
Angela opens the link and enters her email for the PIN. Not yet confirmed.

### F8. Port missing v1 pieces â€” size on arrival
The mobile companion isn't in this repo. Mark supplies the files â†’ review first.

### F18. Quote sweep from email + Drive â€” S (REVIEW-v6 E1)
`docs/skills/quote-sweep.md` + "Paste quotes" sheet (preview vs estimate, one save). PDFs from the Drive folder in STATE "Quotes".

### F19. Quote fields + vendor link â€” M (REVIEW-v6 E2, Q2)
v11 shipped D1 `vendors` (0006: category, status, amounts, payment dates). Still open: vendor email domains, quote `source`, `valid_until`, `vendor_id`, status `excluded` (quotes table rebuild: CHECK constraint).

### F20. Email inbox in the app â€” L (REVIEW-v6 E3)
D1 `inbox` of proposals written via /api/write with an Access service token; daily scheduled sweep; Accept / Dismiss on Today.

### F22. Data health card â€” S (REVIEW-v6 I2; per-household cost shipped v9 in one-by-one Decide; bulk edit v7)

### F24. Seating chart â€” L (v9 review I9, Mark: yes; Joinery floor plan in public/venues/joinery/, 22 tables 3Ã—8 ft)
Drag households onto tables; starting plan from the family tree keeps branches together; flagged pairs apart. Needs a tables migration. Overlaps F17.

### F25. Inspiration board â€” M (v9 review I15, Mark: yes)
Photo uploads to an R2 bucket (new binding + Worker route; size limit), pinned to venues/vendors. Needs Mark's OK to create the bucket.

### F16. Automatic Gmail sync for tasks â€” L (out of v4 scope)
Needs a Google OAuth app + stored tokens. Today: docs/skills/email-sweep.md â†’ Plan "Paste tasks".

### F26. Vendor booked vs estimate â€” S (v11)
Compare each booked vendor's amount with the matching budget line (catering, photo, floralsâ€¦) on Day â†’ Vendors and feed booked amounts into the Joinery budget as quotes.

---

### F28. Addresses: export for envelopes / labels, guest self-entry form, phones + emails -- M/L
Not chosen for v14 (Mark). Self-entry needs a public route outside Access + spam protection.

### F29. Automated weekly D1 backup to R2 -- S
Cron Worker export; needs Mark's OK for a bucket. Custom domain optional.

### F30. Plan: Google Calendar (.ics) feed / sheet export of the checklist -- S
Not chosen for v14.

## Bugs / debt

### B5. Drop v3 tables (migration 0003) â€” XS
households / individuals / friends are unused since v4; musthaves / fit / custom_venues unused since v14. Drop in a later release once rollback to v3 is no longer wanted.

### B6. Date settings: concurrent edit overwrites (integration review #9) â€” XS
`src/ui/venues/Assumptions.tsx` reads `version()` at save time. Capture versions when the sheet opens so a parallel change returns 409.

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
