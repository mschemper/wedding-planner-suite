import { describe, expect, it } from "vitest";
import { TIMELINE_TEMPLATE } from "../src/plan/day";
import { createOp, draftError, draftOf, emptyDraft, parseMinutes, rowOf, templateOps, timelineChanges } from "../src/ui/day/timelineModel";

const row = { id: "TL01", start: "17:00", minutes: 30, title: "Ceremony", place: "Patio", who: null, notes: null };
const ok = { ...emptyDraft(), title: "x" };

describe("timeline model", () => {
  it("validates", () => {
    expect(draftError(ok)).toBeNull();
    expect(draftError(emptyDraft())).toMatch(/title/);
    expect(draftError({ ...ok, start: "24:00" })).toMatch(/Start/);
    expect(draftError({ ...ok, start: "7:00" })).toMatch(/Start/);
    expect(draftError({ ...ok, start: "00:00" })).toBeNull();
    expect(draftError({ ...ok, minutes: "721" })).toMatch(/Minutes/);
    expect(draftError({ ...ok, minutes: "1.5" })).toMatch(/Minutes/);
    expect(draftError({ ...ok, minutes: "" })).toMatch(/Minutes/);
  });
  it("parses minutes", () => {
    expect(parseMinutes("0")).toBe(0);
    expect(parseMinutes(" 720 ")).toBe(720);
    expect(parseMinutes("-1")).toBeNull();
  });
  it("diffs only changed fields", () => {
    const d = draftOf(row);
    expect(timelineChanges(row, d)).toEqual({});
    expect(timelineChanges(row, { ...d, minutes: "45", who: "Officiant", place: "" })).toEqual({ minutes: 45, who: "Officiant", place: null });
  });
  it("builds create rows with nulls for blanks", () => {
    expect(rowOf({ ...ok, title: " A ", place: " " })).toEqual({ start: "12:00", minutes: 30, title: "A", place: null, who: null, notes: null });
    expect(createOp(ok)).toMatchObject({ table: "timeline", op: "create" });
  });
  it("template ops: one create per row, no ids", () => {
    const ops = templateOps();
    expect(ops).toHaveLength(TIMELINE_TEMPLATE.length);
    for (const o of ops) {
      expect(o.table).toBe("timeline");
      expect(o.op).toBe("create");
      if (o.op === "create") expect(o.row).not.toHaveProperty("id");
    }
  });
});
