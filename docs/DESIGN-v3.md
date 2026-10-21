# v3 design — one release on Cloudflare

Mark, 21 Oct 2026: "go the cloudflare + database route … consolidate updates into a single release on the new platform." Choices made in the same question round: **everything pending** goes into v3 (the refinements already committed, plus hosting, login, the guest editor, and the quotes/prices editor). He has an **existing Cloudflare account**. The address is a free **\*.workers.dev**. The build happens in a **fresh Claude Code session on the PC**.

Status: the refinements are committed (CHANGELOG v3, part 1). Everything below is to build. Nothing is deployed.

## 1. Platform (product choice)

| Need | Product | Notes |
|---|---|---|
| Host the React app | **Workers + Static Assets** | Cloudflare recommends this over Pages for new projects. The address is `<name>.<account>.workers.dev`. |
| Save API | Same Worker, `/api/*` | `run_worker_first: ["/api/*"]`; everything else is served from assets with SPA fallback |
| Database | **D1** (binding `DB`) | SQLite; migrations live in `migrations/` |
| Login | **Cloudflare Access** on the workers.dev URL **and preview URLs** | Email one-time PIN for Mark and Angela only. Verify the Zero Trust free-plan seat count at setup and record it in STATE. |
| Identity in code | `Cf-Access-Jwt-Assertion` validated in the Worker (team domain + AUD as vars) | Defence in depth: the API refuses requests without a valid Access JWT, even if Access is misconfigured |

Not used: KV, R2, Durable Objects, Pages. Two editors don't need per-entity coordination.

## 2. Data (D1)

Tables mirror `src/guests/schema.ts` (column names = workbook names). Every row gets `version INTEGER` and `updated_at TEXT` / `updated_by TEXT` (Access email).

| Table | Key | Purpose |
|---|---|---|
| households | HouseholdID | the workbook's Households sheet |
| individuals | PersonID | Individuals (FK HouseholdID) |
| friends | FriendGroupID | Friends |
| quotes | id (uuid) | scenario_id, item_desc (matches a LineItem `desc`) or `"*"` for an all-in total, amount, vendor, received_on, status (`requested`/`received`/`accepted`), notes |
| params | key | one row per `Params` field; value is JSON |
| audit | id | ts, who, table, row_id, op, before JSON, after JSON (last 1,000 kept) |

- **Concurrency:** every write sends the row's `version`. The server updates `WHERE version = ?` and returns 409 when the row has changed, and the UI shows "Angela changed this — reload". No silent overwrite.
- **Validation:** the API runs `validateGuests` (from `src/guests/validate.ts`, shared code) on the post-write state of that household or friend, and rejects on `error`.
- **Seed:** `scripts/seed-d1.ts` turns `data/private/guests.json` into SQL for `wrangler d1 execute --remote --file`. It's one-time. After that, D1 is the source of truth and the xlsx import is retired, except for the seed.
- **Export:** a button builds an xlsx client-side with SheetJS, in the same sheet layout as the workbook, as a backup.

## 3. API (Worker)

`GET /api/data` returns everything (guests, quotes, params, version map); it's one call because the data is small. `PUT/POST/DELETE /api/{households|individuals|friends|quotes|params}/:id`. `GET /api/audit?limit=50`. Responses are JSON. Errors are `{error, issues?}`. No CORS: same origin only.

## 4. Engine changes

- `ComputeOptions.quotes?: Quote[]`. A quote with `received`/`accepted` status replaces the matching row's amount. The row is marked `quoted: true` and shows a "quote" chip, with the variance against the estimate in the detail view. An `"*"` quote replaces the scenario total, for the benchmark venues.
- `SCENARIOS` comes from `buildScenarios(paramsFromDb)`. With no params in the DB, it falls back to `DEFAULT_PARAMS`.
- Golden tests run with no quotes and default params, so they're unchanged.

## 5. UI (new screens; palette and type unchanged)

- **Guests:** a household list grouped by Family and FamilySide, with filters from the workbook's Filter Guide (family side, adult/child, exceptions, locality, status, priority). Edit in a side panel. Add or remove a person or household. Inline errors from `validateGuests`. A partner/parent picker. A live forecast at the top. Export to xlsx.
- **Quotes:** per venue, a list of quotes, and an "add quote" button on any budget line.
- **Prices:** the `Params` form, with a "reset to doc values" button.
- **Budget Studio:** as now; reads from the API.
- **Navigation:** three tabs (Budget · Guests · Quotes & prices) in a header that works at 390 px.
- **Design options first** (AGENTS rule): two layout sketches for the Guests screen go to Mark before it's built.

## 6. Build plan (RELEASE.md: Large)

1. **The lead verifies the environment** (Node, `npx wrangler --version`, pinned versions) and reads this doc.
2. **One Opus design review** of this doc and the current code. The lead resolves its findings into this doc.
3. **Round 1 — shared data (the lead, or 1 Sonnet):** `wrangler.jsonc`, `worker/` (router, Access JWT check, API, validation reuse), `migrations/0001_init.sql`, `scripts/seed-d1.ts`, API tests (`@cloudflare/vitest-pool-workers`), and a client `api.ts`. Commit.
4. **Guests-screen design options to Mark** (one question round).
5. **Round 2 — up to 3 Sonnet builders on disjoint files:**
   - A: the Guests screen + xlsx export.
   - B: the Quotes & Prices screens + engine quote overrides + their tests.
   - C: the app shell, tabs, loading/error/409 states, Budget Studio reading from the API, offline build (`npm run build:offline` keeps the single-file page with the sample data).
6. **One Sonnet integration review.** Then `npm run check` plus the Worker tests.
7. **Deploy session** (fresh; RELEASE rule 12), with the steps in §7.

## 7. Deploy — what Mark does vs. Claude

| Step | Who |
|---|---|
| `npx wrangler login` (opens the browser; approve) | Mark clicks |
| `wrangler d1 create`, migrations, seed, `wrangler deploy` | Claude (PC session) |
| Zero Trust: confirm the free plan and team name. Access → protect the Worker's workers.dev URL + previews. Policy: Mark's and Angela's emails, one-time PIN. | Mark clicks, following steps the session gives him (the session can't sign in to the dashboard for him) |
| Set the `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` vars and redeploy | Claude |
| Check: open the URL, get the code by email, edit a test row, confirm 409 handling with two tabs | Mark + Claude |
| Angela: open the link, enter her email, get the code | Angela |

## 8. Risks

- **The workers.dev URL is treated as a personal/hobby site.** That fits this project, and Access still applies.
- **If Access isn't set up before the seed, the guest list is open to anyone with the link.** Order: deploy with no seed, then Access, then seed.
- **The free-tier limits for D1, Workers and Access must be checked on the day** and recorded in STATE.
- **Two editors, one row:** handled by the 409 rule. Merging edits is out of scope.
