# Backlog: what is known and not yet done

**Read this before planning a release.** Each item says where it came from, its size (docs/RELEASE.md), where the code is, and a proposed fix. When an item ships, move it to CHANGELOG.md and delete it here.

Last reviewed: 20 Oct 2026 (v2 built; items come from docs/REVIEW-v2.md).

---

## Mark's actions (data, not code)

### D1. Fill the guest workbook (REVIEW G-01–G-04)
Add Angela's side (doc target ~40), the Friends sheet, `Locality` for every person, and `PartnerPersonID`/`ParentPersonIDs`. Review the four placeholder children and the "Cousin child" row. Then run `npm run import:guests -- <xlsx>` and update STATE "Guest data". Changes the venue answer more than any code item.

### D2. Send the five quote requests (STATE "Open quotes")
Each answer replaces an estimate in `src/data/scenarios.ts` → golden + HISTORY entry.

---

## Requested / planned (features)

### F1. Rockwell on the River as scenario 17 — S
Mark emailed them on 6 Oct 2026 about a tour; it isn't modelled. Needs a published rate or quote. Add it to `scenarios.ts` along with a golden row of the inputs it's built from.

### F2. Season-aware pricing (REVIEW F-08) — S
River Room under 100 guests uses the winter rate; a spring date is likely peak (+$2,000, 100-guest bar minimum). Add a `season` option or a month-driven step to `scenarios.ts` S4, with golden rows for peak at 50/75. Check every other scenario for date assumptions.

### F3. Global parameters layer (REVIEW F-14) — S
Move dress, hair & makeup, photo, band, favors and the tax bands into `src/data/params.ts`, and have scenarios reference them. **No total may change**; golden stays green.

### F4. Matching bar tier in compare (REVIEW F-11) — S
The comparison venue is priced at its default bar tier. Map beer & wine ↔ beer & wine and full ↔ full instead. Code: `src/ui/App.tsx` DetailView.

### F5. Saved state — XS
Remember guests, month, contingency and the selected venue in localStorage, wrapped in try/catch. Code: `src/ui/App.tsx`.

### F6. Guest list UI — M
A household table with filters from the workbook's Filter Guide sheet, invite-status editing, and export back to xlsx. Shared data first: write and test `src/guests/` mutations before the UI.

### F7. Family graph — M (needs D1 edges)
A force-directed view built from `PartnerPersonID`/`ParentPersonIDs`. If v1 graph code exists, put it in `archive/` and port it.

### F8. Port missing v1 pieces — size on arrival
The force-directed graph and the mobile companion app from earlier work aren't in this repo. Mark supplies the files → review against REVIEW-v2 conventions and list findings before editing.

### F9. Quote tracker — M
Per-scenario actual quotes that override estimates, with variance against the model. Depends on F3.

### F10. Mobile pass — S
A responsive check at 390 px on the single-file build. A PWA only if Mark still wants one afterwards.

---

## Bugs / debt

### B1. Toggle buttons lack `aria-pressed` — XS
`src/ui/App.tsx` GuestPicker and the option toggles.

### B2. Personal items duplicated per scenario — see F3.
