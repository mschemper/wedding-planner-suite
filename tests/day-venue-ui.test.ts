// Pure helpers behind Day > Our venue and the Today venue card (DESIGN-v11).
import { describe, expect, it } from "vitest";
import { milestoneDrafts } from "../src/plan/day";
import { capList, memorialWeekend, milestoneButton, milestoneOps } from "../src/ui/day/ourVenueModel";
import { roomLine, weddingSub } from "../src/ui/today/model";

const WED = "2027-05-29";
const TODAY = "2026-11-09";

describe("milestoneOps", () => {
  it("builds one task create per draft", () => {
    const drafts = milestoneDrafts(WED, TODAY, []);
    const ops = milestoneOps(drafts, 5, TODAY);
    expect(ops).toHaveLength(drafts.length);
    const o = ops[0];
    expect(o.table).toBe("tasks");
    expect(o.op).toBe("create");
    if (o.op !== "create") throw new Error("create expected");
    expect(o.row.source).toBe(drafts[0].source);
    expect(String(o.row.source)).toMatch(/^milestone:/);
    expect(o.row.due).toBe(drafts[0].due);
    expect(o.row.owner).toBe("Both");
    expect(o.row.status).toBe("open");
    expect(o.row.scenario_id).toBe(5);
  });
  it("skips milestones already in Plan", () => {
    const first = milestoneDrafts(WED, TODAY, [])[0];
    const rest = milestoneDrafts(WED, TODAY, [{ source: first.source }]);
    expect(rest.find((d) => d.key === first.key)).toBeUndefined();
    expect(milestoneOps([], 5, TODAY)).toEqual([]);
  });
});

describe("helpers", () => {
  it("memorialWeekend finds the holiday", () => {
    expect(memorialWeekend("2027-05-29")).toBe("2027-05-31");
    expect(memorialWeekend("2027-05-31")).toBe("2027-05-31");
    expect(memorialWeekend("2027-06-12")).toBeNull();
  });
  it("capList caps at max unless all", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7];
    expect(capList(xs, 5, false)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 2 });
    expect(capList(xs, 5, true).shown).toHaveLength(7);
    expect(capList([1], 5, false).hidden).toBe(0);
  });
  it("labels", () => {
    expect(milestoneButton(0)).toBe("All milestones are in Plan");
    expect(milestoneButton(1)).toBe("Add 1 milestone to Plan");
    expect(milestoneButton(12)).toBe("Add 12 milestones to Plan");
    expect(weddingSub(WED, "The Joinery")).toBe("to Sat, May 29, 2027 · The Joinery");
    expect(roomLine(64, 160)).toBe("≈ 64 / 160 seats");
    expect(roomLine(64, null)).toBe("≈ 64 expected");
  });
});
