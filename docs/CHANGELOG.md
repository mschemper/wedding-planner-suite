# Changelog

## v17 - Add-task fix, easier task list, swipe review, Joinery preferred vendors (11 Nov 2026)

**Fixed**: adding a task silently did nothing after the first manually added task (the server treated every "manual"/"email" source as a duplicate). Only checklist keys dedupe now. Tasks typed in before the fix were never saved: re-enter them.
**Plan**: always-visible "Add a task…" bar (Enter saves; details optional), "Added" confirmation, one control row, tasks grouped by month (far months folded), overdue said once, searchable "Waits on" picker.
**People → To review (N)**: swipe deck for everything outstanding: undecided households (right Invite · left No · up If room), "talk about it" flags, local unknown, missing addresses, missing last names. Tap a card for the household; buttons and keys too. Name fixes moved under "⋯ More".
**Day → Vendors → Joinery preferred list**: the venue's paper list (91 vendors, 5 types) with researched descriptions, style, published prices, reviews, links; your 8 marked caterers first; planners with day-of coordination first; "Add to shortlist" makes a vendor idea. **Budget**: plain-English guest-count choices. **Today**: one-line venue summary → Venue details. `scripts/v17-live-data.sql` drops "Firehouse" from T009's title. No D1 migration.

## v16 - Layout picks from the v15 review (10 Nov 2026)

**Today**: Ready now sits beside the countdown (first on phones); Ready now and Next up use the same task row with a checkbox, and Next up skips what Ready now already shows. **Plan on phones**: owner/category filters fold behind one "Filter" button (shows how many are on). **Done message** says what it unblocked ("· 5 tasks now ready"). **One home for money**: Budget; Day → Money keeps only the bar minimum and an Open Budget button. Smaller leaf motif on phone cards. No D1 migration.
