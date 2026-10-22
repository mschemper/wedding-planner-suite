// v4 planning logic: tasks, fit, venue summary, settings (DESIGN-v4 §4).
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/data/params";
import { SCENARIOS, scenarioById } from "../src/data/scenarios";
import { SEED_FIT, SEED_MUSTHAVES, SEED_TASKS, SEED_VENUES } from "../src/data/seed-v4";
import { headcount } from "../src/people/headcount";
import type { PeopleData } from "../src/people/types";
import { fitScore, NEXT_VERDICT } from "../src/plan/fit";
import { addDays, chicagoToday, groupTasks, nextUp, parsePastedTasks } from "../src/plan/tasks";
import { summarize, summarizeAll } from "../src/plan/venueSummary";

const hc = headcount(fixture as unknown as PeopleData, "ours");
const input = {
  scenarios: SCENARIOS, venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, quotes: [], headcount: hc,
  guests: 75, date: "2027-06-12", windows: DEFAULT_SETTINGS.dateWindows,
};

describe("tasks", () => {
  it("groups vs today and puts overdue first", () => {
    const g = groupTasks(SEED_TASKS, "2026-10-27");
    expect(g[0].group).toBe("overdue");
    expect(g[0].tasks.map((t) => t.id)).toEqual(["T006"]);
    expect(g.find((x) => x.group === "week")!.tasks[0].id).toBe("T001");
    expect(nextUp(SEED_TASKS, "2026-10-27", 3).map((t) => t.id)).toEqual(["T006", "T001", "T002"]);
  });
  it("chicagoToday / addDays", () => {
    expect(chicagoToday(new Date("2026-10-22T04:30:00Z"))).toBe("2026-10-21");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
  });
  it("pasted tasks: JSON list or {tasks}; needs titles", () => {
    expect(parsePastedTasks('[{"title":"Call florist","owner":"Angela","junk":1}]')).toEqual({ ok: true, tasks: [{ title: "Call florist", owner: "Angela" }] });
    expect(parsePastedTasks('{"tasks":[{"title":"x"}]}').ok).toBe(true);
    expect(parsePastedTasks("[{}]").ok).toBe(false);
    expect(parsePastedTasks("not json").ok).toBe(false);
  });
});

describe("fit", () => {
  it("scores answered verdicts; unknown counted apart", () => {
    const s = fitScore(17, SEED_MUSTHAVES, SEED_FIT);
    expect(s).toMatchObject({ yes: 2, partly: 2, no: 0, unknown: 5 });
    expect(s.score).toBeCloseTo(0.75);
    expect(fitScore(18, SEED_MUSTHAVES, SEED_FIT).score).toBeNull();
    expect(NEXT_VERDICT.unknown).toBe("yes");
  });
});

describe("venue summary", () => {
  it("Firehouse: peak Saturday rate on Jun 12, off-peak in May; kids' room keeps kids out of the cap", () => {
    const v = summarize(scenarioById(17), input);
    expect(v.priced).toBe(true);
    expect(v.budget!.rows.some((r) => r.desc.includes("peak Saturday") && r.amount === 12000)).toBe(true);
    const may = summarize(scenarioById(17), { ...input, date: "2027-05-15" });
    expect(may.budget!.total - v.budget!.total).toBe(-1000);
    expect(v.capacity).toMatchObject({ cap: 82, used: hc.invited.adults, ok: true });
    expect(v.byWindow.map((w) => w.name)).toEqual(["Late spring", "Early fall"]);
  });
  it("Ravenswood is unpriced: no budget, still summarised", () => {
    const v = summarize(scenarioById(18), input);
    expect(v.priced).toBe(false);
    expect(v.budget).toBeUndefined();
    expect(v.byWindow.every((w) => w.total === undefined)).toBe(true);
  });
  it("active shortlist vs archive", () => {
    const { active, archive } = summarizeAll(input);
    expect(active.map((v) => v.scenario.id)).toEqual([17, 18, 4, 5]);
    expect(archive).toHaveLength(SCENARIOS.length - 4);
  });
});

describe("settings", () => {
  it("defaults, valid overrides, invalid rows ignored", () => {
    expect(mergeSettings([]).kidsPolicy).toBe("ours");
    expect(mergeSettings([{ key: "kidsPolicy", value: "all" }, { key: "heldDate", value: "nope" }])).toMatchObject({ kidsPolicy: "all", heldDate: "2027-06-12" });
  });
});
