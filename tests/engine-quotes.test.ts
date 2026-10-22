import { describe, expect, it } from "vitest";
import { applicableQuotes, computeBudget } from "../src/engine/compute";
import { scenarioById } from "../src/data/scenarios";
import type { Quote } from "../src/engine/types";

const sc = scenarioById(1);
const q = (o: Partial<Quote>): Quote => ({
  id: "q1", scenario_id: 1, item_desc: "Venue rental (Saturday)", basis: "total", amount: 8000,
  includes_tax: false, status: "received", ...o,
});
const row = (b: ReturnType<typeof computeBudget>, d: string) => b.rows.find((r) => r.desc === d)!;

describe("quotes in computeBudget", () => {
  const base = computeBudget(sc, 100);
  it("no quotes -> identical to before", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [] });
    expect(b.total).toBe(base.total);
    expect(b.unmatchedQuotes).toBeUndefined();
    expect(b.rows.some((r) => r.quoted)).toBe(false);
  });
  it("overrides a fixed row and records the estimate", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({})] });
    const r = row(b, "Venue rental (Saturday)");
    expect(r).toMatchObject({ amount: 8000, quoted: true, quoteId: "q1", estimate: 6000 });
    expect(b.total).toBe(base.total + 2000);
  });
  it("perGuest basis multiplies by guests", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ item_desc: "Catering", basis: "perGuest", amount: 200 })] });
    expect(row(b, "Catering").amount).toBe(20000);
  });
  it("percent rows recompute from quoted taxable amounts", () => {
    const t = (b: typeof base) => row(b, "Tax + gratuity (~20% F&B)").amount;
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ item_desc: "Catering", amount: 20000 })] });
    expect(t(b)).toBe(t(base) + Math.round(0.2 * (20000 - 15000)));
  });
  it("includes_tax removes the quote from the tax base", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ item_desc: "Catering", amount: 20000, includes_tax: true })] });
    expect(row(b, "Tax + gratuity (~20% F&B)").amount).toBe(row(base, "Tax + gratuity (~20% F&B)").amount - Math.round(0.2 * 15000));
  });
  it("accepted beats received; else latest received_on", () => {
    const qs = [q({ id: "a", amount: 7000, status: "accepted", received_on: "2026-01-01" }), q({ id: "b", amount: 9000, received_on: "2026-06-01" })];
    expect(row(computeBudget(sc, 100, undefined, { quotes: qs }), "Venue rental (Saturday)").quoteId).toBe("a");
    const rs = [q({ id: "a", received_on: "2026-01-01" }), q({ id: "b", received_on: "2026-06-01" })];
    expect(row(computeBudget(sc, 100, undefined, { quotes: rs }), "Venue rental (Saturday)").quoteId).toBe("b");
  });
  it("options mismatch -> unmatched, row untouched", () => {
    const x = q({ options: { bar: "Full Bar" } });
    const b = computeBudget(sc, 100, { bar: "Beer & Wine" }, { quotes: [x] });
    expect(b.unmatchedQuotes).toEqual([x]);
    expect(b.total).toBe(base.total);
    expect(applicableQuotes(sc, [x], { bar: "Full Bar" })).toEqual([x]);
  });
  it("quote for a row that does not apply is unmatched", () => {
    const b = computeBudget(sc, 100, { bar: "Beer & Wine" }, { quotes: [q({ item_desc: "Bar — full open bar" })] });
    expect(b.unmatchedQuotes).toHaveLength(1);
  });
  it("requested status and other scenarios are ignored", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ status: "requested" }), q({ id: "z", scenario_id: 2 })] });
    expect(b.total).toBe(base.total);
    expect(b.unmatchedQuotes).toBeUndefined();
  });
  it("'*' replaces all rows; contingency applies after", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ item_desc: "*", amount: 50000 })], contingency: 0.1 });
    expect(b.rows).toHaveLength(2);
    expect(b.rows[0]).toMatchObject({ desc: "Quoted all-in", amount: 50000, quoted: true, estimate: base.total });
    expect(b.total).toBe(55000);
  });
});
