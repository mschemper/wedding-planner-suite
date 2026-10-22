// Personal-cost parameters (src/data/params.ts). Drafts are text; validated with parseParamValue and sent in one save.
import { useEffect, useState } from "react";
import type { Op } from "../../api/types";
import { DEFAULT_PARAMS, PARAM_KEYS, parseParamValue, type ParamKey } from "../../data/params";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { money } from "../format";
import { Chip } from "../kit/kit";

const LABELS: Record<ParamKey, string> = {
  photography: "Photography ($)",
  secondShooter: "Second shooter, 200+ guests ($)",
  band: "Band ($)",
  bandTravel: "Band travel, outside the city ($)",
  bandFlyIn: "Band fly-in, Puerto Rico ($)",
  dress: "Dress + alterations ($)",
  dressShipping: "Dress shipping ($)",
  hairMakeup: "Hair & makeup ($)",
  beautyTravel: "Beauty travel ($)",
  islandHairMakeup: "Hair & makeup, island ($)",
  diyFavorsPerGuest: "DIY favors ($ per guest)",
  purchasedFavorsPerGuest: "Purchased favors ($ per guest)",
  welcomeBagPerGuest: "Welcome bag ($ per guest)",
  cakeBase: "Cake base ($)",
  cakePerGuest: "Cake ($ per guest)",
  floralsBase: "Florals base by guest count",
};

type Pair = [string, string];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[$,\s]/g, "")));
const hint = (k: ParamKey) =>
  k === "floralsBase" ? DEFAULT_PARAMS.floralsBase.map(([g, v]) => `${g}: ${money(v)}`).join(" · ") : String(DEFAULT_PARAMS[k]);

export function PricesForm() {
  const { params, paramRows, raw, save } = useData();
  const rowOf = (k: string) => paramRows.find((r) => r.key === k);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(PARAM_KEYS.filter((k) => k !== "floralsBase").map((k) => [k, String(params[k])])));
  const [pairs, setPairs] = useState<Pair[]>(() => params.floralsBase.map(([g, v]) => [String(g), String(v)]));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState("");

  async function run(ops: Op[], msg: string) {
    setBusy(true);
    setFail(null);
    setDone("");
    const r = await save(ops);
    setBusy(false);
    if (r.ok) {
      setConfirm(false);
      setDone(msg);
    } else setFail(r);
    return r.ok;
  }

  async function onSave() {
    if (busy) return;
    const e: Record<string, string> = {};
    const ops: Op[] = [];
    for (const k of PARAM_KEYS) {
      const v: unknown = k === "floralsBase" ? pairs.map(([g, a]) => [num(g), num(a)]) : num(draft[k]);
      const p = parseParamValue(k, v);
      if (!p.ok) { e[k] = p.msg; continue; }
      const row = rowOf(k);
      const isDoc = same(p.value, DEFAULT_PARAMS[k]);
      if (row && isDoc) ops.push({ table: "params", op: "delete", id: k, version: row.version });
      else if (row && !same(row.value, p.value)) ops.push({ table: "params", op: "update", id: k, version: row.version, row: { value: p.value } });
      else if (!row && !isDoc) ops.push({ table: "params", op: "create", row: { key: k, value: p.value } });
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    if (!ops.length) return setDone("Nothing to save.");
    await run(ops, `Saved ${ops.length} change${ops.length === 1 ? "" : "s"}. Every venue is repriced.`);
  }

  const reset = () => run(paramRows.filter((r) => (PARAM_KEYS as string[]).includes(r.key)).map((r) => ({ table: "params", op: "delete", id: r.key, version: r.version }) as Op), "Back to the doc values.");
  // re-seed the drafts whenever the stored rows change (after a save, reset or reload)
  const sig = raw ? JSON.stringify(paramRows.map((r) => [r.key, r.version])) : "";
  useEffect(() => {
    setDraft(Object.fromEntries(PARAM_KEYS.filter((k) => k !== "floralsBase").map((k) => [k, String(params[k])])));
    setPairs(params.floralsBase.map(([g, v]) => [String(g), String(v)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <div>
      <p className="q-meta">Personal costs from the Reconciled Master. Changes reprice every venue.</p>
      <div className="p-grid">
        {PARAM_KEYS.filter((k) => k !== "floralsBase").map((k) => (
          <div className="p-field" key={k}>
            <label>
              <span>{LABELS[k]} {rowOf(k) && <Chip tone="gold">changed</Chip>}</span>
              <input inputMode="decimal" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && void onSave()} />
            </label>
            <div className="p-hint">Doc value: {hint(k)}</div>
            {errs[k] && <div className="q-err" role="alert">{errs[k]}</div>}
          </div>
        ))}
      </div>
      <div className="p-field">
        <span className="vn-label">{LABELS.floralsBase} {rowOf("floralsBase") && <Chip tone="gold">changed</Chip>}</span>
        {pairs.map(([g, a], i) => (
          <div className="p-pairs" key={i}>
            <label>Guests<input inputMode="numeric" value={g} onChange={(e) => setPairs(pairs.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))} /></label>
            <label>Amount ($)<input inputMode="decimal" value={a} onChange={(e) => setPairs(pairs.map((p, j) => (j === i ? [p[0], e.target.value] : p)))} /></label>
            <button className="link-btn" aria-label={`Remove row ${i + 1}`} disabled={pairs.length <= 2} onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button className="link-btn" onClick={() => setPairs([...pairs, ["", ""]])}>+ Add row</button>
        <div className="p-hint">Doc value: {hint("floralsBase")}. Guest counts must ascend.</div>
        {errs.floralsBase && <div className="q-err" role="alert">{errs.floralsBase}</div>}
      </div>
      <div className="q-actions">
        <button className="q-primary" disabled={busy} onClick={() => void onSave()}>{busy ? "Saving…" : "Save prices"}</button>
        {paramRows.length > 0 && !confirm && <button className="link-btn" onClick={() => setConfirm(true)}>Reset to doc values</button>}
        {confirm && (
          <>
            <span className="q-meta">Remove all {paramRows.length} overrides?</span>
            <button className="link-btn" disabled={busy} onClick={() => void reset()}>Yes, reset</button>
            <button className="link-btn" onClick={() => setConfirm(false)}>Keep</button>
          </>
        )}
      </div>
      {done && <p className="q-meta" role="status">{done}</p>}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
      <p className="q-meta">Changes reprice every venue.</p>
    </div>
  );
}
