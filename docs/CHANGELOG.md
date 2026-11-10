# Changelog

## v11 - The Joinery on Sat May 29 2027, Day tab (9 Nov 2026)

**Not deployed yet.** D1 migration 0006 (`vendors`, `timeline`) + `scripts/v11-live-data.sql` (held date May 29, Joinery held, Firehouse backup, Ravenswood + River Room archived, $7,000 May 29 quote). Design: docs/DESIGN-v11.md (Mark picked a new Day tab).

**Day tab** (new, 5th): **Our venue** — The Joinery on Sat May 29 with countdown, sunset, budget at the expected headcount (May 29 quote shown), room check against 160 seats (kids included), bar-minimum cost per guest, six venue photos + floor plan, rules, what's included, lodging, open questions, and "Add milestones to Plan" (21 dated planning steps counted back from the date). **Vendors** — one list per category with status, amounts, deposit/balance due and paid dates, overdue payments, the Joinery's recommended vendors as one-tap suggestions. **Timeline** — run of show from a Joinery template (2 PM–midnight, 5-hour bar), checks against venue hours, sunset marker, printable.

**Today**: the When card counts down to the wedding ("201 days"); new Our venue card (total, seats, vendors booked).

**Budget**: The Joinery repriced from its own brochure and bar sheet: Saturday $6,000 / $7,000 / $9,500 by season; bar Tier 1/2/3 $34/$44/$55 per guest with a $4,000 bar minimum (adds ≈ $1,650 at 75 guests vs the old estimate). Default held date May 29, 2027.

## v10 - Bug sweep, window price ranges, tour mode (25 Oct 2026)

**Deployed** 25 Oct 2026 (Worker version 5904b91d). No D1 migration. Review page (design review + ideas): docs/mockups/v10-review.html; Mark said yes to R1, R2, R4, R5, N2.

**Fixes** (two code reviews, logic + UI): clearing the held date no longer fails the save; impossible dates (2027-13-45) are refused; a replaced quote is no longer flagged "didn't match any line"; a household's cost is priced at the same count as the venue total and says "nothing extra (flat quote)" when an all-in quote covers it; an added venue with only percent lines stays "awaiting rates"; named kids follow the kids rule before their household is decided; Escape on a ⋯ menu no longer closes the household card; a failed save stays on screen; holding a key in one-by-one Decide no longer decides a run of households; bulk edits and "Invite all undecided" touch only the households shown; the household card saves after Reload; the note sheet closes only when saved; a status change keeps unsaved venue details; "done" dates are Chicago dates; negative amounts read "−$…"; small controls are 44px.

**Venues**: each date window shows its cheapest and dearest Saturday ("$36,644 (Sat, May 1) – $37,644"); a total priced at a different count than the one picked says so ("priced at 50 guests, the venue's smallest modelled count").

**Tour mode** (venue detail): every must-have as a question with Yes / Partly / No / Not asked and a note; one Save fills the must-have grid.

**People**: the room check shows a key under the bar (in, if room, undecided, seats) and the cost with the venue's name. **Plan**: must-haves list only; how venues fit lives on Venues.
