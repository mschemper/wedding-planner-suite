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
| Real vs sample data (offline build only) | `src/guests/load.ts`, `vite.config.ts` `privateGuests` | — |
| Home grid, best value, settings | `src/ui/App.tsx` `App`, `SettingsBar`, `GuestListPanel` | `npm run dev` |
| Detail page, compare | `src/ui/App.tsx` `DetailView` | `npm run dev` |
| Colours, type, layout | `src/ui/styles.css` (`:root` tokens) | AGENTS "Design rules" |
| Money formatting | `src/ui/format.ts` | — |
| Personal costs (dress, photo, band, favors, florals base) | `src/data/params.ts` | golden must stay green |
| A venue's season calendar | `scenarios.ts` `seasons`/`docSeason`/`closedSeasons`/`seasonMinGuests`/`seasonSource` | `tests/engine.test.ts` "seasons"; season-dependent golden rows carry a date |
| Remembered settings (guests, date, contingency, open venue) | `src/ui/prefs.ts` (localStorage, try/catch) | — |
| Compare at matching bar tier | `src/engine/compute.ts` `matchOptions` | `tests/engine.test.ts` |
| Build output | `vite.config.ts`, `index.html` | `npm run build` → `dist/` (hosted); `npm run build:offline` → `dist-offline/index.html` |
| API route, auth, save rules | `worker/api.ts`, `worker/auth.ts`, `worker/write.ts` | `tests/worker.test.ts` |
| D1 schema / columns | `migrations/NNNN_*.sql` (new file), `worker/db.ts` TABLES + `normalize` | `tests/worker.test.ts` |
| API contract / client | `src/api/types.ts`, `src/api/client.ts` | — |
| Data in the UI (load, save, offline) | `src/ui/data.tsx` (`useData`), `src/ui/SaveError.tsx` | — |
| Tabs / shell | `src/ui/App.tsx`, `src/ui/nav.tsx` | `npm run dev` |
| Guests screen, xlsx export | `src/ui/guests/*` | `tests/guests-ops.test.ts` |
| Quote overrides in the engine | `src/engine/compute.ts` | `tests/engine-quotes.test.ts` |
| Quotes & Prices screens | `src/ui/quotes/*` | — |
| Stored price params | `src/data/params.ts` `parseParamValue`/`mergeParams` | — |
| D1 seed | `scripts/seed-d1.ts`, `worker/seed.ts` | DESIGN-v3 §7 |
| Cloudflare config | `wrangler.jsonc` | `npm run deploy:dry` |
| Agent permissions | `.claude/settings.json` | — |
