// Add / edit one quote. Amount edits a text draft; validated and committed on Save or Enter (REVIEW-v3 R1).
import { useState } from "react";
import type { Op } from "../../api/types";
import type { Options, Quote, QuoteStatus, Scenario } from "../../engine/types";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";

export const ALL_IN = "*";

export function QuoteForm({ scenario, existing, preset, compact, onDone, onCancel }: {
  scenario: Scenario;
  /** versioned row being edited */
  existing?: Quote & { version: number };
  /** new quote defaults */
  preset?: { item_desc?: string; options?: Options | null };
  /** mini form: amount, basis, vendor, status, includes_tax only */
  compact?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { save } = useData();
  const descs = [...new Set(scenario.items.map((i) => i.desc))];
  const init = existing ?? preset ?? {};
  const [line, setLine] = useState(existing?.item_desc ?? preset?.item_desc ?? descs[0] ?? ALL_IN);
  const [scope, setScope] = useState<string>(() => {
    const o = init.options ?? null;
    return o && Object.keys(o).length ? JSON.stringify(o) : "";
  });
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [basis, setBasis] = useState<Quote["basis"]>(existing?.basis ?? "total");
  const [vendor, setVendor] = useState(existing?.vendor ?? "");
  const [status, setStatus] = useState<QuoteStatus>(existing?.status ?? "received");
  const [receivedOn, setReceivedOn] = useState(existing?.received_on ?? "");
  const [tax, setTax] = useState(existing?.includes_tax ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [err, setErr] = useState("");
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);

  const scopes: { v: string; label: string }[] = [{ v: "", label: "Any option" }];
  for (const o of scenario.options) for (const c of o.choices) scopes.push({ v: JSON.stringify({ [o.key]: c }), label: `${o.label}: ${c}` });
  if (scope && !scopes.some((s) => s.v === scope)) {
    scopes.push({ v: scope, label: Object.entries(JSON.parse(scope) as Options).map(([k, v]) => `${k}: ${v}`).join(", ") });
  }

  async function submit() {
    if (busy) return;
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!amount.trim() || !Number.isFinite(n) || n < 0) return setErr("Amount must be a number of 0 or more.");
    setErr("");
    const row = {
      scenario_id: scenario.id, item_desc: line, options: scope ? (JSON.parse(scope) as Options) : null, basis, amount: n,
      includes_tax: tax, vendor: vendor.trim() || null, received_on: receivedOn || null, status, notes: notes.trim() || null,
    };
    const op: Op = existing
      ? { table: "quotes", op: "update", id: existing.id, version: existing.version, row }
      : { table: "quotes", op: "create", row };
    setBusy(true);
    const r = await save([op]);
    setBusy(false);
    if (r.ok) onDone();
    else setFail(r);
  }

  const amountField = (
    <label>Amount ($)
      <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} />
    </label>
  );
  const basisField = (
    <label>Basis
      <select value={basis} onChange={(e) => setBasis(e.target.value as Quote["basis"])}>
        <option value="total">Total</option>
        <option value="perGuest">Per guest</option>
      </select>
    </label>
  );
  const vendorField = <label>Vendor<input value={vendor} onChange={(e) => setVendor(e.target.value)} /></label>;
  const statusField = (
    <label>Status
      <select value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}>
        <option value="requested">Requested (not applied)</option>
        <option value="received">Received</option>
        <option value="accepted">Accepted</option>
      </select>
    </label>
  );
  const taxField = (
    <label className="q-check"><input type="checkbox" checked={tax} onChange={(e) => setTax(e.target.checked)} />Includes tax / gratuity</label>
  );
  const buttons = (
    <div className="q-actions">
      <button className="q-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Saving…" : "Save quote"}</button>
      <button className="link-btn" onClick={onCancel}>Cancel</button>
      {err && <span className="q-err" role="alert">{err}</span>}
    </div>
  );

  if (compact) {
    return (
      <div className="q-mini">
        {amountField}{basisField}{vendorField}{statusField}
        <div className="wide">{taxField}</div>
        <div className="wide">{buttons}</div>
        <div className="wide"><SaveError result={fail} onDismiss={() => setFail(null)} /></div>
      </div>
    );
  }
  return (
    <div className="q-form">
      <label>Line
        <select value={line} onChange={(e) => setLine(e.target.value)}>
          <option value={ALL_IN}>* All-in total (replaces every line)</option>
          {descs.map((d) => <option key={d} value={d}>{d}</option>)}
          {line !== ALL_IN && !descs.includes(line) && <option value={line}>{line}</option>}
        </select>
      </label>
      <label>Applies to
        <select value={scope} onChange={(e) => setScope(e.target.value)}>{scopes.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select>
      </label>
      {amountField}{basisField}{vendorField}{statusField}
      <label>Received on<input type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></label>
      {taxField}
      <label className="wide">Notes<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="wide">{buttons}</div>
      <div className="wide"><SaveError result={fail} onDismiss={() => setFail(null)} /></div>
    </div>
  );
}
