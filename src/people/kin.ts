// Relationship of each person to the couple member on their side (DESIGN-v4 §4, core set). Pure.
// Derived from parent/partner links; falls back to the stored `label`. A gendered label ("Aunt") wins over the
// neutral derived word ("aunt/uncle") when both name the same relation.
import type { Person } from "./types";

export type Relation =
  | "self" | "partner" | "parent" | "child" | "step-child" | "sibling" | "grandparent" | "grandchild"
  | "aunt/uncle" | "niece/nephew" | "cousin" | "great-grandparent" | "great-aunt/uncle" | "cousin once removed";

export interface Graph {
  byId: Map<string, Person>;
  children: Map<string, string[]>;
}

export function graph(people: Person[]): Graph {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map<string, string[]>();
  for (const p of people) for (const par of p.parent_ids) {
    if (!children.has(par)) children.set(par, []);
    children.get(par)!.push(p.id);
  }
  return { byId, children };
}

const parentsOf = (g: Graph, id: string) => g.byId.get(id)?.parent_ids ?? [];
const childrenOf = (g: Graph, id: string) => g.children.get(id) ?? [];
function siblingsOf(g: Graph, id: string): string[] {
  const s = new Set<string>();
  for (const par of parentsOf(g, id)) for (const c of childrenOf(g, par)) if (c !== id) s.add(c);
  return [...s];
}
const flat = (ids: string[], f: (id: string) => string[]) => [...new Set(ids.flatMap(f))];

/** Blood/step relation of `x` to `anchor`, or null. */
export function bloodRelation(g: Graph, anchor: string, x: string): Relation | null {
  if (x === anchor) return "self";
  const a = g.byId.get(anchor);
  if (a?.partner_id === x) return "partner";
  const parents = parentsOf(g, anchor);
  if (parents.includes(x)) return "parent";
  if (parentsOf(g, x).includes(anchor)) return "child";
  if (a?.partner_id && parentsOf(g, x).includes(a.partner_id)) return "step-child";
  const sibs = siblingsOf(g, anchor);
  if (sibs.includes(x)) return "sibling";
  if (flat(parents, (p) => parentsOf(g, p)).includes(x)) return "grandparent";
  if (flat(childrenOf(g, anchor), (c) => childrenOf(g, c)).includes(x)) return "grandchild";
  const auntsUncles = flat(parents, (p) => siblingsOf(g, p));
  if (auntsUncles.includes(x)) return "aunt/uncle";
  if (flat(sibs, (s) => childrenOf(g, s)).includes(x)) return "niece/nephew";
  const cousins = flat(auntsUncles, (u) => childrenOf(g, u));
  if (cousins.includes(x)) return "cousin";
  // one generation further out, usually reached through ancestors who are never shown (tree-only or deceased; v7)
  const grandparents = flat(parents, (p) => parentsOf(g, p));
  if (flat(grandparents, (p) => parentsOf(g, p)).includes(x)) return "great-grandparent";
  const greatAunts = flat(grandparents, (p) => siblingsOf(g, p));
  if (greatAunts.includes(x)) return "great-aunt/uncle";
  if (flat(greatAunts, (u) => childrenOf(g, u)).includes(x) || flat(cousins, (c) => childrenOf(g, c)).includes(x)) return "cousin once removed";
  return null;
}

const IN_LAW: Partial<Record<Relation, string>> = {
  parent: "parent-in-law", child: "child-in-law", sibling: "sibling-in-law", "aunt/uncle": "aunt/uncle by marriage",
  "niece/nephew": "niece/nephew by marriage", cousin: "cousin-in-law", grandparent: "grandparent-in-law",
  "great-aunt/uncle": "great-aunt/uncle by marriage", "cousin once removed": "cousin once removed by marriage",
};

/** Derived text: blood relation, or "-in-law" via one partner hop. */
export function derivedRelation(g: Graph, anchor: string, x: string): string | null {
  const r = bloodRelation(g, anchor, x);
  if (r) return r;
  const partner = g.byId.get(x)?.partner_id;
  if (partner) {
    const pr = bloodRelation(g, anchor, partner);
    if (pr && IN_LAW[pr]) return IN_LAW[pr]!;
  }
  return null;
}

const ROOTS: [RegExp, RegExp][] = [
  [/^great-grandparent/, /\bgreat.?grand(mother|father|parent)/i],
  [/^great-aunt\/uncle/, /\bgreat.?(aunt|uncle)/i],
  [/^cousin once removed/, /\bonce removed/i],
  [/^parent/, /\b(mother|father|parent|mom|dad)/i],
  [/^child/, /\b(son|daughter|child)/i],
  [/^sibling/, /\b(brother|sister|sibling)/i],
  [/^grandparent/, /\bgrand(mother|father|parent)/i],
  [/^grandchild/, /\bgrand(son|daughter|child)/i],
  [/^aunt\/uncle/, /\b(aunt|uncle)/i],
  [/^niece\/nephew/, /\b(niece|nephew)/i],
  [/^cousin/, /\bcousin/i],
  [/^step-child/, /\bstep/i],
];

/**
 * Core relation named by a text (derived word or a workbook label), or null. Whole words only ("Godson" ≠ son).
 * Only the first "/"-alternative counts; a possessive in it ("Aunt's stepson", "Lugene's aunt") names someone else's
 * relative → null. Order matters: "grandparent" before "parent".
 */
export function relationRoot(text: string | null | undefined): Relation | null {
  const t = (text ?? "").toLowerCase().split("/")[0].trim();
  if (!t || /['’]s\b/.test(t)) return null;
  if (/\bgreat.?grand(mother|father|parent|ma|pa)s?\b/.test(t)) return "great-grandparent";
  if (/\bgreat.?(aunt|uncle)s?\b/.test(t)) return "great-aunt/uncle";
  if (/\bcousins?\b.*\bremoved\b/.test(t)) return "cousin once removed";
  if (/\bgreat\b/.test(t)) return null;
  if (/\bgrand(mother|father|parent|ma|pa)s?\b/.test(t)) return "grandparent";
  if (/\bgrand(son|daughter|child|children|kid)s?\b/.test(t)) return "grandchild";
  if (/\b(niece|nephew)s?\b/.test(t)) return "niece/nephew";
  if (/\bcousins?\b/.test(t)) return "cousin";
  if (/\b(aunt|uncle)s?\b/.test(t)) return "aunt/uncle";
  if (/\bstep-?(son|daughter|child|children|kid)s?\b/.test(t)) return "step-child";
  if (/\bstep-?(mother|father|mom|dad|parent)s?\b/.test(t)) return "parent";
  if (/\b(brother|sister|sibling)s?\b/.test(t)) return "sibling";
  if (/\b(mother|father|parent|mom|dad|mum)s?\b/.test(t)) return "parent";
  if (/\b(son|daughter|child|children|kid)s?\b/.test(t)) return "child";
  return null;
}

/** Text shown for a person: prefers the stored label when it names the same relation (it may carry gender). */
export function relationText(g: Graph, anchor: string | undefined, p: Person): string {
  if (p.kind === "couple") return "the couple";
  const d = anchor ? derivedRelation(g, anchor, p.id) : null;
  const label = p.label?.trim();
  if (d && label) {
    const root = ROOTS.find(([r]) => r.test(d));
    const inLawMatch = /in-law|by marriage/.test(d) === /in-law|by marriage|future|spouse|partner/i.test(label);
    if (root && root[1].test(label) && inLawMatch) return label;
    return d;
  }
  return d ?? label ?? (p.kind === "friend" ? "friend" : "relative");
}

/** Couple member for a side: Mark's side → Mark, Angela's → Angela. Couple rows are recognised by first name. */
export function anchorFor(people: Person[], side: string): string | undefined {
  const couple = people.filter((p) => p.kind === "couple");
  return (couple.find((p) => p.first === side) ?? couple.find((p) => p.side === side))?.id;
}

/** Ids reachable upward from `id` (ancestors). Used by validate to refuse cycles. */
export function ancestors(g: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...parentsOf(g, id)];
  while (stack.length) {
    const x = stack.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...parentsOf(g, x));
  }
  return seen;
}
