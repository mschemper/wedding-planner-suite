// Family outline tree (DESIGN-v5 §2, option B1). Pure. Side → branch → nested household units by parent links.
// A unit = one person + their partner (if any). Children of a unit are units whose person has a parent in it.
// v7: tree-only placeholders and deceased people are never shown. A unit with nobody living left is a "junction": it has no
// people, keeps its children, and the UI draws it as a dashed connector (e.g. Lugene's parents linking Lugene and his aunt).
import type { PeopleData, Person, Side } from "./types";

export interface Unit {
  /** the unit's first person (blood relative when known) */
  id: string;
  /** living people shown on the row (empty for a junction) */
  people: Person[];
  /** nobody living in the unit: draw only the connector to its children */
  hidden?: boolean;
  /** household of the unit (first person's party) */
  party_id: string | null;
  children: Unit[];
}
export interface OutlineBranch {
  side: Side;
  /** raw branch value (display name via settings.branchNames) */
  branch: string;
  roots: Unit[];
  /** grandparents' generation without links (great-aunts/uncles) */
  elders: Unit[];
  /** relatives with no parent link yet */
  unplaced: Unit[];
  /** this branch's people drawn in another branch's unit (with a partner from there) */
  elsewhere: Person[];
  count: number;
}
export interface Outline {
  couple: Person[];
  branches: OutlineBranch[];
  unplacedTotal: number;
}

const byName = (a: Person, b: Person) => (a.sort ?? 0) - (b.sort ?? 0) || (a.gen ?? 0) - (b.gen ?? 0) || a.first.localeCompare(b.first) || a.id.localeCompare(b.id);

export function buildOutline(d: PeopleData): Outline {
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const couple = d.people.filter((p) => p.kind === "couple").sort((a) => (a.side === "Mark" ? -1 : 1));
  const coupleParents = new Set(couple.flatMap((p) => p.parent_ids));
  const family = d.people.filter((p) => p.kind === "family");
  const kids = new Map<string, Person[]>();
  for (const p of [...family, ...couple]) for (const par of p.parent_ids) {
    if (!kids.has(par)) kids.set(par, []);
    kids.get(par)!.push(p);
  }
  const hasLinkedPartner = (p: Person) => !!p.partner_id && (byId.get(p.partner_id)?.parent_ids.length ?? 0) > 0;
  const seen = new Set<string>();
  const living = (p: Person) => !p.placeholder && !p.deceased;
  /** drop junctions that connect nobody */
  const keep = (u: Unit): boolean => !u.hidden || u.children.length > 0;

  const unitOf = (p: Person, depth = 0): Unit => {
    // the couple appear under both families; only their own children hang below them
    if (p.kind === "couple") {
      const own = (kids.get(p.id) ?? []).filter((c) => !seen.has(c.id) && c.kind === "family").sort(byName);
      return { id: p.id, people: [p], party_id: null, children: own.map((c) => unitOf(c, depth + 1)) };
    }
    seen.add(p.id);
    const partner = p.partner_id ? byId.get(p.partner_id) : undefined;
    const members = [p, ...(partner && !seen.has(partner.id) ? [partner] : [])];
    for (const x of members) seen.add(x.id);
    const childPeople = [...new Set(members.flatMap((x) => kids.get(x.id) ?? []))]
      .filter((c) => !seen.has(c.id) && (c.kind === "family" || c.kind === "couple")).sort(byName);
    const children = depth > 12 ? [] : childPeople.filter((c) => !seen.has(c.id)).map((c) => unitOf(c, depth + 1)).filter(keep);
    const people = members.filter(living);
    const lead = people[0] ?? p;
    return { id: p.id, people, ...(people.length ? {} : { hidden: true }), party_id: lead.party_id ?? null, children };
  };

  const groups = new Map<string, Person[]>();
  for (const p of family) {
    const k = `${p.side}\u0000${p.branch || "Other"}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const branches: OutlineBranch[] = [...groups.entries()].map(([k, ps]) => {
    const [side, branch] = k.split("\u0000") as [Side, string];
    // roots: no parents, oldest generations first (placeholders, parents' generation)
    const rootCands = ps.filter((p) => p.parent_ids.length === 0 && (p.placeholder || coupleParents.has(p.id) || (p.gen ?? 0) <= -1) && !hasLinkedPartner(p)).sort(byName);
    const linkedElders = rootCands.filter((p) => p.placeholder || coupleParents.has(p.id) || (kids.get(p.id)?.length ?? 0) > 0 || (p.gen ?? 0) === -1);
    // check `seen` per person as units are built: a partner taken into an earlier unit must not start its own
    const units = (cands: Person[]) => cands.reduce<Unit[]>((out, p) => (seen.has(p.id) ? out : [...out, unitOf(p)]), []).filter(keep);
    const roots = units(linkedElders);
    const elders = units(rootCands.filter((p) => (p.gen ?? 0) <= -2 && living(p)));
    const unplaced = units(ps.filter(living).sort(byName));
    const here = new Set([...roots, ...elders, ...unplaced].flatMap(walk).flatMap((u) => u.people.map((p) => p.id)));
    const elsewhere = ps.filter((p) => living(p) && !here.has(p.id));
    return { side, branch, roots, elders, unplaced, elsewhere, count: ps.filter(living).length };
  }).sort((a, b) => (a.side === b.side ? a.branch.localeCompare(b.branch) : a.side === "Mark" ? -1 : 1));

  return { couple, branches, unplacedTotal: branches.reduce((n, b) => n + b.unplaced.reduce((m, u) => m + u.people.length, 0), 0) };
}

/** Flatten a unit tree (for search / counting). */
export const walk = (u: Unit): Unit[] => [u, ...u.children.flatMap(walk)];
