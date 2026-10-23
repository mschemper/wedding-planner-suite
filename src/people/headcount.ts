// Headcount + if-room cutoff (DESIGN-v4 §4). Acceptance rates = Reconciled Master §2.3 (unchanged from v3 attendance.ts). Pure.
import { effectiveInvite, heads, inviteCtx, kidsIn, type InviteCtx } from "./invite";
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
  // kids' room = age child (same rule as rings.ts); people.kids_room is kept in sync on save, not read
  if (p.age === "child") t.kids += h; else t.adults += h;
  t.expected += h * rate(p);
}

export type Bucket = "invited" | "ifroom" | "undecided" | "no";
export type PartyTally = Record<Bucket, Tally>;
const bucketOf = (e: string): Bucket => (e === "invite" ? "invited" : (e as Bucket));

/** Heads per household and decision bucket, including unnamed kids (they follow the household + kids rule). */
export function tallyByParty(d: PeopleData, ctx: InviteCtx): Map<string, PartyTally> {
  const out = new Map<string, PartyTally>();
  const get = (id: string) => {
    if (!out.has(id)) out.set(id, { invited: zero(), ifroom: zero(), undecided: zero(), no: zero() });
    return out.get(id)!;
  };
  const rates = new Map<string, number[]>();
  for (const p of d.people) {
    const e = effectiveInvite(p, ctx);
    if (!e || !p.party_id) continue;
    add(get(p.party_id)[bucketOf(e)], p);
    if (!rates.has(p.party_id)) rates.set(p.party_id, []);
    rates.get(p.party_id)!.push(rate(p));
  }
  for (const party of d.parties) {
    const n = party.unnamed_kids ?? 0;
    if (!n) continue;
    const r = rates.get(party.id);
    const pr = r?.length ? r.reduce((x, y) => x + y, 0) / r.length : ACCEPTANCE.unknown;
    const come = party.invite === "no" ? "no" : kidsIn(party, ctx) ? bucketOf(party.invite) : "no";
    const t = get(party.id)[come];
    t.heads += n; t.kids += n; t.expected += n * pr;
  }
  return out;
}

export function headcount(d: PeopleData, policy: KidsPolicy, ctx: InviteCtx = inviteCtx(d, policy)): Headcount {
  const out: Headcount = { invited: zero(), ifroom: zero(), undecided: zero(), no: zero(), ranked: [], undecidedParties: 0 };
  const byParty = tallyByParty(d, ctx);
  for (const t of byParty.values()) for (const k of ["invited", "ifroom", "undecided", "no"] as Bucket[]) {
    out[k].heads += t[k].heads; out[k].adults += t[k].adults; out[k].kids += t[k].kids; out[k].expected += t[k].expected;
  }
  // people without a household (shouldn't exist outside couple/placeholders) still count
  for (const p of d.people) {
    const e = effectiveInvite(p, ctx);
    if (e && !p.party_id) add(out[bucketOf(e)], p);
  }
  for (const t of [out.invited, out.ifroom, out.undecided, out.no]) t.expected = Math.round(t.expected * 10) / 10;
  out.ranked = d.parties
    .filter((x) => x.invite === "ifroom" && (byParty.get(x.id)?.ifroom.heads ?? 0) > 0)
    .sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.name.localeCompare(b.name))
    .map((party) => ({ party, tally: byParty.get(party.id)!.ifroom }));
  out.undecidedParties = d.parties.filter((x) => x.invite === "undecided").length;
  return out;
}

export interface Cutoff {
  /** main-room seats used by invited guests at full acceptance */
  used: number;
  cap: number;
  spare: number;
  /** invited kids in the kids' room (0 when the venue has none) */
  kids: number;
  /** kids' room seats; null = no kids' room or no published cap */
  kidsCap: number | null;
  kidsSpare: number | null;
  /** how many ranked if-room parties fit (in rank order) */
  fits: number;
}

/**
 * Who fits a venue's main room at full acceptance (planner's caution).
 * Kids count toward the main room only when the venue has no kids' room.
 */
export function cutoff(hc: Headcount, cap: number, hasKidsRoom: boolean, kidsCap?: number | null): Cutoff {
  const main = (t: Tally) => t.adults + (hasKidsRoom ? 0 : t.kids);
  let used = main(hc.invited);
  let fits = 0;
  for (const r of hc.ranked) {
    if (used + main(r.tally) > cap) break;
    used += main(r.tally);
    fits++;
  }
  const kids = hasKidsRoom ? hc.invited.kids : 0;
  const kc = hasKidsRoom && kidsCap ? kidsCap : null;
  return { used: main(hc.invited), cap, spare: cap - main(hc.invited), fits, kids, kidsCap: kc, kidsSpare: kc == null ? null : kc - kids };
}
