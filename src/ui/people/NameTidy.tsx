// Name fixes section of the Tidy-up list (v8 behaviour, v9 placement): automatic households whose stored envelope name doesn't match their people.
// Fix all in one edit (Undo), or keep a name as written (it becomes a custom name and stops following the people).
import { useState } from "react";
import type { NameFix } from "../../people/names";
import { useData, type SaveResult } from "../data";
import { Button } from "../kit/kit";
import { SaveError } from "../SaveError";

export function NameTidy({ fixes }: { fixes: NameFix[] }) {
  const { edit } = useData();
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  if (!fixes.length) return null;
  const n = fixes.length;
  const all = async () => {
    const r = await edit(fixes.map((f) => ({ table: "parties" as const, id: f.partyId, row: { name: f.to } })), `${n} household name${n === 1 ? "" : "s"} tidied`);
    setErr(r.ok ? null : r);
  };
  const keep = async (id: string, name: string) => {
    const r = await edit([{ table: "parties", id, row: { name_custom: true } }], `Kept "${name}" as written`);
    setErr(r.ok ? null : r);
  };
  return (
    <div className="nt">
      <SaveError result={err} onDismiss={() => setErr(null)} />
      <p className="pp-hint">Names now follow the people ("Ada &amp; Ben Sample"). These {n === 1 ? "household doesn't" : `${n} households don't`} match yet.</p>
      <ul className="nt-list">
        {fixes.map((f) => (
          <li key={f.partyId}>
            <span className="nt-from">{f.from}</span> <span aria-hidden="true">→</span> <b>{f.to}</b>{" "}
            <button type="button" className="pp-link" onClick={() => void keep(f.partyId, f.from)}>Keep as written</button>
          </li>
        ))}
      </ul>
      <Button kind="primary" onClick={() => void all()}>Tidy all {n}</Button>
    </div>
  );
}
