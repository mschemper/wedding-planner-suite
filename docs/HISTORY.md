# History & Rationale

Newest first. Each entry: what changed and why.

## v4 — 2026-10-22 · Garden rebuild
- Households, not people, carry the invite decision: Mark decides by household with a kids option; per-person overrides only for exceptions. Kids policy is global so "our kids only" vs "all kids" is one switch.
- Relationships derived from links instead of typed: the workbook's 21 columns per person were the complexity Mark asked to remove. Gendered workbook labels are kept when they agree with the derivation.
- Tree = branch beds, not strict genealogy (Opus design review): only 11 of 106 people had parent links; a strict layout would have left half the people unplaced.
- Migration 0002 add-only (design review): v3 stays redeployable; drop old tables in 0003.
- Default pricing basis "incl. undecided": with 36 of 121 decided, invited-only priced every venue at its minimum.
- Firehouse priced from its official rate table (21 Oct 2026); third-party $6–8k figures looked dated.
- Stat numbers use Inter: Cormorant Garamond's old-style "1" reads as "I".
- Repo-create via the API was refused by the permission classifier; Mark created the GitHub repo by hand.

## v3 — 2026-10-21 · Seasons, review fixes, mobile, platform plan

- **Seasons come from each venue, not a global winter/summer split** (Mark: "that should depend on what the specific venue says"). Each scenario carries its own calendar and cites it in `seasonSource`. Venues with nothing published stay unseasoned rather than guessed.
- **Date, not month.** River Room's peak starts on Apr 16, partway through a month.
- **`docSeason` keeps the golden tests on the Reconciled Master's own assumption** when no date is given. River Room's doc priced 50/75 off-peak and 100/125 peak, so its golden rows carry dates instead.
- **Peak River Room under 100 guests is "not offered", not repriced.** The venue requires the 100-guest bar package; the card dims and the total still shows for reference.
- **`Budget.unavailable` is a field.** The UI no longer parses warning strings (R16).
- **The Salvage One schedule is third-party** (a couple-submitted venue email via Tulle Together). It was used because the venue publishes nothing; confidence stays at 80.
- **Params via `buildScenarios(params)`.** One edit reprices every scenario, and v5's prices editor can pass edited params without touching scenario data.
- **Compare maps option choices by position:** tier 1 ↔ tier 1. Every bar option lists beer & wine first.
- **Ink tokens instead of new colours.** Darker text-only variants fix WCAG contrast while keeping the palette for fills (AGENTS "Design rules").
- **Mobile is one column below 520 px.** Two narrow columns clipped the price beside "shown at" text.
- **The git history was rewritten to remove surnames.** This was safe because no remote existed and the PC copy was replaced whole.
- **Hosting: Cloudflare over Sheets-first.** Mark wants to edit in our own UI. Cloudflare keeps the single-file app, adds a save API and a database, and puts a free login in front, without a server to maintain (PLATFORMS.md).
- **Workers + Static Assets, not Pages.** Cloudflare recommends Workers for new projects; Pages is for maintaining existing ones. So the address is *.workers.dev, not *.pages.dev, and Access protects it the same way.
- **One release instead of v3/v4/v5** (Mark: consolidate onto the new platform). Part 1 is committed but untagged; the tag lands only after a verified deploy.
- **Part 2: the Worker is tested and run locally in Node, not workerd.** workerd 2026-10-19 crashes on startup on Mark's PC (Win10 19045, i5-7300U; access violation, even with a minimal config and outside the sandbox). So tests and `npm run dev` run `worker/api.ts` against a D1-shaped adapter over `node:sqlite` (`scripts/d1-sqlite.ts`) with the real migration. `wrangler deploy` only bundles, so deploy is unaffected. It also avoided the vitest 2 → 4 / vite 5 → 7 upgrade that `@cloudflare/vitest-pool-workers` needs. Gap: D1-specific behaviour is verified on the day of the deploy, not in tests.
- **Own D1 binding types (`worker/env.ts`) instead of `@cloudflare/workers-types`.** Those types clash with the DOM lib. One tsconfig now covers app, worker and tests.
- **One write endpoint (`POST /api/write`, a list of ops) instead of PUT/POST/DELETE per entity.** A household edit, its people and the cleared partner/parent links must commit together. D1 `batch()` is one transaction, and a `_guard` CHECK row aborts it when any touched row's version changed (an `UPDATE … WHERE version` that matches nothing would not abort it).
- **Validation rejects only errors a save introduces.** Running `validateGuests` per household misreads cross-household links. Running it on the whole dataset would let one old error block every edit.
- **The server allocates ids** (`M006`, `M-PAR-002`, `F003`, uuid for quotes). Two editors can't pick the same id, and the client uses `tmp:` ids within one save.
- **Quotes carry `options`, `basis` and `includes_tax`.** The same `desc` exists under both bar options, a per-guest line must keep scaling with the count, and a quote that includes tax must leave the tax base. Quotes that match no row at this date or option show as unmatched instead of disappearing silently.
- **`preview_urls: false`.** One Access application covers the one URL. The design review found that preview URLs would need a second application with its own AUD.
- **The offline build keeps real names when `data/private` exists.** It is Mark's copy until the deploy, and it is read-only. The hosted build fails if anything under `data/private` is bundled.
- **Optimistic versioning, not merge:** two editors rarely touch the same row, and a 409 "reload" is honest and cheap.
- **Deploy order is deploy → Access → seed,** so real names are never online without the login.
- **Build in a fresh PC session:** wrangler needs Mark's browser login on the PC, and a fresh session avoids re-reading this long conversation (RELEASE rules 7 and 12).

## v2 — 2026-10-20 · Port to Claude Code repo

- **Agent docs follow bauhaus-dashboard.** AGENTS.md is the entry point (CLAUDE.md is just `@AGENTS.md`, so non-Claude agents read the same rules). It carries the P0 block, session-start order and Definition of done. Changing facts live only in STATE.md; rationale lives only here. That's the structure Mark already runs on bauhaus and sheridan, so one mental model covers all three repos.
- **The repo lives at `Documents\Projects\`** next to bauhaus-dashboard and sheridan-dashboard, not `Documents\Code\`.
- **Releases are integer `vN`, like bauhaus.** package.json is `N.0.0`. v1 = the claude.ai HTML.
- **The ADHD output skill is vendored at `docs/skills/i-have-adhd/`**, the same copy and commit as bauhaus (ayghri/i-have-adhd @839872f, MIT).
- **`dist/` isn't deployed anywhere.** The single file is the product, so RELEASE.md has no deploy or apply steps.
- **v1 single HTML → Vite + React + TS.** v1 loaded unpinned CDN React and compiled in the browser with Babel. A build step pins versions, enables tests, and still ships one offline `dist/index.html` (vite-plugin-singlefile).
- **Engine split from UI.** Pricing is pure TypeScript, so it can be tested against the Reconciled Master directly. The UI was where the v1 crash lived (REVIEW F-01).
- **Golden tests are the contract.** 122 doc totals, ±$30. Tolerance covers the doc rounding percent lines to the nearest $5. A larger gap means a modelling error.
- **Benchmarks 14–16 interpolate the doc's data points.** The source gives totals only at 75/125/200/250, and they aren't linear, so a rate-plus-fixed model missed by up to $1,113 (F-02).
- **Data-point lines extend along their trend instead of going flat** above or below the known points. Flat lines underpriced every 150-guest scenario (F-04). Extended lines are marked ≈ in the UI.
- **Three Top @125 golden uses line-item sums, not the doc total.** The doc's own total is $48–50 short (F-03).
- **`appliesIf` changed from a flat object to `{minGuests, maxGuests, options}`.** v1 treated any other key as an option, so a typo silently dropped the line. A test now checks that every bar choice matches at least one line.
- **Capacity, season, and understatement are data with UI warnings, not pricing changes.** The doc prices out-of-range counts "for comparison only". Keeping the numbers while warning keeps the doc's totals intact.
- **Best value considers only venues that can host the count, are open that month, and aren't benchmarks.** In v1 a venue priced at a smaller count could win (F-05).
- **Default comparison is the Baseline (S2), not the Full-Service benchmark (S1).** The doc says every venue "should be read against" the Baseline.
- **Guests: SheetJS instead of exceljs.** The workbook uses `x:`-prefixed OpenXML namespaces, which exceljs can't parse (G-05). SheetJS 0.20.3 comes from cdn.sheetjs.com because the npm `xlsx` package stopped at 0.18.5, which has known CVEs.
- **Real guest data is gitignored; tests use a synthetic fixture.** Family names, relationships, and future addresses don't belong in git history.
- **Attendance uses §2.3 rates:** local 85%, out-of-town 55%, unknown 78% (blended), destination 45% (middle of the 35–55% range). Accepted = 1, Declined and Not inviting = 0. A friend group with `PlusOneDefault = Yes` counts as 2. The workbook has no headcount column.

## v1 — June–July 2026 · Wedding Budget Studio (claude.ai)

- Single-file React app with 16 scenarios from Reconciled Master v2.0. The original and the Reconciled Master .docx are in the claude.ai project "Wedding Planner Suite".
