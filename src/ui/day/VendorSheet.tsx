// Vendor edit/create sheet (DESIGN-v11): draft strings, commit on Save; delete with confirm.
import { useState } from "react";
import { VENDOR_CATEGORIES, VENDOR_STATUSES, type Vendor, type VendorCategory, type VendorStatus } from "../../plan/types";
import { VENDOR_LABEL } from "../../plan/day";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { STATUS_LABEL, checkDraft, createVendorOp, deleteVendorOp, updatePatch, type VendorDraft } from "./vendorsModel";
import "./vendors.css";

/** vendor = existing row to edit; null = create from `initial`. */
export function VendorSheet({ vendor, initial, onClose }: { vendor: Vendor | null; initial: VendorDraft; onClose(): void }) {
  const { edit, save, version, offline } = useData();
  const [draft, setDraft] = useState<VendorDraft>(initial);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const set = (p: Partial<VendorDraft>) => setDraft((d) => ({ ...d, ...p }));
  const { errors, warnings } = checkDraft(draft);
  const patch = vendor ? updatePatch(vendor, draft) : null;
  const unchanged = !!patch && !Object.keys(patch.row ?? {}).length;
  const run = async (f: () => Promise<SaveResult>) => {
    setBusy(true);
    const r = await f();
    setBusy(false);
    if (r.ok) onClose(); else setFail(r);
  };
  const doSave = () => run(() => (vendor && patch ? edit([patch], `Edited: ${draft.name.trim()}`) : save([createVendorOp(draft)])));
  return (
    <Sheet title={vendor ? "Vendor" : "Add vendor"} open onClose={onClose}
      footer={offline ? <Button onClick={onClose}>Close</Button> : confirm && vendor ? (
        <>
          <span className="vd-confirm pl-confirm">Delete this vendor for good?</span>
          <Button onClick={() => setConfirm(false)}>Keep it</Button>
          <Button kind="danger" disabled={busy} onClick={() => void run(() => save([deleteVendorOp(vendor, version("vendors", vendor.id) ?? 0)]))}>Yes, delete</Button>
        </>
      ) : (
        <>
          {vendor && <Button kind="danger" onClick={() => setConfirm(true)}>Delete</Button>}
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy || errors.length > 0 || unchanged} onClick={() => void doSave()}>Save</Button>
        </>
      )}>
      <fieldset className="vd-fieldset" disabled={offline}>
        <div className="vd-fields">
          <Field label="Category">
            <select value={draft.category} onChange={(e) => set({ category: e.target.value as VendorCategory })}>
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{VENDOR_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Name"><input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={200} /></Field>
          <Field label="Status" wide>
            <Segmented<VendorStatus> label="Status" value={draft.status} onChange={(status) => set({ status })}
              options={VENDOR_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </Field>
          <Field label="Amount ($)"><input inputMode="decimal" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
          <Field label="Deposit ($)"><input inputMode="decimal" value={draft.deposit} onChange={(e) => set({ deposit: e.target.value })} /></Field>
          <Field label="Deposit due"><input type="date" value={draft.deposit_due} onChange={(e) => set({ deposit_due: e.target.value })} /></Field>
          <Field label="Deposit paid"><input type="date" value={draft.deposit_paid} onChange={(e) => set({ deposit_paid: e.target.value })} /></Field>
          <Field label="Balance due"><input type="date" value={draft.balance_due} onChange={(e) => set({ balance_due: e.target.value })} /></Field>
          <Field label="Balance paid"><input type="date" value={draft.balance_paid} onChange={(e) => set({ balance_paid: e.target.value })} /></Field>
          <Field label="Contact" wide><input value={draft.contact} onChange={(e) => set({ contact: e.target.value })} maxLength={200} /></Field>
          <Field label="Notes" wide><textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        </div>
      </fieldset>
      {errors.map((m) => <p key={m} className="vd-err" role="alert">{m}</p>)}
      {warnings.map((m) => <p key={m} className="vd-warn">⚠ {m}</p>)}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Sheet>
  );
}
