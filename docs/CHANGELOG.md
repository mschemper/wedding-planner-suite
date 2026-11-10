# Changelog

## v12 - Whole-app review fixes (10 Nov 2026)

**Deployed** 10 Nov 2026. D1 migration 0007 (`quotes.date`) + `scripts/v12-live-data.sql` (dates the May 29 $7,000 Joinery quote). Findings and fixes: docs/REVIEW-v11.md.

**Budget**: a quote can be tied to one date ("Only for this date"); the May 29 $7,000 no longer prices every summer Saturday. The Joinery prices up to 160 guests (≈ past 100). A per-guest bar quote keeps the $4,000 minimum; quote choice is deterministic.

**Safer edits**: sheets ask "Discard your changes?"; failed saves show a toast; One by one moves on only after saving; merge/move confirm first; Undo no longer fakes restoring deletes or overwrites a newer edit; sheets always show the latest values.

**Screens**: Today grid, ≈ + confidence on the Joinery price, over-capacity warning; phone padding above the tab bar; print shows only content; wedding venue first on the shortlist; Venues notes when it prices differently from Today; keyboard menus that stay on screen; People room check defaults to the wedding venue; plainer Day copy; timeline 00:00–02:59 counts as after midnight; no duplicate milestones.

## v11 - The Joinery on Sat May 29 2027, Day tab (9 Nov 2026)

**Deployed** 9 Nov 2026 (Worker version 5dcf0c0a). D1 migration 0006 (`vendors`, `timeline`) + `scripts/v11-live-data.sql` (held date May 29, Joinery held, Firehouse backup, Ravenswood + River Room archived, Mark's 5 Nov Joinery quotes moved to the new line names). Design: docs/DESIGN-v11.md (Mark picked a new Day tab).

**Day tab** (new, 5th): **Our venue** — The Joinery on Sat May 29 with countdown, sunset, budget at the expected headcount (May 29 quote shown), room check against 160 seats (kids included), bar-minimum cost per guest, six venue photos + floor plan, rules, what's included, lodging, open questions, and "Add milestones to Plan" (21 dated planning steps counted back from the date). **Vendors** — one list per category with status, amounts, deposit/balance due and paid dates, overdue payments, the Joinery's recommended vendors as one-tap suggestions. **Timeline** — run of show from a Joinery template (2 PM–midnight, 5-hour bar), checks against venue hours, sunset marker, printable.

**Today**: the When card counts down to the wedding ("201 days"); new Our venue card (total, seats, vendors booked).

**Budget**: The Joinery repriced from its own brochure and bar sheet: Saturday $6,000 / $7,000 / $9,500 by season; bar Tier 1/2/3 $34/$44/$55 per guest with a $4,000 bar minimum (adds ≈ $1,650 at 75 guests vs the old estimate). Default held date May 29, 2027.
