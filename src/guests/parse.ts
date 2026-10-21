import type { FriendGroup, GuestData, Household, Individual } from "./schema";

export type Row = Record<string, unknown>;

const clean = (r: Row): Row => {
  const o: Row = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined || v === "") continue;
    o[k] = typeof v === "string" ? v.trim() : v;
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
