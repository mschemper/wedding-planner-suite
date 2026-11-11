// "Add the wedding checklist" (DESIGN-v14 §4): preview the template by month, untick what you do not want, one save.
import { useMemo, useState } from "react";
import { TEMPLATE, templateDrafts, templateOps, type TemplateDraft } from "../../plan/template";
import type { Task } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Chip, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { fmtDay } from "./model";

const monthOf = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const titleOf = (k: string) => TEMPLATE.find((x) => x.key === k)?.title ?? k;

export function ChecklistSheet({ wedding, today, tasks, onClose }: { wedding: string; today: string; tasks: Task[]; onClose(): void }) {
  const { save } = useData();
  const drafts = useMemo(() => templateDrafts(wedding, today, tasks), [wedding, today, tasks]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const keys = useMemo(() => new Set(drafts.filter((d) => !off.has(d.key)).map((d) => d.key)), [drafts, off]);
  const groups = useMemo(() => {
    const g: { label: string; items: TemplateDraft[] }[] = [];
    for (const d of drafts) {
      const label = monthOf(d.due);
      if (g.length && g[g.length - 1].label === label) g[g.length - 1].items.push(d); else g.push({ label, items: [d] });
    }
    return g;
  }, [drafts]);
  const toggle = (k: string) => setOff((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const go = async () => {
    setBusy(true);
    const n = keys.size;
    const r = await save(templateOps(drafts, keys, tasks));
    setBusy(false);
    if (r.ok) { setAdded(n); setFail(null); } else setFail(r);
  };
  // After the save the drafts list empties; keep the report on screen.
  return (
    <Sheet title="Add the wedding checklist" open onClose={onClose}
      footer={added !== null ? <Button kind="primary" onClick={onClose}>Done</Button> : (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy || keys.size === 0} onClick={() => void go()}>{busy ? "Adding…" : `Add ${keys.size} to Plan`}</Button>
        </>
      )}>
      {added !== null ? <p role="status">Added {added} task{added === 1 ? "" : "s"} to Plan.</p> : drafts.length === 0 ? <p>Everything on the checklist is already in Plan.</p> : (
        <>
          <p className="pl-hint">Counted back from the wedding, {fmtDay(wedding, true)}. Untick anything you do not want.</p>
          {groups.map((g) => (
            <section key={g.label} className="pl-group" aria-label={g.label}>
              <h3 className="pl-group-h">{g.label}</h3>
              <ul className="pl-preview">
                {g.items.map((d) => (
                  <li key={d.key}>
                    <label className="pl-check-line">
                      <input type="checkbox" checked={keys.has(d.key)} onChange={() => toggle(d.key)} />
                      <span>{d.kind === "decision" && <span className="pl-decision">◆ Decision · </span>}{d.title}</span>
                    </label>
                    <span className="pl-task-meta">
                      <span>{fmtDay(d.due, true)}</span>
                      {d.late && <Chip tone="peony" title="Ideal date passed; due today">late</Chip>}
                      {d.deps.length > 0 && <span>after: {d.deps.map(titleOf).join("; ")}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
