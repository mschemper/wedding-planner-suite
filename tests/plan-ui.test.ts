// Pure helpers behind Today + Plan (src/ui/plan/model.ts, src/ui/today/model.ts). Dates are passed in; no "today" literal.
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/params";
import type { MustHave, Task } from "../src/plan/types";
import {
  addMustHaveOp, archivePatch, completePatch, createTaskOp, draftError, dueLabel, duplicateFlags, emptyDraft, filterTasks, musthaveEditPatch,
  NO_FILTER, pasteOps, pasteSummary, reopenPatch, reorderPatches, shortVenueName, sourceUrl, taskChanges, draftOf, dayDiff,
} from "../src/ui/plan/model";
import { countdown, spanText } from "../src/ui/today/model";

const T0 = "2026-10-26";
const task = (o: Partial<Task> = {}): Task => ({ id: "T001", title: "Call venue", owner: "Mark", category: "venue", status: "open", due: null, ...o });
const mh = (id: string, sort: number, o: Partial<MustHave> = {}): MustHave => ({ id, text: id, sort, archived: false, ...o });

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

describe("must-haves", () => {
  const list = [mh("A", 10), mh("B", 20), mh("C", 30)];
  it("reorder swaps sort values; null at the ends", () => {
    expect(reorderPatches(list, 1, -1)).toEqual([{ table: "musthaves", id: "B", row: { sort: 10 } }, { table: "musthaves", id: "A", row: { sort: 20 } }]);
    expect(reorderPatches(list, 1, 1)).toEqual([{ table: "musthaves", id: "B", row: { sort: 30 } }, { table: "musthaves", id: "C", row: { sort: 20 } }]);
    expect(reorderPatches(list, 0, -1)).toBeNull();
    expect(reorderPatches(list, 2, 1)).toBeNull();
  });
  it("reorder with equal sorts still changes the order", () => {
    const eq = [mh("A", 10), mh("B", 10)];
    const p = reorderPatches(eq, 1, -1)!;
    expect(p[0].row!.sort).toBe(9);
  });
  it("add goes last, counting archived rows", () => {
    const op = addMustHaveOp(" Photo booth ", "", [...list, mh("D", 90, { archived: true })]);
    expect(op).toEqual({ table: "musthaves", op: "create", row: { text: "Photo booth", detail: null, sort: 100, archived: false } });
    expect(addMustHaveOp("x", "", [])).toMatchObject({ row: { sort: 10 } });
  });
  it("archive, restore, edit patches", () => {
    expect(archivePatch(list[0], true).row).toEqual({ archived: true });
    expect(archivePatch(list[0], false).row).toEqual({ archived: false });
    const m = mh("A", 10, { detail: "old" });
    expect(musthaveEditPatch(m, "A", "old")).toBeNull();
    expect(musthaveEditPatch(m, "A2", "")).toEqual({ table: "musthaves", id: "A", row: { text: "A2", detail: null } });
    expect(musthaveEditPatch(m, "  ", "x")).toBeNull();
  });
});
