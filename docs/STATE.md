# Where things stand

**Read this first in a new session** (after AGENTS.md). It is the one file that says what is true right now. What isn't done yet is in `docs/BACKLOG.md`, how things got this way is in `docs/HISTORY.md`, and which files a change touches is in `docs/CODEMAP.md`. Update this at the end of any session that changes it.

Last updated: 21 October 2026 (v3 built: venue seasons, review fixes, mobile, platform plan).

## Version

| | |
|---|---|
| Current | **v3** (package.json 3.0.0, tag `v3`) — see CHANGELOG |
| Previous | v1 = single-file HTML Budget Studio in the claude.ai project "Wedding Planner Suite" (with the Reconciled Master .docx and the guest workbook) |
| Output | `dist\index.html`, built locally; Mark opens it from disk |

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

- PC: Windows, repo at `C:\Users\msche\Documents\Projects\wedding-planner-suite`. **Node on the PC is unverified** (built and tested in a cloud container on Node 22).
- Node missing, native: `winget install OpenJS.NodeJS.LTS`, then reopen the terminal. WSL: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`.
- GitHub remote: **none yet** (docs/GIT.md).

## Platform

- **Not chosen.** Requirements (Mark, 21 Oct): Angela uses it too; any device; edit data through our own UI (not a sheet); private link OK; free tier, low upkeep.
- Recommended: Cloudflare Pages + Functions + D1 + Access (docs/PLATFORMS.md). Fallback: our UI saving to a hidden Google Sheet via Apps Script.
- Waiting on Mark's "go" → v4 in a fresh session.

## Standing preferences (Mark)

- Usage first: size the work and choose the setup per docs/RELEASE.md without asking.
- Usage assessment at every handover; a row in docs/USAGE.md.
- Design options before visual changes.
- Real guest names stay out of git and out of summaries.
