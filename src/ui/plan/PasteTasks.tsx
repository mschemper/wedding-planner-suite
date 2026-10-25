// "Paste tasks" sheet: JSON from the email-sweep session (docs/skills/email-sweep.md) → preview → one save with creates.
import { useMemo, useState } from "react";
import type { Task } from "../../plan/types";
import { parsePastedTasks } from "../../plan/tasks";
import { useData, type SaveResult } from "../data";
import { Button, Chip, Field, OwnerChip, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { duplicateFlags, pasteOps, pasteSummary } from "./model";

export function PasteTasks({ open, onClose }: { open: boolean; onClose(): void }) {
  const { tasks, save, scenarios } = useData();
  const [text, setText] = useState("");
  const [withDupes, setWithDupes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const parsed = useMemo(() => (text.trim() ? parsePastedTasks(text) : null), [text]);
  const list: Partial<Task>[] = parsed?.ok ? parsed.tasks : [];
  const dupes = useMemo(() => duplicateFlags(list, tasks), [list, tasks]);
  const skip = dupes.map((d) => d && !withDupes);
  const ops = pasteOps(list, skip, new Set(scenarios.map((s) => s.id)));
  const nDupes = dupes.filter(Boolean).length;
  const close = () => { setText(""); setFail(null); onClose(); };
  const add = async () => {
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (r.ok) close(); else setFail(r);
  };
  return (
    <Sheet title="Paste tasks" open={open} onClose={close}
      footer={<><Button onClick={close}>Cancel</Button><Button kind="primary" disabled={busy || !ops.length} onClick={() => void add()}>Add {ops.length} task{ops.length === 1 ? "" : "s"}</Button></>}>
      <Field label="Task list from the email sweep (JSON)" wide hint="Run docs/skills/email-sweep.md in a Claude session, then paste its JSON here.">
        <textarea className="pl-paste" value={text} onChange={(e) => setText(e.target.value)} rows={6} spellCheck={false} />
      </Field>
      {parsed && !parsed.ok && <p className="pl-err" role="alert">{parsed.msg}</p>}
      {parsed?.ok && (
        <>
          <p className="pl-sum"><strong>{pasteSummary(list)}</strong>{nDupes > 0 && ` · ${nDupes} already on your open list`}</p>
          {nDupes > 0 && (
            <label className="pl-check-line"><input type="checkbox" checked={withDupes} onChange={(e) => setWithDupes(e.target.checked)} /> Add duplicates too</label>
          )}
          <ul className="pl-preview">
            {list.map((p, i) => (
              <li key={i} className={skip[i] ? "is-skip" : ""}>
                <span>{p.title}</span>
                <span className="pl-task-meta">
                  {p.owner && <OwnerChip owner={p.owner} />}
                  {p.category && <span>{p.category}</span>}
                  {p.due && <span>{p.due}</span>}
                  {dupes[i] && <Chip tone="gold">{skip[i] ? "duplicate · skipped" : "duplicate"}</Chip>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
