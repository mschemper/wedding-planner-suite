// v10 bug fixes (code review, Oct 2026): quote matching, per-household cost, dates, custom venues, kids, paste.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { addedCost, computeBudget } from "../src/engine/compute";
import { customScenario } from "../src/data/custom";
import { isDay } from "../src/data/params";
import { scenarioById } from "../src/data/scenarios";
import type { Quote } from "../src/engine/types";
import { effectiveInvite, inviteCtx } from "../src/people/invite";
import type { PeopleData } from "../src/people/types";
import { householdCost } from "../src/plan/venueSummary";
import { costText } from "../src/ui/people/model";
import { pasteOps } from "../src/ui/plan/model";

const sc = scenarioById(1);
const q = (o: Partial<Quote>): Quote => ({
  id: "q1", scenario_id: 1, item_desc: "Venue rental (Saturday)", basis: "total", amount: 8000, includes_tax: false, status: "received", ...o,
});

describe("quotes", () => {
  it("an older quote for the same line is superseded, not unmatched", () => {
    const b = computeBudget(sc, 100, undefined, { quotes: [q({ id: "a", received_on: "2026-01-01" }), q({ id: "b", amount: 9000, received_on: "2026-02-01" })] });
    expect(b.rows.find((r) => r.quoteId)?.quoteId).toBe("b");
    expect(b.unmatchedQuotes).toBeUndefined();
  });
  it("a quote for no line is still unmatched", () => {
    expect(computeBudget(sc, 100, undefined, { quotes: [q({ item_desc: "Nope" })] }).unmatchedQuotes?.map((x) => x.id)).toEqual(["q1"]);
  });
});

describe("per-household cost", () => {
  it("a flat all-in quote adds nothing and says so", () => {
    const c = addedCost(sc, 100, 4, undefined, { quotes: [q({ item_desc: "*", amount: 30000, status: "accepted" })] })!;
    expect(c).toMatchObject({ amount: 0, flat: true });
    expect(costText(c)).toBe("nothing extra (flat quote)");
  });
  it("prices at the same snapped count as the venue summary", () => {
    const below = householdCost(sc, { quotes: [], date: "2027-06-12" }, sc.min - 30, 2)!;
    const at = householdCost(sc, { quotes: [], date: "2027-06-12" }, sc.min, 2)!;
    expect(below.amount).toBe(at.amount);
  });
});

describe("dates", () => {
  it("isDay accepts real days only", () => {
    expect(isDay("2027-06-12")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
    for (const s of ["2027-13-45", "2027-02-30", "2027-6-12", "", null]) expect(isDay(s)).toBe(false);
  });
});

describe("custom venue", () => {
  it("percent lines alone are not priced", () => {
    const v = { scenario_id: 1001, name: "X", location: null, kind: "local", description: null, capacity_seated: null, capacity_kids: null, capacity_cocktail: null,
      confidence: 40, items: [{ cat: "Fees & admin", desc: "Service", type: "percent", rate: 0.2 }], sources: [], notes: null, researched_at: null } as never;
    expect(customScenario(v).priced).toBe(false);
  });
});

describe("kids in an undecided household", () => {
  it("a named child follows the kids rule even before the household is decided", () => {
    const d = JSON.parse(JSON.stringify(fixture)) as PeopleData;
    const kid = d.people.find((p) => p.age === "child" && p.kind !== "couple" && p.party_id && !p.override)!;
    const party = d.parties.find((x) => x.id === kid.party_id)!;
    party.invite = "undecided"; party.kids = "out";
    expect(effectiveInvite(kid, inviteCtx(d, "all"))).toBe("no");
  });
});

describe("paste", () => {
  it("drops an unknown venue id instead of failing the save", () => {
    const [op] = pasteOps([{ title: "Call", scenario_id: 999 }], [], new Set([1, 2]));
    expect((op as { row: Record<string, unknown> }).row.scenario_id).toBeNull();
  });
});
