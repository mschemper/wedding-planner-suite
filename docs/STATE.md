# Where things stand

**Read this first in a new session** (after AGENTS.md). It is the one file that says what is true right now. What isn't done yet is in `docs/BACKLOG.md`, how things got this way is in `docs/HISTORY.md`, and which files a change touches is in `docs/CODEMAP.md`. Update this at the end of any session that changes it.

Last updated: 23 October 2026 (v8 deployed).

## Version

| | |
|---|---|
| Released | **v8** (tag `v8`, package.json 8.0.0): household card, names follow people, Prairie & Steel look, Ask the planner. Deployed 23 Oct 2026, Worker version 13029a97-51d7-4ada-b654-15a29db6458a at 100%; migration 0005 applied (57 households automatic); unauthenticated `/`, `/api/version`, `/api/ask` → Access login (verified); signed-in `/api/version` = 8.0.0 not checked (needs Mark signed in). Ask + research need `ANTHROPIC_API_KEY` |
| Hotfix on v7 | 23 Oct 2026: research line repair (commit dd4d6f1 on main), Worker version 905d2070-023d-4dae-b1f1-b0c7b2d986d6 |
| Previous release | **v7** (tag `v7`, package.json 7.0.0): Conservatory look, hidden ancestors, adults vs kids, Add venue research, bulk edit. Deployed 22 Oct 2026, Worker version 66408ed9-8730-4dc2-9c89-842225e14794 at 100%; migration 0004 applied; unauthenticated `/` and `/api/version` → Access login (verified); signed-in `/api/version` = 7.0.0 not checked (needs Mark signed in). Research needs `ANTHROPIC_API_KEY` (BACKLOG P2) |
| Older | **v6 Easy people + review fixes** (tag `v6`, package.json 6.0.0, no migration): deployed 22 Oct 2026, Worker version 71d3393a-39b8-4e14-8af6-d32005c4755e at 100%; unauthenticated `/` and `/api/version` → Access login (verified); signed-in `/api/version` = 6.0.0 not yet checked (needs Mark signed in) |
| Previous release | v5 People tab (tag `v5`). Rollback = check out `v5`, `npm run build`, `npx wrangler deploy` (no schema change in v6) |
| Older | **v5 People tab** (tag `v5`, package.json 5.0.0): deployed 22 Oct 2026, Worker version 61f32257-13b4-4638-8707-9b4d895e2452; signed-in `/api/version` = 5.0.0; unauthenticated `/` → Access login (verified) |
| Older | v4 "Garden" (tag `v4`). Rollback = check out `v4`, `npm run build`, `npx wrangler deploy` (0003 columns are additive; v4 ignores them) |
| Output | Hosted: https://wedding-planner.wedding-planner-suite.workers.dev (Access login). Offline: `dist-offline\index.html` (`npm run build:offline`), read-only budget only. |
| Design | docs/DESIGN-v4.md, docs/DESIGN-v5.md (People), reviews docs/REVIEW-v4-people.md, docs/REVIEW-v6.md; mockups docs/mockups/ |

## The wedding (facts that drive the model)

| | |
|---|---|
| Couple | Mark & Angela |
| Date | **Flexible. Late spring (May 1 – Jun 30, 2027) or early fall (Sep 1 – Oct 31, 2027)** (Mark, 21 Oct). Settings `dateWindows` (refs Sat Jun 12, Sat Sep 18). |
| Held | **Firehouse Chicago, Sat Jun 12, 2027**, placed after the 20 Oct tour, pending the previous couple's answer (`heldDate`). |
| Shortlist (D1 `venues.active`) | Firehouse Chicago (held), Ravenswood Event Center (no published prices), River Room at Burning Bush Brewery, The Joinery. All others archived. |
| Firehouse facts | Official 15-hour package: Sat $11,000 Nov–May, $12,000 Jun–Oct; seated 82 adults, cocktail 100; Bunk Room $500, up to 20 kids (Mark, 22 Oct); approved caterers; no valet (lot one block away); fetched 21 Oct 2026. F&B minimum, fees, 2027 availability unknown. |
| Kids | Parallel supervised kids' party upstairs ("Sylvie's party"); kids policy default "our kids only", households can override. |
| Music | Joel Paterson and Friends $2,000 in the model; no contract in email; Firehouse timeline assumes a DJ (task T009). |
| Pricing source | Reconciled Master v2.0 (11 Jun 2026) + venue pages (Oct 2026); ±10–15% vs contracts |

## Guest data (D1 is the source of truth; seeded 22 Oct 2026 from `npm run import:v4`)

**Live, 22 Oct 2026 evening (REVIEW-v6 §2):** 121 people, 56 households; decisions invite 46 · if room 3 · undecided 7. 44 relatives not placed in the tree; locality unknown for 113 of 117 guests. The seed-time table below is history.


| | |
|---|---|
| Workbook | `G:\My Drive\Wedding Planner\wedding_guest_data_comprehensive_v4.xlsx` (21 Oct 23:33) → `data/private/guests-v4.xlsx` (gitignored) |
| People | 115 (+ 4 tree-only grandparent placeholders): 2 couple, 93 family, 20 friends; 3 deceased; 11 unnamed kids now a household count (0003) |
| Households (parties) | 55 (45 family + 10 friend groups) |
| Decisions at seed | invite 36 heads (23 adults / 13 kids' room) · if room 0 · undecided 85 heads (42 households) · no 0 |
| Live headcount at seed | ≈ 28 expected of 36 invited; ≈ 95 if the undecided are invited (default pricing basis) |
| Tree | 45 people linked to parents; 23 cousins not linked yet (set in the garden); review list `data/private/import-review.json` |
| v3 → v4 count | v3 116 invited / 91 expected; v4 considered 121 / 95 (+10 friend partners split, −2 couple, −3 deceased) |

## Quotes

- **Firehouse live quotes to delete (Mark, in the app):** Tax + service $0, Event insurance $0, Photography $500 (entered 22 Oct 07:27, no vendor; Mark confirmed test taps). They lower the Firehouse total ≈ $7,600 at 75 guests. Venues → Firehouse → Quotes → delete each.
- Quote documents: Google Drive folder https://drive.google.com/drive/folders/1HWECgGPfEdzSJ6sazixw2Rp3WB9xG2vn (22 Oct: The Joinery Chicago.pdf). Quotes-from-email plan: REVIEW-v6 §4 (BACKLOG F18–F20).
- Joinery visit: Fri 30 Oct 2026 12:30 (Mark confirmed by email 22 Oct).

## Open questions to venues (tasks in the app)

1. Firehouse: when does the Jun 12 hold resolve; seated cap with kids upstairs; caterer + DJ rules; valet.
2. Ravenswood Event Center: rate sheet, F&B minimum, catering/bar policy, 2027 dates (no official site found).
3. River Room: book a tour (Calendly) or drop; 2026/27 pricing not published.
4. The Joinery: confirm visit; jazz combo allowed; $9,500 Saturday not published.
5. Rockwell on the River, Salt Shed: tell them you're passing.

## Environment

- PC: Windows 10, repo `C:\Users\msche\Documents\Projects\wedding-planner-suite` = WSL `/mnt/c/Users/msche/Documents/Projects/wedding-planner-suite`. Git identity repo-local (Mark).
- **WSL (v4 built + deployed here):** Node 24.18 in `~/.local/node/current/bin` (no sudo; `export PATH="$HOME/.local/node/current/bin:$PATH"`); node_modules = **Linux** copy. Native Windows session → `npm ci` first.
- WSL: wrangler logged in (OAuth, 22 Oct 2026). Vite on /mnt/c gets no file-change events: restart `npm run dev` after edits. `WPS_DEV_DATA=data/private/garden.json npm run dev` seeds the local dev DB with real data (local only; delete `.wrangler/dev/db-v4.sqlite` afterwards).
- Pinned: wrangler 4.151.3, jose 6.2.13, vite 5.4.21, vitest 2.1.9 (all deps exact).
- workerd crashes on the PC (native) → no `wrangler dev`; tests and `npm run dev` run the Worker in Node.
- GitHub: **https://github.com/mschemper/wedding-planner-suite** (private), `main` + tags v2–v4; Git Credential Manager pushes from WSL.

## Platform

- Cloudflare Workers + Static Assets + D1 + Access, account `mschemper@gmail.com` (ID 57b28195dc1564bee550b665117db76c). Access team `sukursschemper.cloudflareaccess.com`, one-time PIN, allowed: Mark + Angela. D1 `wedding-planner` id 87b1c95c-7e87-4307-98a3-cac03d0a3937 (ENAM).
- Migrations applied: 0001–0005 (0005 on 23 Oct 2026). v3 tables (households, individuals, friends) still present; drop in a later migration (BACKLOG B5).
- Friend tiers set on live from the workbook InviteTier (A→Must, B→Want, C→Nice to have), 22 Oct 2026.
- Backup before v4: `data/private/d1-backup-v3.sql`; bookmark before 0002: `00000007-00000000-0000510c-d6a1322583093461991a98ead97e221a`.
- Backup before v8: `data/private/d1-backup-v7.sql` (23 Oct 2026). Rollback: check out `v7`, build, deploy (0005 is add-only; v7 ignores name_custom).
- Backup before v7: `data/private/d1-backup-v6.sql` (22 Oct 2026). Rollback: check out `v6`, build, deploy (0004 is add-only; v6 ignores custom_venues).
- Backup before v6: `data/private/d1-backup-v5.sql` (22 Oct 2026).
- Backup before v5: `data/private/d1-backup-v4.sql` (7 in-app edits); bookmark before 0003: `0000000f-00000000-0000510c-4f239d5944ea229ba0af44ddc16553e8`.
- Redeploy: `npm run build` then `npx wrangler deploy`. New migration: `npx wrangler d1 migrations apply DB --remote`. Re-seed people: `npm run import:v4`, `npm run seed:v4 -- --replace`, `wrangler d1 execute DB --remote --file data/private/seed-v4.sql`, delete the file (replace wipes in-app edits: export first).
- Free-tier limits for D1/Workers/Access not re-checked: confirm in the dashboard.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
- Keep the GitHub repo current: push after every commit round.
