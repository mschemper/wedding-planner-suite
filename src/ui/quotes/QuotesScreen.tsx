// Quotes (per venue) and Prices (shared personal-cost parameters). DESIGN-v3 §5.
import { useMemo, useState } from "react";
import type { Op } from "../../api/types";
import { computeBudget, defaultOpts } from "../../engine/compute";
import type { Quote, Scenario } from "../../engine/types";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { money } from "../format";
import { PricesForm } from "./PricesForm";
import { ALL_IN, QuoteForm } from "./QuoteForm";
import "./quotes.css";

type VQuote = Quote & { version: number; updated_by?: string };

const chipOf = (s: Quote["status"]) => (s === "accepted" ? "teal" : s === "received" ? "mustard" : "");

function scopeText(q: Quote) {
  const e = Object.entries(q.options ?? {});
  return e.length ? e.map(([k, v]) => `${k}: ${v}`).join(", ") : "";
}

function QuoteItem({ sc, q, applied, readOnly }: { sc: Scenario; q: VQuote; applied: boolean; readOnly: boolean }) {
  const { save } = useData();
  const [mode, setMode] = useState<"view" | "edit" | "del">("view");
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  if (mode === "edit") return <div className="q-item"><QuoteForm scenario={sc} existing={q} onDone={() => setMode("view")} onCancel={() => setMode("view")} /></div>;
  async function del() {
    setBusy(true);
    const op: Op = { table: "quotes", op: "delete", id: q.id, version: q.version };
    const r = await save([op]);
    setBusy(false);
    if (!r.ok) setFail(r);
  }
  const scope = scopeText(q);
  return (
    <div className="q-item">
      <div className="q-item-head">
        <strong>{q.item_desc === ALL_IN ? "All-in total" : q.item_desc}</strong>
        <span className="q-amt">{money(q.amount)}{q.basis === "perGuest" ? " per guest" : ""}</span>
        <span className={`chip ${chipOf(q.status)}`}>{q.status}</span>
        {q.includes_tax && <span className="chip">incl. tax</span>}
      </div>
      <div className="q-meta">
        {[q.vendor, q.received_on && `received ${q.received_on}`, scope && `only ${scope}`, q.updated_by && `by ${q.updated_by}`].filter(Boolean).join(" · ")}
      </div>
      {q.notes && <div className="q-meta">{q.notes}</div>}
      {q.status !== "requested" && !applied && <div className="q-err">not applied at default date/options</div>}
      {q.status === "requested" && <div className="q-meta">Requested quotes do not change the budget until received.</div>}
      {!readOnly && (
        <div className="q-actions">
          {mode === "view" && <>
            <button className="link-btn" onClick={() => setMode("edit")}>Edit</button>
            <button className="link-btn" onClick={() => setMode("del")}>Delete</button>
          </>}
          {mode === "del" && <>
            <span className="q-meta">Delete this quote?</span>
            <button className="link-btn" disabled={busy} onClick={() => void del()}>Yes, delete</button>
            <button className="link-btn" onClick={() => setMode("view")}>Keep</button>
          </>}
        </div>
      )}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </div>
  );
}

function VenueQuotes({ sc, quotes, readOnly }: { sc: Scenario; quotes: VQuote[]; readOnly: boolean }) {
  const [adding, setAdding] = useState(false);
  const mine = quotes.filter((q) => q.scenario_id === sc.id);
  const unmatched = useMemo(
    () => new Set(computeBudget(sc, sc.def, defaultOpts(sc), { quotes: mine }).unmatchedQuotes?.map((q) => q.id)),
    [sc, mine],
  );
  if (readOnly && !mine.length) return null;
  return (
    <details className="q-venue">
      <summary><span>{sc.name}</span><span className="chip">{mine.length} quote{mine.length === 1 ? "" : "s"}</span></summary>
      <div className="q-venue-body">
        {mine.map((q) => <QuoteItem key={`${q.id}:${q.version}`} sc={sc} q={q} applied={!unmatched.has(q.id)} readOnly={readOnly} />)}
        {!mine.length && <p className="q-meta">No quotes yet.</p>}
        {!readOnly && (adding
          ? <QuoteForm scenario={sc} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
          : <button className="link-btn" onClick={() => setAdding(true)}>+ Add quote</button>)}
      </div>
    </details>
  );
}

export function QuotesScreen() {
  const { scenarios, raw, offline } = useData();
  const [tab, setTab] = useState<"quotes" | "prices">("quotes");
  const quotes = (raw?.quotes ?? []) as VQuote[];
  return (
    <section className="q-wrap">
      <div className="q-tabs" role="group" aria-label="Quotes and prices">
        <button className="q-tab" aria-pressed={tab === "quotes"} onClick={() => setTab("quotes")}>Quotes</button>
        <button className="q-tab" aria-pressed={tab === "prices"} onClick={() => setTab("prices")}>Prices</button>
      </div>
      {offline && <div className="flag">Read-only offline copy. Edit quotes and prices in the online planner.</div>}
      {tab === "quotes" ? (
        <div>
          <h2>Quotes</h2>
          <p className="q-meta">A received or accepted quote replaces the model's amount for that line (accepted wins, then the latest). Tax lines recompute.</p>
          {offline && !quotes.length && <p className="q-meta">No quotes in the offline copy.</p>}
          {scenarios.map((sc) => <VenueQuotes key={sc.id} sc={sc} quotes={quotes} readOnly={offline} />)}
        </div>
      ) : (
        <div className="panel">
          <h2>Prices</h2>
          {offline
            ? <PricesReadOnly />
            : <PricesForm />}
        </div>
      )}
    </section>
  );
}

function PricesReadOnly() {
  const { params } = useData();
  return (
    <ul className="q-meta">
      {Object.entries(params).map(([k, v]) => <li key={k}>{k}: {Array.isArray(v) ? v.map(([g, a]) => `${g}: ${money(a)}`).join(", ") : String(v)}</li>)}
    </ul>
  );
}
