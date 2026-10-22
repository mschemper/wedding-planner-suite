// Assumptions sheet: price params (PricesForm) + shared settings: held date and date windows (DESIGN-v4 §1.5).
import { useState } from "react";
import type { Op } from "../../api/types";
import { Button, Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { money } from "../format";
import { PricesForm } from "./PricesForm";
import { parseHeld, parseWindows, windowsToDraft, type WindowDraft } from "./model";

function SettingsForm() {
  const { settings, save, version } = useData();
  const [held, setHeld] = useState(settings.heldDate ?? "");
  const [wins, setWins] = useState<WindowDraft[]>(() => windowsToDraft(settings.dateWindows));
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setErr(""); setDone(""); setFail(null);
    const h = parseHeld(held);
    if (!h.ok) return setErr(h.msg);
    const w = parseWindows(wins);
    if (!w.ok) return setErr(w.msg);
    const changes: [string, unknown][] = [];
    if (h.value !== settings.heldDate) changes.push(["heldDate", h.value]);
    if (JSON.stringify(w.value) !== JSON.stringify(settings.dateWindows)) changes.push(["dateWindows", w.value]);
    if (!changes.length) return setDone("Nothing to save.");
    const ops: Op[] = changes.map(([key, value]) => {
      const v = version("params", key);
      return v == null ? { table: "params", op: "create", row: { key, value } } : { table: "params", op: "update", id: key, version: v, row: { value } };
    });
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (r.ok) setDone("Saved date settings."); else setFail(r);
  }
  const upd = (i: number, k: keyof WindowDraft, v: string) => setWins(wins.map((w, j) => (j === i ? { ...w, [k]: v } : w)));
  return (
    <div className="vn-settings">
      <p className="vn-meta">Dates only change which season each venue prices at. They never change prices.</p>
      <div className="vn-row">
        <Field label="Held date"><input type="date" value={held} onChange={(e) => setHeld(e.target.value)} /></Field>
        <Button kind="quiet" onClick={() => setHeld("")} disabled={!held}>No held date</Button>
      </div>
      {wins.map((w, i) => (
        <fieldset key={i} className="vn-win">
          <legend>Window {i + 1}</legend>
          <Field label="Name"><input value={w.name} onChange={(e) => upd(i, "name", e.target.value)} /></Field>
          <Field label="From"><input type="date" value={w.from} onChange={(e) => upd(i, "from", e.target.value)} /></Field>
          <Field label="To"><input type="date" value={w.to} onChange={(e) => upd(i, "to", e.target.value)} /></Field>
          <Field label="Reference date"><input type="date" value={w.ref} onChange={(e) => upd(i, "ref", e.target.value)} /></Field>
          <Button kind="quiet" disabled={wins.length <= 1} onClick={() => setWins(wins.filter((_, j) => j !== i))}>Remove window {i + 1}</Button>
        </fieldset>
      ))}
      {wins.length < 4 && <Button onClick={() => setWins([...wins, { name: "", from: "", to: "", ref: "" }])}>Add window</Button>}
      {err && <p className="flag warn" role="alert">{err}</p>}
      {done && <p className="vn-meta" role="status">{done}</p>}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
      <Button kind="primary" disabled={busy} onClick={() => void onSave()}>{busy ? "Saving…" : "Save date settings"}</Button>
    </div>
  );
}

function ReadOnly() {
  const { params, settings } = useData();
  return (
    <>
      <p className="vn-meta">Read-only offline copy. Edit assumptions in the online planner.</p>
      <ul className="vn-plain">
        <li>Held date: {settings.heldDate ?? "none"}</li>
        {settings.dateWindows.map((w) => <li key={w.name}>{w.name}: {w.from} to {w.to} (ref {w.ref})</li>)}
        {Object.entries(params).map(([k, v]) => <li key={k}>{k}: {Array.isArray(v) ? v.map(([g, a]) => `${g}: ${money(a)}`).join(", ") : String(v)}</li>)}
      </ul>
    </>
  );
}

export function AssumptionsButton() {
  const { offline } = useData();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Assumptions</Button>
      <Sheet title="Assumptions" open={open} onClose={() => setOpen(false)}>
        {offline ? <ReadOnly /> : (
          <>
            <h3 className="vn-h3">Dates</h3>
            <SettingsForm />
            <h3 className="vn-h3">Prices</h3>
            <PricesForm />
          </>
        )}
      </Sheet>
    </>
  );
}
