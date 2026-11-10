// Timeline step sheet: draft + Save (create via save, update via edit with Undo); delete with confirm.
import { useState } from "react";
import type { TimelineRow } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { createOp, deleteOp, draftError, draftOf, emptyDraft, timelineChanges, type TimelineDraft } from "./timelineModel";

/** row = existing step; null = new step. */
export function TimelineSheet({ row, onClose }: { row: TimelineRow | null; onClose(): void }) {
  const { edit, save, version, offline } = useData();
  const [draft, setDraft] = useState<TimelineDraft>(() => (row ? draftOf(row) : emptyDraft()));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const set = (p: Partial<TimelineDraft>) => setDraft((d) => ({ ...d, ...p }));
  const bad = draftError(draft);
  const changes = row ? timelineChanges(row, draft) : {};
  const run = async (f: () => Promise<SaveResult>) => {
    setBusy(true);
    const r = await f();
    setBusy(false);
    if (r.ok) onClose(); else setFail(r);
  };
  const onSave = () => {
    if (bad) return;
    if (!row) return void run(() => save([createOp(draft)]));
    void run(() => edit([{ table: "timeline", id: row.id, row: changes }], `Edited: ${draft.title.trim()}`));
  };
  return (
    <Sheet title={row ? "Edit step" : "Add step"} open onClose={onClose}
      footer={offline ? <Button onClick={onClose}>Close</Button> : confirm && row ? (
        <>
          <span className="tl-confirm">Delete this step for good?</span>
          <Button onClick={() => setConfirm(false)}>Keep it</Button>
          <Button kind="danger" disabled={busy} onClick={() => void run(() => save([deleteOp(row.id, version("timeline", row.id) ?? 0)]))}>Yes, delete</Button>
        </>
      ) : (
        <>
          {row && <Button kind="danger" onClick={() => setConfirm(true)}>Delete</Button>}
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy || !!bad || (!!row && !Object.keys(changes).length)} onClick={onSave}>Save</Button>
        </>
      )}>
      <fieldset className="tl-fieldset" disabled={offline}>
        <div className="tl-fields">
          <Field label="Title" wide><input value={draft.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Start"><input type="time" value={draft.start} onChange={(e) => set({ start: e.target.value })} /></Field>
          <Field label="Minutes" hint="0 = a single moment, max 720"><input inputMode="numeric" value={draft.minutes} onChange={(e) => set({ minutes: e.target.value })} /></Field>
          <Field label="Place" wide><input value={draft.place} onChange={(e) => set({ place: e.target.value })} /></Field>
          <Field label="Who" wide><input value={draft.who} onChange={(e) => set({ who: e.target.value })} /></Field>
          <Field label="Notes" wide><textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        </div>
      </fieldset>
      {bad && <p className="tl-err" role="alert">{bad}</p>}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
