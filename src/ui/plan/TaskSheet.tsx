// Task edit sheet + the shared field set (also used by Quick add). Draft + Save via edit(); delete with confirm.
import { useMemo, useState } from "react";
import { byIdMap, dependants, earliestDue } from "../../plan/deps";
import { CATEGORIES, type Category, type Owner, type Task, type TaskKind } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { blockerChoices, depChanges, draftError, draftOf, fmtDay, taskChanges, type TaskDraft } from "./model";


export function TaskFields({ draft, set, hideTitle }: { draft: TaskDraft; set(p: Partial<TaskDraft>): void; hideTitle?: boolean }) {
  return (
    <div className="pl-fields">
      {!hideTitle && <Field label="Title" wide><input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} /></Field>}
      <Field label="Owner">
        <Segmented<Owner> label="Owner" value={draft.owner} onChange={(owner) => set({ owner })}
          options={[{ value: "Mark", label: "Mark" }, { value: "Angela", label: "Angela" }, { value: "Both", label: "Both" }]} />
      </Field>
      <Field label="Due date"><input type="date" value={draft.due} onChange={(e) => set({ due: e.target.value })} /></Field>
      <Field label="Category">
        <select value={draft.category} onChange={(e) => set({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
    </div>
  );
}

function WaitsOn({ task, tasks, deps, setDeps }: { task: Task; tasks: Task[]; deps: string[]; setDeps(d: string[]): void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState(false);
  const byId = useMemo(() => byIdMap(tasks), [tasks]);
  const show = q.trim() !== "" || list;
  const choices = useMemo(() => (show ? blockerChoices(tasks, task.id, deps, q) : []), [show, tasks, task.id, deps, q]);
  return (
    <div className="pl-waits">
      <ul className="pl-dep-picked" aria-label="Waits on">
        {deps.map((id) => (
          <li key={id}><span>{byId.get(id)?.title ?? "(deleted task)"}</span>
            <button type="button" aria-label={`Stop waiting on ${byId.get(id)?.title ?? id}`} onClick={() => setDeps(deps.filter((x) => x !== id))}>✕</button></li>
        ))}
      </ul>
      <div className="pl-dep-search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks to wait on" aria-label="Search tasks to wait on" />
        <Button onClick={() => setList((l) => !l)}>{list ? "Hide list" : "Pick from list"}</Button>
      </div>
      {show && (choices.length > 0 ? (
        <ul className="pl-dep-choices">
          {choices.map((c) => (
            <li key={c.id}><button type="button" onClick={() => { setDeps([...deps, c.id]); setQ(""); }}>
              {c.title}{c.due ? ` · ${fmtDay(c.due)}` : ""}</button></li>
          ))}
        </ul>
      ) : <p className="pl-hint">No matching open tasks.</p>)}
    </div>
  );
}

export function TaskSheet({ task, tasks, onClose }: { task: Task; tasks: Task[]; onClose(): void }) {
  const { edit, save, version, offline } = useData();
  const [draft, setDraft] = useState<TaskDraft>(() => draftOf(task));
  const [detailOnly, setDetail] = useState(task.detail ?? "");
  const [kind, setKind] = useState<TaskKind>(task.kind ?? "task");
  const [deps, setDeps] = useState<string[]>(task.depends_on ?? []);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const bad = draftError(draft);
  const changes = { ...taskChanges(task, { ...draft, detail: detailOnly }), ...depChanges(task, kind, deps) };
  const unblocks = useMemo(() => dependants(task.id, tasks), [task.id, tasks]);
  const earliest = useMemo(() => (draft.due ? earliestDue({ ...task, depends_on: deps }, byIdMap(tasks)) : null), [draft.due, task, deps, tasks]);
  const run = async (f: () => Promise<SaveResult>) => {
    setBusy(true);
    const r = await f();
    setBusy(false);
    if (r.ok) onClose(); else setFail(r);
  };
  return (
    <Sheet title={kind === "decision" ? "Decision" : "Task"} open onClose={onClose} dirty={!offline && Object.keys(changes).length > 0}
      footer={offline ? <Button onClick={onClose}>Close</Button> : confirm ? (
        <>
          <span className="pl-confirm">Delete this task for good?</span>
          <Button onClick={() => setConfirm(false)}>Keep it</Button>
          <Button kind="danger" disabled={busy} onClick={() => void run(() => save([{ table: "tasks", op: "delete", id: task.id, version: version("tasks", task.id) ?? 0 }]))}>Yes, delete</Button>
        </>
      ) : (
        <>
          <Button kind="danger" onClick={() => setConfirm(true)}>Delete</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy || !!bad || !Object.keys(changes).length}
            onClick={() => void run(() => edit([{ table: "tasks", id: task.id, row: changes }], `Edited: ${draft.title.trim()}`))}>Save</Button>
        </>
      )}>
      <fieldset className="pl-fieldset" disabled={offline}>
        <TaskFields draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} />
        <Field label="Type">
          <Segmented<TaskKind> label="Type" value={kind} onChange={setKind}
            options={[{ value: "task", label: "Task" }, { value: "decision", label: "◆ Decision" }]} />
        </Field>
        <div className="k-field wide">
          <span className="k-field-label">Waits on</span>
          <WaitsOn task={task} tasks={tasks} deps={deps} setDeps={setDeps} />
        </div>
        {earliest && draft.due < earliest && <p className="pl-hint" role="status">Earliest sensible due: {fmtDay(earliest, true)}</p>}
        {unblocks.length > 0 && <p className="pl-unblocks">Unblocks: {unblocks.map((t) => t.title).join("; ")}</p>}
        <Field label="Details" wide><textarea value={detailOnly} onChange={(e) => setDetail(e.target.value)} /></Field>
      </fieldset>
      {bad && <p className="pl-err" role="alert">{bad}</p>}
      {task.source && <p className="pl-hint">Source: {task.source}{task.source_date ? ` · ${task.source_date}` : ""}</p>}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
