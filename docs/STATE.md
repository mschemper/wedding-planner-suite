# Where things stand

**Read this first in a new session** (after AGENTS.md). It is the one file that says what is true right now. What isn't done yet is in `docs/BACKLOG.md`, how things got this way is in `docs/HISTORY.md`, and which files a change touches is in `docs/CODEMAP.md`. Update this at the end of any session that changes it.

Last updated: 21 October 2026 (v3 part 2 built and committed; deploy = next session).

## Version

| | |
|---|---|
| Released | **v2** (tag `v2`) |
| In progress | **v3** (package.json 3.0.0, untagged). Part 1 + part 2 built and committed (Worker API, D1 schema, Access check, Guests / Quotes & Prices screens, tabs). **Next: deploy session** (DESIGN-v3 §7). Tag only when deployed and verified. |
| Previous | v1 = single-file HTML Budget Studio in the claude.ai project "Wedding Planner Suite" (with the Reconciled Master .docx and the guest workbook) |
| Output | Until deploy: `dist-offline\index.html` (`npm run build:offline`), opened from disk, read-only. Hosted build: `dist/` (Worker assets). |

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
- Not deployed. Account name, team domain, free-plan seat count, Worker URL, D1 database_id: fill in at the deploy session.
- `wrangler.jsonc`: Worker `wedding-planner`, D1 `wedding-planner` (placeholder id), `preview_urls: false`, vars ACCESS_TEAM_DOMAIN / ACCESS_AUD / ALLOWED_EMAILS empty (API refuses until set).
- Until v3 deploys, `dist-offline/index.html` from disk is the app.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
