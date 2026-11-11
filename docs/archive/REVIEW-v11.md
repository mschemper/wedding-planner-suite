# REVIEW-v11 -- whole-app review, 9 Nov 2026 (after v11 deploy)
Three Sonnet reviewers (engine/Worker/data; Today/Venues/Day; People/Plan) + lead visual pass. B14-B25 fixed 10 Nov 2026 (commits ec5c323, 22fb6c3 + menu edge fix); not deployed. Deploy needs migration 0007 then scripts/v12-live-data.sql.

## Fixed (commit after v11, not deployed)
- Today: grid rows full (Our venue span-4, Next up span-8, Shortlist span-12); price shows ≈ + confidence; meta in sans 13px; room line says over capacity; held chip hidden when countdown shows; full venue name.
- Phone: content clears the bottom bar + safe area; bar shadow uses `--shadow`; print hides header, tabs, Day switch, toasts.
- Day: Vendor/Timeline sheets edit the live row (keyed on version); "Mark paid" buttons named per payment; one "Add step" in empty timeline.
- Venues/Today shortlist: wedding venue first.
- People: tray Link ignores people already placed; sheets reset on new versions (household, person, relative, task, must-have); Kids menu shows without a capacity; room check defaults to the wedding venue; quick-add refocuses; Branch heading/button valid; household row name matches visible text; dead `.pl-mh` rule.
- Plan: "Added — hidden by filters" hint.
- Engine/Worker: perGuest quote on a minimum-spend line keeps the minimum; quote choice deterministic (accepted, specificity, newer, id); bad custom_venues `sources`/capacity/confidence rejected and tolerated on read; "tmp:" ref check only on ref columns; vendor deposit > amount rejected.

## Fixed 10 Nov (B14-B25)
- B14 quotes.date (0007); dated quote applies on its date only; QuoteForm "Only for this date"; v12 script dates the May 29 $7,000.
- B15 Joinery max 160 (≈ past 100). B16 kit Sheet `dirty` → "Discard your changes?"; relative/place flows guarded. B17 failure toast; One by one advances after save. B18 Menu keyboard (shared with Plan); flips side at screen edge. B19 merge/move confirm. B20 deletes offer no Undo; Undo sends post-edit version (409 on newer edits).
- B21 Venues note when basis/date differ from Today. B22 only 00:00-02:59 is after midnight. B23 duplicate milestone source skipped in write.ts. B24 prefs v2 resets stored 17. B25 366-day window cap, QuoteForm on Field, plain Day copy.

## Original findings (detail)
### B14. Quotes have no date: the May 29 $7,000 prices every summer Saturday — M (review 9 Nov)
`src/engine/compute.ts` applicableQuotes. Venues date ranges and any non-held date show $7,000 (model $9,500). Fix: nullable `quotes.date` (migration 0007 + SPECS), match `co.date`; or skip date-less rate quotes off the held date. Mark picks.

### B15. Joinery max 100 vs 160 seats — XS (review)
`scenarios.ts` id 5 `max: 100`: above 100 expected the total is priced at 100 (labelled). Raise max (lines extrapolate, ≈) or add golden rows. Pricing change: HISTORY entry.

### B16. Sheets discard unsaved edits with no warning — S (review)
Esc / backdrop / ✕ on kit `Sheet`; "Add a relative" from household card / person sheet also drops the draft (PeopleScreen `openRelative`). Fix: `dirty` prop + confirm. Lead-owned kit.

### B17. Save failures invisible when scrolled — S (review)
Decide pills/kids/tier errors render only at the list top; One by one advances before the save returns (OneByOne.tsx). Raise failures as a toast; advance after await.

### B18. Menu keyboard model — M (review)
`src/ui/people/Menu.tsx` role=menu without arrow keys / focus move / refocus trigger; plan/MustHaves RowMenu duplicates it. One shared component.

### B19. Merge/move households: no confirm, no Undo — S (review)
HouseholdCard `runMove` uses `save()`. Add a confirm line or route through `edit()`.

### B20. Undo gaps — S (review)
`src/ui/data.tsx`: edit() with `row: null` (delete) undoes to an empty update; Undo uses the current version so it overwrites a newer edit without 409. Snapshot rows + post-edit versions.

### B21. Venues vs Today totals differ by basis — S (review)
Venues prices at prefs basis/date, Today/Day at expected on the held date, no label linking them. Label the basis on the wedding venue row.

### B22. Timeline 00:00-04:59 counts as next day — S (review)
`plan/day.ts` toMin. An early same-day step sorts after breakdown. Per-row day flag or narrower wrap.

### B23. Milestones can duplicate under concurrent adds — S (review)
No unique key on tasks.source. Partial unique index (migration) or dedupe in write.ts.

### B24. Stored People room-check venue — XS (review)
Default is now the wedding venue (prefs `capacityVenue: null`); a device that stored 17 keeps Firehouse until changed in the picker. Add a prefs version to reset it if Mark wants.

### B25. Polish (review) — XS each
Empty-state copy jargon (Day sections); vendor "tap a suggestion" hint shown when the venue has none; QuoteForm not on kit Field; long date windows price every Saturday (no cap).
