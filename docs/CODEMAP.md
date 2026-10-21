# Code map: which files a change touches

Organised by the thing you're changing, not by folder.

| Change | Files | Gate / read first |
|---|---|---|
| A venue's price or line item | `src/data/scenarios.ts` | `src/data/golden.ts`, `tests/golden.test.ts`; HISTORY entry |
| A new venue | `scenarios.ts` (next id), `golden.ts` | DATA_MODEL "Budget" |
| A pricing rule (new line type, tax, contingency, warnings) | `src/engine/types.ts`, `src/engine/compute.ts` | `tests/engine.test.ts` |
| Guest schema / columns | `src/guests/schema.ts`, `validate.ts`, `data/fixtures/guests.sample.json` | DATA_MODEL "Guests"; `tests/guests.test.ts` |
| Attendance rates | `src/guests/attendance.ts` (`ACCEPTANCE`) | Reconciled Master §2.3; `tests/guests.test.ts` |
| Workbook import | `scripts/import-guests.ts`, `src/guests/parse.ts` | run against `data/private/guests.xlsx` |
| Real vs sample data loading | `src/guests/load.ts` | — |
| Home grid, best value, settings | `src/ui/App.tsx` `App`, `SettingsBar`, `GuestListPanel` | `npm run dev` |
| Detail page, compare | `src/ui/App.tsx` `DetailView` | `npm run dev` |
| Colours, type, layout | `src/ui/styles.css` (`:root` tokens) | AGENTS "Design rules" |
| Money formatting, months | `src/ui/format.ts` | — |
| Build output | `vite.config.ts`, `index.html` | `npm run build` → `dist/index.html` |
| Agent permissions | `.claude/settings.json` | — |
