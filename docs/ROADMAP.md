# Roadmap

Ordered by value to the decision in front of you: **venue + guest count for a spring-2027 date**. Each item is sized for `docs/RELEASE.md`.

## Now — data, not code
1. **Fill the guest workbook** (G-01–G-03): Angela's side (target ~40), Friends sheet, `Locality`, partner and parent links. Re-run `npm run import:guests`. *You, not Claude.*
2. **Send the five quote requests** (Reconciled Master Part VI). Three Top, The Joinery band rule, and the Aquatorium rental move the ranking most.

## Next — S
3. **Season-aware pricing** (F-08): a `season` option on River Room (winter/peak) and month-driven defaults. Add golden rows for peak-rate River Room at 50/75.
4. **Global parameters layer** (F-14): `src/data/params.ts` for dress, hair & makeup, photo, band, favors, tax bands. Scenarios reference the parameters; golden stays green.
5. **Option matching in compare** (F-11): price the comparison venue at the equivalent bar tier (beer & wine ↔ full).
6. **Saved state**: remember guests, month, contingency, and selected venue in localStorage, wrapped in try/catch.

## Later — M
7. **Guest list UI**: a household table with filters from the workbook's Filter Guide sheet, invite-status editing, and export back to xlsx.
8. **Family graph**: rebuild the force-directed view from `PartnerPersonID`/`ParentPersonIDs` once they're filled. If the old graph code exists, put it in `legacy/` and port it.
9. **Quote tracker**: per-scenario actual quotes overriding estimates, with variance against the model.
10. **Mobile companion**: a responsive pass on the single-file build first. A PWA only if it's still needed.

## Prompts to start these in Claude Code
- "Read docs/REVIEW.md F-08 and ROADMAP #3. Implement season-aware River Room pricing. Keep golden green and add peak-season golden rows."
- "ROADMAP #4: extract shared personal costs into src/data/params.ts. No total may change; run npm run check."
- "Port legacy/<file> into src/; review against docs/REVIEW.md conventions first and list findings before editing."
