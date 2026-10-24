# Changelog

## v9 - Jungalow Lounge look, one-by-one Decide, Tidy up; Claude API features removed (23 Oct 2026)

**Deployed** 23 Oct 2026 (Worker version 95a4afda). No D1 migration. `ANTHROPIC_API_KEY` secret deleted. Review page (looks, People fixes, ideas): docs/mockups/v9-review.html; Mark picked B · Jungalow Lounge. Design note: docs/DESIGN-v9.md.

**Removed**: Ask the planner (v8) and Add venue web research (v7), the `/api/ask` and `/api/research` routes and the `@anthropic-ai/sdk` dependency. Add venue opens straight to the by-hand form; venues researched earlier keep their "Researched" tag.

**Look**: Jungalow Lounge — mid-century jungle on a hunter-green header band: palm fronds, split-leaf monstera, pink and lilac hydrangeas, brass starbursts; Young Serif + Figtree; pill tabs and buttons; dusk swaps to brass on deep green. Decision icons are plants (monstera = invite, hydrangea bud = if room).

**People** (review items P1, P2, P4, P6–P10): "Decide one by one" walks the undecided households with relation, seats, local/away, what each adds to the budget at the room-check venue and seats left (keys 1/2/3/S). Friends folded into Decide (tier sub-headings; quick-add in the Add menu). One "Tidy up" list (name fixes, unplaced relatives, unknown local/away, talk-about, friends missing a surname). One decision pill per row; plain seat counts ("2 adults · 1 kid"); quieter ring headings with a decided bar; Export + History under "More"; the room check is one line on phones.

**Engine**: `addedCost` / `householdCost` price one household as the difference of two totals (same date, quotes, contingency).

**Privacy**: real-looking names in code comments, tests and one on-screen example replaced with synthetic ones.

## v8 - Household card, names that follow the people, Prairie & Steel Chicago look, Ask the planner (23 Oct 2026)

**Deployed** 23 Oct 2026 (Worker version 13029a97). D1 migration 0005 (add-only: `parties.name_custom`). Ask the planner and Add venue research use the Cloudflare secret `ANTHROPIC_API_KEY`. Theme options: docs/mockups/v8-theme-options.html; Mark picked C · Prairie & Steel with more Chicago. Design note: docs/DESIGN-v8.md.

**Household card** (replaces the separate person and household sheets): tapping any name opens its household — envelope name, invite decision, ring, kids rule at the top; every person below with first / last / age edited in place, "More about…" for relatives, RSVP, local, notes; add someone; move / own household / merge; remove from the guest list. One Save. "Add" now asks: new household (family / friends) or someone to an existing household.

**Names**: household (envelope) names follow their people with "&" and each person's own surname ("Ada & Ben Sample", "Cleo Example & Dev Other", "Sam Lee & Guest"); the Worker keeps them in sync on every save. "Write my own" keeps a name as written. A one-time "Tidy" banner previews every household whose name doesn't match (live audit 23 Oct: 38 of 57 used "and", 4 left out a living adult, 1 dropped a partner's surname).

**Ask the planner** (star button, every tab): ask in plain English; Claude answers from a snapshot of the plan (adults and kids kept apart) and proposes edits — decisions, kids rule, ring, local/away, RSVP, renames, add a person, add a task — each shown before you tap Apply. Nothing changes on its own.

**Look**: Prairie & Steel — Frank Lloyd Wright art-glass tulips framing a Chicago panorama (Marina City, Willis, Hancock, lake), Chicago flag stripes and stars, Josefin Sans, square cards; night-skyline dusk.

**Fix (also shipped as a hotfix on v7, 23 Oct)**: Add venue research no longer fails when Claude gives a per-guest line as a total or a percent as "22" — such lines are repaired, and unusable ones are listed instead of failing the whole result.

