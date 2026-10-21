# Wedding Planner Suite

Mark & Angela, 2027 wedding (spring, likely Mar–May). Budget studio + guest data layer. Vite + React 18 + TS, Vitest, single-file build.

## Commands
- `npm run dev` — local server
- `npm run check` — typecheck + tests + build. Run before every commit.
- `npm run import:guests -- <xlsx>` — workbook → `data/private/guests.json`
- `npm test -- golden` — engine vs Reconciled Master totals

## Layout
- `src/engine/` — pure pricing. No React, no I/O.
- `src/data/scenarios.ts` — 16 scenarios. Source: Reconciled Master v2.0.
- `src/data/golden.ts` — doc totals. Test oracle.
- `src/guests/` — schema, parse, validate, attendance, load.
- `src/ui/` — React. Presentation only.
- `scripts/` — Node CLIs.
- `docs/` — REVIEW (findings), ROADMAP, HISTORY (rationale), RELEASE (sizing), DATA_MODEL.

## Rules
- Engine stays pure; UI never computes money.
- Change a price → update `golden.ts` + `docs/HISTORY.md` entry with source. Golden tolerance stays ±$30.
- New line-item type → engine test + golden coverage.
- Real guest data lives only in `data/private/` (gitignored). Never commit, never paste into docs, tests, or fixtures. Tests use `data/fixtures/`.
- `dist/` may contain real names; never commit.
- Keep column names identical to the workbook.
- Pin exact dependency versions.
- Preserve palette tokens in `src/ui/styles.css`.
- Rationale goes in `docs/HISTORY.md`, not here.

## Subagents
- Haiku: search, sweeps, mechanical edits.
- Sonnet: routine code, tests.
- Main: design, integration, final review.
- Sizing: `docs/RELEASE.md`.

## Handover
End larger work with a usage assessment: size, setup, subagent jobs/models/tokens, rework, verdict.
