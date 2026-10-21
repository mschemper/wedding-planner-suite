# Design & Solution Review — v1 → v2

Reviewed 2026-10-20. Inputs: `wedding-budget-html.html` (v1 Budget Studio), *Wedding Budget Comparative Analysis — Reconciled Master v2.0* (June 11, 2026), `structured_guest_data_model.xlsx`.

Method: ported the v1 engine to TypeScript, transcribed every Part III total from the Reconciled Master into `src/data/golden.ts`, and ran the engine against all of them (122 checks, ±$30 tolerance for the doc's $5 rounding). The UI was rendered headless and checked by hand.

## Verdict

The budget **engine** is sound: once the fixes below are in, it reproduces all 122 totals from the source document. The **app** around it had one bug that crashed every card click, several silent mispricings at the edges of each venue's guest range, and no awareness of the new spring-2027 date. The **guest data** is a good schema but holds only about half the list the budget assumes.

## Findings

Sev: 🔴 breaks or misprices · 🟠 misleading · 🟡 quality. Status: ✅ fixed in v2 · 🗺 in BACKLOG.

### Engine & data

| # | Sev | Finding | Status |
|---|---|---|---|
| F-01 | 🔴 | **Clicking any venue card crashed v1.** `App` called `useMemo` *after* an early `return` for the detail view, so the hook count changed on the first click and React threw "Rendered fewer hooks than expected". | ✅ hooks hoisted |
| F-02 | 🔴 | **Benchmarks 14–16 were modelled as straight lines** (per-guest rate + fixed amount), but the source totals aren't linear. The worst miss was Marco Island at 125 guests (**−$1,113**), then Drake at 125 (+$554) and ULCC at 125 (+$343). | ✅ now interpolated between the doc's own data points at 75/125/200/250 |
| F-03 | 🟠 | **The source document has an arithmetic error.** Three Top Lounge's 125-guest totals ($47,010 beer & wine / $50,865 cocktail) are $50 and $48 less than the sum of their own line items. Part V repeats the wrong figure. | ✅ golden table uses the line-item sums; doc not edited |
| F-04 | 🔴 | **Cost lines stopped growing past 125 guests.** Lines priced from data points (florals, food trucks, rentals, desserts and similar) held flat above the last point. That affected scenarios 2, 4, 7, 9 and 11 at 150, Salvage One up to 175, and Three Top up to 200. Example: Guerilla food trucks at 150 were $4,400; ~$5,300 is realistic. | ✅ now extended along the last segment's trend, with a ≈ marker on those lines |
| F-05 | 🟠 | **"Best value" could go to a venue that can't host the count.** The home screen quietly priced out-of-range venues at their nearest supported count, and those figures competed for best value. | ✅ only venues that can host the count compete; the rest are dimmed and labelled |
| F-06 | 🟠 | **The detail view opened at the home count even outside the venue's range.** Example: The Joinery opened at 250 guests with no guest-count button selected. | ✅ snaps to the nearest supported count |
| F-07 | 🟠 | **Capacity limits in the doc weren't enforced:** Salvage One's ~80 practical minimum and The Joinery's ~100 seated ceiling. | ✅ shown as warnings and dimmed cards |
| F-08 | 🔴 | **The date moved to Mar–May 2027, which breaks assumptions in the doc.** Promontory Point is seasonal (May–Oct), so March and April are out. River Room's under-100 price assumes the **winter** Saturday rate, and spring is likely peak (+$2,000, 100-guest bar minimum). Three Top availability depends on the concert calendar. | ✅ month picker; closed venues flagged and dropped from best value · 🗺 season-aware pricing |
| F-09 | 🟠 | **The doc recommends a 5–10% contingency (Part IV #2); v1 had none.** | ✅ contingency picker |
| F-10 | 🟠 | **Known uncertainty wasn't shown.** The UI hid Three Top's Model B range, the Drake's understatement below 150 guests (+$3k–6k), and per-scenario confidence. | ✅ all shown |
| F-11 | 🟡 | **The compare tool was half-built.** It defaulted to the Full-Service *benchmark*, not the Baseline. The line-item delta column had CSS but was never rendered. The comparison venue is always priced at its default bar tier. | ✅ defaults to Baseline; per-category deltas · 🗺 option matching |
| F-12 | 🟡 | **v1 loaded `react@18` and Babel unpinned from a CDN and compiled in the browser.** That means slow first load, no offline use, and silent breakage when the CDN version changes. | ✅ Vite build producing one self-contained `dist/index.html` |
| F-13 | 🟡 | **Card colors were broken:** `s.colors` was undefined everywhere, so every card was the same color. | ✅ color band by venue type |
| F-14 | 🟡 | **Personal costs (dress, hair & makeup, photo, band, favors) are copied into 13 scenarios.** Changing one figure means 13 edits. | partly: shared helpers · 🗺 one global parameters layer |
| F-15 | 🟡 | **Tax handling differs by scenario** (cake is taxed at most venues but not Three Top; BYO bar isn't taxed). This matches the doc, so the port keeps it as-is and tests it. | ✅ documented |

### Guest data (`structured_guest_data_model.xlsx`)

| # | Sev | Finding | Status |
|---|---|---|---|
| G-01 | 🔴 | **The list is about half the size the budget assumes.** The doc assumes 88 family invitees (48 Mark + 40 Angela). The workbook has **45 individuals in 21 households**: 30 Mark, 15 Angela. One of Angela's parents' sides has a single household. The Friends sheet is **empty**. | 🗺 data entry |
| G-02 | 🟠 | **`Locality` is "Unknown" for all 45 people,** so the attendance forecast falls back to the blended 78% rate. The doc's 85% local / 55% out-of-town split can't kick in until this is filled. | 🗺 data entry |
| G-03 | 🟠 | **`PartnerPersonID` and `ParentPersonIDs` are empty for everyone.** The family graph has nothing to draw from this file. | 🗺 data entry |
| G-04 | 🟡 | **Four placeholder children** are flagged as exceptions (three in one sibling household, one in another), and one row has `GenerationGroup = Cousin child`, which contradicts the doc's "no children of cousins" rule (§I). | review |
| G-05 | 🟡 | **The `xl/workbook.xml` file uses a prefixed `x:` namespace** (OpenXML SDK output). exceljs can't read it, so the importer uses SheetJS. | ✅ |
| G-06 | — | **Forecast now:** 45 invited (32 adults, 13 kids) → **~35 expected** at local rates. With friends not yet entered, every Chicago venue's realistic range is 50–75, and the 75-guest column is the planning anchor. | — |

### Not in scope / not found

The suite also includes a force-directed family graph and a mobile companion app, but neither is in this project's files, so neither was transferred. If they exist elsewhere, drop them into `legacy/` and plan from `docs/BACKLOG.md` F8.
