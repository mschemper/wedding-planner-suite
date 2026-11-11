# v3 design — one release on Cloudflare

Mark, 21 Oct 2026: "go the cloudflare + database route … consolidate updates into a single release on the new platform." Choices made in the same question round: **everything pending** goes into v3 (the refinements already committed, plus hosting, login, the guest editor, and the quotes/prices editor). He has an **existing Cloudflare account**. The address is a free **\*.workers.dev**. The build happens in a **fresh Claude Code session on the PC**.

Status: part 1 committed (CHANGELOG v3). Part 2 built and committed (21 Oct 2026). Nothing is deployed: §7 is the next session.

## 1. Platform (product choice)

| Need | Product | Notes |
|---|---|---|
| Host the React app | **Workers + Static Assets** | Cloudflare recommends this over Pages for new projects. The address is `<name>.<account>.workers.dev`. |
| Save API | Same Worker, `/api/*` | `run_worker_first: ["/api/*"]`; everything else is served from assets with SPA fallback |
| Database | **D1** (binding `DB`) | SQLite; migrations live in `migrations/` |
| Login | **Cloudflare Access** on the workers.dev URL (preview URLs disabled) | Email one-time PIN for Mark and Angela only. Verify the Zero Trust free-plan seat count at setup and record it in STATE. |
| Identity in code | `Cf-Access-Jwt-Assertion` validated in the Worker (team domain + AUD as vars) | Defence in depth: the API refuses requests without a valid Access JWT, even if Access is misconfigured |

Not used: KV, R2, Durable Objects, Pages. Two editors don't need per-entity coordination.

## 2. Data (D1) — built (`migrations/0001_init.sql`)

Tables mirror `src/guests/schema.ts` (column names = workbook names; optional/enum columns nullable TEXT). Every row: `version`, `updated_at` (ISO UTC), `updated_by` (Access email).

| Table | Key | Purpose |
|---|---|---|
| households | HouseholdID | Households sheet |
| individuals | PersonID | Individuals; `HouseholdID REFERENCES households ON DELETE RESTRICT`; ParentPersonIDs stays comma TEXT |
| friends | FriendGroupID | Friends; Ranking TEXT |
| quotes | id (uuid) | scenario_id, item_desc (a LineItem `desc` or `"*"`), options (JSON Options or null = any), basis (total/perGuest), amount, includes_tax, vendor, received_on, status (requested/received/accepted), notes |
| params | key | one row per overridden `Params` field; value JSON; no row = doc value |
| audit | id autoincrement | ts, who, tbl, row_id, op, before, after; last 1,000 kept |
| _guard | — | concurrency guard (below) |

- **One save = one `DB.batch()`** (`worker/write.ts`): guards first, then writes (households created first, deleted last), audit, trim. Guard per touched row: `INSERT INTO _guard SELECT 0 WHERE NOT EXISTS (row with read version)` → CHECK fails → whole batch rolls back → 409.
- **409:** stale `version` on update/delete → `{error:"conflict", message:"<updated_by> changed <id> — reload", row}`. Missing row → 404. UI shows `message` + Reload; never hard-code a name.
- **Ids:** server allocates. Person `{M|A}NNN` (max+1 per Family), household `{M|A}-{BRANCH}-{NNN}` (`_branch` 2–4 letters, default first 3 letters of PrimaryHouseholdName), friend `FNNN`, quote uuid. Creates may use `tmp:*` ids; references to them are rewritten; response `ids` maps tmp → real.
- **Delete person** clears their id from others' PartnerPersonID/ParentPersonIDs in the same batch (versions bumped, audited). **Delete household** requires its people deleted/moved in the same save (else 422).
- **Validation:** per-row shape check (`worker/db.ts normalize`: known columns, text, Family/YesNo/enums, quotes, params via `parseParamValue`) → 400. Then `validateGuests` on the whole post-write dataset; reject (422 + `issues`) only errors not present before the save.
- **Seed:** `npm run seed:sql` → `data/private/seed.sql` (real names; gitignored) for `wrangler d1 execute DB --remote --file`. One-time, only after Access; delete the file after. Then D1 is the source of truth.
- **Export:** button builds an xlsx client-side with SheetJS (dynamic `import()`), same sheet layout as the workbook.

## 3. API (Worker) — built (`worker/`)

- `GET /api/data` → `ApiData` (all rows with versions, params rows, `me`). `POST /api/write {ops: Op[]}` → `{ids, data}`. `GET /api/audit?limit=` (≤200). Contract: `src/api/types.ts`; client `src/api/client.ts`; React `src/ui/data.tsx` (`useData()`).
- Errors `{error, message, issues?, row?}`; all `Cache-Control: no-store`; unknown `/api/*` → JSON 404.
- **CSRF:** non-GET needs `Origin` = request origin and JSON content type, else 403. No CORS.
- **Access JWT** (`worker/auth.ts`): `jose.jwtVerify` against `<team>/cdn-cgi/access/certs`, issuer = team URL, audience ∈ `ACCESS_AUD` (comma list), RS256, 60 s skew; email ∈ `ALLOWED_EMAILS`. Missing vars → 500 (fail closed). Dev bypass: `DEV_ACCESS_EMAIL` (never in wrangler.jsonc; test enforces) AND localhost host.
- `preview_urls: false` (one Access app, one AUD).

## 4. Engine changes (round 2, builder B)

- `ComputeOptions.quotes?: Quote[]`. Applies quotes for this scenario with status received/accepted whose `options` (if set) match the current choices. Precedence on one row: accepted > latest received_on.
- Override happens before the row joins the tax base, so percent rows recompute; `includes_tax` drops the row from the tax base. `basis: "perGuest"` → amount × guests.
- Row gets `quoted: true`, `quoteId`, `estimate` (model amount). UI: "quote" chip + variance; quoted rows don't show a confidence %.
- `"*"` quote replaces all item rows with one "Quoted all-in" row; contingency still applies after it.
- `Budget.unmatchedQuotes`: received/accepted quotes for this scenario that matched no row at this date/options; the Quotes screen shows them as "not applied at this date/options".
- Scenarios come from `useData().scenarios` = `buildScenarios(mergeParams(paramRows))`. `SCENARIOS` stays for golden. Golden tests run with no quotes and default params: unchanged.

## 5. UI (palette and type unchanged)

- **Guests (Mark chose layout A, 21 Oct):** households grouped by Family → FamilySide; filter chips (family side, adult/child, exceptions, locality, status, priority) + search; live forecast strip on top with "Price at this". Tap a household → side panel (full-screen sheet ≤ 520 px) editing household + its people, add/remove person/household, partner/parent picker, inline issues from `validateGuests`. Friends listed as their own group. Export xlsx.
- **Quotes:** per venue, a list of quotes (add/edit/delete, status), unmatched quotes flagged; "add quote" on any budget line (`QuoteLineAction`).
- **Prices:** the `Params` form, per-field "doc value" hint, "reset to doc values".
- **Budget Studio:** as now; scenarios/guests/quotes from `useData()`.
- **Navigation:** three tabs (Budget · Guests · Quotes & prices) in a header that works at 390 px. Loading / load-error / signed-out / read-only-offline states.

## 6. Build plan (RELEASE.md: Large) — status

1. Environment verified; one Opus design review done (findings folded in above; rationale HISTORY v3).
2. Round 1 done: wrangler.jsonc, worker/, migration, seed, `tests/worker.test.ts` (node:sqlite), client + `useData()`, vite hosted/offline split, dev `/api` in `npm run dev`.
3. Round 2: A = Guests + export; B = Quotes & Prices + engine overrides + tests; C = shell, tabs, states, Budget from `useData()`.
4. One Sonnet integration review; `npm run check`; commit.
5. Deploy session (fresh), §7.

## 7. Deploy — what Mark does vs. Claude

| Step | Who |
|---|---|
| `npx wrangler login` (opens the browser; approve) | Mark clicks |
| `wrangler d1 create` → put database_id in wrangler.jsonc → `wrangler d1 migrations apply DB --remote` → `npm run build` → `wrangler deploy` (no seed yet) | Claude (PC session) |
| Zero Trust: confirm the free plan and team name. Access → protect the Worker's workers.dev URL (preview URLs are off). Policy: Mark's and Angela's emails, one-time PIN. | Mark clicks, following steps the session gives him (the session can't sign in to the dashboard for him) |
| Set `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` / `ALLOWED_EMAILS` vars and redeploy; verify `/api/data` without the Access cookie never returns data (Access login redirect or 401) | Claude |
| Seed: `npm run seed:sql` → `wrangler d1 execute DB --remote --file data/private/seed.sql` → delete seed.sql | Claude |
| Check: open the URL, get the code by email, edit a test row, confirm 409 handling with two tabs | Mark + Claude |
| Angela: open the link, enter her email, get the code | Angela |

## 8. Risks

- **The workers.dev URL is treated as a personal/hobby site.** That fits this project, and Access still applies.
- **If Access isn't set up before the seed, the guest list is open to anyone with the link.** Order: deploy with no seed, then Access, then seed.
- **The free-tier limits for D1, Workers and Access must be checked on the day** and recorded in STATE.
- **Two editors, one row:** handled by the 409 rule. Merging edits is out of scope.
