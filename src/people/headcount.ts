// Headcount + if-room cutoff (DESIGN-v4 §4). Acceptance rates = Reconciled Master §2.3 (unchanged from v3 attendance.ts). Pure.
import { effectiveInvite, heads, inviteCtx, type InviteCtx } from "./invite";
import type { KidsPolicy, Local, Party, PeopleData, Person } from "./types";

export const ACCEPTANCE: Record<Local, number> = { local: 0.85, away: 0.55, unknown: 0.78 };

export interface Tally {
  heads: number;
  adults: number;
  /** heads going to the kids' room */
  kids: number;
  /** probability-weighted */
  expected: number;
}

export interface Headcount {
  invited: Tally;
  ifroom: Tally;
  undecided: Tally;
  no: Tally;
  /** ifroom parties in rank order (unranked last, by name) with their heads */
  ranked: { party: Party; tally: Tally }[];
  /** parties with no decision yet */
  undecidedParties: number;
}

const zero = (): Tally => ({ heads: 0, adults: 0, kids: 0, expected: 0 });

/** Probability one invited person comes. */
export function rate(p: Person): number {
  if (p.rsvp === "accepted") return 1;
  if (p.rsvp === "declined") return 0;
  return ACCEPTANCE[p.local] ?? ACCEPTANCE.unknown;
}

function add(t: Tally, p: Person) {
  const h = heads(p);
  t.heads += h;
  if (p.kids_room) t.kids += h; else t.adults += h;
  t.expected += h * rate(p);
}

export function headcount(d: PeopleData, policy: KidsPolicy, ctx: InviteCtx = inviteCtx(d, policy)): Headcount {
  const out: Headcount = { invited: zero(), ifroom: zero(), undecided: zero(), no: zero(), ranked: [], undecidedParties: 0 };
  const byParty = new Map<string, Tally>();
  for (const p of d.people) {
    const e = effectiveInvite(p, ctx);
    if (!e) continue;
    add(out[e === "invite" ? "invited" : e], p);
    if (e === "ifroom" && p.party_id) {
      if (!byParty.has(p.party_id)) byParty.set(p.party_id, zero());
      add(byParty.get(p.party_id)!, p);
    }
  }
  for (const t of [out.invited, out.ifroom, out.undecided, out.no]) t.expected = Math.round(t.expected * 10) / 10;
  out.ranked = d.parties
    .filter((x) => x.invite === "ifroom" && byParty.has(x.id))
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.name.localeCompare(b.name))
    .map((party) => ({ party, tally: byParty.get(party.id)! }));
  out.undecidedParties = d.parties.filter((x) => x.invite === "undecided").length;
  return out;
}

export interface Cutoff {
  /** main-room seats used by invited guests at full acceptance */
  used: number;
  cap: number;
  spare: number;
  /** how many ranked if-room parties fit (in rank order) */
  fits: number;
}

/**
 * Who fits a venue's main room at full acceptance (planner's caution).
 * Kids count toward the main room only when the venue has no kids' room.
 */
export function cutoff(hc: Headcount, cap: number, hasKidsRoom: boolean): Cutoff {
  const main = (t: Tally) => t.adults + (hasKidsRoom ? 0 : t.kids);
  let used = main(hc.invited);
  let fits = 0;
  for (const r of hc.ranked) {
    if (used + main(r.tally) > cap) break;
    used += main(r.tally);
    fits++;
  }
  return { used: main(hc.invited), cap, spare: cap - main(hc.invited), fits };
}
