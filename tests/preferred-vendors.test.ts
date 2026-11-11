// v17 Joinery preferred list: data shape + pure helpers (src/ui/day/preferredModel.ts). Business info only.
import { describe, expect, it } from "vitest";
import { PREFERRED } from "../src/data/preferredVendors";
import { offersDayOf, preferredIn, shortlistCount, shortlistOp, trackedAs } from "../src/ui/day/preferredModel";
import type { Vendor } from "../src/plan/types";

describe("preferred vendors", () => {
  it("covers the paper list: 5 categories, no duplicates within a category", () => {
    const counts = Object.fromEntries(["catering", "photo", "planner", "florals", "music"].map((c) => [c, PREFERRED.filter((p) => p.category === c).length]));
    expect(counts).toEqual({ catering: 21, photo: 22, planner: 21, florals: 14, music: 13 });
    for (const c of Object.keys(counts)) {
      const names = PREFERRED.filter((p) => p.category === c).map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(PREFERRED.filter((p) => p.marked).map((p) => p.name)).toHaveLength(8);
  });
  it("marked first, search by name or style", () => {
    const cat = preferredIn("catering");
    expect(cat.slice(0, 8).every((p) => p.marked)).toBe(true);
    expect(preferredIn("catering", { markedOnly: true })).toHaveLength(8);
    expect(preferredIn("music", { query: "toast" }).map((p) => p.name)).toEqual(["Toast and Jam"]);
  });
  it("planners offering day-of come first", () => {
    const pl = preferredIn("planner");
    const firstNo = pl.findIndex((p) => !offersDayOf(p));
    expect(firstNo).toBeGreaterThan(5);
    expect(pl.slice(firstNo).some((p) => offersDayOf(p))).toBe(false);
  });
  it("tracks a shortlisted vendor by loose name match and builds an idea row", () => {
    const p = PREFERRED.find((x) => x.name === "Toast and Jam")!;
    const v = { id: "V09", category: "music", name: "Toast & Jam", status: "contacted" } as Vendor;
    expect(trackedAs(p, [v])?.id).toBe("V09");
    expect(trackedAs(p, [{ ...v, category: "photo" }])).toBeUndefined();
    expect(shortlistCount("music", [v])).toEqual({ total: 13, tracked: 1 });
    expect(shortlistOp(p, 5)).toMatchObject({ table: "vendors", op: "create", row: { category: "music", name: "Toast and Jam", status: "idea", scenario_id: 5 } });
  });
});
