// Must-have × venue verdict matrix (DESIGN-v4 §1.8, §2). Tap cycles + saves (Undo via edit); "note" opens a Sheet.
import { useCallback, useState, useRef } from "react";
import { Button, Card, EmptyState, Field, Sheet, VerdictPicker, verdictText } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { orderedMustHaves, verdictOf } from "../../plan/fit";
import type { Verdict } from "../../plan/types";
import type { VenueSummary } from "../../plan/venueSummary";
import { cycleFitWrite, fitPct, fitText, noteWrite, type FitWrite } from "./model";

/** Fit writes shared by the matrix and the venue detail. */
export function useFitEdit() {
  const { fit, edit, save, offline } = useData();
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const run = useCallback(async (w: FitWrite, label: string) => {
    const r = w.kind === "edit" ? await edit(w.patches, label) : await save(w.ops);
    setFail(r.ok ? null : r);
  }, [edit, save]);
  const busy = useRef(false);
  const cycle = useCallback(async (scenarioId: number, musthaveId: string, names: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { next, write } = cycleFitWrite(fit, scenarioId, musthaveId);
      await run(write, `${names}: ${verdictText(next as Verdict)}`);
    } finally { busy.current = false; }
  }, [fit, run]);
  const setNote = useCallback((scenarioId: number, musthaveId: string, note: string, names: string) =>
    run(noteWrite(fit, scenarioId, musthaveId, note), `Saved note · ${names}`), [fit, run]);
  const error = <SaveError result={fail} onDismiss={() => setFail(null)} />;
  return { cycle, setNote, error, readOnly: offline };
}

export const noteOf = (fit: ReturnType<typeof useData>["fit"], sid: number, mid: string) => verdictOf(fit, sid, mid)?.note ?? "";

export interface NoteTarget { scenarioId: number; musthaveId: string; venue: string; musthave: string }

export function NoteSheet({ target, onClose, onSave }: { target: NoteTarget | null; onClose(): void; onSave(t: NoteTarget, note: string): Promise<void> }) {
  const { fit } = useData();
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState<NoteTarget | null>(null);
  if (target !== seen) { setSeen(target); setDraft(target ? noteOf(fit, target.scenarioId, target.musthaveId) : ""); }
  return (
    <Sheet title={target ? `${target.venue} · note` : "Note"} open={!!target} onClose={onClose}
      footer={<><Button kind="quiet" onClick={onClose}>Cancel</Button><Button kind="primary" onClick={() => { if (target) void onSave(target, draft).then(onClose); }}>Save note</Button></>}>
      {target && <Field label={target.musthave} wide><textarea rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} /></Field>}
    </Sheet>
  );
}

export function FitMatrix({ active }: { active: VenueSummary[] }) {
  const { musthaves, fit } = useData();
  const { cycle, setNote, error, readOnly } = useFitEdit();
  const [target, setTarget] = useState<NoteTarget | null>(null);
  const rows = orderedMustHaves(musthaves);
  if (!active.length) return null;
  return (
    <Card title="Must-haves × venues">
      {!rows.length && <EmptyState>No must-haves yet. Add them on the Plan tab.</EmptyState>}
      {rows.length > 0 && (
        <div className="vn-table-wrap vn-matrix-wrap">
          <table className="vn-table vn-matrix">
            <caption className="sr-only">Must-have verdict for each shortlisted venue. Tap a verdict to change it.</caption>
            <thead>
              <tr><td />{active.map((v) => <th key={v.scenario.id} scope="col">{v.scenario.name}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.text}{m.detail && <span className="vn-meta"> {m.detail}</span>}</th>
                  {active.map((v) => {
                    const f = verdictOf(fit, v.scenario.id, m.id);
                    const note = f?.note ?? "";
                    const names = `${v.scenario.name} · ${m.text}`;
                    return (
                      <td key={v.scenario.id} title={note || undefined}>
                        <div className="vn-cell">
                          <VerdictPicker verdict={f?.verdict ?? "unknown"} label={names} disabled={readOnly} onCycle={() => void cycle(v.scenario.id, m.id, names)} />
                          {!readOnly && (
                            <button type="button" className="vn-cell-note-btn" aria-label={`${note ? "Edit" : "Add"} note: ${names}`}
                              onClick={() => setTarget({ scenarioId: v.scenario.id, musthaveId: m.id, venue: v.scenario.name, musthave: m.text })}>{note ? "note ✎" : "+ note"}</button>
                          )}
                        </div>
                        {note && <div className="vn-meta vn-cell-note">{note}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="vn-total-row">
                <th scope="row">Fit</th>
                {active.map((v) => (
                  <td key={v.scenario.id}>
                    <div className="vn-fitbar" role="img" aria-label={fitText(v.fit)}><i style={{ width: `${fitPct(v.fit)}%` }} /></div>
                    <div className="vn-meta">{fitText(v.fit)}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {error}
      <NoteSheet target={target} onClose={() => setTarget(null)} onSave={(t, n) => setNote(t.scenarioId, t.musthaveId, n, `${t.venue} · ${t.musthave}`)} />
    </Card>
  );
}
