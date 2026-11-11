// Pure helpers for the Budget tab (DESIGN-v14 §3). No React, no I/O: unit-tested in tests/venues-ui.test.ts.
import type { Headcount, Tally } from "../../people/headcount";
import type { VenueSummary } from "../../plan/venueSummary";

/**
 * Totals per window over every Saturday in it (v10): "Late spring $36,644 (Sat, May 1) – $37,644", or one price when
 * every Saturday costs the same. Unavailable only when no Saturday in the window can be hosted. `fmt` formats money,
 * `day` formats a date.
 */
export function windowParts(v: VenueSummary, fmt: (n: number) => string, day: (d: string) => string = (d) => d): { name: string; text: string; bad: boolean }[] {
  return v.byWindow.map((w) => {
    if (!w.low || !w.high) {
      if (w.unavailable) return { name: w.name, text: `unavailable: ${w.unavailable}`, bad: true };
      return { name: w.name, text: w.total == null ? "awaiting rate sheet" : fmt(w.total), bad: false };
    }
    const some = w.someUnavailable ? " · some Saturdays unavailable" : "";
    if (w.low.total === w.high.total) return { name: w.name, text: fmt(w.low.total) + some, bad: false };
    return { name: w.name, text: `${fmt(w.low.total)} (${day(w.low.date)}) – ${fmt(w.high.total)}${some}`, bad: false };
  });
}

/** R2: why a total is priced at a different count than the one picked, or "" when it isn't. */
export function pricedAtText(v: Pick<VenueSummary, "snapped" | "guests" | "asked">): string {
  if (!v.snapped) return "";
  return v.guests > v.asked
    ? `priced at ${v.guests} guests, the venue's smallest modelled count (you picked ${v.asked})`
    : `priced at ${v.guests} guests, the venue's largest modelled count (you picked ${v.asked})`;
}

/** Quote form checks (REVIEW-v6 Q2): an applied quote needs a source; $0 needs a reason. Returns the first problem or "". */
export function quoteIssue(q: { amount: string; status: string; vendor: string; notes: string }): string {
  const n = Number(q.amount.replace(/[$,\s]/g, ""));
  if (!q.amount.trim() || !Number.isFinite(n) || n < 0) return "Amount must be a number of 0 or more.";
  if (q.status !== "requested" && !q.vendor.trim()) return "Who quoted this? Add the vendor (received and accepted quotes change the budget).";
  if (n === 0 && q.status !== "requested" && !q.notes.trim()) return "$0 removes this line from the budget. Say why in Notes (e.g. included in the venue package).";
  return "";
}

/** Adults and kids that make up `guests` at the chosen basis (proportional to the decided heads; parts add up). null = no split known. */
export function guestSplit(hc: Headcount, basis: string, guests: number): { adults: number; kids: number } | null {
  if (basis === "custom" || guests <= 0) return null;
  const tallies: Tally[] = basis === "considered" ? [hc.invited, hc.ifroom, hc.undecided] : [hc.invited];
  const adults = tallies.reduce((n, t) => n + t.adults, 0);
  const kids = tallies.reduce((n, t) => n + t.kids, 0);
  if (adults + kids <= 0) return null;
  const a = Math.round((guests * adults) / (adults + kids));
  return { adults: a, kids: guests - a };
}
export const splitText = (s: { adults: number; kids: number } | null) =>
  (s ? ` (${s.adults} adult${s.adults === 1 ? "" : "s"}, ${s.kids} kid${s.kids === 1 ? "" : "s"})` : "");
