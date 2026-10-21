# Review — v3 refinement pass (21 Oct 2026)

Inputs: a cold code review of v2 (Sonnet subagent, 20 findings, mostly verified by running code) and venue season research (Sonnet subagent, venue pages first). Dispositions are below. v2's findings are in REVIEW-v2.md.

## Code review

| # | Sev | Finding | Disposition |
|---|---|---|---|
| R1 | high | The "exactly" guest input couldn't be typed into: every keystroke below the minimum snapped back. | ✅ It now edits a draft and commits on Enter or blur, clamped to the range (`GuestPicker`). |
| R2 | high | A bad friend `Locality` turned the forecast into NaN, which then set guests to NaN. | ✅ Unknown values fall back to the blended rate, and validation reports them. |
| R3 | med | "Price at expected" could set the count below every venue's range. | ✅ Clamped to 20–300, with a hint when the count is below every venue's model. |
| R4 | med | The Friends sheet wasn't validated, and status matching was case-sensitive. | ✅ Friends are validated for enums, duplicate IDs and PlusOneDefault. Status matching is case-insensitive. |
| R5 | med | A numeric `ParentPersonIDs` cell crashed the importer, and numeric IDs never matched their references. | ✅ ID columns are always converted to strings. |
| R6 | med | Header whitespace, or a missing or renamed sheet, gave 0 rows silently. | ✅ Keys are trimmed. A missing required sheet or 0 rows is an error. |
| R7 | med | The importer wrote guests.json even when validation failed. | ✅ A failed import writes `guests.rejected.json` instead, so the last good file stays. |
| R8 | med | Real surnames were in `docs/REVIEW-v2.md` and in git history. | ✅ Removed from the docs, and history rewritten (no remote existed). |
| R9 | med | `.gitignore` didn't catch a workbook outside `data/private/`, and `git add -A -f` was allowed. | ✅ Now ignores `*.xlsx` / `*.csv` / `/data/*` except fixtures; force-add variants are denied. |
| R10 | med | Several text colours failed WCAG AA on cream. | ✅ Added `--*-ink` text tokens (fills unchanged). Dimmed cards are at 0.8 opacity, and footer and stat text are darker. |
| R11 | low-med | Toggles had no `aria-pressed`. | ✅ Added, plus role=group labels. |
| R12 | low-med | Cards are buttons containing divs. | ✅ Inner elements are now spans, and each card has an aria-label with total, best-value and availability. |
| R13 | low | The detail view accepted 10–400 guests. | ✅ Now clamped to the scenario's range. |
| R14 | low | The engine priced negative guest counts. | ✅ The engine clamps to ≥0 and rounds; NaN becomes 0. |
| R15 | low | Plus-ones and TBD guests count at locality rates; the couple and vendors aren't counted. | 📝 Documented in `attendance.ts`. |
| R16 | low | The closed check parsed a warning string. | ✅ `Budget.unavailable` is now a field. |
| R17 | low | Promontory dimmed by default in April. | ✅ Intended. The card says "Closed this date". |
| R18 | low | The dev server serves `/data/private/guests.json`. | 📝 Vite binds to localhost by default. Revisit with hosting (PLATFORMS.md). |
| R19 | low | At 390 px, the card footer could clip, and iOS zooms into inputs under 16 px. | ✅ Wrap added, inputs are 16 px, and the layout is one column. Rendered at 390 px with no horizontal scroll. |
| R20 | low | Duplicate DisplayNames weren't caught. | ✅ Warns when two people in a household share one. |

## Venue seasons (now in the model)

| Venue | Rule encoded | Source |
|---|---|---|
| River Room | Peak Apr 16–Nov 15, 2027: $9,000 and needs 100+ guests. Off-peak $7,000. | The venue's Common Questions page (seasons and minimum); Tulle Together (rates) |
| Salvage One | 2027 Saturday rental: Jan–Mar $9,000, Apr $10,000, May–Oct $12,000, Nov–Dec $9,500. | Tulle Together, Jun 2026, from a couple-submitted venue email (third-party) |
| Promontory Point | Open May–Oct only. | Chicago Park District page |
| Morton Arboretum | Ginkgo winter–spring package $5,000 Jan–Apr; standard Saturday $9,000. | Morton rate sheet (Aug 2025) + 2024 insert; confirm 2027 and Saturday eligibility |
| Joinery, Aquatorium, Three Top, Field Museum | Nothing seasonal published; unchanged. | — |
| Rockwell on the River | Not modelled: no published pricing (third-party "starting $9,000", capacity 375). | Questions added to STATE "Open quotes" |

Not changed but noted: the Park District page lists the Promontory weekend 11-hour package at $3,679 total, against the doc's $3,179 itemisation. The difference is probably the $500 refundable deposit, which the doc excludes. Confirm when booking.

Effect for a spring date: April 16 onward, River Room is not offered under 100 guests. Salvage One's rental rises by $1,000 in April and $3,000 in May. Morton's rental rises by $4,000 in May.
