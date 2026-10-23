// People tab pure helpers (src/ui/people/model.ts), synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import type { AuditEntry } from "../src/api/types";
import { headcount } from "../src/people/headcount";
import { inviteCtx } from "../src/people/invite";
import { buildRings, fillPoint } from "../src/people/rings";
import { FRIEND_TIER_LABEL, tierCtx } from "../src/people/tier";
import type { Party, PeopleData } from "../src/people/types";
import {
  authorName, branchEdit, bulkEdit, capacityFor, clampKids, decisionEdit, describeAudit, draftFrom, draftIssues, envelopes, exportSheets, friendTiers, hasKids,
  householdDraft, householdIssues, householdPatch, inviteAllEdit, jsonExport, matchesRow, moveRank, nextDecision, NO_FILTER, partnerNotice, personOps, quickFriendIssues,
  quickFriendName, quickFriendOps, relationFinder, relationSummary, roomCheck, seatsText, tierEdit, timeAgo,
} from "../src/ui/people/model";
import { loadPrefs } from "../src/ui/prefs";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const party = (id: string) => D.parties.find((x) => x.id === id)!;
const person = (id: string) => D.people.find((p) => p.id === id)!;

const ctx = inviteCtx(D, "ours");
const rings = buildRings(D, ctx, tierCtx(D));
const rows = rings.flatMap((r) => r.rows);
const rel = relationFinder(D.people);

describe("decisions", () => {
  it("tapping the lit option returns to undecided", () => {
    expect(nextDecision("invite", "invite")).toBe("undecided");
    expect(nextDecision("undecided", "no")).toBe("no");
    expect(nextDecision("invite", "ifroom")).toBe("ifroom");
  });
  it("a decision never touches rank (rank = order inside a ring)", () => {
    const e = decisionEdit({ ...party("H-M4"), rank: 2 }, D.parties, "ifroom");
    expect(e.patch.row).toEqual({ invite: "ifroom" });
    expect(e.label).toBe(`${party("H-M4").name} → If room`);
    expect(decisionEdit(party("F-3"), D.parties, "invite").patch.row).toEqual({ invite: "invite" });
    expect(decisionEdit(party("H-C1"), D.parties, "invite").patch.row).toEqual({ invite: "undecided" });
  });
  it("moveRank swaps and renumbers only changed ranks", () => {
    const ranked = [party("F-3"), party("H-A3")];
    expect(moveRank(ranked, "H-A3", -1)).toEqual([{ table: "parties", id: "H-A3", row: { rank: 1 } }, { table: "parties", id: "F-3", row: { rank: 2 } }]);
    expect(moveRank(ranked, "F-3", -1)).toEqual([]);
    const messy = [{ ...party("F-3"), rank: 5 }, { ...party("H-A3"), rank: 9 }];
    expect(moveRank(messy, "F-3", 1).map((x) => x.row?.rank)).toEqual([1, 2]);
  });
});

describe("rings: filters and row text", () => {
  it("filters undecided, side, search", () => {
    const f = (o: Partial<typeof NO_FILTER>) => rows.filter((r) => matchesRow(r, { ...NO_FILTER, ...o }));
    expect(f({})).toHaveLength(rows.length);
    expect(f({ undecidedOnly: true })).toHaveLength(D.parties.filter((x) => x.invite === "undecided" && rows.some((r) => r.party.id === x.id)).length);
    expect(f({ side: "friends" }).every((r) => r.friend)).toBe(true);
    expect(f({ side: "Mark" }).some((r) => r.friend)).toBe(false);
    const r = rows.find((x) => x.party.id === "H-M1")!;
    expect(f({ q: r.party.name.slice(0, 4).toUpperCase() }).map((x) => x.party.id)).toContain("H-M1");
    expect(f({ q: "zzzz-nope" })).toHaveLength(0);
  });
  it("relation summary uses the closest member; friends show circle + known by", () => {
    const parents = rows.find((x) => x.party.id === "H-M1")!;
    expect(relationSummary(parents, rel)).toMatch(/mother|father|parent|mom|dad/i);
    const fr = { friend: true, members: [], party: { ...party("F-1"), circle: "College", known_by: "Mark" as const } };
    expect(relationSummary(fr, rel)).toBe("College · known by Mark");
    expect(relationSummary({ ...fr, party: { ...fr.party, circle: null, known_by: null } }, rel)).toBe("friend");
  });
  it("kids and seats text", () => {
    const kid = rows.find((x) => x.party.id === "H-C1")!;
    expect(hasKids(kid)).toBe(true);
    expect(hasKids({ party: party("H-A1"), members: [] })).toBe(false);
    expect(hasKids({ party: { ...party("H-A1"), unnamed_kids: 2 }, members: [] })).toBe(true);
    const seats = (a: number, k: number) => seatsText({ seats: { heads: a + k, adults: a, kids: k, expected: 0 } });
    expect(seats(2, 3)).toBe("2 + 3 kids");
    expect(seats(2, 1)).toBe("2 + 1 kid");
    expect(seats(2, 0)).toBe("2");
    expect(seats(0, 0)).toBe("—");
  });
});

describe("ring edits", () => {
  it("invite all undecided = one patch per undecided household, labelled", () => {
    const ring = rings.find((r) => r.undecidedRows > 0)!;
    const e = inviteAllEdit(ring);
    expect(e.patches).toHaveLength(ring.undecidedRows);
    expect(e.patches.every((p) => p.table === "parties" && (p.row as { invite: string }).invite === "invite")).toBe(true);
    expect(e.label).toBe(`${ring.label}: invited ${ring.undecidedRows} household${ring.undecidedRows === 1 ? "" : "s"}`);
    expect(inviteAllEdit({ label: "X", rows: [] }).patches).toEqual([]);
  });
  it("tier edit sets or clears the ring", () => {
    expect(tierEdit(party("H-M1"), 2, false).patch.row).toEqual({ tier: 2 });
    expect(tierEdit(party("H-M1"), 2, false).label).toContain("Close family");
    expect(tierEdit(party("F-1"), null, true).patch.row).toEqual({ tier: null });
    expect(tierEdit(party("F-1"), 1, true).label).toContain("Must invite");
  });
  it("branch rename merges the whole map; empty resets", () => {
    const e = branchEdit({ a: "A", b: "B" }, "b", "  New name ");
    expect(e.patch).toEqual({ table: "params", id: "branchNames", row: { value: { a: "A", b: "New name" } } });
    expect(branchEdit({ a: "A", b: "B" }, "b", " ").patch.row).toEqual({ value: { a: "A" } });
    expect(branchEdit({}, "x", "y".repeat(80)).patch.row).toEqual({ value: { x: "y".repeat(60) } });
  });
});

describe("room check", () => {
  it("splits main-room seats by decision; kids go upstairs when the venue has a kids' room", () => {
    const a = roomCheck(rings, 82, true);
    const b = roomCheck(rings, 82, false);
    const hc = headcount(D, "ours", ctx);
    expect(a.invited).toBe(hc.invited.adults);
    expect(a.ifroom).toBe(hc.ifroom.adults);
    expect(a.undecided).toBe(hc.undecided.adults);
    expect(a.kidsUp).toBe(hc.invited.kids + hc.ifroom.kids + hc.undecided.kids);
    expect(b.kidsUp).toBe(0);
    expect(b.invited).toBe(hc.invited.heads);
    expect(roomCheck(rings, 3, true).over).toBe(Math.max(0, a.invited - 3));
    expect(roomCheck(rings, 3, true).scale).toBeGreaterThanOrEqual(3);
  });
  it("fill point names the first household past the cap", () => {
    expect(fillPoint(rings, 1000, true).party).toBeNull();
    const f = fillPoint(rings, 2, true);
    expect(f.party).not.toBeNull();
    expect(rows.some((r) => r.party.id === f.party)).toBe(true);
  });
});

describe("household sheet", () => {
  const p = party("H-M1");
  it("unchanged draft = no patch; changes send only changed fields", () => {
    const d = householdDraft(p);
    expect(householdPatch(d, p, false)).toBeNull();
    const e = householdPatch({ ...d, tier: 3, unnamed: 2, talk: true, talk_note: " travel? " }, p, false)!;
    expect(e.patch).toEqual({ table: "parties", id: "H-M1", row: { tier: 3, unnamed_kids: 2, talk: true, talk_note: "travel?" } });
    expect(householdPatch({ ...d, tier: null, circle: "x" }, p, false)).toBeNull();
  });
  it("friend fields are written only for friends; automatic tier = null", () => {
    const f = party("F-2");
    const d = householdDraft(f);
    const e = householdPatch({ ...d, circle: " College ", known_by: "Both", reciprocal: true }, f, true)!;
    expect(e.patch.row).toEqual({ circle: "College", known_by: "Both", reciprocal: true });
    expect(householdPatch({ ...householdDraft({ ...f, tier: 1 }), tier: null }, { ...f, tier: 1 }, true)!.patch.row).toEqual({ tier: null });
  });
  it("validates name and unnamed kids", () => {
    expect(householdIssues({ ...householdDraft(p), name: " " })).toHaveLength(1);
    expect(householdIssues({ ...householdDraft(p), unnamed: 21 })).toHaveLength(1);
    expect(clampKids(-3)).toBe(0);
    expect(clampKids(99)).toBe(20);
    expect(clampKids(Number.NaN)).toBe(0);
  });
});

describe("friends", () => {
  it("tiers hold friend households only, ordered by rank then name", () => {
    const t = friendTiers(rings, FRIEND_TIER_LABEL);
    expect(t.map((x) => x.label)).toEqual(["Must invite", "Want to", "Nice to have"]);
    const all = t.flatMap((x) => x.rows);
    expect(all.every((r) => r.friend)).toBe(true);
    expect(all).toHaveLength(rows.filter((r) => r.friend).length);
    const sorted = friendTiers(rings.map((r) => (r.friend ? { ...r, rows: r.rows.map((x, i) => ({ ...x, tier: 2, party: { ...x.party, rank: 9 - i } })) } : r)), FRIEND_TIER_LABEL)[1].rows;
    expect(sorted.map((x) => x.party.rank)).toEqual([...sorted.map((x) => x.party.rank)].sort((a, b) => a! - b!));
  });
  it("quick add = one household + 1-2 friends with tmp ids", () => {
    const tierParties: Party[] = [{ ...party("F-1"), rank: 4 }];
    const solo = quickFriendOps({ first: " Sam ", partner: "", plusOne: true, circle: " Work ", known_by: "Angela", tier: 1 }, tierParties);
    expect(solo).toHaveLength(2);
    expect(solo[0]).toMatchObject({ table: "parties", op: "create", row: { id: "tmp:hh", name: "Sam + guest", invite: "undecided", tier: 1, circle: "Work", known_by: "Angela", rank: 5 } });
    expect(solo[1]).toMatchObject({ table: "people", op: "create", row: { id: "tmp:p1", first: "Sam", side: "Angela", kind: "friend", party_id: "tmp:hh", plus_one: true } });
    const pair = quickFriendOps({ first: "Sam", partner: "Alex", plusOne: true, circle: "", known_by: "Both", tier: 2 }, []);
    expect(pair).toHaveLength(3);
    expect(pair[0]).toMatchObject({ row: { name: "Sam & Alex", circle: null, rank: 1 } });
    expect(pair[1]).toMatchObject({ row: { plus_one: false } });
    expect(pair[2]).toMatchObject({ table: "people", row: { id: "tmp:p2", first: "Alex", partner_id: "tmp:p1", party_id: "tmp:hh", side: "Both" } });
  });
  it("quick add validation and name", () => {
    const f = { first: "", partner: "", plusOne: false, circle: "", known_by: "Both" as const, tier: 2 };
    expect(quickFriendIssues(f)).toHaveLength(1);
    expect(quickFriendIssues({ ...f, first: "A" })).toEqual([]);
    expect(quickFriendName({ ...f, first: "A" })).toBe("A");
  });
});

describe("prefs migration", () => {
  const withStore = (v: unknown) => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: () => JSON.stringify({ peopleView: v }), setItem: () => undefined };
    try { return loadPrefs().peopleView; } finally { delete (globalThis as unknown as { localStorage?: unknown }).localStorage; }
  };
  it("garden to family, envelopes to decide, junk to null", () => {
    expect(withStore("garden")).toBe("family");
    expect(withStore("envelopes")).toBe("decide");
    expect(withStore("friends")).toBe("friends");
    expect(withStore("nope")).toBeNull();
  });
});

describe("capacity", () => {
  const hc = headcount(D, "ours");
  it("spare and over", () => {
    const sc = { capacity: { hardMax: 82 }, kidsRoom: true } as never;
    const c = capacityFor(hc, sc)!;
    expect(c.used).toBe(hc.invited.adults);
    expect(c.text).toBe(`seats 82 · used ${c.used} → ${82 - c.used} spare`);
    const tight = capacityFor(hc, { capacity: { hardMax: 3 }, kidsRoom: true } as never)!;
    expect(tight.over).toBe(true);
    expect(tight.text).toContain(`over by ${c.used - 3}`);
    expect(tight.pct).toBe(100);
    expect(capacityFor(hc, {} as never)).toBeNull();
  });
});

describe("audit wording", () => {
  const names = { parties: new Map(D.parties.map((x) => [x.id, x.name])), people: new Map(D.people.map((p) => [p.id, p.first])) };
  const entry = (o: Partial<AuditEntry>): AuditEntry => ({ id: 1, ts: "2026-01-01T00:00:00Z", who: "a@b.c", tbl: "parties", row_id: "H-M1", op: "update", before: null, after: null, ...o });
  it("describes party changes", () => {
    const n = party("H-M1").name;
    expect(describeAudit(entry({ before: { invite: "undecided" }, after: { invite: "ifroom", talk: true } }), names)).toBe(`${n} → If room, talk about`);
    expect(describeAudit(entry({ before: { rank: 3 }, after: { rank: 2 } }), names)).toBe(`${n} → rank 3 → 2`);
    expect(describeAudit(entry({ before: { name: "x" }, after: { name: "y" } }), names)).toBeNull();
  });
  it("describes overrides and kids policy", () => {
    expect(describeAudit(entry({ tbl: "people", row_id: "M001", before: { override: null }, after: { override: "no" } }), names)).toBe(`${person("M001").first} → exception: not inviting`);
    expect(describeAudit(entry({ tbl: "params", row_id: "kidsPolicy", after: { value: "family" } }), names)).toBe("Kids policy → Family kids");
    expect(describeAudit(entry({ tbl: "params", row_id: "branchNames", after: { value: { a: "b" } } }), names)).toBe("Branch renamed");
    expect(describeAudit(entry({ before: { tier: null }, after: { tier: 2 } }), names)).toBe(`${party("H-M1").name} → ring 2`);
  });
  it("author and time", () => {
    expect(authorName("angela@example.com")).toBe("Angela");
    expect(authorName("mark.x@example.com")).toBe("Mark");
    expect(authorName("zed@example.com")).toBe("Zed");
    const now = Date.parse("2026-01-02T12:00:00Z");
    expect(timeAgo("2026-01-02T10:00:00Z", now)).toBe("2 h ago");
    expect(timeAgo("2026-01-02 11:58:00", now)).toBe("2 min ago");
    expect(timeAgo("2026-01-01T09:00:00Z", now)).toBe("yesterday");
  });
});

describe("person ops", () => {
  const orig = (id: string) => ({ ...person(id), version: 4 });
  it("edit sends only changed fields and nothing when unchanged", () => {
    const o = orig("M001");
    const d = draftFrom(o);
    expect(personOps({ draft: d, original: o, needsParty: true })).toEqual([]);
    const ops = personOps({ draft: { ...d, local: "away", override: "no" }, original: o, needsParty: true });
    expect(ops).toEqual([{ table: "people", op: "update", id: "M001", version: 4, row: { local: "away", override: "no" } }]);
  });
  it("new household creates party then person with tmp ids", () => {
    const d = { ...draftFrom({ first: "Pat", last: "Demo" }, "new"), partyName: "" };
    expect(draftIssues(d, { needsParty: true })).toEqual([]);
    const ops = personOps({ draft: d, needsParty: true });
    expect(ops[0]).toMatchObject({ table: "parties", op: "create", row: { id: "tmp:hh", name: "Demo household", invite: "undecided" } });
    expect(ops[1]).toMatchObject({ table: "people", op: "create", row: { id: "tmp:p", first: "Pat", party_id: "tmp:hh", placeholder: false } });
  });
  it("generation follows parent links; kids' room follows age (REVIEW-v6 B11, B14)", () => {
    const o = orig("A006");
    const ops = personOps({ draft: { ...draftFrom(o), parent_ids: ["A004", "A005"], gen: "5" }, original: o, needsParty: true, people: D.people });
    expect(ops[0]).toMatchObject({ row: { parent_ids: ["A004", "A005"] } });
    expect((ops[0] as { row: Record<string, unknown> }).row.gen).toBeUndefined(); // already 0 = aunt's gen + 1
    const kid = personOps({ draft: { ...draftFrom({ first: "Tot" }, "new"), age: "child", parent_ids: ["M009"] }, needsParty: true, people: D.people });
    expect(kid[1]).toMatchObject({ row: { gen: 1, kids_room: true } });
  });
  it("warns when the chosen partner is linked to someone else or lives elsewhere (REVIEW-v6 B12)", () => {
    expect(partnerNotice("A006", "M009", "H-A4", D.people)).toEqual({ taken: person("M010"), otherHousehold: "H-M4" });
    expect(partnerNotice("M009", "M010", "H-M4", D.people)).toEqual({ taken: null, otherHousehold: null });
  });
  it("validates draft", () => {
    expect(draftIssues(draftFrom({}, ""), { needsParty: true })).toHaveLength(2);
    expect(draftIssues({ ...draftFrom({ first: "A" }, "new"), gen: "x" }, { needsParty: true })).toEqual(["Generation must be a whole number (0 = the couple's generation)."]);
    expect(draftIssues(draftFrom({ first: "A" }), { needsParty: false })).toEqual([]);
  });
});

describe("envelopes and export", () => {
  it("invited, then ifroom by rank; heads match headcount", () => {
    const e = envelopes(D, ctx);
    const hc = headcount(D, "ours", ctx);
    expect(e.invited.reduce((n, x) => n + x.heads, 0)).toBe(hc.invited.heads);
    expect(e.ifroom.map((x) => x.party.id)).toEqual(hc.ranked.map((r) => r.party.id));
  });
  it("export has no row metadata and two sheets of rows", () => {
    const d = clone();
    (d.people[0] as unknown as Record<string, unknown>).updated_by = "x@y.z";
    const j = jsonExport(d);
    expect(JSON.stringify(j)).not.toContain("updated_by");
    const s = exportSheets(D, ctx);
    expect(s.peopleRows).toHaveLength(D.people.length);
    expect(s.envelopeRows.length).toBeGreaterThan(0);
  });
});

describe("bulk edit (v7)", () => {
  it("patches only households (or people) that change", () => {
    const ps = [party("H-M1"), party("H-M2")];
    const inv = bulkEdit(ps, D.people, { kind: "invite", value: ps[0].invite });
    expect(inv.patches.map((p) => p.id)).toEqual(ps[1].invite === ps[0].invite ? [] : ["H-M2"]);
    const ring = bulkEdit(ps, D.people, { kind: "tier", value: 2 });
    expect(ring.patches).toHaveLength(2);
    expect(ring.label).toBe("2 households → ring 2");
    const local = bulkEdit(ps, D.people, { kind: "local", value: "away" });
    expect(local.patches.every((p) => p.table === "people" && p.row?.local === "away")).toBe(true);
    expect(local.patches.length).toBe(D.people.filter((p) => (p.party_id === "H-M1" || p.party_id === "H-M2") && p.local !== "away").length);
  });
});
