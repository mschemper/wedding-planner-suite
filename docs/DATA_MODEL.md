# Data model

## Budget
- `Scenario` → `items: LineItem[]` (`src/engine/types.ts`).
- Line types: `fixed` · `perGuest` (base + rate×g) · `bands` (piecewise-linear through data points) · `step` (break thresholds) · `minSpend` (max(min, rate×g)) · `percent` (rate × sum of applicable `taxable` items; the row stays in its listed position).
- `appliesIf: { minGuests?, maxGuests?, options?: {key: choice} }`.
- Scenario metadata: `kind` (local | destination, which drives attendance), `confidence`, `min`/`max` (modelled range), `capacity`, `rangeNote`, `understated`.
- Seasons: `seasons: {name, from: "MM-DD", to: "MM-DD"}[]` (first match wins; may wrap the year end); `appliesIf.seasons` picks the line items for a season; `closedSeasons` and `seasonMinGuests` set `Budget.unavailable`; `docSeason` is the season used when no date is given. `computeBudget(..., { date })`.
- Personal costs: `src/data/params.ts` `Params`; `buildScenarios(params)` → `SCENARIOS`.

## People (v4, DESIGN-v4 §3)
- **people**: id, first, last, nick, side (Mark | Angela | Both), branch (family side), gen (0 couple/siblings/cousins, -1 parents/aunts, -2 grandparents, +1 kids/nieces), kind (couple | family | friend), party_id → parties, partner_id (symmetric; server mirrors), parent_ids (JSON, ≤ 2, no loops), age (adult | child), override (null | invite | no: one-person exception), rsvp (none | accepted | declined), deceased, placeholder (tree-only, e.g. grandparents), local (local | away | unknown), circle (friends), plus_one, kids_room, label (relationship text when the tree can't derive it), notes, sort.
- **parties** (households / envelopes): id, name, invite (undecided | invite | ifroom | no), kids (policy | in | out), rank (order within its ring / tier), talk + talk_note, notes, tier (family 1 Inner · 2 Close · 3 Extended · 4 Wider; friends 1 Must · 2 Want · 3 Nice to have; null = derived, `src/people/tier.ts`), unnamed_kids, circle, known_by (Mark | Angela | Both), reciprocal (v5, migration 0003).
- Derived on save (v6): `gen` = parent gen + 1, else partner's, else stored; `kids_room` = age child (headcount and rings count kids by age; the column is kept in sync, not read).
- Linking (v6, `src/people/relatives.ts`): add relative ops (sibling without parents → one tree-only placeholder "<name>'s parents"), parent suggestions for unplaced relatives (same side, one generation up; branch + surname + matching relation), household move / merge ops.
- Couple rows (kind couple) anchor the tree; never counted. Placeholders have no party; every other person has one.
- Effective invite (`src/people/invite.ts`): override → party decision; children only when kids resolve in (party.kids, else `kidsPolicy`: ours = the couple's own kids, family = family households, all).
- Headcount (`src/people/headcount.ts`): invited / if room / undecided / no tallies (heads, adults, kids' room, expected at §2.3 rates: local 0.85, away 0.55, unknown 0.78; accepted 1, declined 0). Capacity cutoff per venue: main room = adults (+ kids when no kids' room) at full acceptance; ranked if-room households added until the cap.
- Relationships (`src/people/kin.ts`): derived from parent/partner links (core set + "-in-law" via one partner hop); a stored gendered label wins when it names the same relation. Label words match whole words; only the first "/" alternative counts; a possessive ("Aunt's stepson") or "great-" = unknown.
- Import (`npm run import:v4`, `src/people/fromWorkbook.ts`): workbook households → parties, individuals → people, friend groups → a party + 1–2 people; status precedence and inference rules in DESIGN-v4 §5. Output `data/private/garden.json` + `import-review.json` (both gitignored).
- Mailing addresses, phones and guest emails: not stored (no plan yet).

## Planning (v4)
- **venues**: one row per scenario (seeded; update only): active (shortlist), status (researching | tour booked | toured | held | quoted | booked | passed), hold_date, tour_date, contacts, next_step, notes.
- **musthaves**: id, text, detail, sort, archived (no delete). **fit**: id `{scenario_id}:{musthave_id}`, verdict (yes | partly | no | unknown), note. Fit score = (yes + ½ partly) / answered.
- **tasks**: id, title, detail, due, owner (Mark | Angela | Both), category, status (open | done), done_at, source (Gmail URL | email | manual), source_date, scenario_id, sort.
- **params** also holds settings: dateWindows, heldDate, kidsPolicy, branchNames (`src/data/params.ts` `Settings`).

## Stored (D1)
- Schema: `migrations/0001_init.sql` (quotes, params, audit, _guard; v3 guest tables kept until 0003) + `migrations/0002_garden.sql` (v4 tables). Specs: `worker/db.ts` `SPECS`.
- Every row: version / updated_at / updated_by. One save = one batch; stale version → 409; only newly introduced errors → 422; audit keeps the last 1,000 changes.
- Quotes: `Quote` (`src/engine/types.ts`); override semantics DESIGN-v3 §4. Params: one row per overridden key; no row = doc value.
