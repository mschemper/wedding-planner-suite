import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/params";
import { planFeed } from "../src/plan/feed";
import type { Task, VenueRow } from "../src/plan/types";

const t = (id: string, due: string | null, status: "open" | "done" = "open", extra: Partial<Task> = {}): Task =>
  ({ id, title: `Task ${id}`, due, owner: "Both", category: "admin", status, detail: "private note", source: "https://mail.example/x", ...extra });
const tasks = [t("a", "2026-11-01"), t("b", "2026-11-12"), t("c", "2027-01-10"), t("d", null), t("e", "2026-10-01", "done")];
const venues: VenueRow[] = [{ scenario_id: 1, active: true, status: "booked", hold_date: "2027-05-29" }];
const settings = { ...DEFAULT_SETTINGS, heldDate: "2027-05-29" };

describe("plan feed", () => {
  const f = planFeed(tasks, venues, settings, "2026-11-09", "2026-11-09T15:00:00Z");
  it("orders next: overdue, this week, later, no date", () => {
    expect(f.next.map((x) => x.group)).toEqual(["overdue", "week", "later", "nodate"]);
    expect(f.next[0].days).toBe(-8);
    expect(f.next[3].due).toBeNull();
  });
  it("counts progress and groups", () => {
    expect(f.progress).toEqual({ done: 1, open: 4, total: 5, pct: 20 });
    expect(f.counts).toEqual({ overdue: 1, week: 1, nodate: 1 });
  });
  it("counts down to the held date and reports the venue status", () => {
    expect(f.wedding).toMatchObject({ date: "2027-05-29", days: 201, past: false, venue_status: "booked" });
  });
  it("leaks no task detail or source", () => {
    expect(JSON.stringify(f)).not.toMatch(/private note|mail\.example/);
  });
  it("no held date -> wedding null; empty list -> pct 0", () => {
    const g = planFeed([], [], { ...settings, heldDate: null }, "2026-11-09", "x");
    expect(g.wedding).toBeNull();
    expect(g.progress.pct).toBe(0);
  });
  it("caps next at n", () => {
    expect(planFeed(tasks, venues, settings, "2026-11-09", "x", 2).next).toHaveLength(2);
  });
});
