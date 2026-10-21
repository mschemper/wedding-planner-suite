# History & Rationale

Newest first. Each entry: what changed and why.

## v0.2.0 — 2026-10-20 · Port to Claude Code repo

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
