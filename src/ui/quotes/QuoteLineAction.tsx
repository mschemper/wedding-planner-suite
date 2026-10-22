// End-of-row cell in the Budget detail table: "quote" chip + variance, or "+ quote" to add one for this line.
import { useState } from "react";
import type { BudgetRow, Options, Scenario } from "../../engine/types";
import { useData } from "../data";
import { money, signedMoney } from "../format";
import { QuoteForm } from "./QuoteForm";
import "./quotes.css";

export interface QuoteLineActionProps {
  scenario: Scenario;
  row: BudgetRow;
  /** the option choices the detail view is showing (stored on a new quote) */
  options: Options;
  guests: number;
}

/** Store option choices only when the line depends on one; otherwise the quote applies under any option. */
function pickOptions(sc: Scenario, row: BudgetRow, options: Options): Options | null {
  const keys = new Set<string>();
  for (const it of sc.items) if (it.desc === row.desc) for (const k of Object.keys(it.appliesIf?.options ?? {})) keys.add(k);
  const out: Options = {};
  for (const k of keys) if (options[k] != null) out[k] = options[k];
  return Object.keys(out).length ? out : null;
}

export function QuoteLineAction({ scenario, row, options }: QuoteLineActionProps) {
  const { offline } = useData();
  const [open, setOpen] = useState(false);
  if (row.quoted) {
    const v = row.estimate != null ? row.amount - row.estimate : null;
    const title = v == null ? "Priced from a vendor quote" : `Vendor quote ${signedMoney(v)} versus the model estimate of ${money(row.estimate!)}`;
    return (
      <span title={title}>
        <span className="chip teal">quote</span>
        {v != null && v !== 0 && <span className="q-var"> {signedMoney(v)}</span>}
      </span>
    );
  }
  if (offline) return null;
  if (!open) return <button className="link-btn" onClick={() => setOpen(true)} aria-label={`Add quote for ${row.desc}`}>+ quote</button>;
  return (
    <QuoteForm key={JSON.stringify(options)} compact scenario={scenario} preset={{ item_desc: row.desc, options: pickOptions(scenario, row, options) }} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
  );
}
