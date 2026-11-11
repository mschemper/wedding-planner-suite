// Household sheet "Mailing address" section (DESIGN-v14 §5). Draft state; its own Save (one save()). Private data: no logging.
import { useEffect, useId, useState } from "react";
import type { Address } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Chip, Field } from "../kit/kit";
import { blankForm, createOp, failText, formDirty, formFrom, formIssue, formRow, todayIso, type AddrForm } from "./addressModel";

export function AddressSection({ partyId, onDirty }: { partyId: string; onDirty?(dirty: boolean): void }) {
  const { addresses, save, edit, version } = useData();
  const saved: Address | undefined = addresses.find((a) => a.id === partyId);
  const base = saved ? formFrom(saved) : blankForm(todayIso());
  const [form, setForm] = useState<AddrForm>(base);
  const [ref, setRef] = useState<AddrForm>(base);
  const [issue, setIssue] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const id = useId();
  const set = <K extends keyof AddrForm>(k: K, v: AddrForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setIssue(null); setFail(null); setOk(false); };
  const dirty = formDirty(form, ref);
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);

  const finish = (r: SaveResult, next: AddrForm | null) => {
    setBusy(false);
    if (r.ok) { setFail(null); setConfirm(false); if (next) { setForm(next); setRef(next); setOk(true); } return; }
    setFail(failText(r)); // draft kept
  };
  const onSave = async () => {
    const p = formIssue(form);
    setIssue(p);
    if (p) return;
    setBusy(true); setOk(false);
    const row = formRow(form);
    const next = formFrom({ id: partyId, ...row });
    if (saved) finish(await edit([{ table: "addresses", id: partyId, row: { ...row } }], "Address"), next);
    else finish(await save([createOp(partyId, form)]), next);
  };
  const onRemove = async () => {
    const v = version("addresses", partyId);
    if (v === undefined) { setFail("Changed elsewhere — reload to see the latest, then re-apply your draft."); return; }
    setBusy(true);
    const r = await save([{ table: "addresses", op: "delete", id: partyId, version: v }]);
    finish(r, null);
    if (r.ok) { const b = blankForm(todayIso()); setForm(b); setRef(b); setOk(false); }
  };

  return (
    <section className="pp-addr wide" aria-labelledby={`${id}-h`}>
      <h3 className="pp-sec" id={`${id}-h`}>Mailing address {saved && <Chip>{saved.verified ? "Confirmed" : "Not confirmed"}</Chip>}</h3>
      <div className="pp-form">
        <Field label="Street" wide><input value={form.line1} onChange={(e) => set("line1", e.target.value)} autoComplete="off" /></Field>
        <Field label="Apt / Unit" wide><input value={form.line2} onChange={(e) => set("line2", e.target.value)} autoComplete="off" /></Field>
        <Field label="City"><input value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="off" /></Field>
        <Field label="State"><input value={form.region} onChange={(e) => set("region", e.target.value)} autoComplete="off" maxLength={3} /></Field>
        <Field label="ZIP / postal code"><input value={form.postal} onChange={(e) => set("postal", e.target.value)} autoComplete="off" /></Field>
        <Field label="Country (2 letters)"><input value={form.country} onChange={(e) => set("country", e.target.value)} autoComplete="off" maxLength={2} /></Field>
        <Field label="Where from" wide hint="e.g. text from a relative"><input value={form.source} onChange={(e) => set("source", e.target.value)} autoComplete="off" /></Field>
        <Field label="Date gathered" hint="YYYY-MM-DD"><input value={form.gathered} onChange={(e) => set("gathered", e.target.value)} autoComplete="off" inputMode="numeric" /></Field>
        <div className="pp-checks"><label className="pp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Confirmed with them</label></div>
        <Field label="Notes" wide><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      </div>
      <p className="pp-addr-msg" role="status" aria-live="polite">
        {issue && <span className="flag warn">{issue}</span>}
        {fail && <span className="flag warn">{fail}</span>}
        {ok && !dirty && <span className="small">Address saved.</span>}
      </p>
      <div className="pp-addrel">
        <Button kind="primary" disabled={busy || (!!saved && !dirty)} onClick={() => void onSave()}>{busy ? "Saving…" : saved ? "Save address" : "Add address"}</Button>
        {saved && !confirm && <Button kind="quiet" disabled={busy} onClick={() => setConfirm(true)}>Remove address</Button>}
      </div>
      {confirm && (
        <div className="flag warn" role="alert">
          Remove this household's address? This can't be undone.{" "}
          <Button kind="danger" disabled={busy} onClick={() => void onRemove()}>Remove</Button>{" "}
          <Button onClick={() => setConfirm(false)}>Keep</Button>
        </div>
      )}
    </section>
  );
}
