# REVIEW-v4-people -- People tab design review (22 Oct 2026). Agent-facing.
Reviewed live v4 with real data (126 people, 55 households) at 1280px; v4 code `src/ui/people/*`. Lens: information design (what question does each screen answer, in how many glances). Options: docs/mockups/v5-people-options.html. Decision -> DESIGN-v5.

## The questions the tab must answer (in this order)
1. Who is still undecided, and who should we decide next?
2. If we say yes to these, do we still fit the room (and the budget)?
3. How is this person related to us / how do we know them?
4. What do we tell each household (who's invited, kids or not)?

## Findings (severity: H high, M medium, L low)
P1 H. No order of importance. Decide lists 55 households A–Z: a sister sits between two cousins-in-law. Decisions follow closeness (immediate → close → extended → distant); the list ignores it.
P2 H. Too tall to scan. Each household card is 4–7 rows (header, one row per person, kids control, Talk-about button): 55 cards ≈ 20 screens. Nothing fits in one view; no sense of progress.
P3 H. Garden lines are noise. Parent/partner lines cross whole beds; dashed partner lines run through names and read as strikethrough. 15–18 "Set parents" links per bed shout louder than the people.
P4 H. Workbook jargon leaks: branch titles "Lugene Schemper (Mark's father)", labels "Niece/nephew · child", "Child 1/2/3", generic "friend".
P5 M. One state shown three ways: subtitle text ("Undecided"), the segmented control, the bloom icon. Undecided = nothing lit, which reads as "not loaded".
P6 M. Generation rows are wrong where gen came from the workbook: great-aunts and their spouses sit in "Grandparents".
P7 M. Friends get the family treatment: same tall cards, no closeness, circle shown only as a heading ("Angela's · Friend"), ranking/tier from the workbook dropped, no "how we know them", no way to compare friends against each other.
P8 M. Impact bar is dense and cryptic ("23 · 13", "seats 82 · used 23 → 59 spare"), costs 150px of sticky height, and ignores budget.
P9 M. Kids control "Policy (in) · In · Out" is hard to parse; the global policy sits mid-page.
P10 L. Right column is mostly empty (If room list empty, Recent decisions empty) while the main column scrolls for 20 screens.
P11 L. Four sub-views with overlapping jobs (Decide, Garden, Friends, Envelopes); Add person / household / friend buttons always visible but rarely used.

## Data structure findings
D1. Closeness is missing. Add `tier` on parties: 1 Inner circle, 2 Close, 3 Extended, 4 Wider; derived default from the household's closest relation (parent/sibling/our kids → 1; aunt/uncle/first cousin/grandparent → 2; cousin's household/great-aunt → 3; rest → 4; friends from workbook InviteTier A/B/C → 2/3/4) and editable. Sort, group and bulk-decide by tier.
D2. Branch is free text from the workbook. Add `branches` (id, side, name like "Mark's dad's side", sort) or at least a display-name map; people keep branch_id.
D3. Friends need their own fields: `circle` (College, Work, Neighbors…), `known_by` (Mark | Angela | Both), `tier`, `last_seen`/note, `reciprocal` (we were at their wedding), and plus-one as either a named partner person or an unnamed +1. One friend household = one party (already true).
D4. gen is unreliable from the workbook for great-aunt branches; derive gen from links where possible, else stored gen; flag conflicts.
D5. Decision vocabulary is fine (Invite / If room / No / Undecided) but undecided must be visible as its own state ("?" chip), and "if room" rank should live per tier, not one global list.
D6. Placeholder children ("Child 1/2/3") should become a household child count until names are known (`unnamed_kids INT` on parties) instead of fake people.
