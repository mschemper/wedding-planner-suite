# Code map: which files a change touches

Organised by the thing you're changing, not by folder.

| Change | Files | Gate / read first |
|---|---|---|
| A venue's price or line item | `src/data/scenarios.ts` | `src/data/golden.ts`, `tests/golden.test.ts`; HISTORY entry |
| A new venue | `scenarios.ts` (next id), `golden.ts` | DATA_MODEL "Budget" |
| A pricing rule (new line type, tax, contingency, warnings) | `src/engine/types.ts`, `src/engine/compute.ts` | `tests/engine.test.ts` |
| Money formatting | `src/ui/format.ts` | — |
| Personal costs (dress, photo, band, favors, florals base) | `src/data/params.ts` | golden must stay green |
| A venue's season calendar | `scenarios.ts` `seasons`/`docSeason`/`closedSeasons`/`seasonMinGuests`/`seasonSource` | `tests/engine.test.ts` "seasons"; season-dependent golden rows carry a date |
| Compare at matching bar tier | `src/engine/compute.ts` `matchOptions` | `tests/engine.test.ts` |
| Build output | `vite.config.ts`, `index.html` | `npm run build` → `dist/` (hosted); `npm run build:offline` → `dist-offline/index.html` |
| API route, auth, save rules | `worker/api.ts`, `worker/auth.ts`, `worker/write.ts` | `tests/worker.test.ts` |
| Quote overrides in the engine | `src/engine/compute.ts` | `tests/engine-quotes.test.ts` |
| Stored price params | `src/data/params.ts` `parseParamValue`/`mergeParams` | — |
| Cloudflare config | `wrangler.jsonc` | `npm run deploy:dry` |
| Agent permissions | `.claude/settings.json` | — |
| People model, enums | `src/people/types.ts` | DATA_MODEL "People" |
| Who is invited (household decision, kids policy, overrides) | `src/people/invite.ts` | `tests/people.test.ts` |
| Headcount, acceptance rates, capacity cutoff | `src/people/headcount.ts` | `tests/people.test.ts` |
| Relationship words | `src/people/kin.ts` | `tests/people.test.ts` "relation words" |
| Add relative, generation from links, parent suggestions, household move / merge | `src/people/relatives.ts`; UI `src/ui/people/RelativeSheet.tsx`, `Family.tsx` (tray), `HouseholdSheet.tsx` | `tests/people-v6.test.ts` |
| People validation (loops, partners, households) | `src/people/validate.ts` (also run by the Worker) | `tests/people.test.ts`, `tests/worker.test.ts` |
| Workbook import | `src/people/fromWorkbook.ts`, `scripts/import-v4.ts` | DESIGN-v4 §5; run against `data/private/guests-v4.xlsx` |
| Tasks grouping, paste format | `src/plan/tasks.ts` | `tests/plan.test.ts`; `docs/skills/email-sweep.md` |
| Must-have fit score | `src/plan/fit.ts` | `tests/plan.test.ts` |
| Venue summary (total, windows, capacity, fit) | `src/plan/venueSummary.ts`, `src/ui/compare.ts` | `tests/plan.test.ts` |
| Seeded venues / must-haves / fit / tasks | `src/data/seed-v4.ts` | `tests/worker.test.ts` |
| Settings (date windows, held date, kids policy) | `src/data/params.ts` `Settings` | `tests/plan.test.ts` |
| D1 schema / columns | `migrations/NNNN_*.sql` (new file), `worker/db.ts` `SPECS` | `tests/worker.test.ts` |
| Save rules (ids, partner mirror, deletes) | `worker/write.ts` | `tests/worker.test.ts` |
| API contract / client | `src/api/types.ts`, `src/api/client.ts` | — |
| Data in the UI, one-tap edit + Undo | `src/ui/data.tsx` (`useData`, `edit`, `useAudit`) | — |
| Shell, tabs, theme toggle | `src/ui/App.tsx`, `src/ui/nav.tsx`, `src/ui/prefs.ts`, `src/ui/usePrefs.tsx` | `npm run dev` |
| Colours, type, shared components | `src/ui/styles.css` (tokens), `src/ui/kit/kit.tsx`, `src/ui/garden/motifs.tsx` | `tests/contrast.test.ts`; AGENTS "Design rules" |
| Today tab | `src/ui/today/*` | `tests/plan-ui.test.ts` |
| Venues tab (shortlist, fit matrix, detail, quotes, assumptions) | `src/ui/venues/*` | `tests/venues-ui.test.ts` |
| People tab (room check, Decide rings, Family outline, Friends shortlist, household + person sheets, export) | `src/ui/people/*` | `tests/people-ui.test.ts` |
| Closeness tiers, rings, fill line | `src/people/tier.ts`, `src/people/rings.ts` | `tests/people-v5.test.ts` |
| Family outline tree | `src/people/outline.ts` | `tests/people-v5.test.ts` |
| Branch display names | `src/data/params.ts` `branchName` / settings `branchNames` | `tests/people-v5.test.ts` |
| Plan tab (tasks, paste, must-haves) | `src/ui/plan/*` | `tests/plan-ui.test.ts` |
| D1 seed | `scripts/seed-v4.ts`, `worker/seed.ts` | DESIGN-v4 §7.5 |
| Hidden ancestors (junctions), place by relation | `src/people/outline.ts`, `src/people/relatives.ts` `placeOps`; UI `src/ui/people/PlaceRelation.tsx`, `Family.tsx` | `tests/people-v7.test.ts` |
| Names with different surnames, friends' last names | `src/people/names.ts` | `tests/people-v7.test.ts` |
| Bulk edit on Decide | `src/ui/people/model.ts` `bulkEdit`, `Decide.tsx` | `tests/people-ui.test.ts` |
| Added venues (custom_venues), research | `src/data/custom.ts`, `worker/research.ts`, `worker/write.ts`, `src/ui/venues/AddVenue.tsx` | `tests/worker.test.ts`, `tests/engine.test.ts`, `tests/venues-ui.test.ts` |
| Theme (Prairie & Steel, v8) | `src/ui/styles.css`, `src/ui/garden/motifs.tsx`, `index.html` | `tests/contrast.test.ts`; docs/DESIGN-v8.md |
| Household card (household + people in one save) | `src/ui/people/HouseholdCard.tsx`, `HouseholdPicker.tsx`; logic `src/ui/people/model.ts` `cardOps` | `tests/people-ui.test.ts` "household card" |
| Household names follow people | `src/people/names.ts` `householdEnvelope`, `worker/write.ts` step 4b, `src/ui/people/NameTidy.tsx` | `tests/worker.test.ts` "household names", `tests/people-v7.test.ts` |
| Ask the planner | `worker/ask.ts` (/api/ask), `src/ui/ask/proposals.ts` (proposal → ops), `src/ui/ask/AskPanel.tsx` | `tests/ask.test.ts`, `tests/ask-ui.test.ts`, `tests/worker.test.ts` |
| Quote form checks (vendor, $0 reason) | `src/ui/venues/model.ts` `quoteIssue`, `QuoteForm.tsx` | `tests/venues-ui.test.ts` |
