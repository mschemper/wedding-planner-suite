// Linking people (REVIEW-v6 R1, R2, R4). Pure. Add relative, generation from links, placement suggestions, household moves.
// Every builder returns save ops (one batch, tmp ids) so a link change is atomic.
import type { Op } from "../api/types";
import { anchorFor, derivedRelation, graph, relationRoot } from "./kin";
import type { Age, PeopleData, Person } from "./types";

export type RelKind = "partner" | "child" | "sibling" | "parent";
export const REL_LABEL: Record<RelKind, string> = { partner: "Partner", child: "Child", sibling: "Sibling", parent: "Parent" };

type Row = Record<string, unknown>;
export type Versioned<T> = T & { version: number };
export type VersionOf = (id: string) => number | undefined;

/** Defaults for a relative of `of` (side, branch, kind, generation, links). */
export function relativeDefaults(of: Person, rel: RelKind): Partial<Person> {
  const base = { side: of.side, branch: of.branch ?? null, kind: of.kind === "couple" ? "family" : of.kind, local: of.local } as Partial<Person>;
  const g = of.gen ?? 0;
  switch (rel) {
    case "parent": return { ...base, gen: g - 1, age: "adult" };
    case "partner": return { ...base, gen: g, age: of.age, partner_id: of.id, party_id: of.party_id ?? null };
    case "child": return { ...base, gen: g + 1, age: "child", parent_ids: [of.id, ...(of.partner_id ? [of.partner_id] : [])], party_id: of.party_id ?? null };
    case "sibling": return { ...base, gen: g, age: of.age, parent_ids: [...of.parent_ids] };
  }
}

/** Which "Add relative" choices make sense for `of` (partner: none yet; parent: fewer than 2). */
export function relativeChoices(of: Person): RelKind[] {
  const out: RelKind[] = [];
  if (!of.partner_id && of.kind !== "couple") out.push("partner");
  out.push("child");
  if (of.kind !== "couple" && !of.placeholder) out.push("sibling");
  if (of.parent_ids.length < 2 && of.kind !== "couple") out.push("parent");
  return out;
}

/** Generation from links: parent + 1, else partner's, else child − 1; null when nothing linked has one. */
export function genFromLinks(links: { parent_ids?: string[]; partner_id?: string | null; child_ids?: string[] }, byId: Map<string, Person>): number | null {
  const gens = (ids: string[] | undefined) => (ids ?? []).map((id) => byId.get(id)?.gen).filter((g): g is number => g != null);
  const par = gens(links.parent_ids);
  if (par.length) return Math.max(...par) + 1;
  const partner = links.partner_id ? byId.get(links.partner_id)?.gen : null;
  if (partner != null) return partner;
  const kids = gens(links.child_ids);
  if (kids.length) return Math.min(...kids) - 1;
  return null;
}

/** Household default for a new relative: partner/child (and a child's sibling or parent) share `of`'s household. */
export function defaultHousehold(of: Person, rel: RelKind, age: Age): "same" | "new" {
  if (!of.party_id) return "new";
  if (rel === "partner") return "same";
  if (rel === "child") return age === "child" ? "same" : "new";
  if (rel === "sibling") return of.age === "child" && age === "child" ? "same" : "new";
  return of.age === "child" ? "same" : "new";
}

export interface RelativeInput {
  first: string;
  last: string;
  age: Age;
  /** "same" = of's household; "new" = a new household; else a party id */
  household: string;
  householdName?: string;
}

/**
 * One save for "Add <rel> of <of>". Parent: also adds the new person to `of`'s parents. Sibling of someone with no
 * parents: creates one tree-only placeholder ("<name>'s parents") so the two are linked as siblings.
 */
export function relativeOps(of: Versioned<Person>, rel: RelKind, input: RelativeInput, byId: Map<string, Person>): Op[] {
  const d = relativeDefaults(of, rel);
  const ops: Op[] = [];
  let party: string | null;
  if (input.household === "same") party = of.party_id ?? null;
  else if (input.household === "new") {
    const name = input.householdName?.trim() || `${input.last.trim() || input.first.trim()} household`;
    ops.push({ table: "parties", op: "create", row: { id: "tmp:hh", name, invite: "undecided", kids: "policy", talk: false } });
    party = "tmp:hh";
  } else party = input.household;

  let parents = d.parent_ids ?? [];
  if (rel === "sibling" && !parents.length) {
    ops.push({ table: "people", op: "create", row: {
      id: "tmp:pp", first: `${of.nick || of.first}'s parents`, last: null, side: of.side, branch: of.branch ?? null, kind: "family",
      gen: (of.gen ?? 0) - 1, party_id: null, parent_ids: [], age: "adult", placeholder: true, deceased: false, rsvp: "none", local: "unknown",
      plus_one: false, kids_room: false,
    } });
    ops.push({ table: "people", op: "update", id: of.id, version: of.version, row: { parent_ids: ["tmp:pp"] } });
    parents = ["tmp:pp"];
  }
  const gen = rel === "child" ? genFromLinks({ parent_ids: parents }, byId) ?? d.gen : d.gen;
  ops.push({ table: "people", op: "create", row: {
    id: "tmp:p", first: input.first.trim(), last: input.last.trim() || null, side: d.side, branch: d.branch ?? null, kind: d.kind,
    gen: gen ?? null, party_id: party, partner_id: d.partner_id ?? null, parent_ids: parents, age: input.age,
    kids_room: input.age === "child", local: d.local ?? "unknown", placeholder: false, deceased: false, rsvp: "none", plus_one: false,
  } });
  if (rel === "parent") ops.push({ table: "people", op: "update", id: of.id, version: of.version, row: { parent_ids: [...of.parent_ids, "tmp:p"] } });
  return ops;
}

export const relativeIssues = (i: RelativeInput) => [
  ...(i.first.trim() ? [] : ["First name is required."]),
  ...(i.household ? [] : ["Pick a household."]),
];

// ---------- placement (REVIEW-v6 R2) ----------
export interface ParentUnit {
  /** the unit's people (1–2): an existing person and their partner */
  ids: string[];
  names: string;
  party_id: string | null;
}
export interface Suggestion {
  /** the blood relative in the unplaced unit (gets the parent link) */
  childId: string;
  best: ParentUnit | null;
  /** other plausible units, best first */
  others: ParentUnit[];
}

const first = (p: Person) => p.nick || p.first;
const unitNames = (ps: Person[]) => ps.map(first).join(" & ") + (ps[0]?.last && ps.every((p) => p.last === ps[0].last) ? ` ${ps[0].last}` : "");
const inLaw = (p: Person) => /in-law|by marriage|spouse|partner|wife|husband/i.test(p.label ?? "");

/** Expected relation of the parents, given the child's relation to the couple. */
const PARENT_ROOT: Record<string, string> = { cousin: "aunt/uncle", "niece/nephew": "sibling", sibling: "parent", "aunt/uncle": "grandparent", child: "self" };

/** Pick the blood relative of an unplaced unit (not the married-in partner). */
export function bloodMember(unit: Person[]): Person {
  return unit.find((p) => !inLaw(p) && !p.placeholder) ?? unit[0];
}

/**
 * Suggest parents for an unplaced person: units one generation up on the same side; scored by same branch,
 * shared surname and a matching relation (a cousin's parents are an aunt/uncle). `best` only when it clearly leads.
 */
export function suggestParents(childId: string, d: PeopleData): Suggestion {
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const child = byId.get(childId);
  if (!child) return { childId, best: null, others: [] };
  const g = graph(d.people);
  const anchor = anchorFor(d.people, child.side);
  const relOf = (p: Person) => relationRoot((anchor && derivedRelation(g, anchor, p.id)) || null) ?? relationRoot(p.label);
  const want = PARENT_ROOT[relationRoot(child.label) ?? relOf(child) ?? ""];
  const cg = child.gen ?? 0;
  const seen = new Set<string>();
  const scored: { u: ParentUnit; s: number }[] = [];
  for (const p of d.people) {
    if (seen.has(p.id) || p.id === child.id || p.kind === "friend" || p.side !== child.side && p.kind !== "couple") continue;
    if ((p.gen ?? 0) !== cg - 1) continue;
    const partner = p.partner_id ? byId.get(p.partner_id) : undefined;
    const ps = [p, ...(partner ? [partner] : [])];
    // a household's other adult with no partner link (e.g. aunt + uncle imported unlinked) joins the unit
    if (!partner && p.party_id) {
      const mate = d.people.find((q) => q.id !== p.id && q.party_id === p.party_id && q.age === "adult" && !q.partner_id && (q.gen ?? 0) === cg - 1);
      if (mate) ps.push(mate);
    }
    for (const x of ps) seen.add(x.id);
    if (ps.some((x) => child.parent_ids.includes(x.id))) continue;
    let s = 0;
    if (child.branch && ps.some((x) => x.branch === child.branch)) s += 2;
    if (child.last && ps.some((x) => x.last === child.last)) s += 3;
    if (want && ps.some((x) => (want === "self" ? x.kind === "couple" : relOf(x) === want))) s += 2;
    if (s > 0) scored.push({ u: { ids: ps.map((x) => x.id), names: unitNames(ps), party_id: p.party_id ?? null }, s });
  }
  scored.sort((a, b) => b.s - a.s || a.u.names.localeCompare(b.u.names));
  const clear = scored.length > 0 && scored[0].s >= 4 && (scored.length === 1 || scored[0].s > scored[1].s);
  return { childId, best: clear ? scored[0].u : null, others: scored.slice(clear ? 1 : 0, 6).map((x) => x.u) };
}

/** Parent units on one side + branch, for the "These are the kids of" picker. */
export function parentUnits(d: PeopleData, side: string, branch: string | null): ParentUnit[] {
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: ParentUnit[] = [];
  for (const p of d.people) {
    if (seen.has(p.id) || p.kind !== "family" || p.side !== side || (branch && p.branch !== branch) || (p.gen ?? 0) > -1 && !p.placeholder) continue;
    const partner = p.partner_id ? byId.get(p.partner_id) : undefined;
    const ps = [p, ...(partner ? [partner] : [])];
    for (const x of ps) seen.add(x.id);
    out.push({ ids: ps.map((x) => x.id), names: unitNames(ps), party_id: p.party_id ?? null });
  }
  return out.sort((a, b) => a.names.localeCompare(b.names));
}

/** Link each child to the unit's people as parents (max 2); gen follows. Patches for edit() (Undo). */
export function linkParentsPatches(childIds: string[], unit: ParentUnit, d: PeopleData): { table: "people"; id: string; row: Row }[] {
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const parents = unit.ids.slice(0, 2);
  const gen = genFromLinks({ parent_ids: parents }, byId);
  return childIds.filter((id) => byId.has(id)).map((id) => {
    const row: Row = { parent_ids: parents };
    if (gen != null && byId.get(id)!.gen !== gen) row.gen = gen;
    return { table: "people" as const, id, row };
  });
}

// ---------- household moves (REVIEW-v6 R4) ----------
/** Move people to a household (existing id or a new one named `newName`). One save. */
export function moveOps(people: Versioned<Person>[], target: { party: string } | { newName: string }): Op[] {
  const ops: Op[] = [];
  let party: string;
  if ("newName" in target) {
    ops.push({ table: "parties", op: "create", row: { id: "tmp:hh", name: target.newName.trim() || "New household", invite: "undecided", kids: "policy", talk: false } });
    party = "tmp:hh";
  } else party = target.party;
  for (const p of people) if (p.party_id !== party) ops.push({ table: "people", op: "update", id: p.id, version: p.version, row: { party_id: party } });
  return ops;
}

/** Merge household `from` into `into`: move every member, then delete `from`. */
export function mergeOps(from: Versioned<{ id: string }>, into: string, members: Versioned<Person>[]): Op[] {
  return [...moveOps(members, { party: into }), { table: "parties", op: "delete", id: from.id, version: from.version }];
}

/** People moving with `p`: their partner when in the same household. */
export function movesWith(p: Person, byId: Map<string, Person>): Person[] {
  const q = p.partner_id ? byId.get(p.partner_id) : undefined;
  return q && q.party_id === p.party_id ? [p, q] : [p];
}
