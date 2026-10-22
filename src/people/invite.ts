// Effective invite per person (DESIGN-v4 §3 "Effective invite"). Pure.
import type { Decision, KidsPolicy, Party, PeopleData, Person } from "./types";

/** null = not a guest (couple, placeholder, deceased). */
export type Effective = Decision | null;

export interface InviteCtx {
  parties: Map<string, Party>;
  /** parties that hold the couple's own children ("ours") */
  ourParties: Set<string>;
  /** parties whose members are all family */
  familyParties: Set<string>;
  policy: KidsPolicy;
}

export function inviteCtx(d: PeopleData, policy: KidsPolicy): InviteCtx {
  const coupleIds = new Set(d.people.filter((p) => p.kind === "couple").map((p) => p.id));
  const ourParties = new Set<string>();
  const nonFamily = new Set<string>();
  for (const p of d.people) {
    if (!p.party_id) continue;
    if (p.parent_ids.some((x) => coupleIds.has(x))) ourParties.add(p.party_id);
    if (p.kind === "friend") nonFamily.add(p.party_id);
  }
  const familyParties = new Set(d.parties.map((x) => x.id).filter((id) => !nonFamily.has(id)));
  return { parties: new Map(d.parties.map((x) => [x.id, x])), ourParties, familyParties, policy };
}

/** Do this party's children come? party.kids wins; else the global kids policy. */
export function kidsIn(party: Party, c: InviteCtx): boolean {
  if (party.kids === "in") return true;
  if (party.kids === "out") return false;
  if (c.policy === "all") return true;
  if (c.policy === "family") return c.familyParties.has(party.id);
  return c.ourParties.has(party.id);
}

export function effectiveInvite(p: Person, c: InviteCtx): Effective {
  if (p.kind === "couple" || p.placeholder || p.deceased) return null;
  if (p.override) return p.override;
  const party = p.party_id ? c.parties.get(p.party_id) : undefined;
  if (!party) return "undecided";
  if (p.age === "child" && (party.invite === "invite" || party.invite === "ifroom") && !kidsIn(party, c)) return "no";
  return party.invite;
}

/** Heads a person brings: themselves + an unnamed plus-one. */
export const heads = (p: Person) => 1 + (p.plus_one ? 1 : 0);
