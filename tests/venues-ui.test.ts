// Pure helpers behind the Venues tab (src/ui/venues/model.ts).
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/params";
import { SCENARIOS } from "../src/data/scenarios";
import { SEED_FIT, SEED_MUSTHAVES, SEED_VENUES } from "../src/data/seed-v4";
import { headcount } from "../src/people/headcount";
import fixture from "../data/fixtures/garden.sample.json";
import type { PeopleData } from "../src/people/types";
import { summarizeAll } from "../src/plan/venueSummary";
import type { Fit } from "../src/plan/types";
import {
  capacityText, cycleFitWrite, dateChoice, draftOf, fitPct, fitText, noteWrite, parseHeld, parseWindows, safeUrl, statusRank, statusTone,
  quoteIssue, telHref, venuePatch, windowParts, addVenueOps, blankDraft, blankItem, capacityShort, confidenceWords, draftIssues,
  guestSplit, percentFromText, percentText, splitText, venueFromDraft,
} from "../src/ui/venues/model";

const hc = headcount(fixture as unknown as PeopleData, "ours");
const sums = summarizeAll({
  scenarios: SCENARIOS, venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, quotes: [], headcount: hc,
  guests: 75, date: "2027-06-12", windows: DEFAULT_SETTINGS.dateWindows,
});

describe("status", () => {
  it("tones", () => {
    expect(statusTone("held")).toBe("peony");
    expect(statusTone("booked")).toBe("euc");
    expect(statusTone("quoted")).toBe("gold");
    expect(statusTone("toured")).toBe("gold");
    expect(statusTone("researching")).toBe("plain");
    expect(statusTone(undefined)).toBe("plain");
  });
  it("order: booked first, passed last", () => {
    expect(statusRank("booked")).toBeLessThan(statusRank("held"));
    expect(statusRank("held")).toBeLessThan(statusRank("researching"));
    expect(statusRank("passed")).toBeGreaterThan(statusRank("researching"));
  });
});

describe("fit writes", () => {
  const fit: Fit[] = [{ id: "1:m1", scenario_id: 1, musthave_id: "m1", verdict: "yes" }];
  it("existing row -> edit with the next verdict", () => {
    const { next, write } = cycleFitWrite(fit, 1, "m1");
    expect(next).toBe("partly");
    expect(write).toEqual({ kind: "edit", patches: [{ table: "fit", id: "1:m1", row: { verdict: "partly" } }] });
  });
  it("missing row -> create, unknown goes to yes", () => {
    const { next, write } = cycleFitWrite(fit, 2, "m1");
    expect(next).toBe("yes");
    expect(write).toEqual({ kind: "create", ops: [{ table: "fit", op: "create", row: { scenario_id: 2, musthave_id: "m1", verdict: "yes" } }] });
  });
  it("note: blank clears to null; new row starts unknown", () => {
    expect(noteWrite(fit, 1, "m1", "  ")).toEqual({ kind: "edit", patches: [{ table: "fit", id: "1:m1", row: { note: null } }] });
    expect(noteWrite(fit, 2, "m1", " valet ")).toEqual({ kind: "create", ops: [{ table: "fit", op: "create", row: { scenario_id: 2, musthave_id: "m1", verdict: "unknown", note: "valet" } }] });
  });
});

describe("text", () => {
  it("fit text and bar", () => {
    const f = { yes: 8, partly: 0, no: 0, unknown: 2, score: 1 };
    expect(fitText(f)).toBe("Fit 8 of 10 · 2 unknown");
    expect(fitPct(f)).toBe(100);
    expect(fitPct({ yes: 0, partly: 0, no: 0, unknown: 3, score: null })).toBe(0);
    expect(fitText({ yes: 0, partly: 0, no: 0, unknown: 0, score: null })).toBe("No must-haves yet");
  });
  it("capacity: ok, over, none", () => {
    const base = sums.active[0];
    const ok = { ...base, scenario: { ...base.scenario, kidsRoom: true }, capacity: { used: 66, cap: 82, spare: 16, fits: 0, kids: 9, kidsCap: 20, kidsSpare: 11, ok: true, cocktail: 100 } };
    expect(capacityText(ok)).toBe("66 adults of 82 ✓ · 9 kids of 20 upstairs ✓ · cocktail 100");
    const kidsOver = { ...ok, capacity: { ...ok.capacity, kids: 23, kidsSpare: -3, ok: false } };
    expect(capacityText(kidsOver)).toBe("66 adults of 82 ✓ · kids over by 3 (23 vs 20 upstairs) · cocktail 100");
    const noKidsCap = { ...ok, capacity: { ...ok.capacity, kids: 1, kidsCap: null, kidsSpare: null } };
    expect(capacityText(noKidsCap)).toBe("66 adults of 82 ✓ · 1 kid upstairs · cocktail 100");
    const over = { ...base, scenario: { ...base.scenario, kidsRoom: false }, capacity: { used: 90, cap: 82, spare: -8, fits: 0, kids: 0, kidsCap: null, kidsSpare: null, ok: false } };
    expect(capacityText(over)).toBe("Guests over by 8 (90 vs cap 82)");
    expect(capacityText({ ...base, capacity: undefined, scenario: { ...base.scenario, capacity: undefined } })).toBe("No seated cap published");
  });
  it("window parts: totals, unavailable, unpriced", () => {
    const base = sums.active[0];
    const v = { ...base, byWindow: [{ name: "Late spring", ref: "2027-06-12", total: 1000 }, { name: "Fall", ref: "2027-09-18", unavailable: "closed" }, { name: "X", ref: "2027-10-01" }] };
    expect(windowParts(v, (n) => `$${n}`)).toEqual([
      { name: "Late spring", text: "$1000", bad: false }, { name: "Fall", text: "unavailable: closed", bad: true }, { name: "X", text: "awaiting rate sheet", bad: false },
    ]);
  });
  it("unpriced seed venue has no budget", () => {
    const u = [...sums.active, ...sums.archive].find((v) => !v.priced);
    expect(u?.budget).toBeUndefined();
  });
  it("links", () => {
    expect(safeUrl("https://a.example/x")).toBe("https://a.example/x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(telHref("(312) 555-0100")).toBe("tel:3125550100");
  });
});

describe("venue form", () => {
  const row = { scenario_id: 1, active: true, status: "held" as const, hold_date: "2027-06-12", next_step: "Call" };
  it("patch has only changed fields; blanks -> null", () => {
    const d = draftOf(row);
    expect(venuePatch(row, d)).toEqual({});
    expect(venuePatch(row, { ...d, next_step: "Email", hold_date: "", contact_name: " Sam " })).toEqual({ next_step: "Email", hold_date: null, contact_name: "Sam" });
  });
});

describe("assumptions", () => {
  it("held date", () => {
    expect(parseHeld("")).toEqual({ ok: true, value: null });
    expect(parseHeld("2027-06-12")).toEqual({ ok: true, value: "2027-06-12" });
    expect(parseHeld("June 12").ok).toBe(false);
  });
  it("windows validate through parseParamValue", () => {
    const good = [{ name: " Spring ", from: "2027-05-01", to: "2027-06-30", ref: "2027-06-12" }];
    const r = parseWindows(good);
    expect(r.ok && r.value[0].name).toBe("Spring");
    const bad = parseWindows([{ name: "A", from: "2027-05-01", to: "2027-06-30", ref: "2027-07-01" }]);
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.msg).toMatch(/dateWindows/);
    expect(parseWindows([]).ok).toBe(false);
  });
  it("date chip choice", () => {
    const w = DEFAULT_SETTINGS.dateWindows;
    expect(dateChoice("2027-06-12", "2027-06-12", w)).toBe("held");
    expect(dateChoice("2027-09-18", "2027-06-12", w)).toBe("2027-09-18");
    expect(dateChoice("2027-07-01", null, w)).toBeNull();
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

describe("add venue", () => {
  const item = { ...blankItem(), desc: "Rental fee", value: "$4,500" };
  const draft = () => ({ ...blankDraft("Test Hall", "Evanston"), website: "https://example.com", seated: "120", kids: "20", items: [item, { ...blankItem(), desc: "Service", type: "percent" as const, value: "22" }], researched_at: "2026-10-22", summary: "Short." });
  it("percent text <-> fraction", () => {
    expect(percentFromText("22")).toBe(0.22);
    expect(percentFromText("22.5%")).toBe(0.225);
    expect(percentFromText("x")).toBeNull();
    expect(percentText(0.22)).toBe("22");
  });
  it("draft becomes a CustomVenue", () => {
    const v = venueFromDraft(draft(), 1000);
    expect(v.items[0]).toMatchObject({ type: "fixed", amount: 4500 });
    expect(v.items[1]).toMatchObject({ type: "percent", rate: 0.22 });
    expect(v.capacity_seated).toBe(120);
    expect(v.sources[0]).toBe("https://example.com");
  });
  it("issues block empty name and bad numbers", () => {
    expect(draftIssues(draft())).toEqual([]);
    expect(draftIssues({ ...draft(), name: " " })[0]).toMatch(/name/);
    expect(draftIssues({ ...draft(), items: [{ ...item, value: "" }] }).length).toBeGreaterThan(0);
    expect(draftIssues({ ...draft(), items: [{ ...item, type: "percent", value: "80" }] }).length).toBeGreaterThan(0);
    expect(draftIssues({ ...draft(), confidence: "150" }).length).toBeGreaterThan(0);
  });
  it("ops: venue, shortlist row, task due in 7 days, id past existing customs", () => {
    const ops = addVenueOps(draft(), [1, 18, 1000, 1001], "2026-10-22");
    expect(ops.map((o) => o.table)).toEqual(["custom_venues", "venues", "tasks"]);
    expect((ops[0] as unknown as { row: { scenario_id: number } }).row.scenario_id).toBe(1002);
    expect((ops[1] as { row: Record<string, unknown> }).row).toMatchObject({ scenario_id: 1002, active: true, status: "researching" });
    expect((ops[2] as { row: Record<string, unknown> }).row).toMatchObject({ due: "2026-10-29", owner: "Both", category: "venue", source: "manual", scenario_id: 1002, title: "Contact Test Hall for pricing, F&B minimum and 2027 dates" });
    expect(addVenueOps(draft(), [], "2026-12-28")[2]).toMatchObject({ row: { due: "2027-01-04", scenario_id: 1000 } });
  });
  it("percent lines round-trip; confidence words", () => {
    const d = { ...blankDraft("A"), items: [{ ...blankItem(), desc: "Fee", type: "percent" as const, value: "20" }] };
    expect(venueFromDraft(d, 1000).items[0].rate).toBe(0.2);
    expect(confidenceWords(55)).toMatch(/rough/);
  });
  it("adults/kids split adds up to the guest count", () => {
    expect(guestSplit(hc, "custom", 75)).toBeNull();
    const s = guestSplit(hc, "expected", 63);
    if (s) { expect(s.adults + s.kids).toBe(63); expect(splitText(s)).toMatch(/\d+ adults?, \d+ kids?\)/); }
    expect(splitText(null)).toBe("");
    const t = { heads: 10, adults: 8, kids: 2, expected: 5 };
    expect(guestSplit({ ...hc, invited: t }, "ceiling", 10)).toEqual({ adults: 8, kids: 2 });
  });
  it("capacityShort", () => {
    expect(sums.active.map(capacityShort).every((t) => typeof t === "string" && t.length > 0)).toBe(true);
  });
});
