// Workbook (v3 GuestData shape) → v4 people + parties (DESIGN-v4 §5). Pure; scripts/import-v4.ts does the I/O.
// Ids are kept from the workbook (A001, M-LUG-001, F-MAR-001) so rows stay traceable; new rows get server ids (P001, H001).
// Review rows and the report carry ids and counts only, never names.
import type { FriendGroup, GuestData, Individual } from "../guests/schema";
import type { Decision, Local, Party, PeopleData, Person, Rsvp, Side } from "./types";
import { effectiveInvite, inviteCtx, kidsIn } from "./invite";

export interface ImportResult extends PeopleData {
  review: { id: string; reason: string }[];
  report: Record<string, number>;
}

const GEN: Record<string, number> = {
  Couple: 0, Parent: -1, Sibling: 0, "Sibling spouse": 0, "Niece/Nephew": 1, "Aunt/Uncle": -1, "Aunt/Uncle spouse": -1,
  "Aunt/Uncle partner": -1, Cousin: 0, "Cousin spouse": 0, "Cousin child": 1, Child: 1, "Great-aunt/uncle generation": -2,
  "Extended family": 0, "Extended family spouse": 0,
};
const local = (v: unknown): Local => (v === "Local Chicago Area" ? "local" : v === "Out of Town" ? "away" : "unknown");
const s = (v: unknown) => String(v ?? "").trim();
const splitIds = (v: unknown) => s(v).split(",").map((x) => x.trim()).filter(Boolean);
const isDeceased = (r: { InviteStatus?: unknown; HouseholdRole?: unknown }) => s(r.InviteStatus) === "Deceased" || /^Deceased/i.test(s(r.HouseholdRole));

/** DESIGN-v4 §5 precedence. */
function decide(status: string, priority: string): { d: Decision; rsvp: Rsvp } {
  switch (status) {
    case "Not inviting": return { d: "no", rsvp: "none" };
    case "Declined": return { d: "invite", rsvp: "declined" };
    case "Accepted": return { d: "invite", rsvp: "accepted" };
    case "Yes": case "Invited": return { d: "invite", rsvp: "none" };
  }
  if (priority === "Core") return { d: "invite", rsvp: "none" };
  if (priority === "Not Invite") return { d: "no", rsvp: "none" };
  return { d: "undecided", rsvp: "none" };
}

function mostCommon(ds: Decision[]): Decision {
  const n = new Map<Decision, number>();
  for (const d of ds) n.set(d, (n.get(d) ?? 0) + 1);
  const sorted = [...n.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return "undecided";
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return "undecided";
  return sorted[0][0];
}

export function fromWorkbook(g: GuestData): ImportResult {
  const review: ImportResult["review"] = [];
  const people: Person[] = [];
  const decided = new Map<string, Decision>();
  const byId = new Map<string, Person>();
  const ind = new Map(g.individuals.map((r) => [s(r.PersonID), r]));

  // couple first (anchors)
  const coupleRows = g.individuals.filter((r) => s(r.GenerationGroup) === "Couple");
  const coupleBySide = new Map<Side, string>();
  for (const r of coupleRows) coupleBySide.set(s(r.FirstName) === "Angela" ? "Angela" : "Mark", s(r.PersonID));
  const coupleHouseholds = new Set(coupleRows.map((r) => s(r.HouseholdID)));

  for (const r of g.individuals) {
    const id = s(r.PersonID);
    const isCouple = s(r.GenerationGroup) === "Couple";
    const side: Side = isCouple ? (s(r.FirstName) === "Angela" ? "Angela" : "Mark") : s(r.Family) === "Angela" ? "Angela" : "Mark";
    const { d, rsvp } = decide(s(r.InviteStatus), s(r.InvitePriority));
    const child = s(r.AdultOrChild) === "Child";
    const p: Person = {
      id, first: s(r.FirstName) || s(r.DisplayName) || id, last: s(r.LastName) || null, nick: null, side,
      branch: s(r.FamilySide) || null, gen: GEN[s(r.GenerationGroup)] ?? null, kind: isCouple ? "couple" : "family",
      party_id: isCouple ? null : s(r.HouseholdID) || null, partner_id: null, parent_ids: splitIds(r.ParentPersonIDs).filter((x) => ind.has(x)),
      age: child ? "child" : "adult", override: null, rsvp, deceased: isDeceased(r), placeholder: false, local: local(r.Locality),
      circle: null, plus_one: false, kids_room: child, label: s(side === "Angela" ? r.RelationshipToAngela : r.RelationshipToMark) || null,
      notes: s(r.Notes) || null, sort: null,
    };
    if (s(r.PartnerPersonID) && ind.has(s(r.PartnerPersonID))) p.partner_id = s(r.PartnerPersonID);
    people.push(p);
    byId.set(id, p);
    decided.set(id, d);
  }

  // partners: infer for one Head + one Spouse/partner per household; then make symmetric
  let inferredPartners = 0;
  const byHousehold = new Map<string, Individual[]>();
  for (const r of g.individuals) {
    const h = s(r.HouseholdID);
    if (!byHousehold.has(h)) byHousehold.set(h, []);
    byHousehold.get(h)!.push(r);
  }
  for (const [h, rows] of byHousehold) {
    if (coupleHouseholds.has(h)) continue;
    const heads = rows.filter((r) => s(r.HouseholdRole) === "Head of household");
    const spouses = rows.filter((r) => /Spouse\/partner|Deceased (spouse|partner)/i.test(s(r.HouseholdRole)));
    if (heads.length === 1 && spouses.length === 1) {
      const a = byId.get(s(heads[0].PersonID))!, b = byId.get(s(spouses[0].PersonID))!;
      if (!a.partner_id && !b.partner_id) { a.partner_id = b.id; b.partner_id = a.id; inferredPartners++; }
    }
  }
  for (const p of people) {
    if (!p.partner_id) continue;
    const q = byId.get(p.partner_id)!;
    if (!q.partner_id) q.partner_id = p.id;
    else if (q.partner_id !== p.id) { review.push({ id: p.id, reason: `partner conflict with ${q.id}` }); p.partner_id = null; }
  }

  // parents
  let inferredParents = 0;
  const setParents = (p: Person, ids: string[]) => {
    if (p.parent_ids.length || !ids.length) return;
    p.parent_ids = ids.slice(0, 2);
    inferredParents++;
  };
  for (const [h, rows] of byHousehold) {
    for (const r of rows.filter((x) => s(x.HouseholdRole) === "Child")) {
      const p = byId.get(s(r.PersonID))!;
      if (coupleHouseholds.has(h)) { const c = coupleBySide.get(p.side); if (c) setParents(p, [c]); continue; }
      const head = rows.find((x) => s(x.HouseholdRole) === "Head of household");
      if (!head) { review.push({ id: p.id, reason: "child without a head of household" }); continue; }
      const hp = byId.get(s(head.PersonID))!;
      setParents(p, [hp.id, ...(hp.partner_id ? [hp.partner_id] : [])]);
    }
  }
  const parentsOnSide = (side: Side) => people.filter((p) => p.side === side && s(ind.get(p.id)?.GenerationGroup) === "Parent").map((p) => p.id);
  for (const [side, cid] of coupleBySide) setParents(byId.get(cid)!, parentsOnSide(side));
  for (const p of people) if (s(ind.get(p.id)?.GenerationGroup) === "Sibling") setParents(p, parentsOnSide(p.side));

  // grandparent placeholders per branch: parents of the branch's Parent row and of its blood aunts/uncles
  let placeholders = 0;
  const branches = [...new Set(people.filter((p) => p.kind === "family" && p.branch).map((p) => `${p.side}\u0000${p.branch}`))];
  for (const k of branches) {
    const [side, branch] = k.split("\u0000") as [Side, string];
    const inBranch = people.filter((p) => p.side === side && p.branch === branch && p.kind === "family");
    const parent = inBranch.filter((p) => s(ind.get(p.id)?.GenerationGroup) === "Parent");
    const aunts = inBranch.filter((p) => s(ind.get(p.id)?.GenerationGroup) === "Aunt/Uncle");
    const blood = aunts.filter((p) => !/by marriage|in-law|partner|spouse/i.test(p.label ?? ""));
    for (const a of aunts) if (!blood.includes(a)) review.push({ id: a.id, reason: "aunt/uncle may be by marriage: not linked to grandparents" });
    if (!parent.length && !blood.length) continue;
    const gid = `G-${side[0]}-${placeholders + 1}`;
    people.push({
      id: gid, first: "Grandparents", last: null, nick: null, side, branch, gen: -2, kind: "family", party_id: null, partner_id: null,
      parent_ids: [], age: "adult", override: null, rsvp: "none", deceased: false, placeholder: true, local: "unknown", circle: null,
      plus_one: false, kids_room: false, label: "grandparents (not a guest)", notes: null, sort: null,
    });
    placeholders++;
    for (const p of [...parent, ...blood]) setParents(p, [gid]);
    // cousins: only when the branch has exactly one blood aunt/uncle household
    const auntHouseholds = [...new Set(blood.map((p) => p.party_id))];
    const cousins = inBranch.filter((p) => s(ind.get(p.id)?.GenerationGroup) === "Cousin" && !p.parent_ids.length);
    if (auntHouseholds.length === 1 && blood.length) {
      const a = blood[0];
      for (const c of cousins) setParents(c, [a.id, ...(a.partner_id ? [a.partner_id] : [])]);
    } else for (const c of cousins) review.push({ id: c.id, reason: "cousin's parents unknown (set them in the garden)" });
  }

  // friends: one party per group; "A and B" → two partners, else one person (+ plus-one)
  const parties: Party[] = [];
  for (const f of g.friends) parties.push(...friendRows(f, people, decided, review));

  // households → parties with a decision
  for (const h of g.households) {
    const id = s(h.HouseholdID);
    const members = people.filter((p) => p.party_id === id && !p.deceased);
    const adults = members.filter((p) => p.age === "adult");
    const d = mostCommon((adults.length ? adults : members).map((p) => decided.get(p.id)!));
    parties.push({
      id, name: coupleHouseholds.has(id) ? "Mark & Angela's household" : s(h.PrimaryHouseholdName) || id,
      invite: d, kids: "policy", rank: null, talk: false, talk_note: null, notes: s(h.Notes) || null,
      tier: null, unnamed_kids: 0, circle: null, known_by: null, reciprocal: false,
    });
  }
  // placeholder children ("Child 1", …) become a count on the household
  const isPlaceholderKid = (p: Person) => p.age === "child" && /^Child \d+$/.test(p.first);
  for (const p of people.filter(isPlaceholderKid)) {
    const party = parties.find((x) => x.id === p.party_id);
    if (party) party.unnamed_kids = (party.unnamed_kids ?? 0) + 1;
  }
  for (let i = people.length - 1; i >= 0; i--) if (isPlaceholderKid(people[i])) people.splice(i, 1);
  const partyIds = new Set(parties.map((x) => x.id));
  for (const p of people) if (p.party_id && !partyIds.has(p.party_id)) { review.push({ id: p.id, reason: `household ${p.party_id} missing` }); p.party_id = null; }

  // overrides: adults that differ from the party; children → party kids rule, else per-child override
  const data: PeopleData = { people, parties };
  const ctx = inviteCtx(data, "ours");
  let overrides = 0;
  for (const party of parties) {
    const members = people.filter((p) => p.party_id === party.id && !p.deceased);
    for (const p of members.filter((x) => x.age === "adult")) {
      const want = decided.get(p.id)!;
      if (want === party.invite) continue;
      if (want === "invite" || want === "no") { p.override = want; overrides++; }
      else review.push({ id: p.id, reason: `marked ${want} but household is ${party.invite}` });
    }
    const kids = members.filter((x) => x.age === "child");
    if (!kids.length || (party.invite !== "invite" && party.invite !== "ifroom")) continue;
    const wants = new Set(kids.map((k) => (decided.get(k.id) === "no" ? "out" : decided.get(k.id) === "invite" ? "in" : "undecided")));
    const policyIn = kidsIn(party, ctx);
    if (wants.size === 1 && !wants.has("undecided")) {
      const w = [...wants][0];
      if ((w === "in") !== policyIn) party.kids = w as "in" | "out";
    } else for (const k of kids) {
      const want = decided.get(k.id)!;
      if (want === "invite" || want === "no") { k.override = want; overrides++; }
    }
  }

  // v3 parity numbers: everyone v3 counted (status not Declined/Not inviting), at v3 rates, with documented differences
  const ctx2 = inviteCtx(data, "ours");
  const considered = people.filter((p) => effectiveInvite(p, ctx2) !== null);
  const report: Record<string, number> = {
    people: people.filter((p) => !p.placeholder).length,
    couple: people.filter((p) => p.kind === "couple").length,
    family: people.filter((p) => p.kind === "family" && !p.placeholder).length,
    friends: people.filter((p) => p.kind === "friend").length,
    deceased: people.filter((p) => p.deceased).length,
    parties: parties.length,
    placeholders,
    inferredPartners,
    inferredParents,
    overrides,
    withParents: people.filter((p) => p.parent_ids.length).length,
    considered: considered.length,
    review: review.length,
  };
  return { people, parties, review, report };
}

function friendRows(f: FriendGroup, people: Person[], decided: Map<string, Decision>, review: ImportResult["review"]): Party[] {
  const id = s(f.FriendGroupID);
  const status = s(f.InviteStatus);
  const tier3 = s(f.InviteTier);
  const { d, rsvp } = status && status !== "TBD" ? decide(status, "") : { d: (tier3 === "A" ? "invite" : "undecided") as Decision, rsvp: "none" as Rsvp };
  const side: Side = s(f.ConnectionTo) === "Angela" ? "Angela" : s(f.ConnectionTo) === "Mark" ? "Mark" : "Both";
  const name = s(f.GroupName) || s(f.PrimaryContact) || id;
  const m = /^(.+?)\s+(?:and|&)\s+(.+)$/i.exec(name);
  const names = m && m[1].split(/\s+/).length <= 2 && m[2].split(/\s+/).length <= 2 ? [m[1], m[2]] : [s(f.PrimaryContact) || name];
  const plusOne = names.length === 1 && /^(yes|named partner|named spouse)$/i.test(s(f.PlusOneDefault));
  if (!m && /named/i.test(s(f.PlusOneDefault))) review.push({ id, reason: "named partner could not be split: counted as plus-one" });
  const ids = names.map((_, n) => `${id}-${n + 1}`);
  names.forEach((full, n) => {
    const [first, ...rest] = full.split(/\s+/);
    const p: Person = {
      id: ids[n], first, last: rest.join(" ") || null, nick: null, side, branch: null, gen: 0, kind: "friend", party_id: id,
      partner_id: names.length === 2 ? ids[1 - n] : null, parent_ids: [], age: s(f.AdultOrChild) === "Child" ? "child" : "adult",
      override: null, rsvp, deceased: false, placeholder: false, local: local(f.Locality), circle: s(f.FriendCategory) || "Friends",
      plus_one: plusOne, kids_room: s(f.AdultOrChild) === "Child", label: null, notes: n === 0 ? s(f.Notes) || null : null, sort: null,
    };
    people.push(p);
    decided.set(p.id, d);
  });
  const rank = Number(f.Ranking);
  const tier = tier3 === "A" ? 1 : tier3 === "C" ? 3 : 2;
  return [{
    id, name, invite: d, kids: "policy", rank: Number.isFinite(rank) ? rank : null, talk: false, talk_note: null, notes: null,
    tier, unnamed_kids: 0, circle: s(f.FriendCategory) || "Friends", known_by: side, reciprocal: false,
  }];
}
