// Ask the planner (v8): proposal → ops (src/ui/ask/proposals.ts) and the plan snapshot (worker/ask.ts). Synthetic data only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import type { Proposal } from "../worker/ask";
import { prepare } from "../src/ui/ask/proposals";
import type { PeopleData } from "../src/people/types";

const D = fixture as unknown as PeopleData;
const v = () => 3;
const base: Proposal = { kind: "set_decision", summary: "s", party_ids: null, person_ids: null, value: null, first: null, last: null, age: null, party_id: null, partner_of: null, title: null, due: null, owner: null };

describe("proposals", () => {
  it("decision: updates only households that change, with readable lines", () => {
    const und = D.parties.find((x) => x.invite !== "no")!;
    const r = prepare({ ...base, party_ids: [und.id, "H-A1"], value: "no" }, D, v);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ops.every((o) => o.op === "update" && o.table === "parties" && o.row.invite === "no")).toBe(true);
      expect(r.lines[0]).toMatch(/→ No$/);
    }
  });
  it("refuses unknown ids and values", () => {
    expect(prepare({ ...base, party_ids: ["NOPE"], value: "invite" }, D, v)).toMatchObject({ ok: false });
    expect(prepare({ ...base, party_ids: ["H-A1"], value: "maybe" }, D, v)).toMatchObject({ ok: false });
    expect(prepare({ ...base, kind: "set_ring", party_ids: ["H-A1"], value: "7" }, D, v)).toMatchObject({ ok: false });
    expect(prepare({ ...base, kind: "add_task", title: "x", due: "next week" }, D, v)).toMatchObject({ ok: false });
  });
  it("ring, local, rsvp, rename", () => {
    expect(prepare({ ...base, kind: "set_ring", party_ids: ["H-A1"], value: "2" }, D, v)).toMatchObject({ ok: true, ops: [{ row: { tier: 2 } }] });
    const loc = prepare({ ...base, kind: "set_local", party_ids: ["H-M2"], value: "away" }, D, v);
    expect(loc.ok && loc.ops.length).toBe(D.people.filter((p) => p.party_id === "H-M2" && p.local !== "away").length);
    expect(prepare({ ...base, kind: "set_rsvp", person_ids: ["M009"], value: "accepted" }, D, v)).toMatchObject({ ok: true, ops: [{ id: "M009", row: { rsvp: "accepted" } }] });
    const ren = prepare({ ...base, kind: "rename_person", person_ids: ["M010"], first: "Ivy", last: "Other" }, D, v);
    expect(ren).toMatchObject({ ok: true, ops: [{ id: "M010", row: { first: "Ivy" } }] });
  });
  it("add a partner into the partner's household; or a new household", () => {
    const r = prepare({ ...base, kind: "add_person", first: "Lee", last: "Park", age: "adult", partner_of: "A006" }, D, v);
    expect(r).toMatchObject({ ok: true, ops: [{ table: "people", op: "create", row: { first: "Lee", party_id: "H-A4", partner_id: "A006", side: "Angela", kind: "family" } }] });
    const n = prepare({ ...base, kind: "add_person", first: "Solo", age: "adult" }, D, v);
    expect(n.ok && n.ops.map((o) => o.table)).toEqual(["parties", "people"]);
  });
  it("task", () => {
    expect(prepare({ ...base, kind: "add_task", title: "Call the florist", due: "2026-11-02", owner: "Angela" }, D, v))
      .toMatchObject({ ok: true, ops: [{ table: "tasks", op: "create", row: { title: "Call the florist", due: "2026-11-02", owner: "Angela" } }] });
  });
});
