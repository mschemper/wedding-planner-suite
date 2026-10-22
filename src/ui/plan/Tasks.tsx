// Plan → Tasks: filters, grouped list, quick add, paste, edit sheet.
import { useEffect, useMemo, useState } from "react";
import { GROUP_LABEL, chicagoToday, groupTasks } from "../../plan/tasks";
import { CATEGORIES, OWNERS, type Category, type Owner, type Task } from "../../plan/types";
import { useCompare } from "../compare";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState, FilterChip } from "../kit/kit";
import { SaveError } from "../SaveError";
import { PasteTasks } from "./PasteTasks";
import { TaskRow } from "./TaskRow";
import { TaskFields, TaskSheet } from "./TaskSheet";
import { NO_FILTER, createTaskOp, draftError, emptyDraft, filterTasks, type TaskDraft, type TaskFilter } from "./model";

export function Tasks({ highlight }: { highlight: string | null }) {
  const { tasks, save, offline, status } = useData();
  const { active } = useCompare();
  const today = chicagoToday();
  const [filter, setFilter] = useState<TaskFilter>(NO_FILTER);
  const [openId, setOpenId] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const venues = useMemo(() => active.map((v) => ({ id: v.scenario.id, name: v.scenario.name })), [active]);
  const groups = useMemo(() => groupTasks(filterTasks(tasks, filter), today), [tasks, filter, today]);
  const open = tasks.find((t) => t.id === openId) ?? null;

  // Focus from another tab: make sure the task is visible, then scroll to it.
  useEffect(() => {
    if (!highlight) return;
    const t = tasks.find((x) => x.id === highlight);
    if (t && filterTasks([t], filter).length === 0) setFilter({ ...NO_FILTER, showDone: t.status === "done" });
    const id = requestAnimationFrame(() => document.getElementById(`task-${highlight}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, tasks.length]);

  const toggleOwner = (o: Owner) => setFilter((f) => ({ ...f, owner: f.owner === o ? null : o }));
  const toggleCat = (c: Category) => setFilter((f) => ({ ...f, category: f.category === c ? null : c }));
  const bad = draftError(draft);
  const add = async () => {
    setBusy(true);
    const r = await save([createTaskOp(draft, "manual", today)]);
    setBusy(false);
    if (r.ok) { setDraft(emptyDraft()); setFail(null); setAdding(false); } else setFail(r);
  };

  return (
    <Card title="Tasks" actions={!offline && <><Button onClick={() => setAdding((a) => !a)}>{adding ? "Close form" : "Add task"}</Button><Button onClick={() => setPaste(true)}>Paste tasks</Button></>}>
      {adding && !offline && (
        <form className="pl-quick" onSubmit={(e) => { e.preventDefault(); if (!bad) void add(); }}>
          <TaskFields draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} venues={venues} />
          <div className="pl-quick-actions">
            <Button type="submit" kind="primary" disabled={busy || !!bad}>Add</Button>
            {bad && draft.title !== "" && <span className="pl-err">{bad}</span>}
          </div>
          <SaveError result={fail} onDismiss={() => setFail(null)} />
        </form>
      )}
      <div className="pl-filters" role="group" aria-label="Filter tasks">
        {OWNERS.map((o) => <FilterChip key={o} on={filter.owner === o} onClick={() => toggleOwner(o)}>{o}</FilterChip>)}
        <span className="pl-sep" aria-hidden="true" />
        {CATEGORIES.map((c) => <FilterChip key={c} on={filter.category === c} onClick={() => toggleCat(c)}>{c}</FilterChip>)}
        <span className="pl-sep" aria-hidden="true" />
        <FilterChip on={filter.showDone} onClick={() => setFilter((f) => ({ ...f, showDone: !f.showDone }))}>Show done</FilterChip>
      </div>
      {groups.length === 0 && (
        <EmptyState>{status === "loading" ? "Loading tasks…" : offline ? "Tasks live in the online planner." : tasks.length ? "No tasks match these filters." : "No tasks yet. Add one above or paste a list."}</EmptyState>
      )}
      {groups.map((g) => (
        <section key={g.group} className="pl-group" aria-label={GROUP_LABEL[g.group]}>
          <h3 className={`pl-group-h${g.group === "overdue" ? " is-overdue" : ""}`}>{GROUP_LABEL[g.group]} <span className="pl-group-n">{g.tasks.length}</span></h3>
          <ul className="pl-list">
            {g.tasks.map((t: Task) => <TaskRow key={t.id} task={t} today={today} highlight={highlight === t.id} onOpen={(x) => setOpenId(x.id)} />)}
          </ul>
        </section>
      ))}
      {open && <TaskSheet key={open.id} task={open} venues={venues} onClose={() => setOpenId(null)} />}
      <PasteTasks open={paste} onClose={() => setPaste(false)} />
    </Card>
  );
}
