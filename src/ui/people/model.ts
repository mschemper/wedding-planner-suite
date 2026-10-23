// Pure helpers for the People tab (no React, no I/O): decision patches, rings filters, room check, household + friend edits, person ops, audit wording, exports.
import type { AuditEntry, Op } from "../../api/types";
import type { Scenario } from "../../engine/types";
import { cutoff, type Headcount } from "../../people/headcount";
import { effectiveInvite, heads, kidsIn, type InviteCtx } from "../../people/invite";
import { anchorFor, graph, relationRoot, relationText, type Relation } from "../../people/kin";
import type { Ring, RingRow } from "../../people/rings";
import { householdEnvelope, lastNamesFromHousehold, pairName } from "../../people/names";
import { genFromLinks } from "../../people/relatives";
import { tierLabel } from "../../people/tier";
import {
  displayName, type Decision, type KidsPolicy, type KidsRule, type KnownBy, type Override, type Party, type PeopleData, type Person, type Side,
} from "../../people/types";
import type { VenueRow } from "../../plan/types";
import type { Patch } from "../data";
import type { BloomState } from "../garden/motifs";

// ---------- decisions ----------
export const DECISION_LABEL: Record<Decision, string> = { undecided: "Undecided", invite: "Invite", ifroom: "If room", no: "No" };
export const KIDS_LABEL: Record<KidsRule, string> = { policy: "Policy", in: "In", out: "Out" };
export const POLICY_LABEL: Record<KidsPolicy, string> = { ours: "Our kids only", family: "Family kids", all: "All kids" };

/** Tapping the lit option again returns to undecided. */
export const nextDecision = (cur: Decision, tapped: Decision): Decision => (cur === tapped ? "undecided" : tapped);

export const nextRank = (parties: Party[]) => 1 + Math.max(0, ...parties.filter((x) => x.invite === "ifroom").map((x) => x.rank ?? 0));

export function decisionEdit(party: Party, _parties: Party[], tapped: Decision): { patch: Patch; label: string } {
  const next = nextDecision(party.invite, tapped);
  // rank is the order inside a ring / friend tier (DESIGN-v5 §1): a decision never touches it
  return { patch: { table: "parties", id: party.id, row: { invite: next } }, label: `${party.name} → ${DECISION_LABEL[next]}` };
}

export const kidsEdit = (party: Party, rule: KidsRule) => ({
  patch: { table: "parties", id: party.id, row: { kids: rule } } as Patch, label: `${party.name} kids → ${KIDS_LABEL[rule]}`,
});
export const talkEdit = (party: Party, talk: boolean) => ({
  patch: { table: "parties", id: party.id, row: { talk } } as Patch, label: `${party.name} → ${talk ? "talk about" : "no longer talk about"}`,
});
export const noteEdit = (party: Party, note: string) => ({
  patch: { table: "parties", id: party.id, row: { talk_note: note.trim() || null } } as Patch, label: `${party.name} → note updated`,
});
export const policyEdit = (policy: KidsPolicy) => ({
  patch: { table: "params", id: "kidsPolicy", row: { value: policy } } as Patch, label: `Kids policy → ${POLICY_LABEL[policy]}`,
});

/** Swap a ranked if-room party one place; renumber 1..n and return patches only for parties whose rank changes. */
export function moveRank(ranked: Party[], id: string, dir: -1 | 1): Patch[] {
  const i = ranked.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ranked.length) return [];
  const order = [...ranked];
  [order[i], order[j]] = [order[j], order[i]];
  return order.flatMap<Patch>((x, k) => (x.rank === k + 1 ? [] : [{ table: "parties" as const, id: x.id, row: { rank: k + 1 } }]));
}

export function bloomFor(p: Person, c: InviteCtx): BloomState {
  if (p.kind === "couple") return "couple";
  if (p.placeholder) return "placeholder";
  if (p.deceased) return "deceased";
  return effectiveInvite(p, c) ?? "undecided";
}
export const kidsResolved = (party: Party, c: InviteCtx) => (kidsIn(party, c) ? "in" : "out");

export function relationFinder(people: Person[]) {
  const g = graph(people);
  const anchors: Record<Side, string | undefined> = { Mark: anchorFor(people, "Mark"), Angela: anchorFor(people, "Angela"), Both: anchorFor(people, "Mark") };
  return (p: Person) => relationText(g, anchors[p.side], p);
}

// ---------- capacity ----------
export interface Capacity { cap: number; used: number; spare: number; over: boolean; pct: number; text: string; fits: number }
export function capacityFor(hc: Headcount, sc: Scenario): Capacity | null {
  const cap = sc.capacity?.hardMax;
  if (!cap) return null;
  const c = cutoff(hc, cap, !!sc.kidsRoom);
  return {
    cap, used: c.used, spare: c.spare, over: c.spare < 0, fits: c.fits, pct: Math.min(100, Math.round((c.used / cap) * 100)),
    text: `seats ${cap} · used ${c.used} → ${c.spare >= 0 ? `${c.spare} spare` : `over by ${-c.spare}`}`,
  };
}
/** Scenarios with a seated capacity, active venues first. */
export function capacityScenarios(scenarios: Scenario[], venues: VenueRow[]): Scenario[] {
  const active = new Set(venues.filter((v) => v.active).map((v) => v.scenario_id));
  return scenarios.filter((s) => s.capacity?.hardMax).sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id)));
}
export function pickVenue(list: Scenario[], pref: number): Scenario | undefined {
  return list.find((s) => s.id === pref) ?? list[0];
}

// ---------- audit wording ----------
export function authorName(who: string): string {
  const local = who.split("@")[0] ?? who;
  if (/angela|^ang/i.test(local)) return "Angela";
  if (/mark|^msche/i.test(local)) return "Mark";
  return local ? local[0].toUpperCase() + local.slice(1) : "Someone";
}

export function timeAgo(ts: string, now = Date.now()): string {
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts.replace(" ", "T")}Z`;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Row = Record<string, unknown>;
const OVERRIDE_TEXT = (v: unknown) => (v === "invite" ? "invite anyway" : v === "no" ? "not inviting" : "follows household");

/** One plain-words line for an audit entry, or null when it is not a decision-type change. */
export function describeAudit(e: AuditEntry, names: { parties: Map<string, string>; people: Map<string, string> }): string | null {
  const a = (e.after ?? {}) as Row;
  const b = (e.before ?? {}) as Row;
  if (e.tbl === "params") {
    if (e.row_id === "branchNames") return "Branch renamed";
    if (e.row_id !== "kidsPolicy" || !a.value) return null;
    return `Kids policy → ${POLICY_LABEL[String(a.value) as KidsPolicy] ?? String(a.value)}`;
  }
  if (e.tbl === "parties") {
    const name = names.parties.get(e.row_id) ?? String(a.name ?? b.name ?? "household");
    if (e.op === "create") return `Added household ${name}`;
    if (e.op === "delete") return `Removed household ${String(b.name ?? name)}`;
    const parts: string[] = [];
    if (a.invite !== b.invite && a.invite) parts.push(DECISION_LABEL[a.invite as Decision] ?? String(a.invite));
    if (a.kids !== b.kids && a.kids) parts.push(`kids ${KIDS_LABEL[a.kids as KidsRule] ?? String(a.kids)}`);
    if (Boolean(a.talk) !== Boolean(b.talk)) parts.push(a.talk ? "talk about" : "talk-about cleared");
    if ((a.talk_note ?? null) !== (b.talk_note ?? null)) parts.push("note updated");
    if ("tier" in a && (a.tier ?? null) !== (b.tier ?? null)) parts.push(a.tier == null ? "ring automatic" : `ring ${String(a.tier)}`);
    if ((a.rank ?? null) !== (b.rank ?? null) && a.rank != null && b.rank != null) parts.push(`rank ${b.rank} → ${a.rank}`);
    return parts.length ? `${name} → ${parts.join(", ")}` : null;
  }
  if (e.tbl === "people") {
    const nm = names.people.get(e.row_id) ?? displayName({ first: String(a.first ?? b.first ?? "someone"), last: (a.last ?? b.last ?? null) as string | null, nick: (a.nick ?? b.nick ?? null) as string | null });
    if (e.op === "create") return `Added ${nm}`;
    if (e.op === "delete") return `Removed ${nm}`;
    if ((a.override ?? null) !== (b.override ?? null)) return `${nm} → exception: ${OVERRIDE_TEXT(a.override)}`;
  }
  return null;
}

// ---------- person editing ----------
export interface PersonDraft {
  first: string; last: string; nick: string; age: Person["age"]; kids_room: boolean; local: Person["local"]; side: Side;
  kind: Person["kind"]; branch: string; gen: string; partner_id: string | null; parent_ids: string[];
  /** "" = none chosen, "new" = create a household, else a party id */
  party: string; partyName: string; override: "" | Override; rsvp: Person["rsvp"]; plus_one: boolean; circle: string; deceased: boolean;
  label: string; notes: string;
}

export function draftFrom(p: Partial<Person> = {}, party?: "new" | ""): PersonDraft {
  const pid = p.party_id ?? "";
  return {
    first: p.first ?? "", last: p.last ?? "", nick: p.nick ?? "", age: p.age ?? "adult", kids_room: p.kids_room ?? false,
    local: p.local ?? "unknown", side: p.side ?? "Mark", kind: p.kind ?? "family", branch: p.branch ?? "",
    gen: p.gen == null ? "" : String(p.gen), partner_id: p.partner_id ?? null, parent_ids: [...(p.parent_ids ?? [])],
    party: pid || (party ?? ""), partyName: "", override: p.override ?? "", rsvp: p.rsvp ?? "none", plus_one: p.plus_one ?? false,
    circle: p.circle ?? "", deceased: p.deceased ?? false, label: p.label ?? "", notes: p.notes ?? "",
  };
}

export const parseGen = (s: string): number | null | "bad" => {
  const t = s.trim();
  if (!t) return null;
  return /^-?\d+$/.test(t) ? Number(t) : "bad";
};

export const defaultHouseholdName = (d: Pick<PersonDraft, "first" | "last" | "nick">) => `${d.last.trim() || d.nick.trim() || d.first.trim() || "New"} household`;

export function draftIssues(d: PersonDraft, opts: { needsParty: boolean }): string[] {
  const out: string[] = [];
  if (!d.first.trim()) out.push("First name is required.");
  if (opts.needsParty && !d.party) out.push("Pick a household (or create a new one).");
  if (parseGen(d.gen) === "bad") out.push("Generation must be a whole number (0 = the couple's generation).");
  if (d.parent_ids.length > 2) out.push("At most two parents.");
  return out;
}

const nn = (s: string) => s.trim() || null;
/** Generation follows the links (parent + 1, else partner); the stored value only when nothing linked has one. Kids' room = age child. */
function rowFromDraft(d: PersonDraft, byId?: Map<string, Person>): Row {
  const stored = parseGen(d.gen);
  const linked = byId ? genFromLinks({ parent_ids: d.parent_ids, partner_id: d.partner_id }, byId) : null;
  return {
    first: d.first.trim(), last: nn(d.last), nick: nn(d.nick), age: d.age, kids_room: d.age === "child", local: d.local, side: d.side, kind: d.kind,
    branch: nn(d.branch), gen: linked ?? (stored === "bad" ? null : stored), partner_id: d.partner_id, parent_ids: d.parent_ids, override: d.override || null,
    rsvp: d.rsvp, plus_one: d.plus_one, circle: nn(d.circle), deceased: d.deceased, label: nn(d.label), notes: nn(d.notes),
  };
}
const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);

export type Versioned<T> = T & { version: number };

/**
 * Save ops for the person sheet. Edit: only changed fields (none changed → []). Create: optional new household first
 * (tmp ids), then the person. `people` lets generation follow the parent / partner links.
 */
export function personOps(a: {
  draft: PersonDraft; original?: Versioned<Person>; needsParty: boolean; people?: Person[];
}): Op[] {
  const { draft: d, original } = a;
  const row = rowFromDraft(d, a.people && new Map(a.people.map((p) => [p.id, p])));
  const ops: Op[] = [];
  let partyId: string | null | undefined;
  if (a.needsParty) {
    if (d.party === "new") {
      ops.push({ table: "parties", op: "create", row: { id: "tmp:hh", name: d.partyName.trim() || defaultHouseholdName(d), invite: "undecided", kids: "policy", talk: false } });
      partyId = "tmp:hh";
    } else partyId = d.party || null;
  }
  if (original) {
    if (partyId !== undefined) row.party_id = partyId;
    const diff: Row = {};
    for (const [k, v] of Object.entries(row)) if (!same(v, (original as unknown as Row)[k])) diff[k] = v;
    if (Object.keys(diff).length) ops.push({ table: "people", op: "update", id: original.id, version: original.version, row: diff });
    return ops.some((o) => o.table === "people") ? ops : [];
  }
  ops.push({ table: "people", op: "create", row: { id: "tmp:p", ...row, party_id: partyId ?? null, placeholder: false } });
  return ops;
}

/** Partner choice side effects to show before saving (REVIEW-v6 B12). */
export interface PartnerNotice {
  /** the chosen partner is linked to someone else; saving unlinks them */
  taken: Person | null;
  /** the chosen partner lives in another household */
  otherHousehold: string | null;
}
export function partnerNotice(selfId: string | undefined, partnerId: string | null, party: string, people: Person[]): PartnerNotice {
  const q = partnerId ? people.find((p) => p.id === partnerId) : undefined;
  if (!q) return { taken: null, otherHousehold: null };
  const taken = q.partner_id && q.partner_id !== selfId ? people.find((p) => p.id === q.partner_id) ?? null : null;
  const otherHousehold = q.party_id && party && party !== "new" && q.party_id !== party ? q.party_id : null;
  return { taken, otherHousehold };
}

/** "Cousin · Mark's side" / "Friend · Angela's side": the line under the person sheet title. */
export const personSummary = (p: Person, rel: (p: Person) => string) => {
  const what = p.kind === "couple" ? "The couple" : p.kind === "friend" ? "Friend" : rel(p);
  const side = p.side === "Both" ? "both sides" : `${p.side}'s side`;
  return p.kind === "couple" ? what : `${what.charAt(0).toUpperCase()}${what.slice(1)} · ${side}`;
};

// ---------- envelopes + export ----------
export interface Envelope { party: Party; names: string[]; heads: number }
export function envelopes(d: PeopleData, ctx: InviteCtx): { invited: Envelope[]; ifroom: Envelope[] } {
  const build = (decision: "invite" | "ifroom"): Envelope[] => d.parties
    .filter((x) => x.invite === decision)
    .map((party) => {
      const m = d.people.filter((p) => p.party_id === party.id && effectiveInvite(p, ctx) === decision);
      return { party, names: m.map((p) => displayName(p) + (p.plus_one ? " + guest" : "")), heads: m.reduce((n, p) => n + heads(p), 0) };
    })
    .filter((e) => e.heads > 0);
  const invited = build("invite").sort((x, y) => x.party.name.localeCompare(y.party.name));
  const ifroom = build("ifroom").sort((x, y) => (x.party.rank ?? 1e9) - (y.party.rank ?? 1e9) || x.party.name.localeCompare(y.party.name));
  return { invited, ifroom };
}

type Meta = { version?: unknown; updated_at?: unknown; updated_by?: unknown };
export function jsonExport(d: PeopleData): { people: unknown[]; parties: unknown[] } {
  const strip = <T extends object>(r: T) => {
    const { version: _v, updated_at: _a, updated_by: _b, ...rest } = r as T & Meta;
    return rest;
  };
  return { people: d.people.map(strip), parties: d.parties.map(strip) };
}

export function exportSheets(d: PeopleData, ctx: InviteCtx) {
  const e = envelopes(d, ctx);
  const names = new Map(d.parties.map((x) => [x.id, x.name]));
  const rel = relationFinder(d.people);
  const envelopeRows = [...e.invited, ...e.ifroom].map((x) => ({
    Envelope: x.party.name, Guests: x.names.join("; "), Heads: x.heads, Decision: DECISION_LABEL[x.party.invite], Rank: x.party.rank ?? "",
  }));
  const peopleRows = d.people.map((p) => ({
    Id: p.id, First: p.first, Last: p.last ?? "", Nickname: p.nick ?? "", Household: p.party_id ? names.get(p.party_id) ?? "" : "", Side: p.side,
    Branch: p.branch ?? "", Generation: p.gen ?? "", Kind: p.kind, Relation: rel(p), Age: p.age, Invite: effectiveInvite(p, ctx) ?? "", Exception: p.override ?? "",
    RSVP: p.rsvp, Local: p.local, Circle: p.circle ?? "", "Plus one": p.plus_one ? "yes" : "", "Kids room": p.kids_room ? "yes" : "",
    Deceased: p.deceased ? "yes" : "", Notes: p.notes ?? "",
  }));
  return { envelopeRows, peopleRows };
}

export const exportName = (ext: string, now = new Date()) => `wedding-guests-${now.toISOString().slice(0, 10)}.${ext}`;

// ---------- rings: filters, row text ----------
export type SideFilter = "all" | "Mark" | "Angela" | "friends";
export interface RowFilter { undecidedOnly: boolean; side: SideFilter; q: string }
export const NO_FILTER: RowFilter = { undecidedOnly: false, side: "all", q: "" };

export function matchesRow(r: RingRow, f: RowFilter): boolean {
  if (f.undecidedOnly && r.party.invite !== "undecided") return false;
  if (f.side === "friends" && !r.friend) return false;
  if ((f.side === "Mark" || f.side === "Angela") && (r.friend || !r.members.some((m) => m.side === f.side || m.side === "Both"))) return false;
  const s = f.q.trim().toLowerCase();
  if (!s) return true;
  const hay = [r.party.name, r.party.circle ?? "", ...r.members.flatMap((m) => [displayName(m), m.first, m.last ?? "", m.nick ?? "", m.branch ?? ""])];
  return hay.some((h) => h.toLowerCase().includes(s));
}

const CLOSE: Partial<Record<Relation, number>> = {
  self: 1, partner: 1, parent: 1, sibling: 1, child: 1, "step-child": 1, grandparent: 2, "aunt/uncle": 2, "niece/nephew": 2, grandchild: 2, cousin: 3,
  "great-grandparent": 3, "great-aunt/uncle": 3, "cousin once removed": 4,
};

/** Friends: "College · known by Mark". */
export function friendMeta(party: Party, members: Person[]): string {
  const circle = party.circle ?? members.find((m) => m.circle)?.circle ?? null;
  return [circle, party.known_by ? `known by ${party.known_by === "Both" ? "both" : party.known_by}` : null].filter(Boolean).join(" · ") || "friend";
}

/** "brother", "aunt", "cousin": the relation of the household's closest living member; friends: circle + known by. */
export function relationSummary(r: Pick<RingRow, "members" | "party" | "friend">, rel: (p: Person) => string): string {
  if (r.friend) return friendMeta(r.party, r.members);
  const m = r.members.filter((p) => !p.deceased && p.kind !== "couple");
  if (!m.length) return "";
  const score = (p: Person) => CLOSE[relationRoot(rel(p)) ?? "self"] ?? (relationRoot(rel(p)) ? 4 : 9);
  const best = m.reduce((a, b) => (score(b) < score(a) ? b : a));
  return rel(best);
}

export const hasKids = (r: Pick<RingRow, "members" | "party">) =>
  (r.party.unnamed_kids ?? 0) > 0 || r.members.some((m) => m.age === "child" && !m.deceased && !m.placeholder);

/** "2 + 3 kids", "2", "—" when nobody comes. */
export function seatsText(r: Pick<RingRow, "seats">): string {
  const a = r.seats.adults;
  const k = r.seats.kids;
  if (!a && !k) return "—";
  return k ? `${a} + ${k} kid${k === 1 ? "" : "s"}` : String(a);
}

export const KIDS_RULE_TEXT: Record<KidsRule, string> = { policy: "Follow policy", in: "Kids in", out: "Kids out" };

// ---------- rings: edits ----------
/** One edit for every undecided household in a ring. */
export function inviteAllEdit(ring: Pick<Ring, "label" | "rows">): { patches: Patch[]; label: string } {
  const rows = ring.rows.filter((r) => r.party.invite === "undecided");
  return {
    patches: rows.map((r) => ({ table: "parties" as const, id: r.party.id, row: { invite: "invite" } })),
    label: `${ring.label}: invited ${rows.length} household${rows.length === 1 ? "" : "s"}`,
  };
}

/** Set a household's ring; null = back to automatic. */
export const tierEdit = (party: Party, tier: number | null, friend: boolean) => ({
  patch: { table: "parties", id: party.id, row: { tier } } as Patch,
  label: tier == null ? `${party.name} → ring automatic` : `${party.name} → ${tierLabel(tier, friend)}`,
});

/** Rename a branch: merges the whole map. Empty name = back to the default. */
export function branchEdit(names: Record<string, string>, raw: string, name: string): { patch: Patch; label: string } {
  const next = { ...names };
  const t = name.trim().slice(0, 60);
  if (t) next[raw] = t; else delete next[raw];
  return { patch: { table: "params", id: "branchNames", row: { value: next } }, label: `Branch renamed → ${t || "default name"}` };
}

// ---------- room check ----------
export interface RoomCheck {
  cap: number;
  invited: number;
  ifroom: number;
  undecided: number;
  /** invited + ifroom + undecided kids sent to the kids' room (0 when the venue has none) */
  kidsUp: number;
  /** bar scale = max(cap, total) */
  scale: number;
  over: number;
}
export function roomCheck(rings: Ring[], cap: number, hasKidsRoom: boolean): RoomCheck {
  const out = { invited: 0, ifroom: 0, undecided: 0, kidsUp: 0 };
  for (const r of rings) for (const row of r.rows) for (const k of ["invited", "ifroom", "undecided"] as const) {
    const t = row.tally[k];
    out[k] += t.adults + (hasKidsRoom ? 0 : t.kids);
    if (hasKidsRoom) out.kidsUp += t.kids;
  }
  const total = out.invited + out.ifroom + out.undecided;
  return { cap, ...out, scale: Math.max(cap, total, 1), over: Math.max(0, out.invited - cap) };
}

// ---------- household sheet ----------
export interface HouseholdDraft {
  name: string; invite: Decision; tier: number | null; kids: KidsRule; unnamed: number; talk: boolean; talk_note: string;
  circle: string; known_by: KnownBy | ""; reciprocal: boolean;
}
export const householdDraft = (p: Party): HouseholdDraft => ({
  name: p.name, invite: p.invite, tier: p.tier ?? null, kids: p.kids, unnamed: p.unnamed_kids ?? 0, talk: p.talk, talk_note: p.talk_note ?? "",
  circle: p.circle ?? "", known_by: p.known_by ?? "", reciprocal: !!p.reciprocal,
});
export const clampKids = (n: number) => Math.max(0, Math.min(20, Math.round(Number.isFinite(n) ? n : 0)));

export function householdIssues(d: HouseholdDraft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push("Household name is required.");
  if (d.unnamed < 0 || d.unnamed > 20) out.push("Unnamed kids must be 0–20.");
  return out;
}

/** One patch with only the changed fields; null when nothing changed. Friend-only fields are written only for friends. */
export function householdPatch(d: HouseholdDraft, p: Party, friend: boolean): { patch: Patch; label: string } | null {
  const cur = householdDraft(p);
  const row: Record<string, unknown> = {};
  const nn = (s: string) => s.trim() || null;
  if (d.name.trim() !== cur.name) row.name = d.name.trim();
  if (d.invite !== cur.invite) row.invite = d.invite;
  if (d.tier !== cur.tier) row.tier = d.tier;
  if (d.kids !== cur.kids) row.kids = d.kids;
  if (d.unnamed !== cur.unnamed) row.unnamed_kids = d.unnamed;
  if (d.talk !== cur.talk) row.talk = d.talk;
  if ((nn(d.talk_note) ?? "") !== (nn(cur.talk_note) ?? "")) row.talk_note = nn(d.talk_note);
  if (friend) {
    if ((nn(d.circle) ?? "") !== (nn(cur.circle) ?? "")) row.circle = nn(d.circle);
    if (d.known_by !== cur.known_by) row.known_by = d.known_by || null;
    if (d.reciprocal !== cur.reciprocal) row.reciprocal = d.reciprocal;
  }
  if (!Object.keys(row).length) return null;
  return { patch: { table: "parties", id: p.id, row }, label: `${d.name.trim() || p.name} updated` };
}

// ---------- friends ----------
export interface FriendTierList { tier: number; label: string; rows: RingRow[] }
export function friendTiers(rings: Ring[], labels: Record<number, string>): FriendTierList[] {
  const rows = rings.find((r) => r.friend)?.rows ?? [];
  return [1, 2, 3].map((tier) => ({
    tier, label: labels[tier],
    rows: rows.filter((r) => r.tier === tier).sort((a, b) => (a.party.rank ?? 1e9) - (b.party.rank ?? 1e9) || a.party.name.localeCompare(b.party.name)),
  }));
}

export interface QuickFriend { first: string; last?: string; partner: string; partnerLast?: string; plusOne: boolean; circle: string; known_by: KnownBy; tier: number }
export const quickFriendIssues = (f: QuickFriend) => (f.first.trim() ? [] : ["First name is required."]);
/** Household name with each person's own surname (v7): "Sam Lee & Alex Kim", "Sam & Alex Lee", "Sam Lee + guest". */
export const quickFriendName = (f: QuickFriend) => {
  const a = { first: f.first.trim(), nick: null, last: f.last?.trim() || null, deceased: false };
  const b = { first: f.partner.trim(), nick: null, last: f.partnerLast?.trim() || null, deceased: false };
  return b.first ? pairName([a, b]) : f.plusOne ? `${pairName([a])} + guest` : pairName([a]);
};

/** One save: friend household + 1–2 people (tmp ids). Rank = last in its tier. */
export function quickFriendOps(f: QuickFriend, tierParties: Party[]): Op[] {
  const circle = f.circle.trim() || null;
  const person = (id: string, first: string, extra: Record<string, unknown>) => ({
    table: "people" as const, op: "create" as const,
    row: { id, first, side: f.known_by, kind: "friend", party_id: "tmp:hh", age: "adult", circle, placeholder: false, deceased: false, rsvp: "none", local: "unknown", parent_ids: [], ...extra },
  });
  const ops: Op[] = [
    { table: "parties", op: "create", row: {
      id: "tmp:hh", name: quickFriendName(f), invite: "undecided", kids: "policy", talk: false, tier: f.tier, circle, known_by: f.known_by, reciprocal: false,
      rank: 1 + Math.max(0, ...tierParties.map((x) => x.rank ?? 0)),
    } },
    person("tmp:p1", f.first.trim(), { last: f.last?.trim() || null, plus_one: !f.partner.trim() && f.plusOne }),
  ];
  if (f.partner.trim()) ops.push(person("tmp:p2", f.partner.trim(), { last: f.partnerLast?.trim() || null, partner_id: "tmp:p1", plus_one: false }));
  return ops;
}

// ---------- bulk edit on Decide (v7) ----------
export type BulkChange =
  | { kind: "invite"; value: Decision }
  | { kind: "tier"; value: number | null }
  | { kind: "kids"; value: KidsRule }
  | { kind: "local"; value: Person["local"] };

/** One edit for several households: patches only where something changes, and a label for Undo / History. */
export function bulkEdit(parties: Party[], people: Person[], change: BulkChange): { patches: Patch[]; label: string } {
  const ids = new Set(parties.map((x) => x.id));
  const n = parties.length;
  const what = `${n} household${n === 1 ? "" : "s"}`;
  if (change.kind === "local") {
    const patches = people.filter((p) => p.party_id && ids.has(p.party_id) && !p.placeholder && p.local !== change.value)
      .map((p) => ({ table: "people" as const, id: p.id, row: { local: change.value } }));
    return { patches, label: `${what} → ${change.value}` };
  }
  const key = change.kind === "invite" ? "invite" : change.kind;
  const patches = parties.filter((x) => (x[key] ?? null) !== change.value).map((x) => ({ table: "parties" as const, id: x.id, row: { [key]: change.value } }));
  const text = change.kind === "invite" ? DECISION_LABEL[change.value] : change.kind === "kids" ? `kids ${KIDS_LABEL[change.value]}` : change.value == null ? "ring automatic" : `ring ${change.value}`;
  return { patches, label: `${what} → ${text}` };
}

/** Friends with no last name whose household name has it (v7): person id → last name, plus readable lines for the preview. */
export function friendLastNameFixes(d: PeopleData): { patches: Patch[]; lines: string[] } {
  const patches: Patch[] = [];
  const lines: string[] = [];
  for (const party of d.parties) {
    const members = d.people.filter((p) => p.party_id === party.id && p.kind === "friend" && !p.placeholder);
    if (!members.length) continue;
    for (const [id, last] of lastNamesFromHousehold(party.name, members)) {
      const p = members.find((m) => m.id === id)!;
      patches.push({ table: "people", id, row: { last } });
      lines.push(`${p.nick || p.first} → ${p.nick || p.first} ${last}`);
    }
  }
  return { patches, lines };
}

// ---------- household card (v8): the household and its people edited in one place, one save ----------
export interface CardPerson {
  /** stable key in the card (person id, or "new:<n>") */
  key: string;
  original?: Versioned<Person>;
  draft: PersonDraft;
  remove?: boolean;
}
export interface CardDraft {
  household: HouseholdDraft;
  /** false = the envelope name follows the people (v8 default) */
  customName: boolean;
  /** new household only: whose side and family vs friend, for the people added with it */
  side: Side;
  kind: "family" | "friend";
  people: CardPerson[];
}

/** The automatic name the card shows while editing (same rule and order as the Worker). */
export function cardAutoName(c: CardDraft): string {
  const live = c.people.filter((x) => !x.remove && x.draft.first.trim()).map((x, i) => ({
    ...(x.original ?? ({} as Person)), id: x.original?.id ?? `~${i}`, first: x.draft.first.trim(), last: x.draft.last.trim() || null,
    nick: x.draft.nick.trim() || null, age: x.draft.age, deceased: x.draft.deceased, placeholder: false, plus_one: x.draft.plus_one,
    parent_ids: x.draft.parent_ids, sort: x.original?.sort ?? null,
  }) as Person);
  return householdEnvelope(live);
}

export function cardIssues(c: CardDraft): string[] {
  const out: string[] = [];
  const kept = c.people.filter((x) => !x.remove);
  if (!kept.length) out.push("A household needs at least one person (or move everyone and merge it instead).");
  kept.forEach((x, i) => { if (!x.draft.first.trim()) out.push(`Person ${i + 1} needs a first name.`); });
  if (c.customName && !c.household.name.trim()) out.push("Write an envelope name, or switch back to automatic.");
  if (c.household.unnamed < 0 || c.household.unnamed > 20) out.push("Unnamed kids must be 0–20.");
  return out;
}

/**
 * One save for the card. Existing household: changed household fields + name mode, changed people, new people, removals.
 * New household: create it (tmp:hh) then its people. The Worker writes the automatic name; a custom one is sent as written.
 */
export function cardOps(c: CardDraft, party: Versioned<Party> | null, friend: boolean, all: Person[]): Op[] {
  const ops: Op[] = [];
  const pid = party?.id ?? "tmp:hh";
  const h = c.household;
  if (!party) {
    ops.push({ table: "parties", op: "create", row: {
      id: "tmp:hh", name: c.customName ? h.name.trim() : "New household", name_custom: c.customName, invite: h.invite, kids: h.kids, tier: h.tier,
      unnamed_kids: h.unnamed, talk: h.talk, talk_note: h.talk_note.trim() || null,
      ...(c.kind === "friend" ? { circle: h.circle.trim() || null, known_by: h.known_by || null, reciprocal: h.reciprocal } : {}),
    } });
  } else {
    const patch = householdPatch({ ...h, name: c.customName ? h.name : party.name }, party, friend);
    const row: Record<string, unknown> = { ...(patch?.patch.row ?? {}) };
    if (!!party.name_custom !== c.customName) row.name_custom = c.customName;
    if (!c.customName) delete row.name;
    if (Object.keys(row).length) ops.push({ table: "parties", op: "update", id: party.id, version: party.version, row });
  }
  let n = 0;
  for (const x of c.people) {
    if (x.remove) {
      if (x.original) ops.push({ table: "people", op: "delete", id: x.original.id, version: x.original.version });
      continue;
    }
    const made = personOps({ draft: { ...x.draft, party: pid }, original: x.original, needsParty: true, people: all });
    if (x.original) ops.push(...made);
    else {
      n++;
      for (const o of made) if (o.op === "create" && o.table === "people") ops.push({ ...o, row: { ...o.row, id: `tmp:p${n}` } });
    }
  }
  return ops;
}

/** A blank person for "Add someone to this household": side, kind, branch and surname from the household. */
export function blankCardPerson(key: string, peers: Person[], fallback: { side: Side; kind: "family" | "friend" }): CardPerson {
  const peer = peers.find((p) => !p.placeholder && !p.deceased);
  const kind = peer ? (peer.kind === "friend" ? "friend" : "family") : fallback.kind;
  return { key, draft: draftFrom({ side: peer?.side ?? fallback.side, kind, branch: peer?.branch ?? null, last: peer?.last ?? null, local: peer?.local ?? "unknown" }) };
}
