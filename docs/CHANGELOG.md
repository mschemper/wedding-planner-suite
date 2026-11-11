# Changelog

## v18 - Preferred vendors on the tasks that need them (11 Nov 2026)

Vendor tasks (choose / book the caterer, photographer, planner, florist, DJ / band, menu, engagement photos) now carry a "★ 21 Joinery caterers · 1 shortlisted ›" link in the Plan list, the Calendar and Today; it opens Day → Vendors → Joinery preferred list on that vendor type. The task sheet lists the top Joinery picks for that task (shortlisted, your marked caterers, planners with day-of first) with "See all and shortlist". Hand-typed vendor tasks are matched by their words. No D1 migration.

## v17 - Add-task fix, easier task list, swipe review, Joinery preferred vendors (11 Nov 2026)

**Fixed**: adding a task silently did nothing after the first manually added task (the server treated every "manual"/"email" source as a duplicate). Only checklist keys dedupe now. Tasks typed in before the fix were never saved: re-enter them.
**Plan**: always-visible "Add a task…" bar (Enter saves; details optional), "Added" confirmation, one control row, tasks grouped by month (far months folded), overdue said once, searchable "Waits on" picker.
**People → To review (N)**: swipe deck for everything outstanding: undecided households (right Invite · left No · up If room), "talk about it" flags, local unknown, missing addresses, missing last names. Tap a card for the household; buttons and keys too. Name fixes moved under "⋯ More".
**Day → Vendors → Joinery preferred list**: the venue's paper list (91 vendors, 5 types) with researched descriptions, style, published prices, reviews, links; your 8 marked caterers first; planners with day-of coordination first; "Add to shortlist" makes a vendor idea. **Budget**: plain-English guest-count choices. **Today**: one-line venue summary → Venue details. `scripts/v17-live-data.sql` drops "Firehouse" from T009's title. No D1 migration.
