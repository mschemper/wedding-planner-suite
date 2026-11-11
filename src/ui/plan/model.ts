// Pure helpers for the Plan + Today screens (DESIGN-v4 §2): due labels, task/must-have ops, reorder, paste review, filters.
import type { Op } from "../../api/types";
import type { Patch } from "../data";
import { isDay } from "../../data/params";
import { monthAgenda, taskState, waitingOn, wouldCycle, type AgendaMonth, type TaskState } from "../../plan/deps";
import { CATEGORIES, OWNERS, type Category, type Owner, type Task, type TaskKind } from "../../plan/types";

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

// ---- v14 states, views, dependencies ----
export type PlanMode = "list" | "calendar";
export type PlanFilter = "all" | "ready" | "decisions";

export interface RowInfo { state: TaskState; waitingOn: Task[] }
export interface StateChip { tone: "plain" | "peony" | "gold" | "sage"; text: string }

/** Row state as text + tone; done rows show none. "Waiting on <first blocker> (+N more)". */
export function stateChip(info: RowInfo): StateChip | null {
  if (info.state === "ready") return { tone: "sage", text: "Ready" };
  if (info.state === "overdue") return { tone: "peony", text: "Overdue" };
  if (info.state === "waiting") {
    const [first, ...more] = info.waitingOn;
    return { tone: "gold", text: `Waiting on ${first?.title ?? "another task"}${more.length ? ` (+${more.length} more)` : ""}` };
  }
  return null;
}

export function rowInfo(t: Task, byId: Map<string, Task>, today: string): RowInfo {
  return { state: taskState(t, byId, today), waitingOn: waitingOn(t, byId) };
}

/** Plan view filter: Ready now = open with no open blocker; Decisions = open decisions. Done tasks only pass "all". */
export function matchesView(t: Task, view: PlanFilter, byId: Map<string, Task>): boolean {
  if (view === "all") return true;
  if (t.status !== "open") return false;
  if (view === "decisions") return t.kind === "decision";
  return waitingOn(t, byId).length === 0;
}

export const isDecision = (t: Pick<Task, "kind">) => t.kind === "decision";

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** v14 fields that differ from the stored task (kind, depends_on). */
export function depChanges(t: Task, kind: TaskKind, deps: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (kind !== (t.kind ?? "task")) out.kind = kind;
  if (!sameIds(deps, t.depends_on ?? [])) out.depends_on = deps;
  return out;
}

/** Open tasks that could be a blocker for `id`: not itself, not already picked, no loop; matches the search text. */
export function blockerChoices(tasks: Task[], id: string, picked: string[], query: string, max = 8): Task[] {
  const q = query.trim().toLowerCase();
  return tasks
    .filter((t) => t.id !== id && t.status === "open" && !picked.includes(t.id) && (!q || t.title.toLowerCase().includes(q)) && !wouldCycle(tasks, id, [...picked, t.id]))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title))
    .slice(0, max);
}

/** "Wedding day · Sat 29 May 2027" */
export function weddingMarker(date: string): string {
  const s = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `Wedding day · ${s.replace(",", "")}`;
}

/** Calendar months for display: agenda over ALL tasks (so blockers resolve), items filtered, empty months dropped, wedding month kept. */
export interface CalMonth extends AgendaMonth { total: number; done: number }
export function calendarMonths(tasks: Task[], today: string, keep: (t: Task) => boolean, wedding: string | null): CalMonth[] {
  const all = monthAgenda(tasks, today);
  const out: CalMonth[] = all.map((m) => ({ ...m, total: m.items.length, done: m.items.filter((i) => i.state === "done").length, items: m.items.filter((i) => keep(i.task)) }));
  const wm = wedding?.slice(0, 7);
  return out.filter((m) => m.items.length > 0 || m.key === wm)
    .concat(wm && !out.some((m) => m.key === wm) ? [{ key: wm, label: monthAgenda([{ id: "_", title: "", owner: "Both", category: "admin", status: "open", due: wedding }], "0000-01-01")[0].label, items: [], total: 0, done: 0 }] : [])
    .sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : a.key.localeCompare(b.key)));
}
