// Pure helpers behind the Budget tab (src/ui/venues/model.ts) + stored-prefs migration (src/ui/prefs.ts).
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/params";
import { SCENARIOS } from "../src/data/scenarios";
import { SEED_FIT, SEED_MUSTHAVES, SEED_VENUES } from "../src/data/seed-v4";
import { headcount } from "../src/people/headcount";
import fixture from "../data/fixtures/garden.sample.json";
import type { PeopleData } from "../src/people/types";
import { summarizeAll } from "../src/plan/venueSummary";
import { DEFAULT_PREFS, loadPrefs } from "../src/ui/prefs";
import { guestSplit, pricedAtText, quoteIssue, splitText, windowParts } from "../src/ui/venues/model";

const hc = headcount(fixture as unknown as PeopleData, "ours");
const sums = summarizeAll({
  scenarios: SCENARIOS, venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, quotes: [], headcount: hc,
  guests: 75, date: "2027-06-12", windows: DEFAULT_SETTINGS.dateWindows,
});

describe("text", () => {
  it("window parts: totals, unavailable, unpriced", () => {
    const base = sums.active[0];
    const v = { ...base, byWindow: [{ name: "Late spring", ref: "2027-06-12", total: 1000 }, { name: "Fall", ref: "2027-09-18", unavailable: "closed" }, { name: "X", ref: "2027-10-01" }] };
    expect(windowParts(v, (n) => `$${n}`)).toEqual([
      { name: "Late spring", text: "$1000", bad: false }, { name: "Fall", text: "unavailable: closed", bad: true }, { name: "X", text: "awaiting rate sheet", bad: false },
    ]);
  });
  it("priced-at note only when snapped", () => {
    expect(pricedAtText({ snapped: false, guests: 75, asked: 75 })).toBe("");
    expect(pricedAtText({ snapped: true, guests: 80, asked: 60 })).toMatch(/smallest modelled count \(you picked 60\)/);
    expect(pricedAtText({ snapped: true, guests: 150, asked: 200 })).toMatch(/largest/);
  });
  it("unpriced seed venue has no budget", () => {
    const u = [...sums.active, ...sums.archive].find((v) => !v.priced);
    expect(u?.budget).toBeUndefined();
  });
});

describe("quote form (REVIEW-v6 Q2)", () => {
  it("needs a vendor to apply, and a reason for $0", () => {
    const q = { amount: "500", status: "received", vendor: "", notes: "" };
    expect(quoteIssue(q)).toMatch(/vendor/);
    expect(quoteIssue({ ...q, vendor: "Lens Co" })).toBe("");
    expect(quoteIssue({ ...q, amount: "0", vendor: "Firehouse" })).toMatch(/\$0/);
    expect(quoteIssue({ ...q, amount: "0", vendor: "Firehouse", notes: "in package" })).toBe("");
    expect(quoteIssue({ ...q, status: "requested" })).toBe("");
    expect(quoteIssue({ ...q, amount: "abc" })).toMatch(/number/);
  });
});

describe("guest basis", () => {
  it("adults/kids split adds up to the guest count", () => {
    expect(guestSplit(hc, "custom", 75)).toBeNull();
    const s = guestSplit(hc, "expected", 63);
    if (s) { expect(s.adults + s.kids).toBe(63); expect(splitText(s)).toMatch(/\d+ adults?, \d+ kids?\)/); }
    expect(splitText(null)).toBe("");
    const t = { heads: 10, adults: 8, kids: 2, expected: 5 };
    expect(guestSplit({ ...hc, invited: t }, "ceiling", 10)).toEqual({ adults: 8, kids: 2 });
  });
});

describe("stored prefs (v14: tab venues -> budget)", () => {
  const store = (v: Record<string, string>) => vi.stubGlobal("localStorage", { getItem: (k: string) => v[k] ?? null, setItem: () => undefined });
  afterEach(() => vi.unstubAllGlobals());
  it("old tab 'venues' loads as 'budget'", () => {
    store({ "wps.prefs.v2": JSON.stringify({ v: 2, tab: "venues", guestBasis: "custom", guests: 90, capacityVenue: 5, selected: 3, date: "2027-09-18" }) });
    const p = loadPrefs();
    expect(p.tab).toBe("budget");
    expect(p).toMatchObject({ guestBasis: "custom", guests: 90, capacityVenue: 5, selected: 3 });
    expect(p.date).toBeNull();
  });
  it("budget stays budget; junk tab falls back; v1 prefs map to budget", () => {
    store({ "wps.prefs.v2": JSON.stringify({ v: 2, tab: "budget" }) });
    expect(loadPrefs().tab).toBe("budget");
    store({ "wps.prefs.v2": JSON.stringify({ v: 2, tab: "nope" }) });
    expect(loadPrefs().tab).toBe(DEFAULT_PREFS.tab);
    store({ "wps.prefs.v1": JSON.stringify({ tab: "quotes" }) });
    expect(loadPrefs().tab).toBe("budget");
  });
});
