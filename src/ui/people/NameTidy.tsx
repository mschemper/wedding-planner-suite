// One-time tidy (v8): automatic households whose stored envelope name doesn't match their people. Preview, then fix all in
// one edit (Undo), or keep a name as written (it becomes a custom name and stops following the people).
import { useMemo, useState } from "react";
import { nameFixes } from "../../people/names";
import { useData, type SaveResult } from "../data";
import { Button } from "../kit/kit";
import { SaveError } from "../SaveError";

export function NameTidy() {
  const { people, edit } = useData();
  const fixes = useMemo(() => nameFixes(people), [people]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  if (!fixes.length) return null;
  const n = fixes.length;
  const all = async () => {
    const r = await edit(fixes.map((f) => ({ table: "parties" as const, id: f.partyId, row: { name: f.to } })), `${n} household name${n === 1 ? "" : "s"} tidied`);
    setErr(r.ok ? null : r);
    if (r.ok) setOpen(false);
  };
  const keep = async (id: string, name: string) => {
    const r = await edit([{ table: "parties", id, row: { name_custom: true } }], `Kept "${name}" as written`);
    setErr(r.ok ? null : r);
  };
  return (
    <div className="flag nt" role="status">
      <SaveError result={err} onDismiss={() => setErr(null)} />
      <b>{n} household name{n === 1 ? " doesn't" : "s don't"} match {n === 1 ? "its" : "their"} people.</b>{" "}
      Names now follow the people ("Fran &amp; Len Van Noord", "Erica Schemper &amp; Erik Vorhes").{" "}
      <button type="button" className="pp-link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Preview"}</button>
      {open && (
        <>
          <ul className="nt-list">
            {fixes.map((f) => (
              <li key={f.partyId}>
                <span className="nt-from">{f.from}</span> <span aria-hidden="true">→</span> <b>{f.to}</b>{" "}
                <button type="button" className="pp-link" onClick={() => void keep(f.partyId, f.from)}>Keep as written</button>
              </li>
            ))}
          </ul>
          <Button kind="primary" onClick={() => void all()}>Tidy all {n}</Button>
        </>
      )}
    </div>
  );
}
