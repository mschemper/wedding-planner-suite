// Quotes log for one venue (DESIGN-v3 §5, carried into Venue detail).
import { useMemo, useState } from "react";
import type { Op } from "../../api/types";
import { computeBudget, defaultOpts } from "../../engine/compute";
import type { Quote, Scenario } from "../../engine/types";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { Button, Chip, EmptyState, type ChipTone } from "../kit/kit";
import { money } from "../format";
import { ALL_IN, QuoteForm } from "./QuoteForm";
import "./quotes.css";

type VQuote = Quote & { version: number; updated_by?: string };

const toneOf = (s: Quote["status"]): ChipTone => (s === "accepted" ? "euc" : s === "received" ? "gold" : "plain");

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
        <Chip tone={toneOf(q.status)}>{q.status}</Chip>
        {q.includes_tax && <Chip>incl. tax</Chip>}
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
            <Button kind="quiet" onClick={() => setMode("edit")}>Edit</Button>
            <Button kind="quiet" onClick={() => setMode("del")}>Delete</Button>
          </>}
          {mode === "del" && <>
            <span className="q-meta">Delete this quote?</span>
            <Button kind="danger" disabled={busy} onClick={() => void del()}>Yes, delete</Button>
            <Button kind="quiet" onClick={() => setMode("view")}>Keep</Button>
          </>}
        </div>
      )}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </div>
  );
}

/** Quotes log for one venue: list + add. Offline: read-only, hidden when empty. */
export function QuotesLog({ sc }: { sc: Scenario }) {
  const { raw, offline } = useData();
  const [adding, setAdding] = useState(false);
  const all = (raw?.quotes ?? []) as VQuote[];
  const mine = useMemo(() => all.filter((q) => q.scenario_id === sc.id), [all, sc.id]);
  const unmatched = useMemo(
    () => new Set(computeBudget(sc, sc.def, defaultOpts(sc), { quotes: mine }).unmatchedQuotes?.map((q) => q.id)),
    [sc, mine],
  );
  if (offline && !mine.length) return <EmptyState>No quotes in the offline copy.</EmptyState>;
  return (
    <div className="q-venue-body">
      <p className="q-meta">A received or accepted quote replaces the model's amount for that line (accepted wins, then the latest). Tax lines recompute.</p>
      {mine.map((q) => <QuoteItem key={`${q.id}:${q.version}`} sc={sc} q={q} applied={!unmatched.has(q.id)} readOnly={offline} />)}
      {!mine.length && <EmptyState>No quotes yet.</EmptyState>}
      {!offline && (adding
        ? <QuoteForm scenario={sc} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
        : <Button onClick={() => setAdding(true)}>Add quote</Button>)}
    </div>
  );
}
