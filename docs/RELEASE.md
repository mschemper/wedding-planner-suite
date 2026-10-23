# Cutting a release

## Usage first (Mark's standing rule, carried from bauhaus-dashboard)

**Follow this without asking Mark which approach to take.** Minimise usage, even when it takes longer, and keep the release safe. Size the work, then use the matching setup.

| Size | What it is | Setup |
|---|---|---|
| **XS / Small** (most) | backlog bug, a price update, a tweak, docs | One session, **no subagents**. If the session is on Opus, say once at the start that a Sonnet session would cost less for this size. |
| **Medium** | a feature inside the budget or guest module (F4, F6 data layer) | One session. Subagents only when the work splits into **disjoint files**: at most **2**, on **Sonnet**. |
| **Large** | a new surface (guest UI + graph, quote tracker + params) | Opus lead for the design, **one Opus design review**, then the **shared data layer first**, then at most **3 Sonnet builders** in parallel, then **one Sonnet integration review**. |

Rules for every size:

1. **Decide before building.** Anything uncertain whose answer changes the work goes to Mark in ONE AskUserQuestion round.
2. **Shared data before its consumers.** Engine/guest-layer changes and their tests land before the UI that reads them.
3. **Subagent briefs are exact:** the files it may edit (disjoint from other agents), the types/contract it codes against, its gate, "do not commit", and what to report. Only the lead runs `npm run check` once everyone is back.
4. **Opus subagents only for the design review.** Builders, fixers, docs and the integration review use Sonnet; sweeps use Haiku.
5. **Integration review only when two or more builders touched shared code.**
6. **Check cheaply.** During development, run the one relevant test file (`npm test -- golden|engine|guests`), then `npm run check` once before committing. UI release: 2-3 headless-Chrome screenshots (day, dusk, 360px) of the changed screens, not every state; tests missed a crash in v7.
7. **One release per session.** Start the next one in a fresh session; the repo docs carry the context.
8. **Protect the work.** Commit after each round of subagents and before any long step.
9. **Keep the progress list current** (TaskCreate/TaskUpdate).
10. **Report usage at every handover.** Same row goes in `docs/USAGE.md`: size and setup used; the lead's model; each subagent's job, model and tokens (`subagent_tokens`); the subagent total and how much of it was rework (the lead's own tokens can't be measured, so say that); anything that cost more than it should; a one-line verdict. **Row <= 200 characters**: numbers and verdict, no narrative.
11. **Split a wide request.** More than ~5 builders' worth of work, or more than one data layer, → two releases.

## Checklist

1. `git status` is clean, or holds only this release's work.
2. `npm run check` is green.
3. Bump `package.json` "version" to `N.0.0` (releases are integers: v2, v3, …).
4. Add a `docs/CHANGELOG.md` top section `## vN - <title> (<date>)`.
5. Update `docs/STATE.md` "Version" and the facts that changed; update `docs/BACKLOG.md`.
6. Add a `docs/USAGE.md` row.
7. Docs hygiene (below).
8. `git add -A && git commit` (message `vN: <title>`), then `git tag -a vN -m vN`.
9. Push if the remote exists (docs/GIT.md).
10. Hand over: the path to `dist\index.html`, what to look at, and the usage assessment.

## Docs hygiene (every release; `tests/docs.test.ts` gates the measurable parts)

1. `docs/STATE.md`: current + previous release rows only; latest backup only; move the rest to `docs/HISTORY.md` "Release log". Size budget in the test.
2. `docs/CHANGELOG.md`: last two releases only; move the oldest to `docs/CHANGELOG-archive.md`.
3. `docs/BACKLOG.md`: delete shipped items, set "Last reviewed" to today and the shipped version.
4. `AGENTS.md`: no per-release facts (version, look, migration number); point to STATE/DESIGN. Fix any line the release made false (look, fonts, migrations, deploy).
5. New session-start doc -> justify in AGENTS "Session start"; default is read on demand.
6. Deploy steps live only in `docs/DEPLOY.md`; update it when the procedure changes.
7. Recurring slip in a USAGE "Rework" cell -> add one line to AGENTS "Known pitfalls".

## Hotfix while a release is open
1. `git worktree add ../wps-hotfix main`; fix + test there (do not touch the release checkout).
2. Worktree `node_modules`: `npm ci` inside it (a symlink escapes `.gitignore`; pattern is `node_modules`).
3. Commit on main, deploy per docs/DEPLOY.md, merge main into the release branch, `git worktree remove ../wps-hotfix`.

## The traps

1. **Building with `data/private/` present embeds real names in `dist/`.** dist is gitignored; never attach it anywhere public.
2. **A stale `data/private/guests.json`.** The app reads the JSON, not the xlsx. After editing the workbook, re-import.
3. **Golden drift.** Never widen `GOLDEN_TOLERANCE` to make a test pass; find the line that moved.
4. **node_modules from the other OS** (native ↔ WSL) fails in odd ways. Run `npm ci`.
5. **`npm install <pkg>` without a version.** Pin exact versions.
