import { describe, expect, it } from "vitest";
import { addedCost, computeBudget, diffByCategory, guestStops, interp, matchOptions, seasonOf, snapGuests } from "../src/engine/compute";
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
    expect(computeBudget(scenarioById(5), 175).warnings.join()).toMatch(/capacity/);
    expect(computeBudget(scenarioById(6), 100, undefined, { date: "2027-04-24" }).unavailable).toMatch(/Closed/);
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

describe("seasons (venue calendars)", () => {
  const rr = scenarioById(4);
  it("River Room: Apr 15 off-peak, Apr 16 peak (venue's 2027 dates)", () => {
    expect(seasonOf(rr, "2027-04-15")).toBe("off-peak");
    expect(seasonOf(rr, "2027-04-16")).toBe("peak");
    expect(seasonOf(rr, "2027-12-01")).toBe("off-peak"); // wraps year end
  });
  it("River Room peak under 100 is not offered; at 100 it prices $9,000 rental", () => {
    expect(computeBudget(rr, 75, undefined, { date: "2027-05-15" }).unavailable).toMatch(/100\+/);
    const b = computeBudget(rr, 100, undefined, { date: "2027-05-15" });
    expect(b.unavailable).toBeUndefined();
    expect(b.rows.find((r) => r.desc.startsWith("Venue rental"))!.amount).toBe(9000);
  });
  it("Salvage One rental follows the 2027 month tiers", () => {
    const rent = (d: string) => computeBudget(scenarioById(3), 100, undefined, { date: d }).rows.find((r) => r.desc.startsWith("Venue rental"))!.amount;
    expect([rent("2027-03-20"), rent("2027-04-24"), rent("2027-05-22"), rent("2027-11-20")]).toEqual([9000, 10000, 12000, 9500]);
  });
  it("Morton: package Jan–Apr, standard $9,000 from May", () => {
    const rent = (d: string) => computeBudget(scenarioById(10), 100, undefined, { date: d }).rows.find((r) => r.desc.startsWith("Venue"))!.amount;
    expect([rent("2027-04-24"), rent("2027-05-01")]).toEqual([5000, 9000]);
  });
  it("Promontory open May–Oct only", () => {
    expect(computeBudget(scenarioById(6), 100, undefined, { date: "2027-05-01" }).unavailable).toBeUndefined();
    expect(computeBudget(scenarioById(6), 100, undefined, { date: "2027-03-20" }).unavailable).toBeTruthy();
  });
  it("no date → doc season (golden unchanged)", () => expect(seasonOf(scenarioById(3))).toBe("Jan–Mar"));
});

describe("guards and compare", () => {
  it("negative / fractional / NaN guest counts are clamped and rounded", () => {
    expect(computeBudget(scenarioById(2), -5).guests).toBe(0);
    expect(computeBudget(scenarioById(2), 99.6).guests).toBe(100);
    expect(computeBudget(scenarioById(2), NaN).total).toBeGreaterThan(0);
  });
  it("matchOptions maps bar tier by position", () => {
    expect(matchOptions(scenarioById(2), { bar: "Full Bar" }, scenarioById(5))).toEqual({ bar: "Tier 2 (Full Bar)" });
    expect(matchOptions(scenarioById(2), { bar: "Full Bar" }, scenarioById(12))).toEqual({ scope: "Full scope" });
  });
});

describe("added venues (v7)", () => {
  it("prices a custom venue like a code scenario; no lines = awaiting rates", async () => {
    const { customScenario } = await import("../src/data/custom");
    const { computeBudget } = await import("../src/engine/compute");
    const sc = customScenario({ scenario_id: 1001, name: "Hall", kind: "local", confidence: 50, sources: ["https://x.test", "notaurl"], researched_at: "2026-10-22",
      capacity_seated: 120, capacity_kids: 15,
      items: [
        { cat: "Venue & site", desc: "Rental", type: "fixed", amount: 5000 },
        { cat: "Food & beverage", desc: "Catering", type: "perGuest", rate: 100 },
        { cat: "Food & beverage", desc: "Tax + service", type: "percent", rate: 0.2 },
      ] });
    expect(sc).toMatchObject({ id: 1001, priced: true, kidsRoom: true, capacity: { hardMax: 120, kids: 15 }, sources: ["https://x.test"], tag: "Researched" });
    const b = computeBudget(sc, 50);
    // 5000 + 50 × 100 + 20% of catering (taxable) = 11,000
    expect(Math.round(b.total)).toBe(11000);
    expect(customScenario({ scenario_id: 1002, name: "TBD", kind: "local", confidence: 30, sources: [], items: [] }).priced).toBe(false);
  });
});

describe("household cost (v9)", () => {
  it("is the difference between two totals; null when unpriced or unavailable", () => {
    const s = SCENARIOS.find((x) => x.priced !== false && x.items.length && 60 >= x.min && 62 <= x.max)!;
    const c = addedCost(s, 60, 2)!;
    expect(c.amount).toBe(computeBudget(s, 62).total - computeBudget(s, 60).total);
    expect(c.amount).toBeGreaterThan(0);
    expect(addedCost({ ...s, priced: false }, 60, 2)).toBeNull();
    const cap = s.capacity?.hardMax;
    if (cap) expect(addedCost(s, cap, 50)).toBeNull();
  });
});
