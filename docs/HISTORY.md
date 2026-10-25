# History & Rationale

Newest first. Each entry: what changed and why.

## v5 — 2026-10-22 · People tab rebuild
- Order by closeness, not alphabet: decisions follow inner → outer; the A–Z list mixed a sister among cousins-in-law (REVIEW-v4-people P1).
- Rings + fill line over a capacity bar alone: "do we invite the cousins?" is answered where the cousins are.
- Outline tree over the v4 SVG overlay: links are sparse and lines tangled; indentation cannot tangle.
- Friends ranked by tier, not drawn as a tree; tier is separate from the decision (a must-invite can still be undecided).
- Placeholder "Child n" people → a household count: fake people distorted names, relations and the tree.

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

## v7 data (22 Oct 2026)
- Firehouse Chicago kids' room capacity 20 (Bunk Room), adults seated 82. Source: Mark, 22 Oct 2026 (chat). `capacity.kids` added to Scenario; capacity checks adults and kids separately. Kids stay priced as adults (Mark's choice).
- Added venues: D1 `custom_venues` (0004); ids from 1000 so they never collide with code scenarios.

## Release log (moved from STATE.md, 23 Oct 2026)
- v8 Household card, Prairie & Steel (tag v8, 8.0.0, migration 0005): deployed 23 Oct 2026, Worker version 13029a97-51d7-4ada-b654-15a29db6458a.
- v10 review: docs/mockups/v10-review.html (design review R1–R7, ideas N1–N12). Mark: yes R1, R2, R4, R5, N2; no R6, R7, N1, N3, N4; R3, N5–N12 unanswered.
- v6 Easy people + review fixes (tag v6, 6.0.0, no migration): deployed 22 Oct 2026, Worker version 71d3393a-39b8-4e14-8af6-d32005c4755e.
- v5 People tab (tag v5, 5.0.0): deployed 22 Oct 2026, Worker version 61f32257-13b4-4638-8707-9b4d895e2452. Rollback = check out v5, build, deploy.
- v4 Garden (tag v4): rollback = check out v4, build, deploy (0003 columns additive; v4 ignores them).
- v7 Conservatory look (tag v7, 7.0.0): deployed 22 Oct 2026, Worker version 66408ed9-8730-4dc2-9c89-842225e14794.
- v7 hotfix (research line repair, commit dd4d6f1): Worker version 905d2070-023d-4dae-b1f1-b0c7b2d986d6.
- Designs/reviews by release: DESIGN-v3/v4/v5/v7/v8/v9, REVIEW-v2/v3/v4-people/v6, v9 review (mockups/v9-review.html); mockups docs/mockups/. Looks: Twinkle garden (v4, DESIGN-v4 §6) -> Conservatory Modern (v7) -> Prairie & Steel (v8) -> Jungalow Lounge (v9, current).

## Backups (moved from STATE.md)
- Before v9: data/private/d1-backup-v8.sql (23 Oct 2026). Before v8: data/private/d1-backup-v7.sql (23 Oct 2026). Before v7: d1-backup-v6.sql (22 Oct). Before v6: d1-backup-v5.sql (22 Oct). Before v5: d1-backup-v4.sql (7 in-app edits); Time Travel bookmark before 0003: 0000000f-00000000-0000510c-4f239d5944ea229ba0af44ddc16553e8. Before v4: d1-backup-v3.sql; bookmark before 0002: 00000007-00000000-0000510c-d6a1322583093461991a98ead97e221a.
- Friend tiers set on live from the workbook InviteTier (A→Must, B→Want, C→Nice to have), 22 Oct 2026.

## Guest data at seed, 22 Oct 2026 (moved from STATE.md)
- Workbook G:\My Drive\Wedding Planner\wedding_guest_data_comprehensive_v4.xlsx (21 Oct 23:33) -> data/private/guests-v4.xlsx. People 115 (+4 tree-only grandparent placeholders): 2 couple, 93 family, 20 friends; 3 deceased; 11 unnamed kids became a household count (0003). Households 55 (45 family + 10 friend groups).
- Decisions at seed: invite 36 heads (23 adults / 13 kids' room) · if room 0 · undecided 85 heads (42 households) · no 0. Headcount ≈ 28 expected of 36 invited; ≈ 95 if undecided invited. Tree: 45 linked to parents, 23 cousins unlinked. v3 -> v4 count: v3 116 invited / 91 expected; v4 considered 121 / 95.
