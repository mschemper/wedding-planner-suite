// Pure helpers for the Plan + Today screens (DESIGN-v4 §2): due labels, task/must-have ops, reorder, paste review, filters.
import type { Op } from "../../api/types";
import type { Patch } from "../data";
import { isDay } from "../../data/params";
import { CATEGORIES, OWNERS, type Category, type MustHave, type Owner, type Task } from "../../plan/types";

const DAY = { test: (s: string) => isDay(s) };

/** Whole days from a to b (YYYY-MM-DD). */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export function fmtDay(d: string, withYear = false): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
}

export interface DueLabel { text: string; overdue: boolean }
/** "overdue 2 days" | "due today" | "due Thu Oct 28" | "no date". */
export function dueLabel(due: string | null | undefined, today: string): DueLabel {
  if (!due) return { text: "no date", overdue: false };
  const n = dayDiff(today, due);
  if (n < 0) return { text: `overdue ${-n} day${n === -1 ? "" : "s"}`, overdue: true };
  if (n === 0) return { text: "due today", overdue: false };
  return { text: `due ${fmtDay(due, due.slice(0, 4) !== today.slice(0, 4))}`, overdue: false };
}

/** Task source → Gmail (or other) URL; null for "manual" / "email" / empty. */
export const sourceUrl = (source: string | null | undefined): string | null => (source && /^https?:\/\//.test(source) ? source : null);

/** Short venue name for chips: "River Room at Burning Bush Brewery" → "River Room". */
export function shortVenueName(name: string): string {
  return name.replace(/^The\s+/, "").split(/\s+at\s+/)[0].replace(/\s+(Chicago|Event Center)$/, "").trim() || name;
}

// ---- task ops ----
export const doneLabel = (t: Pick<Task, "title">) => `Done: ${t.title}`;
export const completePatch = (t: Pick<Task, "id">, now = new Date()): Patch => ({ table: "tasks", id: t.id, row: { status: "done", done_at: now.toISOString() } });
export const reopenPatch = (t: Pick<Task, "id">): Patch => ({ table: "tasks", id: t.id, row: { status: "open", done_at: null } });

export interface TaskDraft {
  title: string; detail: string; due: string; owner: Owner; category: Category; scenario_id: number | null;
}
export const emptyDraft = (): TaskDraft => ({ title: "", detail: "", due: "", owner: "Mark", category: "venue", scenario_id: null });
export const draftOf = (t: Task): TaskDraft => ({
  title: t.title, detail: t.detail ?? "", due: t.due ?? "", owner: t.owner, category: t.category, scenario_id: t.scenario_id ?? null,
});

/** null = valid, else the message. */
export function draftError(d: TaskDraft): string | null {
  if (!d.title.trim()) return "Title is required.";
  if (d.due && !DAY.test(d.due)) return "Date must be YYYY-MM-DD.";
  return null;
}

/** Only the fields that differ from the stored task (empty strings → null). */
export function taskChanges(t: Task, d: TaskDraft): Record<string, unknown> {
  const next: Record<string, unknown> = {
    title: d.title.trim(), detail: d.detail.trim() || null, due: d.due || null, owner: d.owner, category: d.category, scenario_id: d.scenario_id,
  };
  const cur: Record<string, unknown> = { title: t.title, detail: t.detail ?? null, due: t.due ?? null, owner: t.owner, category: t.category, scenario_id: t.scenario_id ?? null };
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== cur[k]));
}

export function createTaskOp(d: TaskDraft, source = "manual", today?: string): Op {
  return {
    table: "tasks", op: "create",
    row: {
      title: d.title.trim(), detail: d.detail.trim() || null, due: d.due || null, owner: d.owner, category: d.category,
      status: "open", source, source_date: today ?? null, scenario_id: d.scenario_id,
    },
  };
}

// ---- paste ----
const lc = (s: string) => s.trim().toLowerCase();

/** Pasted tasks whose title matches an open task (case-insensitive) or an earlier pasted title. */
export function duplicateFlags(pasted: Partial<Task>[], existing: Task[]): boolean[] {
  const seen = new Set(existing.filter((t) => t.status === "open").map((t) => lc(t.title)));
  return pasted.map((p) => {
    const k = lc(p.title ?? "");
    if (seen.has(k)) return true;
    seen.add(k);
    return false;
  });
}

/** "6 tasks: 2 for Mark, 3 for Angela, 1 for Both". Unknown owners count as Mark. */
export function pasteSummary(pasted: Partial<Task>[]): string {
  const n = pasted.length;
  const by = new Map<Owner, number>();
  for (const p of pasted) {
    const o = OWNERS.includes(p.owner as Owner) ? (p.owner as Owner) : "Mark";
    by.set(o, (by.get(o) ?? 0) + 1);
  }
  const parts = OWNERS.filter((o) => by.get(o)).map((o) => `${by.get(o)} for ${o}`);
  return `${n} task${n === 1 ? "" : "s"}${parts.length ? `: ${parts.join(", ")}` : ""}`;
}

/** One create op per pasted task; invalid owner/category/due fall back to defaults; source defaults to "email".
 * A venue id not in `venueIds` (when given) is dropped, so one bad task can't fail the whole save. */
export function pasteOps(pasted: Partial<Task>[], skip: boolean[] = [], venueIds?: ReadonlySet<number>): Op[] {
  return pasted.flatMap((p, i): Op[] => {
    if (skip[i]) return [];
    const row: Record<string, unknown> = {
      title: String(p.title ?? "").trim(),
      detail: p.detail ? String(p.detail) : null,
      due: typeof p.due === "string" && DAY.test(p.due) ? p.due : null,
      owner: OWNERS.includes(p.owner as Owner) ? p.owner : "Mark",
      category: CATEGORIES.includes(p.category as Category) ? p.category : "admin",
      status: "open",
      source: p.source ? String(p.source) : "email",
      source_date: typeof p.source_date === "string" && DAY.test(p.source_date) ? p.source_date : null,
      scenario_id: typeof p.scenario_id === "number" && (!venueIds || venueIds.has(p.scenario_id)) ? p.scenario_id : null,
    };
    return [{ table: "tasks", op: "create", row }];
  });
}

// ---- filters ----
export interface TaskFilter { owner: Owner | null; category: Category | null; showDone: boolean }
export const NO_FILTER: TaskFilter = { owner: null, category: null, showDone: false };
export function filterTasks(tasks: Task[], f: TaskFilter): Task[] {
  return tasks.filter((t) => (f.showDone || t.status !== "done") && (!f.owner || t.owner === f.owner) && (!f.category || t.category === f.category));
}

// ---- must-haves ----
/** Swap `sort` of the item at idx with its neighbour (dir -1 up, +1 down). null at the ends. `list` = displayed order. */
export function reorderPatches(list: MustHave[], idx: number, dir: -1 | 1): Patch[] | null {
  const j = idx + dir;
  if (idx < 0 || j < 0 || idx >= list.length || j >= list.length) return null;
  const a = list[idx], b = list[j];
  let sa = b.sort, sb = a.sort;
  if (sa === sb) { sa = dir < 0 ? b.sort - 1 : b.sort + 1; } // equal sorts: nudge the moved row past its neighbour
  return [
    { table: "musthaves", id: a.id, row: { sort: sa } },
    { table: "musthaves", id: b.id, row: { sort: sb } },
  ];
}

/** New must-have goes last: sort = max(all rows incl. archived) + 10. */
export function addMustHaveOp(text: string, detail: string, all: MustHave[]): Op {
  const max = all.reduce((m, x) => Math.max(m, x.sort), 0);
  return { table: "musthaves", op: "create", row: { text: text.trim(), detail: detail.trim() || null, sort: max + 10, archived: false } };
}
export const archivePatch = (m: Pick<MustHave, "id">, archived: boolean): Patch => ({ table: "musthaves", id: m.id, row: { archived } });
export const musthaveEditPatch = (m: MustHave, text: string, detail: string): Patch | null => {
  const row: Record<string, unknown> = {};
  if (text.trim() !== m.text) row.text = text.trim();
  if ((detail.trim() || null) !== (m.detail ?? null)) row.detail = detail.trim() || null;
  return Object.keys(row).length && text.trim() ? { table: "musthaves", id: m.id, row } : null;
};
