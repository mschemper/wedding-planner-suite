// Pure helpers for the People tab (no React, no I/O): decision patches, filters, ranking, person ops, audit wording, exports.
import type { AuditEntry, Op } from "../../api/types";
import type { Scenario } from "../../engine/types";
import { cutoff, type Headcount } from "../../people/headcount";
import { effectiveInvite, heads, kidsIn, type InviteCtx } from "../../people/invite";
import { anchorFor, graph, relationText } from "../../people/kin";
import {
  displayName, type Decision, type KidsPolicy, type KidsRule, type Override, type Party, type PeopleData, type Person, type Side,
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

export function decisionEdit(party: Party, parties: Party[], tapped: Decision): { patch: Patch; label: string } {
  const next = nextDecision(party.invite, tapped);
  const row: Record<string, unknown> = { invite: next };
  if (next === "ifroom") row.rank = party.rank ?? nextRank(parties);
  else if (party.rank != null) row.rank = null;
  return { patch: { table: "parties", id: party.id, row }, label: `${party.name} → ${DECISION_LABEL[next]}` };
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

// ---------- party rows, filters, search ----------
export interface PartyRow {
  party: Party;
  members: Person[];
  sides: Set<Side>;
  branch: string | null;
  hasKids: boolean;
  friend: boolean;
}

export function partyRows(d: PeopleData): PartyRow[] {
  const by = new Map<string, Person[]>();
  for (const p of d.people) if (p.party_id) {
    if (!by.has(p.party_id)) by.set(p.party_id, []);
    by.get(p.party_id)!.push(p);
  }
  return d.parties.map((party) => {
    const members = (by.get(party.id) ?? []).slice().sort(
      (a, b) => (a.gen ?? 0) - (b.gen ?? 0) || Number(a.age === "child") - Number(b.age === "child") || (a.sort ?? 0) - (b.sort ?? 0) || a.first.localeCompare(b.first));
    return {
      party, members, sides: new Set(members.map((m) => m.side)), branch: members.find((m) => m.branch)?.branch ?? null,
      hasKids: members.some((m) => m.age === "child" && !m.deceased && !m.placeholder),
      friend: members.some((m) => m.kind === "friend"),
    };
  }).sort((a, b) => a.party.name.localeCompare(b.party.name));
}

export type FilterKey = "undecided" | "ifroom" | "talk" | "invited" | "no" | "kids" | "mark" | "angela" | "friends";
export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "undecided", label: "Undecided" }, { key: "ifroom", label: "If room" }, { key: "talk", label: "Talk about" },
  { key: "invited", label: "Invited" }, { key: "no", label: "Not inviting" }, { key: "kids", label: "Has kids" },
  { key: "mark", label: "Mark's side" }, { key: "angela", label: "Angela's side" }, { key: "friends", label: "Friends" },
];
const TEST: Record<FilterKey, (r: PartyRow) => boolean> = {
  undecided: (r) => r.party.invite === "undecided", ifroom: (r) => r.party.invite === "ifroom", invited: (r) => r.party.invite === "invite",
  no: (r) => r.party.invite === "no", talk: (r) => r.party.talk, kids: (r) => r.hasKids,
  mark: (r) => r.sides.has("Mark") || r.sides.has("Both"), angela: (r) => r.sides.has("Angela") || r.sides.has("Both"), friends: (r) => r.friend,
};
/** Chips in one group combine with OR; groups combine with AND. */
const GROUPS: FilterKey[][] = [["undecided", "ifroom", "invited", "no"], ["talk", "kids"], ["mark", "angela", "friends"]];

export function matchesFilters(r: PartyRow, active: ReadonlySet<FilterKey>): boolean {
  for (const g of GROUPS) {
    const on = g.filter((k) => active.has(k));
    if (on.length && !on.some((k) => TEST[k](r))) return false;
  }
  return true;
}
export function filterCounts(rows: PartyRow[]): Record<FilterKey, number> {
  const out = {} as Record<FilterKey, number>;
  for (const f of FILTERS) out[f.key] = rows.filter(TEST[f.key]).length;
  return out;
}
export function matchesSearch(r: PartyRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [r.party.name, r.branch ?? "", ...r.members.flatMap((m) => [displayName(m), m.first, m.last ?? "", m.nick ?? ""])];
  return hay.some((h) => h.toLowerCase().includes(s));
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

export function sideText(r: PartyRow): string {
  const s = [...r.sides];
  const side = s.length === 1 && s[0] !== "Both" ? `${s[0]}'s side` : s.length ? "Both sides" : "";
  return [side, r.branch].filter(Boolean).join(" · ");
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
function rowFromDraft(d: PersonDraft): Row {
  const gen = parseGen(d.gen);
  return {
    first: d.first.trim(), last: nn(d.last), nick: nn(d.nick), age: d.age, kids_room: d.kids_room, local: d.local, side: d.side, kind: d.kind,
    branch: nn(d.branch), gen: gen === "bad" ? null : gen, partner_id: d.partner_id, parent_ids: d.parent_ids, override: d.override || null,
    rsvp: d.rsvp, plus_one: d.plus_one, circle: nn(d.circle), deceased: d.deceased, label: nn(d.label), notes: nn(d.notes),
  };
}
const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);

export type Versioned<T> = T & { version: number };

/**
 * Save ops for the person sheet. Edit: only changed fields (none changed → []). Create: optional new household first
 * (tmp ids), then the person; `parentOf` also appends the new person to that child's parents (max 2).
 */
export function personOps(a: {
  draft: PersonDraft; original?: Versioned<Person>; needsParty: boolean; parentOf?: Versioned<Pick<Person, "id" | "parent_ids">>;
}): Op[] {
  const { draft: d, original } = a;
  const row = rowFromDraft(d);
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
  if (a.parentOf && a.parentOf.parent_ids.length < 2) {
    const list = [...a.parentOf.parent_ids, "tmp:p"];
    ops.push({ table: "people", op: "update", id: a.parentOf.id, version: a.parentOf.version, row: { parent_ids: list } });
  }
  return ops;
}

/** Garden "Set parents": family, gen >= -1, no parents, not one of the couple's own parents, not a tree-only placeholder. */
export function unlinkedParents(people: Person[]): Set<string> {
  const coupleParents = new Set(people.filter((p) => p.kind === "couple").flatMap((p) => p.parent_ids));
  const byId = new Map(people.map((p) => [p.id, p]));
  // married-in relatives (their partner is the linked one) are not "missing parents"
  const marriedIn = (p: Person) => !!p.partner_id && (byId.get(p.partner_id)?.parent_ids.length ?? 0) > 0;
  return new Set(people.filter((p) => p.kind === "family" && !p.placeholder && (p.gen ?? 0) >= -1 && p.parent_ids.length === 0 && !coupleParents.has(p.id) && !marriedIn(p)).map((p) => p.id));
}

export function genLabel(gen: number): string {
  if (gen === -2) return "Grandparents";
  if (gen === -1) return "Parents, aunts & uncles";
  if (gen === 0) return "Siblings & cousins";
  if (gen === 1) return "Nieces, nephews & kids";
  return `Generation ${gen}`;
}

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
