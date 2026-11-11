// Pure helpers behind Today + Plan (src/ui/plan/model.ts, src/ui/today/model.ts). Dates are passed in; no "today" literal.
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/params";
import type { Task } from "../src/plan/types";
import {
  completePatch, createTaskOp, draftError, dueLabel, duplicateFlags, emptyDraft, filterTasks,
  NO_FILTER, blockerChoices, calendarMonths, depChanges, matchesView, rowInfo, stateChip, weddingMarker, pasteOps, pasteSummary, reopenPatch, shortVenueName, sourceUrl, taskChanges, draftOf, dayDiff,
} from "../src/ui/plan/model";
import { byIdMap, unblockedBy } from "../src/plan/deps";
import { doneLabel } from "../src/ui/plan/model";
import { countdown, spanText } from "../src/ui/today/model";

const T0 = "2026-10-26";
const task = (o: Partial<Task> = {}): Task => ({ id: "T001", title: "Call venue", owner: "Mark", category: "venue", status: "open", due: null, ...o });

describe("countdown", () => {
  it("formats spans", () => {
    expect(spanText(5)).toBe("5 days");
    expect(spanText(1)).toBe("1 day");
    expect(spanText(28)).toBe("4 weeks");
    expect(spanText(228)).toBe("7½ months");
    expect(spanText(61)).toBe("2 months");
    expect(spanText(800)).toBe("2 years");
  });
  it("counts to the next window start", () => {
    const c = countdown("2026-10-22", DEFAULT_SETTINGS.dateWindows);
    expect(c.big).toBe("6½ months");
    expect(c.sub).toContain("late spring window opens");
    expect(c.inWindow).toBe(false);
  });
  it("says now inside a window, picks the later window between, and handles past", () => {
    expect(countdown("2027-05-15", DEFAULT_SETTINGS.dateWindows)).toMatchObject({ big: "Now", inWindow: true });
    expect(countdown("2027-07-10", DEFAULT_SETTINGS.dateWindows).sub).toContain("early fall");
    expect(countdown("2028-01-01", DEFAULT_SETTINGS.dateWindows).big).toBe("Past");
  });
});

describe("due labels", () => {
  it("overdue, today, future, none", () => {
    expect(dueLabel("2026-10-24", T0)).toEqual({ text: "overdue 2 days", overdue: true });
    expect(dueLabel("2026-10-25", T0).text).toBe("overdue 1 day");
    expect(dueLabel(T0, T0)).toEqual({ text: "due today", overdue: false });
    expect(dueLabel("2026-10-28", T0)).toEqual({ text: "due Wed, Oct 28", overdue: false });
    expect(dueLabel(null, T0)).toEqual({ text: "no date", overdue: false });
  });
  it("adds the year across years", () => expect(dueLabel("2027-01-04", T0).text).toContain("2027"));
  it("dayDiff", () => expect(dayDiff("2026-10-26", "2026-11-02")).toBe(7));
  it("source URL + short names", () => {
    expect(sourceUrl("https://mail.google.com/mail/u/0/#all/abc")).toContain("mail.google.com");
    expect(sourceUrl("email")).toBeNull();
    expect(shortVenueName("River Room at Burning Bush Brewery")).toBe("River Room");
    expect(shortVenueName("The Joinery")).toBe("Joinery");
    expect(shortVenueName("Firehouse Chicago")).toBe("Firehouse");
    expect(shortVenueName("Ravenswood Event Center")).toBe("Ravenswood");
  });
});

describe("task ops", () => {
  it("complete / reopen patches", () => {
    const p = completePatch(task(), new Date("2026-10-26T15:00:00Z"));
    expect(p).toEqual({ table: "tasks", id: "T001", row: { status: "done", done_at: "2026-10-26T15:00:00.000Z" } });
    expect(reopenPatch(task())).toEqual({ table: "tasks", id: "T001", row: { status: "open", done_at: null } });
  });
  it("create op trims and nulls empties", () => {
    const op = createTaskOp({ ...emptyDraft(), title: "  Book tour ", due: "2026-11-01" }, "manual", T0);
    expect(op).toMatchObject({ table: "tasks", op: "create", row: { title: "Book tour", due: "2026-11-01", detail: null, status: "open", source: "manual", scenario_id: null } });
  });
  it("draft validation and changed-fields-only", () => {
    expect(draftError(emptyDraft())).toMatch(/Title/);
    expect(draftError({ ...emptyDraft(), title: "x", due: "11/1/26" })).toMatch(/Date/);
    expect(draftError({ ...emptyDraft(), title: "x" })).toBeNull();
    const t = task({ due: "2026-11-01" });
    expect(taskChanges(t, draftOf(t))).toEqual({});
    expect(taskChanges(t, { ...draftOf(t), owner: "Angela", due: "" })).toEqual({ owner: "Angela", due: null });
  });
  it("filters", () => {
    const list = [task({ id: "a" }), task({ id: "b", owner: "Angela" }), task({ id: "c", category: "admin" }), task({ id: "d", status: "done" })];
    expect(filterTasks(list, NO_FILTER).map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(filterTasks(list, { ...NO_FILTER, owner: "Angela" }).map((t) => t.id)).toEqual(["b"]);
    expect(filterTasks(list, { ...NO_FILTER, category: "admin" }).map((t) => t.id)).toEqual(["c"]);
    expect(filterTasks(list, { ...NO_FILTER, showDone: true })).toHaveLength(4);
  });
});

describe("paste", () => {
  const pasted: Partial<Task>[] = [
    { title: "Call venue", owner: "Mark" }, { title: "call VENUE " }, { title: "Pick flowers", owner: "Angela", due: "2026-12-01", category: "design", source: "https://mail.google.com/x" },
    { title: "Odd", owner: "Zed" as never, category: "nope" as never, due: "soon" },
  ];
  it("flags duplicates of open tasks and earlier pasted titles; ignores done tasks", () => {
    expect(duplicateFlags(pasted, [task()])).toEqual([true, true, false, false]);
    expect(duplicateFlags(pasted, [task({ status: "done" })])).toEqual([false, true, false, false]);
  });
  it("summary counts owners", () => {
    expect(pasteSummary(pasted)).toBe("4 tasks: 3 for Mark, 1 for Angela");
    expect(pasteSummary([{ title: "a", owner: "Both" }])).toBe("1 task: 1 for Both");
  });
  it("ops default source to email, sanitise fields, and skip flagged rows", () => {
    const ops = pasteOps(pasted, [true, true, false, false]);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ op: "create", row: { title: "Pick flowers", owner: "Angela", category: "design", source: "https://mail.google.com/x", due: "2026-12-01" } });
    expect(ops[1]).toMatchObject({ row: { owner: "Mark", category: "admin", due: null, source: "email", status: "open" } });
  });
});

describe("v14 states, views, deps", () => {
  const A = task({ id: "A", title: "Pick caterer", due: "2026-12-01", kind: "decision" });
  const B = task({ id: "B", title: "Book caterer", due: "2026-12-10", depends_on: ["A"] });
  const C = task({ id: "C", title: "Old", due: "2026-10-01" });
  const D = task({ id: "D", title: "Done", status: "done" });
  const all = [A, B, C, D];
  const by = byIdMap(all);
  it("state chip text", () => {
    expect(stateChip(rowInfo(A, by, T0))).toEqual({ tone: "sage", text: "Ready" });
    expect(stateChip(rowInfo(B, by, T0))).toEqual({ tone: "gold", text: "Waiting on Pick caterer" });
    expect(stateChip(rowInfo(C, by, T0))).toEqual({ tone: "peony", text: "Overdue" });
    expect(stateChip(rowInfo(D, by, T0))).toBeNull();
    const E = task({ id: "E", title: "E", depends_on: ["A", "C"] });
    expect(stateChip(rowInfo(E, byIdMap([...all, E]), T0))?.text).toBe("Waiting on Pick caterer (+1 more)");
  });
  it("view filters", () => {
    expect(all.filter((t) => matchesView(t, "ready", by)).map((t) => t.id)).toEqual(["A", "C"]);
    expect(all.filter((t) => matchesView(t, "decisions", by)).map((t) => t.id)).toEqual(["A"]);
    expect(all.filter((t) => matchesView(t, "all", by))).toHaveLength(4);
  });
  it("dep changes and blocker choices exclude self and loops", () => {
    expect(depChanges(B, "task", ["A"])).toEqual({});
    expect(depChanges(B, "decision", [])).toEqual({ kind: "decision", depends_on: [] });
    expect(blockerChoices(all, "A", [], "").map((t) => t.id)).toEqual(["C"]);
    expect(blockerChoices(all, "B", [], "old").map((t) => t.id)).toEqual(["C"]);
    expect(blockerChoices(all, "B", ["A"], "").map((t) => t.id)).toEqual(["C"]);
  });
  it("calendar months keep the wedding month, count done, roll overdue forward", () => {
    const m = calendarMonths(all, T0, () => true, "2027-05-29");
    expect(m.map((x) => x.key)).toEqual(["2026-10", "2026-12", "2027-05", "none"]);
    expect(m[0].items.map((i) => i.task.id)).toEqual(["C"]);
    expect(m[3]).toMatchObject({ total: 1, done: 1 });
    expect(calendarMonths(all, T0, (t) => t.id === "A", null).map((x) => x.key)).toEqual(["2026-12"]);
    expect(weddingMarker("2027-05-29")).toBe("Wedding day · Sat 29 May 2027");
  });
});

describe("v16 unblock toast", () => {
  const A = task({ id: "A", title: "Pick caterer", kind: "decision" });
  const B = task({ id: "B", depends_on: ["A"] });
  const C = task({ id: "C", depends_on: ["A", "X"] });
  const X = task({ id: "X" });
  const D = task({ id: "D", depends_on: ["A"], status: "done" });
  it("counts open tasks whose only open blocker is the completed one", () => {
    expect(unblockedBy("A", [A, B, C, X, D]).map((t) => t.id)).toEqual(["B"]);
    expect(unblockedBy("A", [A, B, C, { ...X, status: "done" }, D]).map((t) => t.id)).toEqual(["B", "C"]);
  });
  it("names the count", () => {
    expect(doneLabel(A)).toBe("Done: Pick caterer");
    expect(doneLabel(A, 1)).toBe("Done: Pick caterer · 1 task now ready");
    expect(doneLabel(A, 3)).toBe("Done: Pick caterer · 3 tasks now ready");
  });
});
