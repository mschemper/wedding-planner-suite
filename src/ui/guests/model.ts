// Pure logic for the Guests screen: filtering, grouping, drafts → Op[]. No React, no I/O.
import type { ApiData, Op } from "../../api/types";
import type { FriendGroup, GuestData, Household, Individual } from "../../guests/schema";
import type { Issue } from "../../guests/validate";

export type Rec = Record<string, string>;

// Column order = src/guests/schema.ts interfaces (also the xlsx export order).
export const HH_COLS: (keyof Household)[] = ["HouseholdID", "Family", "FamilySide", "PrimaryHouseholdName", "HouseholdType", "Notes"];
export const PERSON_COLS: (keyof Individual)[] = [
  "PersonID", "HouseholdID", "FirstName", "LastName", "DisplayName", "Family", "FamilySide", "RelationshipToMark", "RelationshipToAngela",
  "GenerationGroup", "AdultOrChild", "HouseholdRole", "PartnerPersonID", "ParentPersonIDs", "InviteException", "ExceptionReason",
  "Locality", "CityState", "InvitePriority", "InviteStatus", "Notes",
];
export const FRIEND_COLS: (keyof FriendGroup)[] = [
  "FriendGroupID", "GroupName", "PrimaryContact", "ConnectionTo", "FriendCategory", "Ranking", "InviteTier", "Locality", "CityState",
  "PlusOneDefault", "AdultOrChild", "InviteException", "ExceptionReason", "InviteStatus", "Notes",
];
/** Editable columns (ids and Family/FamilySide of people are managed by the household). */
export const HH_FIELDS = ["Family", "FamilySide", "PrimaryHouseholdName", "HouseholdType", "Notes"] as const;
export const PERSON_FIELDS = PERSON_COLS.filter((c) => c !== "PersonID" && c !== "HouseholdID");
export const FRIEND_FIELDS = FRIEND_COLS.filter((c) => c !== "FriendGroupID");

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const rec = (row: object, cols: readonly string[]): Rec => {
  const o: Rec = {};
  for (const c of cols) o[c] = str((row as Record<string, unknown>)[c]);
  return o;
};

// ---------- filters ----------
export interface Filters {
  side: "All" | "Mark" | "Angela";
  aoc: "" | "Adult" | "Child";
  locality: "" | "Local Chicago Area" | "Out of Town" | "Unknown";
  status: "" | "TBD" | "Invited" | "Accepted" | "Declined" | "Not inviting";
  priority: "" | "Core" | "Review";
  exceptionsOnly: boolean;
  q: string;
}
export const NO_FILTERS: Filters = { side: "All", aoc: "", locality: "", status: "", priority: "", exceptionsOnly: false, q: "" };

const personFilterActive = (f: Filters) => !!(f.aoc || f.locality || f.status || f.priority || f.exceptionsOnly);
const lc = (s: unknown) => str(s).toLowerCase();

export function personMatches(p: Individual, f: Filters): boolean {
  if (f.aoc && p.AdultOrChild !== f.aoc) return false;
  if (f.locality && p.Locality !== f.locality) return false;
  if (f.status && p.InviteStatus !== f.status) return false;
  if (f.priority && p.InvitePriority !== f.priority) return false;
  if (f.exceptionsOnly && p.InviteException !== "Yes") return false;
  return true;
}
const personNameMatches = (p: Individual, q: string) => [p.DisplayName, p.FirstName, p.LastName].some((x) => lc(x).includes(q));

export function householdMatches(h: Household, people: Individual[], f: Filters): boolean {
  if (f.side !== "All" && h.Family !== f.side) return false;
  const q = f.q.trim().toLowerCase();
  if (q && !lc(h.PrimaryHouseholdName).includes(q) && !people.some((p) => personNameMatches(p, q))) return false;
  if (personFilterActive(f) && !people.some((p) => personMatches(p, f))) return false;
  return true;
}

export function friendMatches(g: FriendGroup, f: Filters): boolean {
  if (f.side !== "All") return false;
  if (f.priority) return false; // friends have no InvitePriority
  if (f.aoc && g.AdultOrChild !== f.aoc) return false;
  if (f.locality && g.Locality !== f.locality) return false;
  if (f.status && g.InviteStatus !== f.status) return false;
  if (f.exceptionsOnly && g.InviteException !== "Yes") return false;
  const q = f.q.trim().toLowerCase();
  if (q && !lc(g.GroupName).includes(q) && !lc(g.PrimaryContact).includes(q)) return false;
  return true;
}

// ---------- grouping ----------
export interface HouseholdRow { h: Household; people: Individual[] }
export interface HouseholdGroup { key: string; family: string; side: string; rows: HouseholdRow[] }

const FAMILY_ORDER = ["Mark", "Angela"];
const famRank = (f: string) => { const i = FAMILY_ORDER.indexOf(f); return i < 0 ? FAMILY_ORDER.length : i; };

/** Family (Mark, Angela, other) → FamilySide (A–Z) → household name (A–Z). Only households that match `f`. */
export function groupHouseholds(d: GuestData, f: Filters = NO_FILTERS): HouseholdGroup[] {
  const byHH = new Map<string, Individual[]>();
  for (const p of d.individuals) {
    const l = byHH.get(p.HouseholdID);
    if (l) l.push(p); else byHH.set(p.HouseholdID, [p]);
  }
  const groups = new Map<string, HouseholdGroup>();
  for (const h of d.households) {
    const people = byHH.get(h.HouseholdID) ?? [];
    if (!householdMatches(h, people, f)) continue;
    const side = str(h.FamilySide) || "(no side)";
    const key = `${h.Family}|${side}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, family: str(h.Family), side, rows: [] }));
    g.rows.push({ h, people });
  }
  const out = [...groups.values()];
  for (const g of out) g.rows.sort((a, b) => str(a.h.PrimaryHouseholdName).localeCompare(str(b.h.PrimaryHouseholdName)));
  out.sort((a, b) => famRank(a.family) - famRank(b.family) || a.family.localeCompare(b.family) || a.side.localeCompare(b.side));
  return out;
}

/** `where` ids (household and person ids) that carry a validation issue of level error or warn. */
export function issueIds(issues: Issue[]): Set<string> {
  return new Set(issues.map((i) => i.where));
}
export function householdHasIssue(h: Household, people: Individual[], ids: Set<string>): boolean {
  return ids.has(h.HouseholdID) || people.some((p) => ids.has(p.PersonID));
}

// ---------- drafts ----------
export interface PersonDraft { id: string; isNew: boolean; row: Rec }
export type Draft =
  | { kind: "household"; id: string | null; tmp: string; row: Rec; branch: string; people: PersonDraft[]; removed: string[]; del: boolean }
  | { kind: "friend"; id: string | null; tmp: string; row: Rec; del: boolean };

let seq = 0;
export const newTmp = (what: string) => `tmp:${what}${++seq}`;

export const NEW_PERSON_DEFAULTS: Rec = { AdultOrChild: "Adult", Locality: "Unknown", InviteStatus: "TBD", InvitePriority: "Core", InviteException: "No" };

export function blankPerson(hh: Rec): PersonDraft {
  const row = rec({}, PERSON_FIELDS);
  Object.assign(row, NEW_PERSON_DEFAULTS, { Family: hh.Family ?? "Mark", FamilySide: hh.FamilySide ?? "" });
  return { id: newTmp("p"), isNew: true, row };
}

export function householdDraft(d: GuestData, id: string | null, defaults: Partial<Rec> = {}): Draft {
  if (id === null) {
    const row = { ...rec({}, HH_FIELDS), Family: "Mark", ...defaults };
    return { kind: "household", id: null, tmp: newTmp("h"), row, branch: "", people: [blankPerson(row)], removed: [], del: false };
  }
  const h = d.households.find((x) => x.HouseholdID === id);
  if (!h) throw new Error(`unknown household ${id}`);
  const people = d.individuals.filter((p) => p.HouseholdID === id).map((p) => ({ id: p.PersonID, isNew: false, row: rec(p, PERSON_FIELDS) }));
  return { kind: "household", id, tmp: "", row: rec(h, HH_FIELDS), branch: "", people, removed: [], del: false };
}

export function friendDraft(d: GuestData, id: string | null): Draft {
  if (id === null) {
    return { kind: "friend", id: null, tmp: newTmp("f"), row: { ...rec({}, FRIEND_FIELDS), Locality: "Unknown", PlusOneDefault: "No", AdultOrChild: "Adult", InviteException: "No", InviteStatus: "TBD" }, del: false };
  }
  const g = d.friends.find((x) => x.FriendGroupID === id);
  if (!g) throw new Error(`unknown friend group ${id}`);
  return { kind: "friend", id, tmp: "", row: rec(g, FRIEND_FIELDS), del: false };
}

const defaultDisplayName = (r: Rec) => `${r.FirstName ?? ""} ${r.LastName ?? ""}`.trim();
/** Fills DisplayName from "First Last" when blank. */
export function withDisplayNames(p: PersonDraft): PersonDraft {
  return p.row.DisplayName.trim() ? p : { ...p, row: { ...p.row, DisplayName: defaultDisplayName(p.row) } };
}

/** The household's id as other rows see it (real id, or the tmp id for a new household). */
export const draftHouseholdId = (dr: Extract<Draft, { kind: "household" }>) => dr.id ?? dr.tmp;

/** Current people of the draft (those not removed), with blank DisplayNames filled. */
export const livePeople = (dr: Extract<Draft, { kind: "household" }>) => dr.people.filter((p) => !dr.removed.includes(p.id)).map(withDisplayNames);

function toIndividual(p: PersonDraft, hhId: string, hh: Rec): Individual {
  const r = p.row;
  const o: Record<string, unknown> = { PersonID: p.id, HouseholdID: hhId };
  for (const c of PERSON_FIELDS) if (r[c] !== "") o[c] = r[c];
  o.Family = r.Family || hh.Family;
  o.FamilySide = r.FamilySide ?? hh.FamilySide ?? "";
  for (const c of ["FirstName", "LastName", "GenerationGroup", "HouseholdRole"] as const) o[c] = r[c] ?? "";
  return o as unknown as Individual;
}

/** `d` with the draft applied (for validation and pickers). A deleted household/friend is removed. */
export function applyDraft(d: GuestData, dr: Draft): GuestData {
  if (dr.kind === "friend") {
    const friends = d.friends.filter((g) => g.FriendGroupID !== dr.id);
    if (dr.del) return { ...d, friends };
    const row: Record<string, unknown> = { FriendGroupID: dr.id ?? dr.tmp };
    for (const c of FRIEND_FIELDS) if (dr.row[c] !== "") row[c] = dr.row[c];
    const f = row as unknown as FriendGroup;
    const i = dr.id ? d.friends.findIndex((g) => g.FriendGroupID === dr.id) : -1;
    if (i >= 0) { const next = [...d.friends]; next[i] = f; return { ...d, friends: next }; }
    return { ...d, friends: [...friends, f] };
  }
  const hhId = draftHouseholdId(dr);
  const households = d.households.filter((h) => h.HouseholdID !== hhId);
  const individuals = d.individuals.filter((p) => p.HouseholdID !== hhId);
  if (dr.del) return { ...d, households, individuals };
  const h: Record<string, unknown> = { HouseholdID: hhId };
  for (const c of HH_FIELDS) if (dr.row[c] !== "" || c === "FamilySide" || c === "PrimaryHouseholdName" || c === "HouseholdType") h[c] = dr.row[c];
  const people = livePeople(dr).map((p) => toIndividual(p, hhId, dr.row));
  // keep original position for existing rows so list order is stable
  const idx = dr.id ? d.households.findIndex((x) => x.HouseholdID === dr.id) : -1;
  const hs = [...households];
  if (idx >= 0) hs.splice(Math.min(idx, hs.length), 0, h as unknown as Household); else hs.push(h as unknown as Household);
  return { ...d, households: hs, individuals: [...individuals, ...people] };
}

// ---------- draft → Op[] ----------
type Versions = Pick<ApiData, "households" | "individuals" | "friends"> | null;
const versionOf = (raw: Versions, table: "households" | "individuals" | "friends", id: string): number => {
  const list = (raw?.[table] ?? []) as unknown as Record<string, unknown>[];
  const pk = table === "households" ? "HouseholdID" : table === "individuals" ? "PersonID" : "FriendGroupID";
  const r = list.find((x) => x[pk] === id);
  if (!r) throw new Error(`no version for ${id} — reload`);
  return Number(r.version);
};

/** Only the columns whose draft value differs from the original (""/missing treated alike; "" clears). */
export function changedFields(orig: Rec, now: Rec, cols: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cols) if ((now[c] ?? "") !== (orig[c] ?? "")) out[c] = now[c] ?? "";
  return out;
}
const nonEmpty = (r: Rec, cols: readonly string[]): Record<string, string> => {
  const o: Record<string, string> = {};
  for (const c of cols) if ((r[c] ?? "") !== "") o[c] = r[c];
  return o;
};

/**
 * Order: household create/update → people create/update → person deletes → household delete.
 * Deleting a household deletes all its stored people first and sends nothing else.
 */
export function buildOps(dr: Draft, orig: GuestData, raw: Versions): Op[] {
  if (dr.kind === "friend") {
    if (dr.id === null) return dr.del ? [] : [{ table: "friends", op: "create", row: { FriendGroupID: dr.tmp, ...nonEmpty(dr.row, FRIEND_FIELDS) } }];
    const v = versionOf(raw, "friends", dr.id);
    if (dr.del) return [{ table: "friends", op: "delete", id: dr.id, version: v }];
    const o = orig.friends.find((g) => g.FriendGroupID === dr.id);
    const ch = changedFields(o ? rec(o, FRIEND_FIELDS) : {}, dr.row, FRIEND_FIELDS);
    return Object.keys(ch).length ? [{ table: "friends", op: "update", id: dr.id, version: v, row: ch }] : [];
  }

  const ops: Op[] = [];
  const stored = dr.id ? orig.individuals.filter((p) => p.HouseholdID === dr.id) : [];
  if (dr.del) {
    if (dr.id === null) return [];
    for (const p of stored) ops.push({ table: "individuals", op: "delete", id: p.PersonID, version: versionOf(raw, "individuals", p.PersonID) });
    ops.push({ table: "households", op: "delete", id: dr.id, version: versionOf(raw, "households", dr.id) });
    return ops;
  }

  const hhId = draftHouseholdId(dr);
  if (dr.id === null) {
    const row: Record<string, unknown> = { HouseholdID: dr.tmp, ...nonEmpty(dr.row, HH_FIELDS) };
    if (dr.branch.trim()) row._branch = dr.branch.trim();
    ops.push({ table: "households", op: "create", row });
  } else {
    const o = orig.households.find((h) => h.HouseholdID === dr.id);
    const ch = changedFields(o ? rec(o, HH_FIELDS) : {}, dr.row, HH_FIELDS);
    if (Object.keys(ch).length) ops.push({ table: "households", op: "update", id: dr.id, version: versionOf(raw, "households", dr.id), row: ch });
  }

  for (const p of livePeople(dr)) {
    if (p.isNew) {
      const row: Record<string, unknown> = { PersonID: p.id, HouseholdID: hhId, ...nonEmpty(p.row, PERSON_FIELDS) };
      row.Family = p.row.Family || dr.row.Family;
      ops.push({ table: "individuals", op: "create", row });
    } else {
      const o = orig.individuals.find((x) => x.PersonID === p.id);
      const ch = changedFields(o ? rec(o, PERSON_FIELDS) : {}, p.row, PERSON_FIELDS);
      if (Object.keys(ch).length) ops.push({ table: "individuals", op: "update", id: p.id, version: versionOf(raw, "individuals", p.id), row: ch });
    }
  }
  for (const id of dr.removed) {
    if (!stored.some((p) => p.PersonID === id)) continue; // removed before it was ever saved
    ops.push({ table: "individuals", op: "delete", id, version: versionOf(raw, "individuals", id) });
  }
  return ops;
}

/** Issues that belong to this draft's household or friend group (for inline display). */
export function issuesFor(dr: Draft, issues: Issue[]): { hh: Issue[]; byPerson: Map<string, Issue[]> } {
  const byPerson = new Map<string, Issue[]>();
  if (dr.kind === "friend") return { hh: issues.filter((i) => i.where === (dr.id ?? dr.tmp)), byPerson };
  const hhId = draftHouseholdId(dr);
  const ids = new Set(dr.people.map((p) => p.id));
  const hh: Issue[] = [];
  for (const i of issues) {
    if (i.where === hhId) hh.push(i);
    else if (ids.has(i.where)) byPerson.set(i.where, [...(byPerson.get(i.where) ?? []), i]);
  }
  return { hh, byPerson };
}

export const splitIds = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
export const joinIds = (ids: string[]) => ids.join(", ");

/** Sets a household field; people whose Family/FamilySide equalled the old value follow it (keeps validateGuests quiet). */
export function setHouseholdField(dr: Extract<Draft, { kind: "household" }>, key: string, val: string): Draft {
  const old = dr.row[key] ?? "";
  const sync = key === "Family" || key === "FamilySide";
  const people = sync ? dr.people.map((p) => ((p.row[key] ?? "") === old ? { ...p, row: { ...p.row, [key]: val } } : p)) : dr.people;
  return { ...dr, row: { ...dr.row, [key]: val }, people };
}
