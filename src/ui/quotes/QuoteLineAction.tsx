// STUB (round 1): builder B replaces this. Rendered by the Budget detail table (src/ui/App.tsx) at the end of every row.
// Contract: shows a "quote" chip (+ variance vs row.estimate) when row.quoted, otherwise an "add quote" action for row.desc.
import type { BudgetRow, Options, Scenario } from "../../engine/types";

export interface QuoteLineActionProps {
  scenario: Scenario;
  row: BudgetRow;
  /** the option choices the detail view is showing (stored on a new quote) */
  options: Options;
  guests: number;
}

export function QuoteLineAction(_props: QuoteLineActionProps) {
  return null;
}
