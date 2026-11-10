// B21: Venues prices at the prefs basis/date; Today and Day price the wedding venue at expected guests on the held date.
import { fmtDate, type WeddingSummary } from "../compare";
import { money } from "../format";

/** Muted line for the wedding venue when the Venues basis differs from Today's; null otherwise. */
export function weddingNote(ws: WeddingSummary | null, scenarioId: number, guests: number, date: string): string | null {
  const total = ws?.summary.budget?.total;
  if (!ws || ws.summary.scenario.id !== scenarioId || total == null) return null;
  if (ws.guests === guests && ws.date === date) return null;
  return `Today and Day show ${money(total)} at ${ws.guestsLabel} on ${fmtDate(ws.date)}`;
}
