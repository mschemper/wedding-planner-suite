// v14 task dependencies + month agenda (DESIGN-v14 §4). Pure; "today" is YYYY-MM-DD in America/Chicago.
import { addDays } from "./tasks";
import type { Task } from "./types";

export type TaskState = "done" | "overdue" | "ready" | "waiting";
export const STATE_LABEL: Record<TaskState, string> = { done: "Done", overdue: "Overdue", ready: "Ready", waiting: "Waiting" };

type Deps = Pick<Task, "id" | "depends_on">;
const depsOf = (t: Pick<Task, "depends_on">) => t.depends_on ?? [];
export const byIdMap = <T extends { id: string }>(tasks: T[]) => new Map(tasks.map((t) => [t.id, t]));

/** Open tasks this one waits on (missing ids are ignored; depIssues reports them). */
export function waitingOn<T extends Task>(t: Task, byId: Map<string, T>): T[] {
  return depsOf(t).map((id) => byId.get(id)).filter((x): x is T => !!x && x.status !== "done");
}

/** done > waiting (an open blocker) > overdue > ready. A waiting task past its due date is still "waiting": the blocker is the action. */
export function taskState(t: Task, byId: Map<string, Task>, today: string): TaskState {
  if (t.status === "done") return "done";
  if (waitingOn(t, byId).length) return "waiting";
  if (t.due && t.due < today) return "overdue";
  return "ready";
}

const byDue = (a: Task, b: Task) =>
  (a.due ?? "9999").localeCompare(b.due ?? "9999") || (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title);

/** Open tasks with no open blocker: decisions first, then overdue, then by due date. */
export function readyNow(tasks: Task[], today: string): Task[] {
  const byId = byIdMap(tasks);
  return tasks.filter((t) => t.status === "open" && !waitingOn(t, byId).length)
    .sort((a, b) => Number(b.kind === "decision") - Number(a.kind === "decision")
      || Number(!!b.due && b.due < today) - Number(!!a.due && a.due < today) || byDue(a, b));
}

/** Tasks this one unblocks (direct dependants). */
export const dependants = (id: string, tasks: Task[]): Task[] => tasks.filter((t) => depsOf(t).includes(id));

export interface AgendaItem { task: Task; state: TaskState; waitingOn: Task[] }
export interface AgendaMonth { key: string; label: string; items: AgendaItem[] }

const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T12:00:00Z`));

/**
 * Month agenda: one entry per month that has tasks, sorted; undated tasks last (key "none").
 * Open tasks due before this month land in the current month (overdue rolls forward) unless `keepPast`.
 */
export function monthAgenda(tasks: Task[], today: string, opts: { keepPast?: boolean } = {}): AgendaMonth[] {
  const byId = byIdMap(tasks);
  const thisMonth = today.slice(0, 7);
  const groups = new Map<string, AgendaItem[]>();
  for (const t of tasks) {
    let key = t.due ? t.due.slice(0, 7) : "none";
    if (!opts.keepPast && key !== "none" && key < thisMonth && t.status !== "done") key = thisMonth;
    const item = { task: t, state: taskState(t, byId, today), waitingOn: waitingOn(t, byId) };
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "none" ? 1 : b === "none" ? -1 : a.localeCompare(b)))
    .map(([key, items]) => ({ key, label: key === "none" ? "No date yet" : monthLabel(key), items: items.sort((a, b) => byDue(a.task, b.task)) }));
}

export interface DepIssue { id: string; msg: string }

/** Warnings: a task due before one of its blockers; a blocker that no longer exists. */
export function depIssues(tasks: Task[]): DepIssue[] {
  const byId = byIdMap(tasks);
  const out: DepIssue[] = [];
  for (const t of tasks) {
    if (t.status === "done") continue;
    for (const d of depsOf(t)) {
      const b = byId.get(d);
      if (!b) out.push({ id: t.id, msg: `waits on a task that no longer exists (${d})` });
      else if (b.status !== "done" && b.due && t.due && t.due < b.due) out.push({ id: t.id, msg: `due ${t.due}, before "${b.title}" (${b.due})` });
    }
  }
  return out;
}

/** True when giving task `id` these deps creates a loop (incl. waiting on itself). */
export function wouldCycle(tasks: Deps[], id: string, deps: string[]): boolean {
  const next = new Map(tasks.map((t) => [t.id, depsOf(t)]));
  next.set(id, deps);
  const seen = new Set<string>();
  const stack = [...deps];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === id) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(next.get(cur) ?? []));
  }
  return false;
}

/** Ids of every task in a loop (Worker check after a save). */
export function cycleIds(tasks: Deps[]): string[] {
  return tasks.filter((t) => wouldCycle(tasks, t.id, depsOf(t))).map((t) => t.id);
}

/** Latest blocker due date + 1 day: the earliest sensible due for a task (null when no dated blocker). */
export function earliestDue(t: Task, byId: Map<string, Task>): string | null {
  const dues = depsOf(t).map((d) => byId.get(d)?.due).filter((x): x is string => !!x).sort();
  return dues.length ? addDays(dues[dues.length - 1], 1) : null;
}
