// Plan → Tasks: quick-add bar, one control row (List|Calendar, All|Ready|Decisions, Filter), month-grouped list or calendar, paste, checklist sheet, edit sheet.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { byIdMap } from "../../plan/deps";
import { chicagoToday } from "../../plan/tasks";
import { CATEGORIES, OWNERS, type Category, type Owner, type Task } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState, FilterChip, Segmented } from "../kit/kit";
import { SaveError } from "../SaveError";
import { templateDrafts } from "../../plan/template";
import { Calendar } from "./Calendar";
import { ChecklistSheet } from "./ChecklistSheet";
import { PasteTasks } from "./PasteTasks";
import { TaskRow } from "./TaskRow";
import { TaskFields, TaskSheet } from "./TaskSheet";
import { NO_FILTER, createTaskOp, draftError, filterTasks, hiddenByFilters, listGroups, matchesView, quickDraft, rowInfo, type PlanFilter, type PlanMode, type TaskDraft, type TaskFilter } from "./model";

export function Tasks({ highlight, mode, setMode, view, setView }: {
  highlight: string | null; mode: PlanMode; setMode(m: PlanMode): void; view: PlanFilter; setView(v: PlanFilter): void;
}) {
  const { tasks, save, offline, status, version, settings } = useData();
  const today = chicagoToday();
  const [filter, setFilter] = useState<TaskFilter>(NO_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = (filter.owner ? 1 : 0) + (filter.category ? 1 : 0) + (filter.showDone ? 1 : 0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [checklist, setChecklist] = useState(false);
  const [more, setMore] = useState(false);
  const [details, setDetails] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(quickDraft);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => byIdMap(tasks), [tasks]);
  const wedding = settings.heldDate;
  const offerChecklist = !!wedding && !offline && templateDrafts(wedding, today, tasks).length > 0;
  const groups = useMemo(() => listGroups(filterTasks(tasks, filter).filter((t) => matchesView(t, view, byId)), today), [tasks, filter, view, byId, today]);
  const keep = useCallback((t: Task) => filterTasks([t], filter).length > 0 && matchesView(t, view, byId), [filter, view, byId]);
  const open = tasks.find((t) => t.id === openId) ?? null;

  // Focus from another tab: make sure the task is visible, then scroll to it.
  useEffect(() => {
    if (!highlight) return;
    const t = tasks.find((x) => x.id === highlight);
    if (t && filterTasks([t], filter).length === 0) setFilter({ ...NO_FILTER, showDone: t.status === "done" });
    const g = groups.find((x) => x.tasks.some((y) => y.id === highlight));
    if (g?.collapsed) setExpanded((s) => new Set(s).add(g.key));
    const id = requestAnimationFrame(() => document.getElementById(`task-${highlight}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, tasks.length]);

  // The "Added" note clears after ~4 s.
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(id);
  }, [note]);

  const toggleOwner = (o: Owner) => setFilter((f) => ({ ...f, owner: f.owner === o ? null : o }));
  const toggleCat = (c: Category) => setFilter((f) => ({ ...f, category: f.category === c ? null : c }));
  const bad = draftError(draft);
  const add = async () => {
    if (bad || busy) return;
    const added = draft;
    setBusy(true);
    const r = await save([createTaskOp(added, "manual", today)]);
    setBusy(false);
    if (r.ok) {
      setNote(`Added: ${added.title.trim()}${hiddenByFilters(added, filter, view) ? " — hidden by filters" : ""}`);
      setDraft(quickDraft()); setFail(null);
      inputRef.current?.focus();
    } else setFail(r);
  };

  return (
    <Card title="Tasks">
      {!offline && (
        <form className="pl-quick" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <div className="pl-quick-row">
            <input ref={inputRef} className="pl-quick-input" value={draft.title} maxLength={200} placeholder="Add a task…" aria-label="Add a task"
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            <Button type="submit" kind="primary" disabled={busy || !!bad}>Add</Button>
            <Button onClick={() => setDetails((d) => !d)} aria-expanded={details}>{details ? "Fewer details" : "More details"}</Button>
            <Button onClick={() => setMore((m) => !m)} aria-expanded={more}>⋯ More</Button>
          </div>
          {details && <TaskFields hideTitle draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} />}
          {bad && draft.title !== "" && <span className="pl-err">{bad}</span>}
          {more && (
            <div className="pl-quick-row">
              <Button onClick={() => setPaste(true)}>Paste tasks</Button>
              {offerChecklist && <Button onClick={() => setChecklist(true)}>Add the wedding checklist</Button>}
            </div>
          )}
          <SaveError result={fail} onDismiss={() => setFail(null)} />
        </form>
      )}
      {note && <p className="pl-hint" role="status">{note}</p>}
      <div className="pl-controls">
        <Segmented<PlanMode> label="Plan view" size="sm" value={mode} onChange={setMode}
          options={[{ value: "list", label: "List" }, { value: "calendar", label: "Calendar" }]} />
        <Segmented<PlanFilter> label="Show" size="sm" value={view} onChange={setView}
          options={[{ value: "all", label: "All" }, { value: "ready", label: "Ready now" }, { value: "decisions", label: "Decisions" }]} />
        <button type="button" className="k-filter pl-filter-toggle" aria-expanded={filtersOpen} aria-controls="pl-filters" onClick={() => setFiltersOpen((o) => !o)}>
          Filter{activeFilters ? ` (${activeFilters})` : ""} <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
        </button>
      </div>
      <div id="pl-filters" className={`pl-filters${filtersOpen ? " is-open" : ""}`} role="group" aria-label="Filter tasks">
        {OWNERS.map((o) => <FilterChip key={o} on={filter.owner === o} onClick={() => toggleOwner(o)}>{o}</FilterChip>)}
        <span className="pl-sep" aria-hidden="true" />
        {CATEGORIES.map((c) => <FilterChip key={c} on={filter.category === c} onClick={() => toggleCat(c)}>{c}</FilterChip>)}
        <span className="pl-sep" aria-hidden="true" />
        <FilterChip on={filter.showDone} onClick={() => setFilter((f) => ({ ...f, showDone: !f.showDone }))}>Show done</FilterChip>
      </div>
      {mode === "calendar" && tasks.length > 0 && <Calendar tasks={tasks} today={today} wedding={wedding} keep={keep} highlight={highlight} onOpen={(x) => setOpenId(x.id)} />}
      {mode === "list" && groups.length === 0 && (
        <EmptyState>{status === "loading" ? "Loading tasks…" : offline ? "Tasks live in the online planner." : tasks.length ? "No tasks match these filters." : "No tasks yet. Type one above or paste a list."}</EmptyState>
      )}
      {mode === "calendar" && tasks.length === 0 && <EmptyState>{status === "loading" ? "Loading tasks…" : "No tasks yet. Type one above, paste a list or add the wedding checklist."}</EmptyState>}
      {mode === "list" && groups.map((g) => {
        const shut = g.collapsed && !expanded.has(g.key);
        const flip = () => setExpanded((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; });
        return (
          <section key={g.key} className="pl-group" aria-label={g.label}>
            <h3 className={`pl-group-h${g.overdue ? " is-overdue" : ""}`}>{g.label} <span className="pl-group-n">{g.tasks.length}</span></h3>
            {g.collapsed && <button type="button" className="pl-group-toggle" aria-expanded={!shut} onClick={flip}>{shut ? `Show ${g.tasks.length} task${g.tasks.length === 1 ? "" : "s"}` : "Hide"}</button>}
            {!shut && (
              <ul className="pl-list">
                {g.tasks.map((t: Task) => <TaskRow key={t.id} task={t} today={today} highlight={highlight === t.id} onOpen={(x) => setOpenId(x.id)} info={rowInfo(t, byId, today)} />)}
              </ul>
            )}
          </section>
        );
      })}
      {open && <TaskSheet key={`${open.id}:${version("tasks", open.id) ?? 0}`} task={open} tasks={tasks} onClose={() => setOpenId(null)} />}
      {checklist && wedding && <ChecklistSheet wedding={wedding} today={today} tasks={tasks} onClose={() => setChecklist(false)} />}
      <PasteTasks open={paste} onClose={() => setPaste(false)} />
    </Card>
  );
}
