// v5 people logic: tiers, rings + fill point, outline tree, unnamed kids, branch names, migration 0003 (DESIGN-v5 §1–2).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { branchName, defaultBranchName, DEFAULT_SETTINGS, mergeSettings } from "../src/data/params";
import { headcount } from "../src/people/headcount";
import { inviteCtx } from "../src/people/invite";
import { buildOutline, walk } from "../src/people/outline";
import { buildRings, fillPoint, namesLine } from "../src/people/rings";
import { derivedTier, tierCtx, tierOf } from "../src/people/tier";
import type { PeopleData } from "../src/people/types";
import { SqliteD1 } from "../scripts/d1-sqlite";

const D = fixture as unknown as PeopleData;
const party = (id: string) => D.parties.find((x) => x.id === id)!;

describe("tiers", () => {
  const c = tierCtx(D);
  it("derives closeness from relationships; friends default to Want", () => {
    expect(derivedTier(party("H-M1"), c)).toBe(1); // parents
    expect(derivedTier(party("H-M2"), c)).toBe(1); // brother's household
    expect(derivedTier(party("H-C1"), c)).toBe(1); // our kid
    expect(derivedTier(party("H-M3"), c)).toBe(2); // aunt + uncle by marriage
    expect(derivedTier(party("H-M4"), c)).toBe(3); // cousin's household
    expect(derivedTier(party("H-A4"), c)).toBe(3); // cousin by label only
    expect(derivedTier(party("F-2"), c)).toBe(2);
  });
  it("a stored tier wins", () => {
    expect(tierOf(party("F-1"), c)).toBe(1);
    expect(tierOf({ ...party("H-M4"), tier: 4 }, c)).toBe(4);
  });
});

describe("rings", () => {
  const rings = buildRings(D, inviteCtx(D, "ours"));
  it("orders family rings inside-out, then friends by tier", () => {
    expect(rings.map((r) => r.key)).toEqual(["t1", "t2", "t3", "friends"]);
    expect(rings[3].rows.map((r) => r.party.id)).toEqual(["F-1", "F-2", "F-3"]);
    expect(rings[2].undecidedRows).toBe(1);
  });
  it("fill point: first household past the cap in ring order", () => {
    expect(fillPoint(rings, 82, true).party).toBeNull();
    const f = fillPoint(rings, 6, true); // inner circle has 7 adults
    expect(f.ring).toBe("t1");
    expect(f.total).toBeGreaterThan(6);
  });
  it("names line: shared last name once, kids counted", () => {
    const r = rings.flatMap((x) => x.rows).find((x) => x.party.id === "H-M2")!;
    expect(namesLine(r)).toBe("Birch & Cedar Example + 2 kids");
    const m4 = rings.flatMap((x) => x.rows).find((x) => x.party.id === "H-M4")!;
    expect(namesLine(m4)).toBe("Hazel Example & Iris Other + 2 kids");
  });
});

describe("unnamed kids", () => {
  it("count as kids' room heads when the household's kids come", () => {
    const h = headcount(D, "all");
    const h0 = headcount({ ...D, parties: D.parties.map((p) => ({ ...p, unnamed_kids: 0 })) }, "all");
    expect(h.undecided.kids - h0.undecided.kids).toBe(2);
    expect(h.undecided.adults).toBe(h0.undecided.adults);
  });
});

describe("outline", () => {
  const o = buildOutline(D);
  it("nests households under parents; couple under both families; strays in 'not placed'", () => {
    const mf = o.branches.find((b) => b.branch === "Mark's father's side")!;
    const ids = mf.roots.flatMap(walk).flatMap((u) => u.people.map((p) => p.id));
    expect(ids).toContain("M003");
    expect(ids).toContain("C001");
    expect(ids).toContain("M009"); // cousin under aunt Fern
    const af = o.branches.find((b) => b.branch === "Angela's father's side")!;
    expect(af.roots.flatMap(walk).some((u) => u.people.some((p) => p.id === "C002"))).toBe(true);
    expect(af.unplaced.flatMap((u) => u.people.map((p) => p.id))).toContain("A006");
  });
  it("draws each person once per side; a partner from another branch is listed as elsewhere (REVIEW-v6 V1)", () => {
    for (const side of ["Mark", "Angela"]) {
      const ids = o.branches.filter((b) => b.side === side).flatMap((b) => [...b.roots, ...b.elders, ...b.unplaced].flatMap(walk)).flatMap((u) => u.people.map((p) => p.id));
      expect(ids.length).toBe(new Set(ids).size);
    }
    const mm = o.branches.find((b) => b.branch === "Mark's mother's side")!;
    expect(mm.elsewhere.map((p) => p.id)).toEqual(["M002"]);
  });
});

describe("branch names", () => {
  it("friendly default + stored override", () => {
    expect(defaultBranchName("Lugene Schemper (Mark's father)")).toBe("Mark's dad's side");
    expect(defaultBranchName("Sara Nottingham (Angela's mother)")).toBe("Angela's mom's side");
    expect(defaultBranchName("Other")).toBe("Other");
    const s = mergeSettings([{ key: "branchNames", value: { "X (Mark's father)": "Schemper side" } }]);
    expect(branchName(s, "X (Mark's father)")).toBe("Schemper side");
    expect(branchName(DEFAULT_SETTINGS, null)).toBe("Other");
  });
});

describe("migration 0003", () => {
  it("turns 'Child n' placeholders into a household count and moves friend circle to the household", () => {
    const db = new SqliteD1().migrate(["migrations/0001_init.sql", "migrations/0002_garden.sql"]);
    const t = "'2026-10-22T00:00:00Z', 'seed'";
    db.raw.exec(`INSERT INTO parties (id, name, updated_at, updated_by) VALUES ('H1', 'X', ${t}), ('F1', 'Friends', ${t});
      INSERT INTO people (id, first, side, kind, party_id, age, updated_at, updated_by) VALUES
        ('P1', 'Ann', 'Mark', 'family', 'H1', 'adult', ${t}), ('P2', 'Child 1', 'Mark', 'family', 'H1', 'child', ${t}),
        ('P3', 'Child 2', 'Mark', 'family', 'H1', 'child', ${t}), ('P4', 'Childe', 'Mark', 'family', 'H1', 'child', ${t});
      INSERT INTO people (id, first, side, kind, party_id, circle, updated_at, updated_by) VALUES ('P5', 'Bo', 'Angela', 'friend', 'F1', 'Work', ${t});`);
    db.raw.exec(readFileSync("migrations/0003_people_v5.sql", "utf8"));
    const h = db.raw.prepare("SELECT unnamed_kids FROM parties WHERE id = 'H1'").get() as { unnamed_kids: number };
    expect(h.unnamed_kids).toBe(2);
    expect((db.raw.prepare("SELECT COUNT(*) n FROM people WHERE party_id = 'H1'").get() as { n: number }).n).toBe(2);
    expect(db.raw.prepare("SELECT circle, known_by FROM parties WHERE id = 'F1'").get()).toMatchObject({ circle: "Work", known_by: "Angela" });
  });
});
