import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/guests.sample.json";
import type { GuestData } from "../src/guests/schema";
import { validateGuests } from "../src/guests/validate";
import {
  NO_FILTERS, setHouseholdField, applyDraft, blankPerson, buildOps, friendDraft, groupHouseholds, householdDraft, householdHasIssue, issueIds, type Draft,
} from "../src/ui/guests/model";

const d = fixture as unknown as GuestData;
const raw = {
  households: d.households.map((h) => ({ ...h, version: 4, updated_at: "", updated_by: "" })),
  individuals: d.individuals.map((p) => ({ ...p, version: 7, updated_at: "", updated_by: "" })),
  friends: d.friends.map((g) => ({ ...g, version: 2, updated_at: "", updated_by: "" })),
};
type HD = Extract<Draft, { kind: "household" }>;
const hh = (id: string | null) => householdDraft(d, id) as HD;

describe("grouping", () => {
  it("Family (Mark, Angela) → FamilySide A–Z → household name", () => {
    const g = groupHouseholds(d);
    expect(g.map((x) => x.family)).toEqual([...g.map((x) => x.family)].sort((a, b) => (a === "Mark" ? -1 : b === "Mark" ? 1 : 0)));
    expect(g[0].family).toBe("Mark");
    expect(g[g.length - 1].family).toBe("Angela");
    const marks = g.filter((x) => x.family === "Mark").map((x) => x.side);
    expect(marks).toEqual([...marks].sort());
    expect(g.flatMap((x) => x.rows).length).toBe(d.households.length);
  });
  it("filters: family, person filter, search", () => {
    expect(groupHouseholds(d, { ...NO_FILTERS, side: "Angela" }).every((x) => x.family === "Angela")).toBe(true);
    const outOfTown = groupHouseholds(d, { ...NO_FILTERS, locality: "Out of Town" }).flatMap((x) => x.rows);
    expect(outOfTown.length).toBeGreaterThan(0);
    expect(outOfTown.every((r) => r.people.some((p) => p.Locality === "Out of Town"))).toBe(true);
    const hit = groupHouseholds(d, { ...NO_FILTERS, q: "alder" }).flatMap((x) => x.rows);
    expect(hit.map((r) => r.h.HouseholdID)).toEqual(["M-PAR-001"]);
    expect(groupHouseholds(d, { ...NO_FILTERS, q: "zzzz" })).toEqual([]);
  });
  it("issue ids flag households via their people", () => {
    const bad: GuestData = { ...d, individuals: d.individuals.map((p, i) => (i === 0 ? { ...p, PartnerPersonID: "GHOST" } : p)) };
    const ids = issueIds(validateGuests(bad));
    const first = d.individuals[0];
    const h = bad.households.find((x) => x.HouseholdID === first.HouseholdID)!;
    expect(householdHasIssue(h, bad.individuals.filter((p) => p.HouseholdID === h.HouseholdID), ids)).toBe(true);
  });
});

describe("buildOps", () => {
  it("untouched draft → no ops", () => {
    expect(buildOps(hh("M-PAR-001"), d, raw)).toEqual([]);
    expect(buildOps(friendDraft(d, "F001"), d, raw)).toEqual([]);
  });
  it("edit sends only changed fields with the row's version; '' clears", () => {
    const dr = hh("M-PAR-001");
    dr.row.HouseholdType = "Elders";
    const p = dr.people[0];
    p.row.CityState = "Denver, CO";
    p.row.ExceptionReason = "";
    const ops = buildOps(dr, d, raw);
    expect(ops).toEqual([
      { table: "households", op: "update", id: "M-PAR-001", version: 4, row: { HouseholdType: "Elders" } },
      { table: "individuals", op: "update", id: p.id, version: 7, row: { CityState: "Denver, CO" } },
    ]);
    p.row.CityState = "";
    const orig = d.individuals.find((x) => x.PersonID === p.id)!;
    expect(buildOps(dr, d, raw).filter((o) => o.table === "individuals")).toEqual(
      orig.CityState ? [{ table: "individuals", op: "update", id: p.id, version: 7, row: { CityState: "" } }] : [],
    );
  });
  it("new household + people: tmp ids, household first, people reference it", () => {
    let dr = householdDraft(d, null, { PrimaryHouseholdName: "New House", FamilySide: "Bride's mother" }) as HD;
    dr = setHouseholdField(dr, "Family", "Angela") as HD;
    dr.branch = "NEW";
    dr.people[0].row.FirstName = "Ana";
    dr.people[0].row.LastName = "New";
    dr.people[0].row.GenerationGroup = "Cousin";
    dr.people[0].row.HouseholdRole = "Head of household";
    const p2 = blankPerson(dr.row);
    p2.row.FirstName = "Bo";
    p2.row.PartnerPersonID = dr.people[0].id;
    dr.people.push({ ...p2, row: { ...p2.row, LastName: "New" } });
    const ops = buildOps(dr, d, raw);
    expect(ops.map((o) => `${o.table}:${o.op}`)).toEqual(["households:create", "individuals:create", "individuals:create"]);
    const [h, a, b] = ops as Extract<(typeof ops)[number], { op: "create" }>[];
    expect(h.row.HouseholdID).toMatch(/^tmp:/);
    expect(h.row._branch).toBe("NEW");
    expect(a.row.PersonID).toMatch(/^tmp:/);
    expect(a.row.HouseholdID).toBe(h.row.HouseholdID);
    expect(a.row.Family).toBe("Angela");
    expect(a.row.DisplayName).toBe("Ana New");
    expect(b.row.PartnerPersonID).toBe(a.row.PersonID);
    expect(validateGuests(applyDraft(d, dr)).filter((i) => i.level === "error")).toEqual([]);
  });
  it("adding a person to an existing household references the real id", () => {
    const dr = hh("A-PAR-001");
    const p = blankPerson(dr.row);
    p.row.FirstName = "Zed";
    dr.people.push(p);
    const ops = buildOps(dr, d, raw);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ table: "individuals", op: "create", row: { HouseholdID: "A-PAR-001", Family: "Angela", DisplayName: "Zed" } });
  });
  it("removing a person: deletes after creates/updates; unsaved removals send nothing", () => {
    const dr = hh("M-PAR-001");
    const gone = dr.people[1].id;
    dr.removed.push(gone);
    dr.row.Notes = "x";
    const p = blankPerson(dr.row);
    p.row.FirstName = "Tmp";
    dr.people.push(p);
    const ops = buildOps(dr, d, raw);
    expect(ops.map((o) => `${o.table}:${o.op}`)).toEqual(["households:update", "individuals:create", "individuals:delete"]);
    expect(ops[2]).toMatchObject({ id: gone, version: 7 });
  });
  it("delete household → person deletes first, household delete last", () => {
    const dr = hh("M-PAR-001");
    dr.del = true;
    dr.row.Notes = "ignored";
    const ops = buildOps(dr, d, raw);
    const people = d.individuals.filter((p) => p.HouseholdID === "M-PAR-001");
    expect(ops).toHaveLength(people.length + 1);
    expect(ops.slice(0, -1).every((o) => o.table === "individuals" && o.op === "delete")).toBe(true);
    expect(ops[ops.length - 1]).toEqual({ table: "households", op: "delete", id: "M-PAR-001", version: 4 });
    const after = applyDraft(d, dr);
    expect(after.households.some((h) => h.HouseholdID === "M-PAR-001")).toBe(false);
    expect(after.individuals.some((p) => p.HouseholdID === "M-PAR-001")).toBe(false);
  });
  it("friend create / update / delete", () => {
    const n = friendDraft(d, null);
    n.row.GroupName = "Climbing crew";
    expect(buildOps(n, d, raw)[0]).toMatchObject({ table: "friends", op: "create", row: { GroupName: "Climbing crew", PlusOneDefault: "No" } });
    const e = friendDraft(d, "F001");
    e.row.PlusOneDefault = "No";
    expect(buildOps(e, d, raw)).toEqual([{ table: "friends", op: "update", id: "F001", version: 2, row: { PlusOneDefault: "No" } }]);
    e.del = true;
    expect(buildOps(e, d, raw)).toEqual([{ table: "friends", op: "delete", id: "F001", version: 2 }]);
  });
});
