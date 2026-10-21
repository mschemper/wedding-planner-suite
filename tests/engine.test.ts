import { describe, expect, it } from "vitest";
import { computeBudget, diffByCategory, guestStops, interp, snapGuests } from "../src/engine/compute";
import { SCENARIOS, scenarioById } from "../src/data/scenarios";

describe("interp", () => {
  const a: [number, number][] = [[50, 1000], [100, 2000]];
  it("interpolates inside", () => expect(interp(a, 75)).toEqual({ v: 1500, extrapolated: false }));
  it("extrapolates above (was flat in v1)", () => expect(interp(a, 150)).toEqual({ v: 3000, extrapolated: true }));
  it("extrapolates below, floored at 0", () => expect(interp(a, 0).v).toBe(0));
});

describe("computeBudget", () => {
  it("percent rows tax only taxable items", () => {
    const b = computeBudget(scenarioById(3), 50, { bar: "BYO Beer & Wine" });
    expect(b.rows.find((r) => r.desc.startsWith("Tax"))!.amount).toBe(1810); // 20% of catering+cake, not BYO bar
  });
  it("percent row keeps its position in the item order", () => {
    const b = computeBudget(scenarioById(1), 100);
    const i = b.rows.findIndex((r) => r.desc.startsWith("Tax"));
    expect(b.rows[i - 1].desc).toMatch(/^Bar/);
  });
  it("contingency adds a row of subtotal × rate", () => {
    const base = computeBudget(scenarioById(2), 100).total;
    expect(computeBudget(scenarioById(2), 100, undefined, { contingency: 0.1 }).total).toBe(base + Math.round(base * 0.1));
  });
  it("warns on capacity, range, season, understatement", () => {
    expect(computeBudget(scenarioById(3), 50).warnings.join()).toMatch(/practical minimum/);
    expect(computeBudget(scenarioById(5), 125).warnings.join()).toMatch(/capacity/);
    expect(computeBudget(scenarioById(6), 100, undefined, { month: 4 }).warnings.join()).toMatch(/closed/);
    expect(computeBudget(scenarioById(14), 100).warnings.join()).toMatch(/understated/);
  });
  it("every scenario computes at every stop with defaults, no NaN", () => {
    for (const s of SCENARIOS) for (const g of guestStops(s.min, s.max)) expect(Number.isFinite(computeBudget(s, g).total)).toBe(true);
  });
  it("every bar choice selects at least one item (catches label typos)", () => {
    for (const s of SCENARIOS)
      for (const o of s.options.filter((x) => x.key === "bar"))
        for (const c of o.choices)
          expect(s.items.some((it) => it.appliesIf?.options?.[o.key] === c), `${s.name}: ${c}`).toBe(true);
  });
});

describe("helpers", () => {
  it("snapGuests clamps to scenario grid", () => {
    expect(snapGuests(scenarioById(5), 250)).toBe(100);
    expect(snapGuests(scenarioById(13), 50)).toBe(150);
  });
  it("diffByCategory sums to total delta", () => {
    const a = computeBudget(scenarioById(10), 100), b = computeBudget(scenarioById(2), 100);
    expect(diffByCategory(a, b).reduce((s, d) => s + d.delta, 0)).toBe(a.total - b.total);
  });
});
