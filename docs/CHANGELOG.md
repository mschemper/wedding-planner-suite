# Changelog

## v14 - Joinery booked: Budget tab, checklist + calendar, addresses, production hardening (10 Nov 2026)

**Venue decided**: The Joinery, Sat 29 May 2027, signed. Venues tab is now **Budget** (Joinery cost at the held date, quotes, prices). Shortlist, fit matrix, tour mode, compare, add venue, date windows and must-haves are gone. Day → Our venue: contacts, payment rules, 2027 inventory, contract questions. `scripts/v14-live-data.sql`: Joinery booked, others passed, Joinery vendor row ($7,000, $3,500 deposit).

**Checklist + calendar** (Plan): ~50 tasks and decisions counted back from the wedding with dependencies ("Add the wedding checklist"); List | Calendar (month agenda); filters All / Ready now / Decisions; each task shows Ready / Waiting on … / Overdue; Waits-on picker blocks loops. Today shows Ready now. D1 migration 0008 (`tasks.depends_on`, `tasks.kind`).

**Mailing addresses**: one per household (People → Addresses + household card); progress "N of M invited households". Private: D1 only; import script for found addresses.

**Production**: CI on every push, CSP + security headers, crash-safe tabs (error boundary), re-seed guard; docs archived (docs/archive/), AGENTS.md rules updated.

## v13 - Plan feed for the Bauhaus wall (9 Nov 2026)

**New route** `GET /api/feed/plan` (docs/FEED.md): wedding countdown, task progress, overdue / this-week / no-date counts and the next 6 open tasks, for the Bauhaus wall's new Wedding page. Only titles, dates, owners and categories leave; no task detail, guests, money or contacts.

**Access**: a Cloudflare Access service token passes only on `/api/feed/*`, and only if its Client ID is in `FEED_CLIENT_IDS`; everywhere else it gets 403. No D1 migration.

