// Rings of closeness for Decide (DESIGN-v5 §2). Pure. Family tiers 1–4, then Friends (tiers 1–3 inside).
import { tallyByParty, type PartyTally, type Tally } from "./headcount";
import type { InviteCtx } from "./invite";
import { FAMILY_TIER_LABEL, isFriendParty, tierCtx, tierOf, type TierCtx } from "./tier";
import { pairName } from "./names";
import type { Party, PeopleData, Person } from "./types";

export interface RingRow {
  party: Party;
  tier: number;
  /** tier came from the stored value (true) or was derived (false) */
  setByHand: boolean;
  friend: boolean;
  members: Person[];
  tally: PartyTally;
  /** heads if this household comes, in its current kids setting (all buckets except "no") */
  seats: Tally;
}

export interface Ring {
  key: string;
  label: string;
  friend: boolean;
  rows: RingRow[];
  /** seats by bucket across the ring */
  invited: number;
  ifroom: number;
  undecided: number;
  undecidedRows: number;
}

const z = (): Tally => ({ heads: 0, adults: 0, kids: 0, expected: 0 });
const sum = (ts: Tally[]): Tally => ts.reduce((a, t) => ({ heads: a.heads + t.heads, adults: a.adults + t.adults, kids: a.kids + t.kids, expected: a.expected + t.expected }), z());

export function buildRings(d: PeopleData, ctx: InviteCtx, tc: TierCtx = tierCtx(d)): Ring[] {
  const tallies = tallyByParty(d, ctx);
  const rows: RingRow[] = d.parties.map((party) => {
    const tally = tallies.get(party.id) ?? { invited: z(), ifroom: z(), undecided: z(), no: z() };
    return {
      party, tier: tierOf(party, tc), setByHand: party.tier != null, friend: isFriendParty(party, tc),
      members: (tc.members.get(party.id) ?? []).filter((p) => !p.placeholder),
      tally, seats: sum([tally.invited, tally.ifroom, tally.undecided]),
    };
  }).filter((r) => r.members.length > 0 || (r.party.unnamed_kids ?? 0) > 0);

  const order = (a: RingRow, b: RingRow) =>
    (a.party.rank ?? 1e9) - (b.party.rank ?? 1e9) || (a.friend ? 0 : a.members[0]?.side === "Mark" ? 0 : 1) - (b.friend ? 0 : b.members[0]?.side === "Mark" ? 0 : 1) ||
    a.party.name.localeCompare(b.party.name);
  const ring = (key: string, label: string, friend: boolean, rs: RingRow[]): Ring => ({
    key, label, friend, rows: rs.sort(friend ? (a, b) => a.tier - b.tier || order(a, b) : order),
    invited: rs.reduce((n, r) => n + r.tally.invited.heads, 0),
    ifroom: rs.reduce((n, r) => n + r.tally.ifroom.heads, 0),
    undecided: rs.reduce((n, r) => n + r.tally.undecided.heads, 0),
    undecidedRows: rs.filter((r) => r.party.invite === "undecided").length,
  });
  const fam = rows.filter((r) => !r.friend);
  const out = [1, 2, 3, 4].map((t) => ring(`t${t}`, FAMILY_TIER_LABEL[t], false, fam.filter((r) => r.tier === t)));
  out.push(ring("friends", "Friends", true, rows.filter((r) => r.friend)));
  return out.filter((r) => r.rows.length);
}

export interface FillPoint {
  /** ring key + party id of the first household that no longer fits, or null when everyone fits */
  ring: string | null;
  party: string | null;
  /** main-room seats if every not-"no" household in ring order came */
  total: number;
}

/**
 * Where the venue fills if you invite in ring order (decided "no" skipped). Main room = adults,
 * plus kids when the venue has no kids' room. Full acceptance (planner's caution).
 */
export function fillPoint(rings: Ring[], cap: number, hasKidsRoom: boolean): FillPoint {
  let used = 0;
  let hit: FillPoint | null = null;
  for (const r of rings) for (const row of r.rows) {
    const main = row.seats.adults + (hasKidsRoom ? 0 : row.seats.kids);
    if (!hit && used + main > cap) hit = { ring: r.key, party: row.party.id, total: 0 };
    used += main;
  }
  return hit ? { ...hit, total: used } : { ring: null, party: null, total: used };
}

/** "Mom & Dad", "Chad & Allison + 3 kids": a household's names line from its living members (nicknames first). */
export function namesLine(row: Pick<RingRow, "members" | "party">): string {
  const living = row.members.filter((p) => !p.deceased);
  const adults = living.filter((p) => p.age === "adult");
  const kids = living.filter((p) => p.age === "child").length + (row.party.unnamed_kids ?? 0);
  const base = adults.length ? pairName(adults) : row.party.name;
  return kids ? `${base} + ${kids} kid${kids === 1 ? "" : "s"}` : base;
}
