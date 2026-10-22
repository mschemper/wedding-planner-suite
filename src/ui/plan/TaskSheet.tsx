// Task edit sheet + the shared field set (also used by Quick add). Draft + Save via edit(); delete with confirm.
import { useState } from "react";
import { CATEGORIES, type Category, type Owner, type Task } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { draftError, draftOf, taskChanges, shortVenueName, type TaskDraft } from "./model";

export interface VenueOption { id: number; name: string }

export function TaskFields({ draft, set, venues }: { draft: TaskDraft; set(p: Partial<TaskDraft>): void; venues: VenueOption[] }) {
  return (
    <div className="pl-fields">
      <Field label="Title" wide><input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} /></Field>
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
      <Field label="Venue (optional)">
        <select value={draft.scenario_id ?? ""} onChange={(e) => set({ scenario_id: e.target.value === "" ? null : Number(e.target.value) })}>
          <option value="">None</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{shortVenueName(v.name)}</option>)}
        </select>
      </Field>
    </div>
  );
}

export function TaskSheet({ task, venues, onClose }: { task: Task; venues: VenueOption[]; onClose(): void }) {
  const { edit, save, version, offline } = useData();
  const [draft, setDraft] = useState<TaskDraft>(() => draftOf(task));
  const [detailOnly, setDetail] = useState(task.detail ?? "");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const bad = draftError(draft);
  const changes = taskChanges(task, { ...draft, detail: detailOnly });
  const run = async (f: () => Promise<SaveResult>) => {
    setBusy(true);
    const r = await f();
    setBusy(false);
    if (r.ok) onClose(); else setFail(r);
  };
  return (
    <Sheet title="Task" open onClose={onClose}
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
        <TaskFields draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} venues={venues} />
        <Field label="Details" wide><textarea value={detailOnly} onChange={(e) => setDetail(e.target.value)} /></Field>
      </fieldset>
      {bad && <p className="pl-err" role="alert">{bad}</p>}
      {task.source && <p className="pl-hint">Source: {task.source}{task.source_date ? ` · ${task.source_date}` : ""}</p>}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
