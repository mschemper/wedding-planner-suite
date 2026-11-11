// Shared selector for Today, Budget, People, Plan: what guest count and date the venues are priced at, and every venue's summary.
import { useMemo } from "react";
import type { BudgetRow, Quote } from "../engine/types";
import { defaultOpts } from "../engine/compute";
import { weddingVenue } from "../plan/day";
import { summarize, summarizeAll, type VenueSummary } from "../plan/venueSummary";
import { useData } from "./data";
import { usePrefs } from "./usePrefs";
import { guestSplit, splitText } from "./venues/model";

export interface Compare {
  guests: number;
  /** label for the guest basis, e.g. "≈ 63 expected" */
  guestsLabel: string;
  date: string;
  active: VenueSummary[];
  archive: VenueSummary[];
}

export function useCompare(): Compare {
  const { scenarios, venues, musthaves, fit, quotes, headcount: hc, settings } = useData();
  const { prefs } = usePrefs();
  const expected = Math.round(hc.invited.expected);
  const considered = Math.round(hc.invited.expected + hc.ifroom.expected + hc.undecided.expected);
  const guests = prefs.guestBasis === "custom" ? prefs.guests : prefs.guestBasis === "ceiling" ? hc.invited.heads
    : prefs.guestBasis === "considered" ? considered : expected;
  // Nothing decided yet → fall back to the custom count so venues still price sensibly.
  const g = guests > 0 ? guests : prefs.guests;
  const date = prefs.date ?? settings.heldDate ?? settings.dateWindows[0].ref;
  const split = splitText(guestSplit(hc, prefs.guestBasis, g));
  const guestsLabel = guests <= 0 ? `${g} guests (nothing decided yet)`
    : prefs.guestBasis === "custom" ? `${g} guests` : prefs.guestBasis === "ceiling" ? `${g} if everyone invited comes${split}`
    : prefs.guestBasis === "considered" ? `≈ ${g} expected if the undecided are invited${split}` : `≈ ${g} expected${split}`;
  const s = useMemo(
    () => summarizeAll({ scenarios, venues, musthaves, fit, quotes, headcount: hc, guests: g, date, windows: settings.dateWindows, contingency: prefs.contingency }),
    [scenarios, venues, musthaves, fit, quotes, hc, g, date, settings.dateWindows, prefs.contingency],
  );
  // The wedding venue leads the shortlist; the rest keep their order.
  const wid = weddingVenue(venues, settings)?.scenario_id;
  const active = wid == null ? s.active : [...s.active.filter((v) => v.scenario.id === wid), ...s.active.filter((v) => v.scenario.id !== wid)];
  return { guests: g, guestsLabel, date, ...s, active };
}

export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-US", opts);

/** v11: the wedding venue priced at expected guests on the held date (Today + Day share this; DESIGN-v11). null = no venue holds the date. */
export interface WeddingSummary {
  summary: VenueSummary;
  date: string;
  /** count the total is priced at (expected, snapped into the venue's modelled range) */
  guests: number;
  guestsLabel: string;
  /** the Venue & site row that comes from a quote (e.g. the Joinery's $7,000 May 29 rate) */
  rentalQuote?: BudgetRow;
  /** quotes that matched no line on this date: show as a warning */
  unmatched: Quote[];
}

export function useWeddingSummary(): WeddingSummary | null {
  const { scenarios, venues, musthaves, fit, quotes, headcount: hc, settings } = useData();
  const { prefs } = usePrefs();
  return useMemo(() => {
    const row = weddingVenue(venues, settings);
    const s = row && scenarios.find((x) => x.id === row.scenario_id);
    if (!row || !s || !settings.heldDate) return null;
    const expected = Math.round(hc.invited.expected);
    const considered = Math.round(hc.invited.expected + hc.ifroom.expected + hc.undecided.expected);
    const guests = expected > 0 ? expected : considered > 0 ? considered : prefs.guests;
    const guestsLabel = expected > 0 ? `≈ ${guests} expected` : considered > 0 ? `≈ ${guests} if the undecided are invited` : `${guests} guests (nothing decided yet)`;
    const summary = summarize(s, { scenarios, venues, musthaves, fit, quotes, headcount: hc, guests, date: settings.heldDate, windows: settings.dateWindows, contingency: prefs.contingency });
    const b = summary.budget;
    // the total is priced at summary.guests (snapped into the venue's modelled range); say so, and report that count
    const label = summary.snapped ? `${guestsLabel} · priced at ${summary.guests} (venue's ${summary.guests > summary.asked ? "smallest" : "largest"} modelled count)` : guestsLabel;
    return {
      summary, date: settings.heldDate, guests: summary.guests, guestsLabel: label,
      rentalQuote: b?.rows.find((r) => r.cat === "Venue & site" && r.quoted),
      // quotes for another option (e.g. a different bar tier) are not "unmatched" here, just not chosen
      unmatched: (b?.unmatchedQuotes ?? []).filter((q) => Object.entries(q.options ?? {}).every(([k, v]) => defaultOpts(s)[k] === v)),
    };
  }, [scenarios, venues, musthaves, fit, quotes, hc, settings, prefs.guests, prefs.contingency]);
}
