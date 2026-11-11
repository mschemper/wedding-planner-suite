// v11 Day tab logic (src/plan/day.ts) + Joinery facts + vendors/timeline tables (0006).
import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiData, Op, WriteResult } from "../src/api/types";
import { DEFAULT_SETTINGS } from "../src/data/params";
import { scenarioById } from "../src/data/scenarios";
import { VENUE_FACTS } from "../src/data/venueFacts";
import { computeBudget, seasonOf } from "../src/engine/compute";
import {
  TIMELINE_TEMPLATE, clock, endOf, sortTimeline, sunsetIndex, sunsetLocal, timelineIssues,
  toMin, vendorSummary, weddingCountdown, weddingVenue, sunsetUtc, roomCheck, barMinimum,
} from "../src/plan/day";
import type { TimelineRow, Vendor, VenueRow } from "../src/plan/types";
import { SqliteD1 } from "../scripts/d1-sqlite";
import { handleApi } from "../worker/api";
import type { Env } from "../worker/env";

const venue = (p: Partial<VenueRow>): VenueRow => ({ scenario_id: 5, active: true, status: "held", ...p });
const settings = { ...DEFAULT_SETTINGS, heldDate: "2027-05-29" };

describe("wedding venue + countdown", () => {
  it("default held date is Sat May 29 2027", () => {
    expect(DEFAULT_SETTINGS.heldDate).toBe("2027-05-29");
    expect(new Date("2027-05-29T12:00:00Z").getUTCDay()).toBe(6);
  });
  it("picks the active row holding the date; booked beats held; archived and other dates ignored", () => {
    const rows = [venue({ scenario_id: 17, hold_date: "2027-06-12" }), venue({ hold_date: "2027-05-29" }), venue({ scenario_id: 4, hold_date: "2027-05-29", active: false })];
    expect(weddingVenue(rows, settings)?.scenario_id).toBe(5);
    expect(weddingVenue([...rows, venue({ scenario_id: 18, hold_date: "2027-05-29", status: "booked" })], settings)?.scenario_id).toBe(18);
    expect(weddingVenue(rows, { ...settings, heldDate: null })).toBeNull();
    expect(weddingVenue([venue({ hold_date: "2027-05-29", status: "passed" })], settings)).toBeNull();
  });
  it("counts days", () => {
    expect(weddingCountdown("2026-11-09", "2027-05-29")).toMatchObject({ days: 201, weeks: 28, big: "201 days", past: false });
    expect(weddingCountdown("2027-05-28", "2027-05-29").big).toBe("1 day");
    expect(weddingCountdown("2027-05-29", "2027-05-29").big).toBe("Today");
    expect(weddingCountdown("2027-06-01", "2027-05-29").past).toBe(true);
  });
});

describe("sunset", () => {
  it("falls on the asked local day", () => {
    const u = sunsetUtc("2027-05-29", 41.918, -87.705)!;
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(u)).toBe("2027-05-29");
  });
  it("Chicago: May 29 2027 about 8:20 PM CDT; Dec 21 about 4:22 PM CST", () => {
    expect(Math.abs(toMin(sunsetLocal("2027-05-29")!) - toMin("20:20"))).toBeLessThanOrEqual(4);
    expect(Math.abs(toMin(sunsetLocal("2026-12-21")!) - toMin("16:22"))).toBeLessThanOrEqual(4);
  });
});

describe("timeline", () => {
  const rows: TimelineRow[] = TIMELINE_TEMPLATE.map((r, i) => ({ ...r, id: `TL${String(i + 1).padStart(2, "0")}` }));
  it("after-midnight steps sort last; end times wrap", () => {
    const s = sortTimeline(rows);
    expect(s[s.length - 1].title).toBe("Vendor breakdown");
    expect(endOf({ start: "23:45", minutes: 30 })).toBe("00:15");
    expect(clock("17:30")).toBe("5:30 PM");
    expect(clock("00:00")).toBe("12:00 AM");
  });
  it("only 00:00-02:59 counts as after midnight (B22)", () => {
    expect(toMin("02:59")).toBe(26 * 60 + 59);
    expect(toMin("03:00")).toBe(3 * 60);
    expect(toMin("04:30")).toBeLessThan(toMin("23:00"));
  });
  it("the Joinery template fits the venue's hours", () => {
    expect(timelineIssues(rows, VENUE_FACTS[5].hours)).toEqual([]);
  });
  it("flags steps at the venue outside 2 PM to midnight + 1.5 h; away steps are fine", () => {
    const bad: TimelineRow[] = [
      { id: "a", start: "13:00", minutes: 30, title: "Early setup" },
      { id: "b", start: "01:00", minutes: 60, title: "Late" },
      { id: "c", start: "09:00", minutes: 60, title: "Hair", place: "Hotel" },
    ];
    expect(timelineIssues(bad, VENUE_FACTS[5].hours).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("sunset marker sits before the first step after sunset", () => {
    const s = sortTimeline(rows);
    const i = sunsetIndex(s, "20:20");
    expect(toMin(s[i].start)).toBeGreaterThan(toMin("20:20"));
    expect(toMin(s[i - 1].start)).toBeLessThanOrEqual(toMin("20:20"));
  });
});

describe("vendor summary", () => {
  const v = (p: Partial<Vendor>): Vendor => ({ id: "V01", category: "photo", name: "x", status: "idea", ...p });
  it("best status per category, booked count, committed total, payments soonest first", () => {
    const s = vendorSummary([
      v({ id: "V01", category: "photo", status: "contacted" }),
      v({ id: "V02", category: "photo", status: "booked", amount: 5000, deposit: 1000, deposit_due: "2026-12-01", balance_due: "2027-05-15" }),
      v({ id: "V03", category: "bar", status: "quoted", amount: 4000, deposit_due: "2026-11-20" }),
      v({ id: "V04", category: "transport", status: "passed", amount: 900 }),
      v({ id: "V05", category: "cake", status: "booked", amount: 600, deposit: 100, deposit_due: "2026-10-01", deposit_paid: "2026-10-01" }),
    ], "2026-11-25");
    expect(s.byCategory.find((c) => c.category === "photo")).toMatchObject({ count: 2, best: { id: "V02" } });
    expect(s.byCategory.some((c) => c.category === "transport")).toBe(true);
    expect(s.committed).toBe(5600);
    expect(s.booked).toBe(2);
    expect(s.payments.map((p) => [p.vendor.id, p.kind, p.amount, p.overdue])).toEqual([["V03", "deposit", null, true], ["V02", "deposit", 1000, false], ["V02", "balance", 4000, false]]);
    expect(s.next?.vendor.id).toBe("V03");
    expect(vendorSummary([v({ status: "booked", deposit_due: "2026-11-01" })], "2026-11-25")).toMatchObject({ overdue: 1, next: { overdue: true } });
  });
});

describe("room + bar minimum", () => {
  const t = (heads: number, adults: number, kids: number, expected: number) => ({ heads, adults, kids, expected });
  const hc = { invited: t(80, 70, 10, 64), ifroom: t(0, 0, 0, 0), undecided: t(0, 0, 0, 0), no: t(0, 0, 0, 0), ranked: [], undecidedParties: 0 };
  it("Joinery has no kids' room: kids count against 160", () => {
    expect(roomCheck(hc, scenarioById(5))).toMatchObject({ invited: 80, expected: 64, cap: 160, spare: 96, over: false, kidsInMain: true });
    expect(roomCheck(hc, scenarioById(17))).toMatchObject({ invited: 70, expected: 56, cap: 82, kidsInMain: false });
  });
  it("$4,000 bar minimum binds below 118 guests on Tier 1", () => {
    expect(barMinimum(scenarioById(5), 75, { bar: "Tier 1 Standard" }, "summer/fall")).toMatchObject({ min: 4000, perHead: 53.33, binding: true });
    expect(barMinimum(scenarioById(5), 125, { bar: "Tier 1 Standard" }, "summer/fall")).toMatchObject({ perHead: 34, binding: false });
    expect(barMinimum(scenarioById(17), 75, { bar: "Beer & Wine" })).toBeNull();
  });
});

describe("Joinery (v11 prices + facts)", () => {
  it("May 29 is summer/fall; bar minimum applies at 75 guests", () => {
    const sc = scenarioById(5);
    expect(seasonOf(sc, "2027-05-29")).toBe("summer/fall");
    expect(seasonOf(sc, "2027-01-16")).toBe("winter");
    const b = computeBudget(sc, 75, { bar: "Tier 1 Standard" }, { date: "2027-05-29" });
    expect(b.rows.find((r) => r.desc.startsWith("Bar — Tier 1"))!.amount).toBe(4000);
    expect(b.rows.find((r) => r.desc.startsWith("Venue rental"))!.amount).toBe(9500);
  });
  it("photos exist for the hosted build", () => {
    for (const p of VENUE_FACTS[5].photos) expect(existsSync(`public/${p.src}`), p.src).toBe(true);
  });
});

describe("vendors + timeline tables (0006)", () => {
  let env: Env;
  beforeEach(() => {
    env = { DB: new SqliteD1().migrate(), ASSETS: { fetch: async () => new Response("asset") }, DEV_ACCESS_EMAIL: "mark@example.com" };
  });
  const LOCAL = "http://localhost:5173";
  const write = (ops: Op[]) => handleApi(new Request(`${LOCAL}/api/write`, { method: "POST", headers: { "Content-Type": "application/json", Origin: LOCAL }, body: JSON.stringify({ ops }) }), env);
  const ok = async (ops: Op[]) => {
    const r = await write(ops);
    const body = await r.json();
    expect(r.status, JSON.stringify(body)).toBe(200);
    return (body as WriteResult).data as ApiData;
  };

  it("vendors: create V01, update, delete; enums, dates and amounts checked", async () => {
    const d = await ok([{ table: "vendors", op: "create", row: { category: "bar", name: "The Joinery bar", status: "quoted", amount: 4000, deposit_due: "2027-01-15" } }]);
    expect(d.vendors.map((v) => [v.id, v.category, v.status, v.amount])).toEqual([["V01", "bar", "quoted", 4000]]);
    expect((await write([{ table: "vendors", op: "create", row: { category: "llamas", name: "x" } }])).status).toBe(400);
    expect((await write([{ table: "vendors", op: "create", row: { name: "x", deposit_due: "2027-02-30" } }])).status).toBe(400);
    expect((await write([{ table: "vendors", op: "create", row: { name: "x", amount: -1 } }])).status).toBe(400);
    expect((await write([{ table: "vendors", op: "create", row: { name: "x", scenario_id: 999 } }])).status).toBe(400);
    expect((await ok([{ table: "vendors", op: "update", id: "V01", version: 1, row: { status: "booked" } }])).vendors[0].status).toBe("booked");
    expect((await ok([{ table: "vendors", op: "delete", id: "V01", version: 2 }])).vendors).toEqual([]);
  });
  it("timeline: TL ids, HH:MM checked, minutes 0 to 720, default 30", async () => {
    const d = await ok([
      { table: "timeline", op: "create", row: { start: "17:00", minutes: 30, title: "Ceremony" } },
      { table: "timeline", op: "create", row: { start: "00:00", minutes: 90, title: "Breakdown" } },
    ]);
    expect(d.timeline.map((t) => [t.id, t.start, t.minutes])).toEqual([["TL01", "17:00", 30], ["TL02", "00:00", 90]]);
    expect((await write([{ table: "timeline", op: "create", row: { start: "24:00", title: "x" } }])).status).toBe(400);
    expect((await write([{ table: "timeline", op: "create", row: { start: "5pm", title: "x" } }])).status).toBe(400);
    expect((await write([{ table: "timeline", op: "create", row: { start: "18:00", minutes: 721, title: "x" } }])).status).toBe(400);
    expect((await ok([{ table: "timeline", op: "create", row: { start: "18:00", title: "Dinner" } }])).timeline.find((t) => t.title === "Dinner")!.minutes).toBe(30);
  });
});
