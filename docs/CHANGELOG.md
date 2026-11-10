# Changelog

## v13 - Plan feed for the Bauhaus wall (9 Nov 2026)

**New route** `GET /api/feed/plan` (docs/FEED.md): wedding countdown, task progress, overdue / this-week / no-date counts and the next 6 open tasks, for the Bauhaus wall's new Wedding page. Only titles, dates, owners and categories leave; no task detail, guests, money or contacts.

**Access**: a Cloudflare Access service token passes only on `/api/feed/*`, and only if its Client ID is in `FEED_CLIENT_IDS`; everywhere else it gets 403. No D1 migration.

## v12 - Whole-app review fixes (10 Nov 2026)

**Deployed** 10 Nov 2026. D1 migration 0007 (`quotes.date`) + `scripts/v12-live-data.sql` (dates the May 29 $7,000 Joinery quote). Findings and fixes: docs/REVIEW-v11.md.

**Budget**: a quote can be tied to one date ("Only for this date"); the May 29 $7,000 no longer prices every summer Saturday. The Joinery prices up to 160 guests (≈ past 100). A per-guest bar quote keeps the $4,000 minimum; quote choice is deterministic.

**Safer edits**: sheets ask "Discard your changes?"; failed saves show a toast; One by one moves on only after saving; merge/move confirm first; Undo no longer fakes restoring deletes or overwrites a newer edit; sheets always show the latest values.

**Screens**: Today grid, ≈ + confidence on the Joinery price, over-capacity warning; phone padding above the tab bar; print shows only content; wedding venue first on the shortlist; Venues notes when it prices differently from Today; keyboard menus that stay on screen; People room check defaults to the wedding venue; plainer Day copy; timeline 00:00–02:59 counts as after midnight; no duplicate milestones.
