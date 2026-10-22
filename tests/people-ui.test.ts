// People tab pure helpers (src/ui/people/model.ts), synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import type { AuditEntry } from "../src/api/types";
import { headcount } from "../src/people/headcount";
import { inviteCtx } from "../src/people/invite";
import type { PeopleData, Person } from "../src/people/types";
import {
  authorName, capacityFor, decisionEdit, describeAudit, draftFrom, draftIssues, envelopes, exportSheets, filterCounts, genLabel, jsonExport,
  matchesFilters, matchesSearch, moveRank, nextDecision, partyRows, personOps, timeAgo, unlinkedParents, type FilterKey,
} from "../src/ui/people/model";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const party = (id: string) => D.parties.find((x) => x.id === id)!;
const person = (id: string) => D.people.find((p) => p.id === id)!;

describe("decisions", () => {
  it("tapping the lit option returns to undecided", () => {
    expect(nextDecision("invite", "invite")).toBe("undecided");
    expect(nextDecision("undecided", "no")).toBe("no");
    expect(nextDecision("invite", "ifroom")).toBe("ifroom");
  });
  it("ifroom gets the next rank, leaving ifroom clears it", () => {
    const e = decisionEdit(party("H-M4"), D.parties, "ifroom");
    expect(e.patch.row).toEqual({ invite: "ifroom", rank: 3 });
    expect(e.label).toBe(`${party("H-M4").name} → If room`);
    const out = decisionEdit(party("F-3"), D.parties, "invite");
    expect(out.patch.row).toEqual({ invite: "invite", rank: null });
    expect(decisionEdit(party("H-C1"), D.parties, "invite").patch.row).toEqual({ invite: "undecided" });
  });
  it("moveRank swaps and renumbers only changed ranks", () => {
    const ranked = [party("F-3"), party("H-A3")];
    const p = moveRank(ranked, "H-A3", -1);
    expect(p).toEqual([{ table: "parties", id: "H-A3", row: { rank: 1 } }, { table: "parties", id: "F-3", row: { rank: 2 } }]);
    expect(moveRank(ranked, "F-3", -1)).toEqual([]);
    const messy = [{ ...party("F-3"), rank: 5 }, { ...party("H-A3"), rank: 9 }];
    expect(moveRank(messy, "F-3", 1).map((x) => x.row?.rank)).toEqual([1, 2]);
  });
});

describe("filters and search", () => {
  const rows = partyRows(D);
  it("counts and combines groups", () => {
    const c = filterCounts(rows);
    expect(c.undecided).toBe(D.parties.filter((x) => x.invite === "undecided").length);
    expect(c.ifroom).toBe(2);
    const on = (...k: FilterKey[]) => rows.filter((r) => matchesFilters(r, new Set(k))).length;
    expect(on()).toBe(rows.length);
    expect(on("undecided", "ifroom")).toBe(c.undecided + c.ifroom);
    expect(on("undecided", "friends")).toBeLessThanOrEqual(c.undecided);
  });
  it("search matches household, member and branch", () => {
    const r = rows.find((x) => x.party.id === "H-M1")!;
    expect(matchesSearch(r, r.party.name.slice(0, 4).toUpperCase())).toBe(true);
    expect(matchesSearch(r, r.members[0].first)).toBe(true);
    expect(matchesSearch(r, "zzzz-nope")).toBe(false);
    expect(matchesSearch(r, "  ")).toBe(true);
  });
  it("has-kids is true for the couple's child household", () => {
    expect(rows.find((x) => x.party.id === "H-C1")!.hasKids).toBe(true);
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
  it("adding a parent also links the child (max 2)", () => {
    const d = draftFrom({ first: "Pa" }, "new");
    const ops = personOps({ draft: d, needsParty: true, parentOf: { id: "C003", parent_ids: ["a"], version: 2 } });
    expect(ops[2]).toEqual({ table: "people", op: "update", id: "C003", version: 2, row: { parent_ids: ["a", "tmp:p"] } });
    expect(personOps({ draft: d, needsParty: true, parentOf: { id: "C003", parent_ids: ["a", "b"], version: 2 } })).toHaveLength(2);
  });
  it("validates draft", () => {
    expect(draftIssues(draftFrom({}, ""), { needsParty: true })).toHaveLength(2);
    expect(draftIssues({ ...draftFrom({ first: "A" }, "new"), gen: "x" }, { needsParty: true })).toEqual(["Generation must be a whole number (0 = the couple's generation)."]);
    expect(draftIssues(draftFrom({ first: "A" }), { needsParty: false })).toEqual([]);
  });
});

describe("garden helpers", () => {
  it("unlinked parents excludes couple's parents, placeholders and old generations", () => {
    const d = clone();
    const s = unlinkedParents(d.people);
    for (const id of s) {
      const p = d.people.find((x) => x.id === id) as Person;
      expect(p.parent_ids).toEqual([]);
      expect((p.gen ?? 0) >= -1).toBe(true);
      expect(p.placeholder).toBe(false);
    }
    expect(s.has("G-M-1")).toBe(false);
    d.people.push({ ...person("M001"), id: "X1", parent_ids: [], gen: -1, party_id: "H-M1" } as Person);
    expect(unlinkedParents(d.people).has("X1")).toBe(true);
  });
  it("row labels", () => {
    expect(genLabel(-2)).toBe("Grandparents");
    expect(genLabel(3)).toBe("Generation 3");
  });
});

describe("envelopes and export", () => {
  const ctx = inviteCtx(D, "ours");
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
