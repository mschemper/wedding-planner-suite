// Family garden grouping (DESIGN-v4 §4): couple centre; each side's branches are beds; rows by generation; clusters by party.
// Edges only where parent/partner links exist. Pure data: the UI decides coordinates.
import type { Party, PeopleData, Person, Side } from "./types";

export interface Cluster {
  party: Party | null;
  members: Person[];
}
export interface BedRow {
  gen: number;
  clusters: Cluster[];
}
export interface Bed {
  side: Side;
  /** branch name; "Other" when none */
  branch: string;
  rows: BedRow[];
  count: number;
}
export interface Edge {
  from: string;
  to: string;
  kind: "parent" | "partner";
}
export interface Garden {
  couple: Person[];
  beds: Bed[];
  edges: Edge[];
  /** friends grouped by circle */
  circles: { circle: string; side: Side; clusters: Cluster[] }[];
}

const byName = (a: Person, b: Person) => (a.sort ?? 0) - (b.sort ?? 0) || a.first.localeCompare(b.first) || a.id.localeCompare(b.id);

function clusters(people: Person[], parties: Map<string, Party>): Cluster[] {
  const m = new Map<string, Person[]>();
  for (const p of people) {
    const k = p.party_id ?? `solo:${p.id}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(p);
  }
  return [...m.entries()]
    .map(([k, members]) => ({ party: parties.get(k) ?? null, members: members.sort(byName) }))
    .sort((a, b) => (a.party?.name ?? a.members[0].first).localeCompare(b.party?.name ?? b.members[0].first));
}

export function buildGarden(d: PeopleData): Garden {
  const parties = new Map(d.parties.map((x) => [x.id, x]));
  const couple = d.people.filter((p) => p.kind === "couple").sort((a, b) => (a.side === "Mark" ? -1 : 1) - (b.side === "Mark" ? -1 : 1));
  const family = d.people.filter((p) => p.kind === "family");
  const beds = new Map<string, Person[]>();
  for (const p of family) {
    const k = `${p.side}\u0000${p.branch || "Other"}`;
    if (!beds.has(k)) beds.set(k, []);
    beds.get(k)!.push(p);
  }
  const bedList: Bed[] = [...beds.entries()].map(([k, people]) => {
    const [side, branch] = k.split("\u0000") as [Side, string];
    const gens = new Map<number, Person[]>();
    for (const p of people) {
      const g = p.gen ?? 0;
      if (!gens.has(g)) gens.set(g, []);
      gens.get(g)!.push(p);
    }
    const rows = [...gens.entries()].sort((a, b) => a[0] - b[0]).map(([gen, ps]) => ({ gen, clusters: clusters(ps, parties) }));
    return { side, branch, rows, count: people.filter((p) => !p.placeholder).length };
  }).sort((a, b) => (a.side === b.side ? a.branch.localeCompare(b.branch) : a.side === "Mark" ? -1 : 1));

  const ids = new Set(d.people.map((p) => p.id));
  const edges: Edge[] = [];
  for (const p of d.people) {
    for (const par of p.parent_ids) if (ids.has(par)) edges.push({ from: par, to: p.id, kind: "parent" });
    if (p.partner_id && ids.has(p.partner_id) && p.id < p.partner_id) edges.push({ from: p.id, to: p.partner_id, kind: "partner" });
  }

  const circ = new Map<string, Person[]>();
  for (const p of d.people.filter((x) => x.kind === "friend")) {
    const k = `${p.side}\u0000${p.circle || "Friends"}`;
    if (!circ.has(k)) circ.set(k, []);
    circ.get(k)!.push(p);
  }
  const circles = [...circ.entries()].map(([k, ps]) => {
    const [side, circle] = k.split("\u0000") as [Side, string];
    return { circle, side, clusters: clusters(ps, parties) };
  }).sort((a, b) => a.side.localeCompare(b.side) || a.circle.localeCompare(b.circle));

  return { couple, beds: bedList, edges, circles };
}

/** Defaults for "Add relative" from a node (DESIGN-v4 §2). */
export function relativeDefaults(of: Person, rel: "parent" | "partner" | "child" | "sibling"): Partial<Person> {
  const base = { side: of.side, branch: of.branch ?? null, kind: of.kind === "couple" ? "family" : of.kind, local: of.local } as Partial<Person>;
  const g = of.gen ?? 0;
  switch (rel) {
    case "parent": return { ...base, gen: g - 1, age: "adult" };
    case "partner": return { ...base, gen: g, age: of.age, partner_id: of.id, party_id: of.party_id ?? null };
    case "child": return { ...base, gen: g + 1, age: "child", kids_room: true, parent_ids: [of.id, ...(of.partner_id ? [of.partner_id] : [])], party_id: of.party_id ?? null };
    case "sibling": return { ...base, gen: g, age: of.age, parent_ids: [...of.parent_ids] };
  }
}
