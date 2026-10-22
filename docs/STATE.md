# Where things stand

**Read this first in a new session** (after AGENTS.md). It is the one file that says what is true right now. What isn't done yet is in `docs/BACKLOG.md`, how things got this way is in `docs/HISTORY.md`, and which files a change touches is in `docs/CODEMAP.md`. Update this at the end of any session that changes it.

Last updated: 21 October 2026 (v3 deployed and verified).

## Version

| | |
|---|---|
| Released | **v3** (tag `v3`, package.json 3.0.0): deployed, Access on, seeded, two-tab 409 check passed |
| Previous release | v2 (tag `v2`) |
| Previous | v1 = single-file HTML Budget Studio in the claude.ai project "Wedding Planner Suite" (with the Reconciled Master .docx and the guest workbook) |
| Output | Hosted: https://wedding-planner.wedding-planner-suite.workers.dev (Access login). Offline fallback: `dist-offline\index.html` (`npm run build:offline`), read-only. |

## The wedding (facts that drive the model)

| | |
|---|---|
| Couple | Mark & Angela |
| Date | **Likely Mar–May 2027, not fixed.** The Feb 13, 2027 Salt Shed (Three Top) plan was dropped. The app defaults to Sat Apr 24, 2027. |
| Season effects (venue pages, Oct 2026) | River Room peak from Apr 16 (100+ guests, $9k); Salvage One Apr +$1k, May +$3k; Morton May +$4k; Promontory May–Oct only. REVIEW-v3. |
| Venues being toured | Rockwell on the River (emailed 6 Oct 2026) — **not yet a scenario** (BACKLOG F1) |
| Music | Joel Paterson and Friends, confirmed, $2,000 |
| Venue contact on file | McKenzie Murphy |
| Pricing source | Reconciled Master v2.0 (11 Jun 2026); ±10–15% vs contracts |

## Guest data (from the last `npm run import:guests`)

| | |
|---|---|
| Workbook | `data/private/guests.xlsx` (gitignored) = `structured_guest_data_model 1 1.xlsx` |
| Households / individuals / friend groups | 21 / 45 / 0 |
| Mark / Angela | 30 / 15 |
| Adults / children | 32 / 13 |
| Locality known | 0 of 45 (all Unknown) |
| Graph edges (partner/parent) | 0 |
| Forecast | ~35 expected (local scenario) of 45 invited |
| Doc assumption | 88 family invitees (48 + 40) plus friends; Mark has also said ~55 households |

## Open quotes (Reconciled Master Part VI — none answered yet)

1. Three Top Lounge (16" On Center): site fee, Saturday F&B minimum
2. The Joinery: is a jazz combo allowed; bar tier prices
3. The Aquatorium: rental rate
4. El Conquistador: package rate
5. The Drake: Saturday minimum
6. Rockwell on the River (tour pending): Saturday rate by month, F&B minimum, outside catering allowed?, seated-with-dancing capacity. Events@Rockwellontheriver.com · 312-624-9164
7. Morton: are 2027 winter–spring packages valid on Saturdays?
8. The Joinery: confirm $9,500 Saturday (not published)

## Environment

- PC: Windows 10, repo at `C:\Users\msche\Documents\Projects\wedding-planner-suite`. Node 24.18, npm 11.16 (verified 21 Oct 2026). Git identity set repo-locally (Mark).
- Pinned: wrangler 4.151.3, jose 6.2.13, vite 5.4.21, vitest 2.1.9 (all deps exact).
- **workerd 2026-10-19 crashes on this PC** → no `wrangler dev`; tests and `npm run dev` run the Worker in Node (HISTORY v3). `wrangler deploy` bundling works: dry run OK, 90 KiB.
- Node missing, native: `winget install OpenJS.NodeJS.LTS`, then reopen the terminal. WSL: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`.
- GitHub remote: **none yet** (docs/GIT.md).

## Platform

- **Chosen (Mark, 21 Oct): Cloudflare Workers + Static Assets + D1 + Access**, free *.workers.dev, on his **existing Cloudflare account**. docs/DESIGN-v3.md.
- Deployed 21 Oct 2026. Account `mschemper@gmail.com` (ID 57b28195dc1564bee550b665117db76c). Access team `sukursschemper.cloudflareaccess.com`, one-time PIN, allowed: Mark + Angela. D1 `wedding-planner` id 87b1c95c-7e87-4307-98a3-cac03d0a3937 (ENAM).
- `wrangler.jsonc` holds the real vars; `preview_urls: false`. Unauthenticated `/` and `/api/data` redirect to the Access login (verified).
- Redeploy: `npm run build` then `npx wrangler deploy`. New migration: `npx wrangler d1 migrations apply DB --remote`. Re-seeding: `npm run seed:sql`, `wrangler d1 execute DB --remote --file data/private/seed.sql`, delete the file.
- Free-tier limits for D1/Workers/Access not re-checked on the day: confirm in the dashboard.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
