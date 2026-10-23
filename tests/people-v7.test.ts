// v7: hidden ancestors (place by relation, junctions in the outline), names with different surnames, last names for friends.
// Synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import type { Op } from "../src/api/types";
import { anchorFor, graph, relationText } from "../src/people/kin";
import { lastNamesFromHousehold, pairName } from "../src/people/names";
import { buildOutline, walk } from "../src/people/outline";
import { placeOps } from "../src/people/relatives";
import { derivedTier, tierCtx } from "../src/people/tier";
import type { PeopleData, Person } from "../src/people/types";
import { validatePeople } from "../src/people/validate";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const P = (d: PeopleData, id: string) => d.people.find((p) => p.id === id)!;
const v = (p: Person) => ({ ...p, version: 2 });
const version = () => 2;

/** Apply save ops to a data copy the way the Worker would (tmp ids → real ids). */
function apply(d: PeopleData, ops: Op[]): PeopleData {
  const out = JSON.parse(JSON.stringify(d)) as PeopleData;
  const ids = new Map<string, string>();
  let n = 0;
  for (const o of ops) if (o.op === "create" && String(o.row.id).startsWith("tmp:")) ids.set(String(o.row.id), `X${++n}`);
  const fix = (x: unknown): unknown => (typeof x === "string" && ids.has(x) ? ids.get(x) : Array.isArray(x) ? x.map(fix) : x);
  for (const o of ops) {
    if (o.table !== "people") continue;
    if (o.op === "create") out.people.push(Object.fromEntries(Object.entries(o.row).map(([k, val]) => [k, fix(val)])) as unknown as Person);
    if (o.op === "update") Object.assign(P(out, o.id), Object.fromEntries(Object.entries(o.row).map(([k, val]) => [k, fix(val)])));
  }
  return out;
}

/** Fixture + an unlinked great-aunt and her husband on Angela's side, in their own household. */
function withFran(): PeopleData {
  const d = clone();
  d.parties.push({ id: "H-F", name: "Fran & Len", invite: "undecided", kids: "policy", talk: false });
  const base = { ...P(d, "A006"), parent_ids: [], party_id: "H-F", gen: 0, label: null, deceased: false, placeholder: false };
  d.people.push({ ...base, id: "A-FRAN", first: "Fran", last: "Vann", partner_id: "A-LEN" }, { ...base, id: "A-LEN", first: "Len", last: "Vann", partner_id: "A-FRAN" });
  return d;
}

describe("place by relation (Fran is Kale's aunt)", () => {
  const d = withFran();
  const ops = placeOps(v(P(d, "A-FRAN")), v(P(d, "A001")), "aunt/uncle", d, version);
  const after = apply(d, ops);

  it("creates the hidden parents and grandparents once, links Fran, sets her generation", () => {
    const creates = ops.filter((o) => o.op === "create");
    expect(creates).toHaveLength(2);
    expect(creates.every((o) => o.op === "create" && o.row.placeholder === true && o.row.party_id === null)).toBe(true);
    expect(P(after, "A-FRAN")).toMatchObject({ gen: -2, parent_ids: ["X2"] });
    expect(P(after, "A001").parent_ids).toEqual(["X1"]);
    expect(P(after, "X1").parent_ids).toEqual(["X2"]);
    expect(validatePeople(after).filter((i) => i.level === "error")).toEqual([]);
  });
  it("derives great-aunt for Angela and by-marriage for Len; ring Extended", () => {
    const g = graph(after.people);
    const a = anchorFor(after.people, "Angela");
    expect(relationText(g, a, P(after, "A-FRAN"))).toBe("great-aunt/uncle");
    expect(relationText(g, a, P(after, "A-LEN"))).toBe("great-aunt/uncle by marriage");
    expect(derivedTier(after.parties.find((x) => x.id === "H-F")!, tierCtx(after))).toBe(3);
  });
  it("the tree shows no ancestors, links Fran through a junction, and she is no longer unplaced", () => {
    const b = buildOutline(after).branches.find((x) => x.side === "Angela")!;
    const units = b.roots.flatMap(walk);
    expect(units.flatMap((u) => u.people).some((p) => p.placeholder || p.deceased)).toBe(false);
    expect(units.some((u) => u.hidden)).toBe(true);
    expect(units.some((u) => u.people.some((p) => p.id === "A-FRAN") && u.people.some((p) => p.id === "A-LEN"))).toBe(true);
    expect(b.unplaced.flatMap((u) => u.people).some((p) => p.id === "A-FRAN")).toBe(false);
  });
  it("reuses existing parents; refuses a third parent and self", () => {
    const d2 = withFran();
    const sib = placeOps(v(P(d2, "A-FRAN")), v(P(d2, "A003")), "sibling", d2, version);
    expect(sib.filter((o) => o.op === "create")).toHaveLength(0);
    expect(sib[0]).toMatchObject({ id: "A-FRAN", row: { parent_ids: ["A001", "A002"], gen: 0 } });
    expect(placeOps(v(P(d2, "A-FRAN")), v(P(d2, "A003")), "parent", d2, version)).toEqual([]);
    expect(placeOps(v(P(d2, "A-FRAN")), v(P(d2, "A-FRAN")), "cousin", d2, version)).toEqual([]);
  });
  it("cousin of someone goes through a hidden aunt-or-uncle", () => {
    const d2 = withFran();
    const after2 = apply(d2, placeOps(v(P(d2, "A-FRAN")), v(P(d2, "A003")), "cousin", d2, version));
    const g = graph(after2.people);
    expect(relationText(g, anchorFor(after2.people, "Angela"), P(after2, "A-FRAN"))).toBe("cousin");
  });
});

describe("deceased people are never shown", () => {
  it("a deceased partner drops out of the row; the living one stays", () => {
    const d = clone();
    P(d, "A005").deceased = true;
    P(d, "A004").partner_id = "A005";
    P(d, "A005").partner_id = "A004";
    const units = buildOutline(d).branches.flatMap((b) => [...b.roots, ...b.elders, ...b.unplaced].flatMap(walk));
    expect(units.flatMap((u) => u.people).some((p) => p.id === "A005")).toBe(false);
    expect(units.some((u) => u.people.some((p) => p.id === "A004"))).toBe(true);
  });
});

describe("names", () => {
  const p = (first: string, last: string | null, deceased = false) => ({ first, nick: null, last, deceased });
  it("keeps each partner's surname", () => {
    expect(pairName([p("Erica", "Schemper"), p("Erik", "Vorhes")])).toBe("Erica Schemper & Erik Vorhes");
    expect(pairName([p("Fran", "Van Noord"), p("Len", "Van Noord")])).toBe("Fran & Len Van Noord");
    expect(pairName([p("Pine", "Friend"), p("Quill", null)])).toBe("Pine Friend & Quill");
    expect(pairName([p("Nan", "CaJacob"), p("Pete", "CaJacob", true)])).toBe("Nan CaJacob");
  });
  it("fills friends' last names from the household name", () => {
    const m = [{ id: "a", first: "John", nick: null, last: null }, { id: "b", first: "Sara", nick: null, last: null }, { id: "c", first: "Zed", nick: null, last: "Known" }];
    expect([...lastNamesFromHousehold("John Schoon and Sara Tripp", m)]).toEqual([["a", "Schoon"], ["b", "Tripp"]]);
    expect([...lastNamesFromHousehold("John Schoon + guest", m)]).toEqual([["a", "Schoon"]]);
    expect([...lastNamesFromHousehold("Zed Other & Sara Van Der Berg", m)]).toEqual([["b", "Van Der Berg"]]);
  });
});

describe("envelope names (v8)", () => {
  const m = (first: string, last: string | null, extra: Partial<Person> = {}) =>
    ({ first, nick: null, last, deceased: false, placeholder: false, age: "adult", plus_one: false, ...extra }) as Person;
  it("adults with &, own surnames, guest, kids only when no adults, deceased left out", async () => {
    const { envelopeName } = await import("../src/people/names");
    expect(envelopeName([m("Fran", "Van Noord"), m("Len", "Van Noord"), m("Kid", "Van Noord", { age: "child" })])).toBe("Fran & Len Van Noord");
    expect(envelopeName([m("Erica", "Schemper"), m("Erik", "Vorhes")])).toBe("Erica Schemper & Erik Vorhes");
    expect(envelopeName([m("Sam", "Lee", { plus_one: true })])).toBe("Sam Lee & Guest");
    expect(envelopeName([m("Nan", "CaJacob"), m("Pete", "CaJacob", { deceased: true })])).toBe("Nan CaJacob");
    expect(envelopeName([m("Wren", "Example", { age: "child" })])).toBe("Wren Example");
    expect(envelopeName([m("G", null, { placeholder: true })])).toBe("");
  });
});

describe("name tidy (v8)", () => {
  it("lists automatic households whose name differs; custom ones are left alone", async () => {
    const { nameFixes } = await import("../src/people/names");
    const d = clone();
    const fixes = nameFixes(d);
    expect(fixes.find((f) => f.partyId === "H-M4")).toEqual({ partyId: "H-M4", from: D.parties.find((x) => x.id === "H-M4")!.name, to: "Hazel Example & Iris Other" });
    d.parties.find((x) => x.id === "H-M4")!.name_custom = true;
    expect(nameFixes(d).some((f) => f.partyId === "H-M4")).toBe(false);
  });
});
