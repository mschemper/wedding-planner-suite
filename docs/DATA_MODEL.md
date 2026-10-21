# Data model

## Budget
- `Scenario` → `items: LineItem[]` (`src/engine/types.ts`).
- Line types: `fixed` · `perGuest` (base + rate×g) · `bands` (piecewise-linear through data points) · `step` (break thresholds) · `minSpend` (max(min, rate×g)) · `percent` (rate × sum of applicable `taxable` items; the row stays in its listed position).
- `appliesIf: { minGuests?, maxGuests?, options?: {key: choice} }`.
- Scenario metadata: `kind` (local | destination, which drives attendance), `confidence`, `min`/`max` (modelled range), `capacity`, `rangeNote`, `understated`.
- Seasons: `seasons: {name, from: "MM-DD", to: "MM-DD"}[]` (first match wins; may wrap the year end); `appliesIf.seasons` picks the line items for a season; `closedSeasons` and `seasonMinGuests` set `Budget.unavailable`; `docSeason` is the season used when no date is given. `computeBudget(..., { date })`.
- Personal costs: `src/data/params.ts` `Params`; `buildScenarios(params)` → `SCENARIOS`.

## Guests — mirrors `structured_guest_data_model.xlsx`
- **Households**: HouseholdID (e.g. `M-LUG-001` = family–branch–seq), Family (Mark | Angela), FamilySide, PrimaryHouseholdName, HouseholdType, Notes.
- **Individuals**: PersonID, HouseholdID → Households, names, Family, FamilySide, RelationshipToMark/Angela, GenerationGroup, AdultOrChild, HouseholdRole, PartnerPersonID → Individuals, ParentPersonIDs (comma-separated) → Individuals, InviteException + ExceptionReason, Locality (Local Chicago Area | Out of Town | Unknown), CityState, InvitePriority (Core | Review), InviteStatus (TBD | Invited | Accepted | Declined | Not inviting), Notes.
- **Friends**: FriendGroupID, GroupName, PrimaryContact, ConnectionTo, FriendCategory, Ranking, InviteTier, Locality, CityState, PlusOneDefault, AdultOrChild, InviteException, ExceptionReason, InviteStatus, Notes.
- Validation (`src/guests/validate.ts`): unique IDs, references, enums, and family consistency. Warnings for unknown locality and a missing graph.
- Flow: xlsx → `npm run import:guests` → `data/private/guests.json` → `src/guests/load.ts` (falls back to `data/fixtures/guests.sample.json`).
