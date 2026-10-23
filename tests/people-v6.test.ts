// v6: linking people (add relative, placement, household moves) + review fixes B11/B12. Synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { headcount } from "../src/people/headcount";
import { inviteCtx } from "../src/people/invite";
import { buildRings } from "../src/people/rings";
import {
  defaultHousehold, genFromLinks, linkParentsPatches, mergeOps, moveOps, movesWith, parentUnits, relativeChoices, relativeIssues, relativeOps, suggestParents,
} from "../src/people/relatives";
import type { PeopleData, Person } from "../src/people/types";
import { validatePeople } from "../src/people/validate";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const P = (d: PeopleData, id: string) => d.people.find((p) => p.id === id)!;
const byId = new Map(D.people.map((p) => [p.id, p]));
const v = (p: Person) => ({ ...p, version: 3 });

describe("B11 kids counted by age", () => {
  it("a child without the kids_room flag still goes to the kids' room in headcount and rings", () => {
    const d = clone();
    for (const p of d.people) if (p.age === "child") p.kids_room = false;
    for (const x of d.parties) x.invite = "invite";
    const h = headcount(d, "all");
    const ringKids = buildRings(d, inviteCtx(d, "all")).flatMap((r) => r.rows).reduce((n, r) => n + r.tally.invited.kids, 0);
    expect(h.invited.kids).toBe(ringKids);
    expect(h.invited.kids).toBeGreaterThan(0);
  });
});

describe("B12 partners in different households", () => {
  it("warns once per couple", () => {
    const d = clone();
    P(d, "M010").party_id = "H-M2";
    const w = validatePeople(d).filter((i) => /another household/.test(i.msg));
    expect(w).toHaveLength(1);
    expect(w[0].level).toBe("warning");
  });
});

describe("add relative", () => {
  it("offers only choices that fit", () => {
    expect(relativeChoices(P(D, "M009"))).toEqual(["child", "sibling"]);
    expect(relativeChoices(P(D, "A006"))).toEqual(["partner", "child", "sibling", "parent"]);
    expect(relativeChoices(P(D, "M005"))).toEqual(["partner", "child", "sibling"]);
  });
  it("child joins the household with both parents, generation + 1, kids' room", () => {
    const ops = relativeOps(v(P(D, "M009")), "child", { first: " Ivy ", last: "Example", age: "child", household: "same" }, byId);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ table: "people", op: "create", row: { first: "Ivy", parent_ids: ["M009", "M010"], party_id: "H-M4", gen: 1, age: "child", kids_room: true, branch: P(D, "M009").branch } });
  });
  it("parent: new household, added to the person's parents in the same save", () => {
    const ops = relativeOps(v(P(D, "A006")), "parent", { first: "Pat", last: "Demo", age: "adult", household: "new" }, byId);
    expect(ops.map((o) => `${o.table}:${o.op}`)).toEqual(["parties:create", "people:create", "people:update"]);
    expect(ops[1]).toMatchObject({ row: { gen: -1, party_id: "tmp:hh" } });
    expect(ops[2]).toMatchObject({ id: "A006", version: 3, row: { parent_ids: ["tmp:p"] } });
  });
  it("sibling with no parents: one placeholder links them", () => {
    const ops = relativeOps(v(P(D, "A006")), "sibling", { first: "Sam", last: "Demo", age: "adult", household: "new" }, byId);
    const pp = ops.find((o) => o.op === "create" && o.row.placeholder === true);
    expect(pp).toMatchObject({ row: { id: "tmp:pp", party_id: null, gen: -1 } });
    expect(ops.find((o) => o.op === "update")).toMatchObject({ id: "A006", row: { parent_ids: ["tmp:pp"] } });
    expect(ops.find((o) => o.op === "create" && o.row.id === "tmp:p")).toMatchObject({ row: { parent_ids: ["tmp:pp"], gen: 0 } });
  });
  it("sibling with parents shares them; partner shares the household", () => {
    const sib = relativeOps(v(P(D, "M003")), "sibling", { first: "Sky", last: "", age: "adult", household: "new", householdName: "Sky's place" }, byId);
    expect(sib[0]).toMatchObject({ row: { name: "Sky's place" } });
    expect(sib[1]).toMatchObject({ row: { parent_ids: ["M001", "M002"], last: null } });
    const partner = relativeOps(v(P(D, "A006")), "partner", { first: "Lee", last: "", age: "adult", household: "same" }, byId);
    expect(partner[0]).toMatchObject({ row: { partner_id: "A006", party_id: "H-A4" } });
  });
  it("household defaults and issues", () => {
    expect(defaultHousehold(P(D, "M009"), "partner", "adult")).toBe("same");
    expect(defaultHousehold(P(D, "M009"), "child", "adult")).toBe("new");
    expect(defaultHousehold(P(D, "M005"), "sibling", "child")).toBe("same");
    expect(relativeIssues({ first: "", last: "", age: "adult", household: "" })).toHaveLength(2);
  });
  it("generation from links", () => {
    expect(genFromLinks({ parent_ids: ["M003"] }, byId)).toBe(1);
    expect(genFromLinks({ partner_id: "M001" }, byId)).toBe(-1);
    expect(genFromLinks({ child_ids: ["M009"] }, byId)).toBe(-1);
    expect(genFromLinks({}, byId)).toBeNull();
  });
});

describe("placement", () => {
  it("suggests the aunt + uncle household for an unplaced cousin with the same surname", () => {
    const s = suggestParents("A006", D);
    expect(s.best?.ids.sort()).toEqual(["A004", "A005"]);
  });
  it("no clear best → no suggestion, still lists candidates", () => {
    const d = clone();
    P(d, "A006").last = "Nobody";
    P(d, "A006").label = null;
    const s = suggestParents("A006", d);
    expect(s.best).toBeNull();
    expect(s.others.length).toBeGreaterThan(0);
  });
  it("links several kids to a unit in one patch list, fixing generation", () => {
    const d = clone();
    P(d, "A006").gen = 3;
    const unit = parentUnits(d, "Angela", "Angela's father's side").find((u) => u.ids.includes("A004"))!;
    expect(linkParentsPatches(["A006", "A003"], unit, d)).toEqual([
      { table: "people", id: "A006", row: { parent_ids: unit.ids, gen: 0 } },
      { table: "people", id: "A003", row: { parent_ids: unit.ids } },
    ]);
  });
});

describe("household moves", () => {
  it("moves a person and partner to a new household in one save", () => {
    const who = movesWith(P(D, "M009"), byId).map(v);
    expect(who.map((p) => p.id)).toEqual(["M009", "M010"]);
    const ops = moveOps(who, { newName: "Hazel & Iris" });
    expect(ops.map((o) => o.op)).toEqual(["create", "update", "update"]);
    expect(ops[1]).toMatchObject({ row: { party_id: "tmp:hh" } });
  });
  it("merge moves members then deletes the old household", () => {
    const ops = mergeOps({ id: "H-A3", version: 2 }, "H-A4", [v(P(D, "A004")), v(P(D, "A005"))]);
    expect(ops.map((o) => `${o.op}:${"id" in o ? o.id : ""}`)).toEqual(["update:A004", "update:A005", "delete:H-A3"]);
  });
});
