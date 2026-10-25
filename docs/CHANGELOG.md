# Changelog

## v10 - Bug sweep, window price ranges, tour mode (25 Oct 2026)

**Deployed** 25 Oct 2026 (Worker version 5904b91d). No D1 migration. Review page (design review + ideas): docs/mockups/v10-review.html; Mark said yes to R1, R2, R4, R5, N2.

**Fixes** (two code reviews, logic + UI): clearing the held date no longer fails the save; impossible dates (2027-13-45) are refused; a replaced quote is no longer flagged "didn't match any line"; a household's cost is priced at the same count as the venue total and says "nothing extra (flat quote)" when an all-in quote covers it; an added venue with only percent lines stays "awaiting rates"; named kids follow the kids rule before their household is decided; Escape on a ⋯ menu no longer closes the household card; a failed save stays on screen; holding a key in one-by-one Decide no longer decides a run of households; bulk edits and "Invite all undecided" touch only the households shown; the household card saves after Reload; the note sheet closes only when saved; a status change keeps unsaved venue details; "done" dates are Chicago dates; negative amounts read "−$…"; small controls are 44px.

**Venues**: each date window shows its cheapest and dearest Saturday ("$36,644 (Sat, May 1) – $37,644"); a total priced at a different count than the one picked says so ("priced at 50 guests, the venue's smallest modelled count").

**Tour mode** (venue detail): every must-have as a question with Yes / Partly / No / Not asked and a note; one Save fills the must-have grid.

**People**: the room check shows a key under the bar (in, if room, undecided, seats) and the cost with the venue's name. **Plan**: must-haves list only; how venues fit lives on Venues.

## v9 - Jungalow Lounge look, one-by-one Decide, Tidy up; Claude API features removed (23 Oct 2026)

**Deployed** 23 Oct 2026 (Worker version 95a4afda). No D1 migration. `ANTHROPIC_API_KEY` secret deleted. Review page (looks, People fixes, ideas): docs/mockups/v9-review.html; Mark picked B · Jungalow Lounge. Design note: docs/DESIGN-v9.md.

**Removed**: Ask the planner (v8) and Add venue web research (v7), the `/api/ask` and `/api/research` routes and the `@anthropic-ai/sdk` dependency. Add venue opens straight to the by-hand form; venues researched earlier keep their "Researched" tag.

**Look**: Jungalow Lounge — mid-century jungle on a hunter-green header band: palm fronds, split-leaf monstera, pink and lilac hydrangeas, brass starbursts; Young Serif + Figtree; pill tabs and buttons; dusk swaps to brass on deep green. Decision icons are plants (monstera = invite, hydrangea bud = if room).

**People** (review items P1, P2, P4, P6–P10): "Decide one by one" walks the undecided households with relation, seats, local/away, what each adds to the budget at the room-check venue and seats left (keys 1/2/3/S). Friends folded into Decide (tier sub-headings; quick-add in the Add menu). One "Tidy up" list (name fixes, unplaced relatives, unknown local/away, talk-about, friends missing a surname). One decision pill per row; plain seat counts ("2 adults · 1 kid"); quieter ring headings with a decided bar; Export + History under "More"; the room check is one line on phones.

**Engine**: `addedCost` / `householdCost` price one household as the difference of two totals (same date, quotes, contingency).

**Privacy**: real-looking names in code comments, tests and one on-screen example replaced with synthetic ones.
