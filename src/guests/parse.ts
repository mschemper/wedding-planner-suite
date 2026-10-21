import type { FriendGroup, GuestData, Household, Individual } from "./schema";

export type Row = Record<string, unknown>;

/** ID columns are always strings (a numeric cell would otherwise never match a reference). */
const ID_COLS = new Set(["HouseholdID", "PersonID", "PartnerPersonID", "ParentPersonIDs", "FriendGroupID"]);

const clean = (r: Row): Row => {
  const o: Row = {};
  for (const [rawKey, v] of Object.entries(r)) {
    const k = rawKey.trim();
    if (v === null || v === undefined || v === "") continue;
    const val = v instanceof Date ? v.toISOString().slice(0, 10) : v;
    o[k] = typeof val === "string" ? val.trim() : ID_COLS.has(k) ? String(val) : val;
  }
  return o;
};

/** Sheet rows (header-keyed) → GuestData. Pure; xlsx I/O lives in scripts/import-guests.ts. */
export function parseSheets(sheets: { Households: Row[]; Individuals: Row[]; Friends?: Row[] }, source?: string): GuestData {
  return {
    households: sheets.Households.map(clean).filter((r) => r.HouseholdID) as unknown as Household[],
    individuals: sheets.Individuals.map(clean).filter((r) => r.PersonID) as unknown as Individual[],
    friends: (sheets.Friends ?? []).map(clean).filter((r) => r.FriendGroupID) as unknown as FriendGroup[],
    importedAt: new Date().toISOString(),
    source,
  };
}
