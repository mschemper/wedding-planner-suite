# Where things stand

Read after AGENTS.md. Only what is true now. Open work -> BACKLOG.md. Past releases, old backups, seed-time numbers -> HISTORY.md "Release log". Files per subject -> CODEMAP.md.
Keep: current + previous release rows only, latest backup only, no history. `tests/docs.test.ts` gates size and version.

Last updated: 10 November 2026 (v14).

## Version

| | |
|---|---|
| Current | **v14** (tag `v14`, package.json 14.0.0): Joinery booked — Budget tab, checklist + calendar with dependencies, household addresses, CI + security headers (DESIGN-v14). Deployed 10 Nov 2026 (evening): Worker version 536df694-1f33-465b-b5fe-2e2d164e0442; migration 0008 + `scripts/v14-live-data.sql` + 4 addresses imported (0 orphans). Unauthenticated `/`, `/api/*` redirect to Access (verified); signed-in app + headers not checked. |
| Previous | **v13** (tag `v13`, 13.0.0), deployed 9 Nov 2026, Worker version 2976f4fd; Plan feed live (F27). Rollback: docs/DEPLOY.md |
| Output | Hosted: https://wedding-planner.wedding-planner-suite.workers.dev (Access login). Offline: `dist-offline\index.html` (`npm run build:offline`), read-only budget only. |
| Look | Jungalow Lounge (docs/DESIGN-v9.md); Day tab docs/DESIGN-v11.md; Budget/Plan/Addresses docs/DESIGN-v14.md. Older: docs/archive/ |

## The wedding (facts that drive the model)

| | |
|---|---|
| Couple | Mark & Angela |
| Date | **Sat May 29, 2027** (Memorial Day weekend). Settings `heldDate` = 2027-05-29. |
| Venue | **The Joinery, booked**: signed via HoneyBook 10 Nov 2026 (Angela; Shay to countersign); $7,000 Friday rate; deposit $500 (10 Nov) + $3,000 (11 Nov, per Angela's email) by Zelle. Balance date, COI, headcount deadline unknown (venueFacts questions). Contract PDF not yet in Drive. Facts: `src/data/venueFacts.ts`. |
| Other venues | Passed (v14 live-data sets Firehouse + added venue to passed). |
| Kids | Parallel supervised kids' party upstairs ("Sylvie's party"); kids policy default "our kids only", households can override. |
| Music | Joel Paterson and Friends $2,000 in the model; no contract in email; Firehouse timeline assumes a DJ (task T009). |
| Pricing source | Reconciled Master v2.0 (11 Jun 2026) + venue pages (Oct 2026); ±10–15% vs contracts |

## Guest data (D1 is the source of truth)

Live, 22 Oct 2026 evening (REVIEW-v6 §2): 121 people, 56 households; decisions invite 46 · if room 3 · undecided 7. 44 relatives not placed in the tree; locality unknown for 113 of 117 guests. After 0005: 57 households. Re-count from D1 before quoting. Seed-time table: HISTORY.md.

## Quotes

- Quote documents: Google Drive folder https://drive.google.com/drive/folders/1HWECgGPfEdzSJ6sazixw2Rp3WB9xG2vn (22 Oct: The Joinery Chicago.pdf). Quotes-from-email plan: REVIEW-v6 §4 (BACKLOG F18–F20).
- Joinery: brochure (22 Oct), bar sheet + vendor list photos (30 Oct) in the Drive folder; May 29 $7,000 + bar quotes entered by Mark 5 Nov, relabelled to the v11 lines by scripts/v11-live-data.sql. Venue photos: `public/venues/joinery/` (venue's site, downloaded with Mark's OK 9 Nov; hosted build only).

## Open questions to the Joinery
In `src/data/venueFacts.ts` [5].questions (Day → Our venue) and the checklist task "Ask Shay: …".

## Addresses
4 imported to D1 10 Nov 2026 (Drive "Guest Addresses" screenshot; Gmail/Drive sweeps found none else); 1 found but unmatched (`data/private/addresses-found.json`).

## Environment

- PC: Windows 10, repo `C:\Users\msche\Documents\Projects\wedding-planner-suite` = WSL `/mnt/c/Users/msche/Documents/Projects/wedding-planner-suite`. Git identity repo-local (Mark).
- WSL: Node 24.18 in `~/.local/node/current/bin` (no sudo; `export PATH="$HOME/.local/node/current/bin:$PATH"`); node_modules = **Linux** copy. Native Windows session → `npm ci` first. wrangler logged in (OAuth, 22 Oct 2026).
- Vite on /mnt/c gets no file-change events: restart `npm run dev` after edits. `WPS_DEV_DATA=data/private/garden.json npm run dev` seeds the local dev DB with real data (local only; delete `.wrangler/dev/db-v4.sqlite` afterwards).
- Pinned: wrangler 4.151.3, jose 6.2.13, vite 5.4.21, vitest 2.1.9 (all deps exact).
- workerd crashes on the PC (native) → no `wrangler dev`; tests and `npm run dev` run the Worker in Node.
- GitHub: **https://github.com/mschemper/wedding-planner-suite** (private), `main` + tags v2–v8; Git Credential Manager. WSL push can hang: push from Windows.

## Platform

- Cloudflare Workers + Static Assets + D1 + Access, account `mschemper@gmail.com` (ID 57b28195dc1564bee550b665117db76c). Access team `sukursschemper.cloudflareaccess.com`, one-time PIN, allowed: Mark + Angela. D1 `wedding-planner` id 87b1c95c-7e87-4307-98a3-cac03d0a3937 (ENAM).
- Migrations applied (remote): 0001–0005 (0005 on 23 Oct 2026); 0006 (vendors, timeline) on 9 Nov 2026. 0007 (quotes.date) + `scripts/v12-live-data.sql` on 10 Nov 2026. 0008 (tasks.depends_on/kind, addresses) + v14 live data on 10 Nov 2026. v3 tables (households, individuals, friends) still present; drop in a later migration (BACKLOG B5).
- Latest backup (before v14): `data/private/d1-backup-v13.sql` (10 Nov 2026, 706 INSERT rows); Time Travel bookmark before 0008: 0000004a-00000000-00005120-6de4cc6a93b752803ea1b4deaeae6c77. Older: HISTORY.md.
- Deploy, rollback, re-seed: docs/DEPLOY.md.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
- Keep the GitHub repo current: push after every commit round.
