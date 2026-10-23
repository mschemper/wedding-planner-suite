# AGENTS.md -- Wedding Planner Suite (Mark & Angela). Agent entry point.
Index + hard rules. Detail lives in docs/: point, never copy. Facts that change (version, wedding date, guest counts, quotes, pending work) live ONLY in docs/STATE.md. CLAUDE.md imports this file.

## P0 -- order = precedence; overrides everything below
0. Written for agents, not humans: adherence + minimal tokens; imperative, terse, no rationale (-> docs/HISTORY.md), no duplication. Every edit keeps this form.
1. Ambiguous request -> ask clarifying questions (all in one call) before any work. Never guess-and-rebuild.
2. Fixes: no apology. State what changed: file, behaviour delta, what Mark should check.
3. Subagents on fitted models when cheaper at equal output: Haiku = search/sweeps/mechanical edits; Sonnet = routine code/tests; main = design, integration, final review. Release sizing: docs/RELEASE.md.
4. Tool calls: plan; batch independent calls; wait for ALL returns before reading any; dependents in next batch.
5. ADHD output mode always on (ayghri/i-have-adhd @839872f, MIT). Off only on "stop adhd mode"/"normal mode", that session only. Conflict -> P0 wins (P0.1 allows >1 question). Digest, apply every reply: first line = next action or answer; numbered steps, fewest that work; end with ONE <2-min next action; restate state ("step 3 of 5 done"); specific time estimates; show what now works; no preamble/recap/closer/tangents (offer separately); errors = cause + fix, no "uh oh"; lists max 5 visible; "explain" requests run long. Full rules docs/skills/i-have-adhd/SKILL.md: read only if the digest is unclear.

## What this is
Planning app for Mark & Angela's 2027 wedding, hosted on Cloudflare (Workers + Static Assets + D1 + Access): https://wedding-planner.wedding-planner-suite.workers.dev. v8 look Prairie & Steel (docs/DESIGN-v8.md): tabs Today, Venues (shortlist, budget per venue, must-have fit, quotes), People (household invite decisions, family garden, friends, envelopes), Plan (tasks, must-haves). Budget engine prices 18 scenarios by guest count, date (venue seasons), options, quotes (source: Reconciled Master v2.0 + venue pages). Offline build = read-only budget.

## Session start (in order)
0. Cowork only: repo not mounted -> device_request_folder_access C:\Users\msche\Documents\Projects\wedding-planner-suite.
1. Verify environment, never assume: `node -v` (>=22.13; node:sqlite), `npm -v`, `git status`. No node_modules -> `npm ci`. Node missing -> tell Mark the one command (docs/STATE.md "Environment"), stop.
2. docs/STATE.md -- what is true now.
3. docs/BACKLOG.md -- open requests + bugs; plan from here.
4. docs/RELEASE.md -- usage-first sizing (incl. subagents) without asking Mark, then its checklist, traps, docs hygiene. Follow all.
5. Read on demand only, not at start: docs/CODEMAP.md (files per subject; task touches unfamiliar files), docs/GIT.md (before push/bundle), docs/DEPLOY.md (deploy session), docs/CHANGELOG.md + CHANGELOG-archive.md (write at release; read only to look up a past change), docs/USAGE.md (write at release).
6. Before changing pricing or guests: docs/DATA_MODEL.md; findings behind current code: docs/REVIEW-v3.md, docs/REVIEW-v2.md. Hosting plans: docs/PLATFORMS.md. Old rationale, old backups, release log: docs/HISTORY.md.
7. Design/review docs are history unless the task names them. Current look = docs/DESIGN-v8.md. Others (DESIGN-v3/v4/v5/v7, REVIEW-v4-people/v6): index in docs/HISTORY.md "Release log".

## Architecture constraints
- `src/engine/`, `src/people/`, `src/plan/` pure TS: no React, no I/O. UI never computes money, headcount or relationships.
- Scenarios = data (`src/data/scenarios.ts`). Oracle = `src/data/golden.ts` (Reconciled Master totals, +/-$30). Venue shortlist/status lives ONLY in D1 `venues`.
- Price change -> golden.ts + HISTORY.md entry with source. New line-item type -> engine test + golden coverage. Unpriced venue -> `priced: false`.
- Personal costs only via `src/data/params.ts` `Params`. Shared settings (dateWindows, heldDate, kidsPolicy) = `Settings`, same D1 `params` table.
- Venue seasons: `Scenario.seasons` from the venue's own page; cite in `seasonSource`; `docSeason` keeps golden on the doc's assumption. Golden rows that depend on season carry a date.
- People model (DESIGN-v4 §3): invite decision per party (household); kids via `kidsPolicy` + party `kids`; person `override` only for exceptions. Effective invite = `src/people/invite.ts`; headcount = `src/people/headcount.ts`.
- Workbook import only via `npm run import:v4` (src/people/fromWorkbook.ts). Workbook columns never drive the UI.
- Two builds: hosted `dist/` (Worker assets; data only via /api) and offline `dist-offline/index.html` (singlefile, read-only budget, no CDN, no fetch). Neither bundles data/private (vite `noPrivate`).
- Worker: `worker/` pure handler; one save = one D1 batch (`POST /api/write`); never write D1 outside it. Table specs `worker/db.ts SPECS`; contract `src/api/types.ts`; UI reads only `useData()` (src/ui/data.tsx); one-tap edits via `edit()` (Undo).
- New D1 column/table -> new migration file + `SPECS` + tests/worker.test.ts. Never edit an applied migration. Migrations are add-only; latest = 0005 (docs/STATE.md). v3 tables drop in a later migration (BACKLOG B5).
- Exact dependency versions. SheetJS from cdn.sheetjs.com tarball (npm `xlsx` frozen at CVE'd 0.18.5).

## Build and release
- Gate: `npm run check` (typecheck + tests incl. Worker + both builds, ~15 s) before any behaviour-changing commit.
- Dev: `npm run dev` (UI + local /api on .wrangler/dev/db.sqlite, synthetic data; delete that folder to reset). Engine vs doc: `npm test -- golden`.
- Release: docs/RELEASE.md checklist -> bump package.json, `git tag -a vN -m vN`, CHANGELOG + STATE + BACKLOG + USAGE row.
- Deploy: docs/DEPLOY.md (backup → migrate → seed → build → deploy → verify; rollback).
- Cloudflare work: load skills `cloudflare:wrangler`, `cloudflare:workers-best-practices`, `cloudflare:cloudflare-one` (Access) if available. Never ask Mark for an API token in chat; `wrangler login` in his browser.
- Never print or commit Access AUD/team secrets beyond wrangler vars; never commit `.wrangler/` or `.dev.vars`.
- Time estimates to Mark: Sonnet subagent ~25-30 min each, even in parallel.

## Design rules
- Prairie & Steel look (DESIGN-v8). Colours only as tokens in `src/ui/styles.css` `:root` (day) + dusk set; never literal colours in components. Text colours: `--ink`, `--muted`, `--*-ink` only; `tests/contrast.test.ts` gates AA.
- Josefin Sans headings + body (DESIGN-v8 Type); 16px body, 13px floor.
- Shared primitives `src/ui/kit/kit.tsx` and motifs `src/ui/garden/motifs.tsx` are lead-owned: compose, don't restyle. Screen CSS lives in the screen's own folder.
- State never by colour alone (Bloom shapes, verdict icons + text). Touch targets >= 44px. 360px wide works; tabs become a bottom bar < 640px.
- Every estimate shows its uncertainty: confidence %, ranges, understatement, extrapolation (≈). Unpriced venues say so.
- Dimmed / flagged venue = cannot host the count or date (`Budget.unavailable`) or over capacity. Never hide a scenario (Archive keeps them).
- Show design options before building visual changes.
- UI release QA: 2-3 headless-Chrome screenshots (day, dusk, 360px) of changed screens; tests miss crashes and layout.

## Private data
- Real guest data ONLY in `data/private/` (gitignored: workbook, garden.json, import-review.json, seed SQL, D1 backups) and in D1. Never commit, paste into docs, tests, fixtures, commit messages or chat summaries beyond counts.
- Tests use synthetic fixtures (`data/fixtures/garden.sample.json`, `guests.sample.json`).
- No addresses, phone numbers or emails for guests until a plan for them is in docs/DATA_MODEL.md. Vendor business contacts are fine.

## Known pitfalls (detail at the link)
- exceljs cannot read the workbook (x: namespace) -- REVIEW-v2.md G-05.
- tsx <4.20 breaks on `module-sync` exports in exceljs deps -- HISTORY.md v2.
- Source doc arithmetic error at Three Top @125 -- REVIEW-v2.md F-03; golden uses line-item sums.
- Data-point lines extrapolate past the source (≈) -- treat those figures as soft. REVIEW-v2.md F-04.
- Hooks after an early return crashed v1 -- keep all hooks above early returns in every component.
- Controlled number input that rejects keystrokes cannot be typed into -- edit a draft, commit on blur/Enter (REVIEW-v3 R1).
- workerd crashes on Mark's PC: no `wrangler dev`/`wrangler types`/vitest-pool-workers; Worker runs in Node via scripts/d1-sqlite.ts -- HISTORY.md v3.
- npm 11 skips postinstall scripts: if a wrangler command needs workerd, `node node_modules/workerd/install.js`.
- `gitignore` `node_modules/` misses a symlinked node_modules (worktrees) -- pattern is `node_modules`.
- Shell quoting slips (nested quotes, heredocs) cost retries and hang: write scripts to files, or use Edit; pass paths.
- WSL `git push` can hang on credentials: push from Windows PowerShell.
- Vite on /mnt/c misses file changes: restart `npm run dev` after edits (BACKLOG B8).
- Hotfix while a release is open: worktree off main (RELEASE.md "Hotfix").

## Environment
- PC: Claude Code native Windows (claude-here.cmd, PowerShell) or WSL (start-claude.cmd). Repo C:\Users\msche\Documents\Projects\wedding-planner-suite; WSL /mnt/c/Users/msche/Documents/Projects/wedding-planner-suite. Edit, gate, commit in place.
- node_modules is per-OS: switching native <-> WSL -> `npm ci`.
- GitHub: see docs/GIT.md. After each commit round, `git push origin main --tags` once the remote exists. Never force-push.
- Cowork fallback: repo = device $HOME/mnt/Documents/Projects/wedding-planner-suite; device_request_delete_permission before first git write (lock files); develop in cloud container; return work as git bundle (docs/GIT.md); cannot push.

## Definition of done
Update docs/STATE.md (+ BACKLOG.md if changed) and, for a release, docs/CHANGELOG.md + docs/USAGE.md row (<=200 chars); docs hygiene per RELEASE.md (tests/docs.test.ts gates it); `npm run check` green; commit; push if remote exists; handover = usage assessment (RELEASE.md rule 10).
