// Plan → Calendar (DESIGN-v14 §4): month agenda, vertical. Rows = TaskRow; wedding-day marker; dependency warnings inline.
import { useMemo } from "react";
import { byIdMap, depIssues } from "../../plan/deps";
import type { Task } from "../../plan/types";
import { TaskRow } from "./TaskRow";
import { calendarMonths, rowInfo, weddingMarker } from "./model";

export function Calendar({ tasks, today, wedding, keep, highlight, onOpen }: {
  tasks: Task[]; today: string; wedding: string | null; keep(t: Task): boolean; highlight: string | null; onOpen(t: Task): void;
}) {
  const months = useMemo(() => calendarMonths(tasks, today, keep, wedding), [tasks, today, keep, wedding]);
  const byId = useMemo(() => byIdMap(tasks), [tasks]);
  const issues = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const i of depIssues(tasks)) m.set(i.id, [...(m.get(i.id) ?? []), i.msg]);
    return m;
  }, [tasks]);
  const wm = wedding?.slice(0, 7);
  return (
    <div className="pl-cal">
      {months.map((m) => {
        const isWm = !!wedding && m.key === wm;
        const before = isWm ? m.items.filter((i) => (i.task.due ?? "") <= wedding) : m.items;
        const after = isWm ? m.items.slice(before.length) : [];
        const row = (i: (typeof m.items)[number]) => (
          <TaskRow key={i.task.id} task={i.task} today={today} highlight={highlight === i.task.id} onOpen={onOpen}
            info={rowInfo(i.task, byId, today)} warn={issues.get(i.task.id)} />
        );
        return (
          <section key={m.key} className="pl-month" aria-label={m.label}>
            <h3 className="pl-group-h">{m.label} <span className="pl-group-n">{m.done} of {m.total} done</span></h3>
            <ul className="pl-list">
              {before.map(row)}
              {isWm && <li className="pl-wedding"><span aria-hidden="true">♥</span> {weddingMarker(wedding)}</li>}
              {after.map(row)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
