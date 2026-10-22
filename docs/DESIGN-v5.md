# DESIGN-v5 -- People tab rebuild. Agent-facing.
Inputs: docs/REVIEW-v4-people.md (findings P1–P11, D1–D6); options docs/mockups/v5-people-options.html. Mark picked (22 Oct 2026): D room check, A1 rings, B1 outline tree, C1 friend shortlist; data: closeness tiers, friend fields, friendly branch names, unnamed-kids count + gen fix.
Size: Medium (one surface + one data change). Lead: data layer + pure logic + tests; one Sonnet builder: src/ui/people/*; lead QA + deploy.

## 1. Data (migration 0003_people_v5.sql, add-only + one generic data fix)
- parties + `tier INTEGER NULL` (family 1 Inner circle · 2 Close · 3 Extended · 4 Wider; friends 1 Must invite · 2 Want to · 3 Nice to have; NULL = derived), `unnamed_kids INTEGER NOT NULL DEFAULT 0`, `circle TEXT` (friends), `known_by TEXT` (Mark | Angela | Both), `reciprocal INTEGER NOT NULL DEFAULT 0` (we went to theirs).
- Data fix in 0003: people named `Child <n>` with age child → `parties.unnamed_kids` += count, rows deleted.
- Friend circle moves from people.circle to parties.circle (0003 copies the first member's circle; people.circle kept, unused).
- Settings key `branchNames` (params): { "<raw branch>": "<display name>" }; default derived: "X (Mark's father)" → "Mark's dad's side", "(…mother)" → "mom's side"; else raw.
- `rank` = order within a ring/tier (was: if-room order only).

## 2. Pure logic
- src/people/tier.ts: `derivedTier(party, data)`: family — min over members of relation tier (parent/sibling/child/step-child → 1; grandparent/aunt-uncle/niece-nephew → 2; cousin(-in-law) → 3; else 4), relation from kin.ts derivation, else the stored gendered label (ROOTS); friends — 2. `tierOf(party) = party.tier ?? derivedTier`. Labels per kind.
- src/people/rings.ts: rings = family tiers 1–4 then Friends; each ring: households sorted by side, tier rank, name; seats by decision (invite / ifroom / undecided / no); `fillPoint(rings, cap, kidsRoom)` = first household where cumulative main-room seats (invited + ifroom + undecided, in ring order) exceed the cap → the room line.
- src/people/outline.ts: per side → branch (display name) → roots (placeholders + people with no parents whose gen ≤ -1) → nested units (person + partner + household kids) by parent links; "Not placed yet" = family people with no parent link, gen ≥ 0 and not married-in; great-aunt/uncle generation (gen -2, unlinked) grouped under "Grandparents' generation".
- headcount.ts: + unnamed_kids per party (kids' room heads when kids resolve in; rate = the party's members' rate); if-room ordering = tier, rank, name.
- fromWorkbook.ts: Child-n placeholders → unnamed_kids; friend tier from InviteTier A/B/C → 1/2/3; circle/known_by on the party.

## 3. UI (src/ui/people/*, Sonnet builder)
- Views: Decide (rings) · Family (outline tree) · Friends (shortlist). Envelopes → "Export" button (JSON/xlsx) on the view bar. Add person/household/friend → one "Add" menu.
- Room check (sticky, one line): venue select; stacked bar invited / if room / undecided (hatched) with the cap line; counts; kids upstairs; ≈ total for the venue (useCompare summary).
- Decide: rings as sections; ring header = name, households, seats, "Invite all undecided" (one edit, Undo); household row = decision dot/? + names line ("Dad & Mom", "Brother Chad's household") + relation + seats (2 + 3 kids) + kids chip (tap → In/Out/Policy popover) + talk chip + 3-way control; room line drawn between rows at fillPoint. Filters: Undecided only toggle, side, search. Tier change from the row menu (Move to ring…).
- Family: outline per side (collapsible branches, display names, rename branch inline); rows show decision dot + names + relation chip + kids; "Not placed yet" tray with "Set parents"; tap row → household sheet.
- Friends: tiers Must invite / Want to / Nice to have; row = who-knows avatar (M / A / M+A), names, circle chip, partner/+1 chip, "we went to theirs" chip, decision control, ↑/↓ within tier; quick-add row (name, partner name or +1, circle, known by, tier) → one save (party + 1–2 people).
- Household sheet (new): name, tier (with "derived: Close"), kids policy, unnamed kids count, talk note, friend fields, members (open person sheet), decision. Person sheet stays for details.
- Phone: rows wrap to two lines; controls ≥ 44px; room check collapses to bar + "23 in · 70 undecided".

## 4. Out of scope
Drag-and-drop between rings (use "Move to ring…"); fan chart (B2).
