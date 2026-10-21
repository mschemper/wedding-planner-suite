# AGENTS.md -- Wedding Planner Suite (Mark & Angela). Agent entry point.
Index + hard rules. Detail lives in docs/: point, never copy. Facts that change (version, wedding date, guest counts, quotes, pending work) live ONLY in docs/STATE.md. CLAUDE.md imports this file.

## P0 -- order = precedence; overrides everything below
0. Written for agents, not humans: adherence + minimal tokens; imperative, terse, no rationale (-> docs/HISTORY.md), no duplication. Every edit keeps this form.
1. Ambiguous request -> ask clarifying questions (all in one call) before any work. Never guess-and-rebuild.
2. Fixes: no apology. State what changed: file, behaviour delta, what Mark should check.
3. Subagents on fitted models when cheaper at equal output: Haiku = search/sweeps/mechanical edits; Sonnet = routine code/tests; main = design, integration, final review. Release sizing: docs/RELEASE.md.
4. Tool calls: plan; batch independent calls; wait for ALL returns before reading any; dependents in next batch.
5. ADHD output mode always on: read + follow docs/skills/i-have-adhd/SKILL.md at session start (ayghri/i-have-adhd @839872f, MIT). Off only on "stop adhd mode"/"normal mode", that session only. Conflict -> P0 wins (P0.1 allows >1 question).

## What this is
Planning tools for Mark & Angela's 2027 wedding. Budget Studio: 16 venue scenarios priced by guest count, bar tier, wedding date (venue seasons), contingency (source: Reconciled Master v2.0, June 2026). Guest data layer: workbook import, validation, attendance forecast feeding the guest count. One self-contained page (`dist/index.html`), opens from disk; no server, no hosting.

## Session start (in order)
0. Cowork only: repo not mounted -> device_request_folder_access C:\Users\msche\Documents\Projects\wedding-planner-suite.
1. Verify environment, never assume: `node -v` (>=20), `npm -v`, `git status`. No node_modules -> `npm ci`. Node missing -> tell Mark the one command (docs/STATE.md "Environment"), stop.
2. docs/STATE.md -- what is true now.
3. docs/BACKLOG.md -- open requests + bugs; plan from here. docs/CODEMAP.md -- files per subject.
4. docs/RELEASE.md -- usage-first sizing (incl. subagents) without asking Mark, then its checklist and traps. Follow both.
5. docs/GIT.md -- repository, GitHub. docs/CHANGELOG.md -- per-release changes.
6. Before changing pricing or guests: docs/DATA_MODEL.md; findings behind current code: docs/REVIEW-v3.md, docs/REVIEW-v2.md. Hosting plans: docs/PLATFORMS.md. Old rationale: docs/HISTORY.md.

## Architecture constraints
- `src/engine/` pure TS: no React, no I/O. UI never computes money.
- Scenarios = data (`src/data/scenarios.ts`). Oracle = `src/data/golden.ts` (Reconciled Master totals, +/-$30).
- Price change -> golden.ts + HISTORY.md entry with source. New line-item type -> engine test + golden coverage.
- Personal costs only via `src/data/params.ts`. Venue seasons: `Scenario.seasons` from the venue's own page; cite in `seasonSource`; `docSeason` keeps golden on the doc's assumption.
- Golden rows that depend on season carry a date.
- Guest column names identical to the workbook. Import only via `npm run import:guests`.
- Build = Vite + vite-plugin-singlefile -> one file. No CDN, no runtime fetch.
- Exact dependency versions. SheetJS from cdn.sheetjs.com tarball (npm `xlsx` frozen at CVE'd 0.18.5).

## Build and release
- Gate: `npm run check` (typecheck + tests + build, ~10 s) before any behaviour-changing commit.
- Dev: `npm run dev`. Engine vs doc: `npm test -- golden`.
- Release: docs/RELEASE.md checklist -> bump package.json, `git tag -a vN -m vN`, CHANGELOG + STATE + BACKLOG + USAGE row.
- Hand Mark `dist\index.html` path; he opens it. Nothing to deploy.
- Time estimates to Mark: Sonnet subagent ~25-30 min each, even in parallel.

## Design rules
- Palette tokens only via `:root` in src/ui/styles.css (cream ground, burnt, teal, mustard, avocado). Palatino headings, Helvetica body. Preserve.
- Dimmed card = venue cannot host the count or that date (`Budget.unavailable`). Never hide a scenario.
- Text colours: `--*-ink` tokens only (WCAG AA on cream); fills keep the base tokens.
- Every estimate shows its uncertainty: confidence %, ranges, understatement, extrapolation (≈).
- Show design options before building visual changes.

## Private data
- Real guest data ONLY in `data/private/` (gitignored). Never commit, paste into docs, tests, fixtures, commit messages or chat summaries beyond counts.
- Tests use `data/fixtures/guests.sample.json` (synthetic).
- `dist/` built with private data contains real names: gitignored, never commit or publish.
- No addresses, phone numbers or emails in the workbook until a plan for them is in docs/DATA_MODEL.md.

## Known pitfalls (detail at the link)
- exceljs cannot read the workbook (x: namespace) -- REVIEW-v2.md G-05.
- tsx <4.20 breaks on `module-sync` exports in exceljs deps -- HISTORY.md v2.
- Source doc arithmetic error at Three Top @125 -- REVIEW-v2.md F-03; golden uses line-item sums.
- Data-point lines extrapolate past the source (≈) -- treat those figures as soft. REVIEW-v2.md F-04.
- Hooks after an early return crashed v1 -- keep all hooks above returns in src/ui/App.tsx.
- Controlled number input that rejects keystrokes cannot be typed into -- edit a draft, commit on blur/Enter (REVIEW-v3 R1).
- `gitignore` `node_modules/` misses a symlinked node_modules (worktrees) -- pattern is `node_modules`.

## Environment
- PC: Claude Code native Windows (claude-here.cmd, PowerShell) or WSL (start-claude.cmd). Repo C:\Users\msche\Documents\Projects\wedding-planner-suite; WSL /mnt/c/Users/msche/Documents/Projects/wedding-planner-suite. Edit, gate, commit in place.
- node_modules is per-OS: switching native <-> WSL -> `npm ci`.
- GitHub: see docs/GIT.md. After each commit round, `git push origin main --tags` once the remote exists. Never force-push.
- Cowork fallback: repo = device $HOME/mnt/Documents/Projects/wedding-planner-suite; device_request_delete_permission before first git write (lock files); develop in cloud container; return work as git bundle (docs/GIT.md); cannot push.

## Definition of done
Update docs/STATE.md (+ BACKLOG.md if changed) and, for a release, docs/CHANGELOG.md + docs/USAGE.md row; `npm run check` green; commit; push if remote exists; handover = usage assessment (RELEASE.md rule 10).
