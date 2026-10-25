// Tour mode: a venue-visit checklist. Each must-have is a question; one Save writes every changed answer (one batch).
import { useState } from "react";
import { Button, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { orderedMustHaves } from "../../plan/fit";
import type { Verdict } from "../../plan/types";
import { tourDraft, tourOps, type TourAnswer } from "./model";

type Choice = Verdict | "asked-none";
const OPTIONS: { value: Choice; label: string; tone: "euc" | "gold" | "peony" | "plain" }[] = [
  { value: "yes", label: "✓ Yes", tone: "euc" },
  { value: "partly", label: "◐ Partly", tone: "gold" },
  { value: "no", label: "✕ No", tone: "peony" },
  { value: "asked-none", label: "Not asked", tone: "plain" },
];

export function TourMode({ scenarioId, venueName, onClose }: { scenarioId: number; venueName: string; onClose(): void }) {
  const { musthaves, fit, save, version } = useData();
  const rows = orderedMustHaves(musthaves);
  const [answers, setAnswers] = useState<Record<string, TourAnswer>>(() => tourDraft(fit, scenarioId, rows.map((m) => m.id)));
  const [showNote, setShowNote] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);

  const ans = (id: string): TourAnswer => answers[id] ?? { verdict: null, note: "" };
  const ops = tourOps(fit, scenarioId, answers, (id) => version("fit", id));
  const answered = rows.filter((m) => ans(m.id).verdict != null).length;
  const set = (id: string, patch: Partial<TourAnswer>) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] ?? { verdict: null, note: "" }), ...patch } }));

  async function onSave() {
    setBusy(true);
    const r = await save(tourOps(fit, scenarioId, answers, (id) => version("fit", id)));
    setBusy(false);
    if (r.ok) onClose();
    else setFail(r);
  }

  return (
    <Sheet title={`Tour · ${venueName}`} open onClose={onClose} footer={
      <div className="vn-tour-foot">
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button kind="primary" onClick={() => void onSave()} disabled={busy || !ops.length}>{busy ? "Saving…" : `Save answers (${ops.length} changed)`}</Button>
      </div>
    }>
      <p className="vn-tour-progress">{answered} of {rows.length} answered</p>
      <SaveError result={fail} onDismiss={() => setFail(null)} />
      {!rows.length && <p className="vn-tour-hint">No must-haves yet. Add them on the Plan tab.</p>}
      <ol className="vn-tour-list">
        {rows.map((m) => {
          const a = ans(m.id);
          const noteOpen = showNote[m.id] || a.note.trim() !== "";
          return (
            <li key={m.id} className="vn-tour-q">
              <p className="vn-tour-text">{m.text}</p>
              {m.detail && <p className="vn-tour-hint">{m.detail}</p>}
              <div className="vn-tour-seg">
                <Segmented<Choice> label={m.text} options={OPTIONS} value={a.verdict ?? "asked-none"} disabled={busy}
                  onChange={(v) => set(m.id, { verdict: v === "asked-none" ? null : v })} />
              </div>
              {noteOpen ? (
                <textarea className="vn-tour-note" aria-label={`Note for: ${m.text}`} value={a.note} disabled={busy}
                  onChange={(e) => set(m.id, { note: e.target.value })} placeholder="What did they say?" />
              ) : (
                <Button kind="quiet" onClick={() => setShowNote((s) => ({ ...s, [m.id]: true }))}>+ note</Button>
              )}
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
