// Task grouping and ordering (DESIGN-v4 §2 Plan). Pure; "today" is a YYYY-MM-DD in America/Chicago.
import type { Task } from "./types";

export type TaskGroup = "overdue" | "week" | "later" | "nodate" | "done";
export const GROUP_LABEL: Record<TaskGroup, string> = {
  overdue: "Overdue", week: "This week", later: "Later", nodate: "No date", done: "Done",
};

/** Today's date in Chicago as YYYY-MM-DD. */
export function chicagoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function groupOf(t: Task, today: string): TaskGroup {
  if (t.status === "done") return "done";
  if (!t.due) return "nodate";
  if (t.due < today) return "overdue";
  if (t.due <= addDays(today, 7)) return "week";
  return "later";
}

const cmp = (a: Task, b: Task) =>
  (a.due ?? "9999") .localeCompare(b.due ?? "9999") || (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title);

export function groupTasks(tasks: Task[], today: string): { group: TaskGroup; tasks: Task[] }[] {
  const order: TaskGroup[] = ["overdue", "week", "later", "nodate", "done"];
  return order
    .map((group) => ({
      group,
      tasks: tasks.filter((t) => groupOf(t, today) === group)
        .sort(group === "done" ? (a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "") : cmp),
    }))
    .filter((g) => g.tasks.length);
}

/** Open tasks, overdue first, then by due date: Today's "Next up". */
export const nextUp = (tasks: Task[], today: string, n = 5): Task[] =>
  groupTasks(tasks.filter((t) => t.status === "open"), today).flatMap((g) => g.tasks).slice(0, n);

/** "Paste tasks" box: accepts a JSON array of {title, due?, owner?, category?, detail?, source?, source_date?}. */
export function parsePastedTasks(text: string): { ok: true; tasks: Partial<Task>[] } | { ok: false; msg: string } {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, msg: "That isn't JSON. Paste the list the email-sweep session printed." };
  }
  const arr = Array.isArray(v) ? v : (v as { tasks?: unknown })?.tasks;
  if (!Array.isArray(arr) || !arr.length) return { ok: false, msg: "Expected a list of tasks." };
  const keep = ["title", "detail", "due", "owner", "category", "source", "source_date", "scenario_id"];
  const tasks: Partial<Task>[] = [];
  for (const [i, x] of arr.entries()) {
    if (!x || typeof x !== "object" || typeof (x as Task).title !== "string" || !(x as Task).title.trim()) return { ok: false, msg: `Task ${i + 1} has no title.` };
    tasks.push(Object.fromEntries(Object.entries(x as object).filter(([k]) => keep.includes(k))) as Partial<Task>);
  }
  return { ok: true, tasks };
}
