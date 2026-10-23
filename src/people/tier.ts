// Closeness tiers (DESIGN-v5 §2). Pure. Family: 1 Inner circle · 2 Close · 3 Extended · 4 Wider. Friends: 1 Must · 2 Want · 3 Nice to have.
import { anchorFor, derivedRelation, graph, relationRoot, type Graph, type Relation } from "./kin";
import type { Party, PeopleData, Person } from "./types";

export const FAMILY_TIERS = [1, 2, 3, 4] as const;
export const FRIEND_TIERS = [1, 2, 3] as const;
export const FAMILY_TIER_LABEL: Record<number, string> = { 1: "Inner circle", 2: "Close family", 3: "Extended family", 4: "Wider family" };
export const FRIEND_TIER_LABEL: Record<number, string> = { 1: "Must invite", 2: "Want to", 3: "Nice to have" };

const REL_TIER: Partial<Record<Relation, number>> = {
  self: 1, partner: 1, parent: 1, sibling: 1, child: 1, "step-child": 1,
  grandparent: 2, "aunt/uncle": 2, "niece/nephew": 2, grandchild: 2,
  cousin: 3, "great-grandparent": 3, "great-aunt/uncle": 3, "cousin once removed": 4,
};

export interface TierCtx {
  g: Graph;
  anchors: Record<string, string | undefined>;
  members: Map<string, Person[]>;
}

export function tierCtx(d: PeopleData): TierCtx {
  const members = new Map<string, Person[]>();
  for (const p of d.people) if (p.party_id) {
    if (!members.has(p.party_id)) members.set(p.party_id, []);
    members.get(p.party_id)!.push(p);
  }
  return { g: graph(d.people), anchors: { Mark: anchorFor(d.people, "Mark"), Angela: anchorFor(d.people, "Angela") }, members };
}

/** True when every living member of the household is a friend. */
export function isFriendParty(party: Party, c: TierCtx): boolean {
  const m = (c.members.get(party.id) ?? []).filter((p) => !p.placeholder);
  return m.length > 0 && m.every((p) => p.kind === "friend");
}

function personTier(p: Person, c: TierCtx): number {
  if (p.kind === "couple") return 1;
  const anchor = c.anchors[p.side];
  const d = anchor ? derivedRelation(c.g, anchor, p.id) : null;
  // "-in-law"/"by marriage" via a partner: same tier as the blood relative
  const root = relationRoot(d) ?? relationRoot(p.label);
  return (root && REL_TIER[root]) ?? 4;
}

export function derivedTier(party: Party, c: TierCtx): number {
  if (isFriendParty(party, c)) return 2;
  const m = (c.members.get(party.id) ?? []).filter((p) => !p.placeholder && !p.deceased);
  if (!m.length) return 4;
  return Math.min(...m.map((p) => personTier(p, c)));
}

export const tierOf = (party: Party, c: TierCtx) => party.tier ?? derivedTier(party, c);
export const tierLabel = (tier: number, friend: boolean) => (friend ? FRIEND_TIER_LABEL : FAMILY_TIER_LABEL)[tier] ?? `Tier ${tier}`;
