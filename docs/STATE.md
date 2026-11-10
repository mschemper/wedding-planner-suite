# Where things stand

Read after AGENTS.md. Only what is true now. Open work -> BACKLOG.md. Past releases, old backups, seed-time numbers -> HISTORY.md "Release log". Files per subject -> CODEMAP.md.
Keep: current + previous release rows only, latest backup only, no history. `tests/docs.test.ts` gates size and version.

Last updated: 9 November 2026 (v11 deployed; review fixes committed on main, not deployed).

## Version

| | |
|---|---|
| Current | **v11** (tag `v11`, package.json 11.0.0): The Joinery on Sat May 29 2027; Day tab (our venue + photos, vendors, timeline), wedding countdown, plan-back milestones; Joinery repriced from its own sheets; migration 0006 + scripts/v11-live-data.sql (both applied). Deployed 9 Nov 2026, Worker version 5dcf0c0a-a7af-461d-b9af-8962abca2129; unauthenticated `/`, `/api/version`, photos → Access login (verified); signed-in view not checked |
| Previous | **v10** (tag `v10`, 10.0.0), deployed 25 Oct 2026, Worker version 5904b91d-009e-41dd-9784-85781427ed6c; no migration. Rollback: docs/DEPLOY.md |
| Output | Hosted: https://wedding-planner.wedding-planner-suite.workers.dev (Access login). Offline: `dist-offline\index.html` (`npm run build:offline`), read-only budget only. |
| Look | Jungalow Lounge (docs/DESIGN-v9.md); Day tab layout docs/DESIGN-v11.md. Older looks and designs: HISTORY.md |

## The wedding (facts that drive the model)

| | |
|---|---|
| Couple | Mark & Angela |
| Date | **Likely Sat May 29, 2027** (Memorial Day weekend; Mark, 9 Nov). Settings `heldDate` = 2027-05-29; `dateWindows` unchanged (late spring / early fall). |
| Venue | **The Joinery** (likely): toured 30 Oct; Shay offered May 29 at the Friday rate **$7,000** (tax incl.) and held it free for one week from 3 Nov (ends ≈ 10 Nov 2026). Facts, rules, vendors, photos: `src/data/venueFacts.ts`. |
| Shortlist (D1 `venues.active`) | The Joinery (held May 29), Firehouse Chicago (backup, held Jun 12). Ravenswood + River Room archived 9 Nov (scripts/v11-live-data.sql). |
| Firehouse facts | Official 15-hour package: Sat $11,000 Nov–May, $12,000 Jun–Oct; seated 82 adults, cocktail 100; Bunk Room $500, up to 20 kids (Mark, 22 Oct); approved caterers; no valet (lot one block away); fetched 21 Oct 2026. F&B minimum, fees, 2027 availability unknown. |
| Kids | Parallel supervised kids' party upstairs ("Sylvie's party"); kids policy default "our kids only", households can override. |
| Music | Joel Paterson and Friends $2,000 in the model; no contract in email; Firehouse timeline assumes a DJ (task T009). |
| Pricing source | Reconciled Master v2.0 (11 Jun 2026) + venue pages (Oct 2026); ±10–15% vs contracts |

## Guest data (D1 is the source of truth)

Live, 22 Oct 2026 evening (REVIEW-v6 §2): 121 people, 56 households; decisions invite 46 · if room 3 · undecided 7. 44 relatives not placed in the tree; locality unknown for 113 of 117 guests. After 0005: 57 households. Re-count from D1 before quoting. Seed-time table: HISTORY.md.

## Quotes

- **Firehouse live quotes to delete (Mark, in the app):** Tax + service $0, Event insurance $0, Photography $500 (entered 22 Oct 07:27, no vendor; Mark confirmed test taps). They lower the Firehouse total ≈ $7,600 at 75 guests. Venues → Firehouse → Quotes → delete each.
- Quote documents: Google Drive folder https://drive.google.com/drive/folders/1HWECgGPfEdzSJ6sazixw2Rp3WB9xG2vn (22 Oct: The Joinery Chicago.pdf). Quotes-from-email plan: REVIEW-v6 §4 (BACKLOG F18–F20).
- Joinery: brochure (22 Oct), bar sheet + vendor list photos (30 Oct) in the Drive folder; May 29 $7,000 + bar quotes entered by Mark 5 Nov, relabelled to the v11 lines by scripts/v11-live-data.sql. Venue photos: `public/venues/joinery/` (venue's site, downloaded with Mark's OK 9 Nov; hosted build only).

## Open questions to venues (tasks in the app)

1. Firehouse: when does the Jun 12 hold resolve; seated cap with kids upstairs; caterer + DJ rules; valet.
2. Ravenswood Event Center: rate sheet, F&B minimum, catering/bar policy, 2027 dates (no official site found).
3. River Room: book a tour (Calendly) or drop; 2026/27 pricing not published.
4. The Joinery: sign before the hold ends; jazz combo allowed; Memorial Day surcharge; bar tax/gratuity; deposit schedule (`VENUE_FACTS[5].questions`).
5. Rockwell on the River, Salt Shed: tell them you're passing.

## Environment

- PC: Windows 10, repo `C:\Users\msche\Documents\Projects\wedding-planner-suite` = WSL `/mnt/c/Users/msche/Documents/Projects/wedding-planner-suite`. Git identity repo-local (Mark).
- WSL: Node 24.18 in `~/.local/node/current/bin` (no sudo; `export PATH="$HOME/.local/node/current/bin:$PATH"`); node_modules = **Linux** copy. Native Windows session → `npm ci` first. wrangler logged in (OAuth, 22 Oct 2026).
- Vite on /mnt/c gets no file-change events: restart `npm run dev` after edits. `WPS_DEV_DATA=data/private/garden.json npm run dev` seeds the local dev DB with real data (local only; delete `.wrangler/dev/db-v4.sqlite` afterwards).
- Pinned: wrangler 4.151.3, jose 6.2.13, vite 5.4.21, vitest 2.1.9 (all deps exact).
- workerd crashes on the PC (native) → no `wrangler dev`; tests and `npm run dev` run the Worker in Node.
- GitHub: **https://github.com/mschemper/wedding-planner-suite** (private), `main` + tags v2–v8; Git Credential Manager. WSL push can hang: push from Windows.

## Platform

- Cloudflare Workers + Static Assets + D1 + Access, account `mschemper@gmail.com` (ID 57b28195dc1564bee550b665117db76c). Access team `sukursschemper.cloudflareaccess.com`, one-time PIN, allowed: Mark + Angela. D1 `wedding-planner` id 87b1c95c-7e87-4307-98a3-cac03d0a3937 (ENAM).
- Migrations applied: 0001–0005 (0005 on 23 Oct 2026); 0006 (vendors, timeline) on 9 Nov 2026. v3 tables (households, individuals, friends) still present; drop in a later migration (BACKLOG B5).
- Latest backup (before v11): `data/private/d1-backup-v10.sql` (9 Nov 2026, 698 INSERT rows); Time Travel bookmark before 0006: 0000003a-00000002-0000511f-e40f45be727f0598a37106786b869db1. Older backups + bookmarks: HISTORY.md.
- Deploy, rollback, re-seed: docs/DEPLOY.md.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
- Keep the GitHub repo current: push after every commit round.
