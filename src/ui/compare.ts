// Shared selector for Today + Venues: what guest count and date the venues are priced at, and every venue's summary.
import { useMemo } from "react";
import { summarizeAll, type VenueSummary } from "../plan/venueSummary";
import { useData } from "./data";
import { usePrefs } from "./usePrefs";

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
  const guestsLabel = guests <= 0 ? `${g} guests (nothing decided yet)`
    : prefs.guestBasis === "custom" ? `${g} guests` : prefs.guestBasis === "ceiling" ? `${g} if everyone invited comes`
    : prefs.guestBasis === "considered" ? `≈ ${g} expected if the undecided are invited` : `≈ ${g} expected`;
  const s = useMemo(
    () => summarizeAll({ scenarios, venues, musthaves, fit, quotes, headcount: hc, guests: g, date, windows: settings.dateWindows, contingency: prefs.contingency }),
    [scenarios, venues, musthaves, fit, quotes, hc, g, date, settings.dateWindows, prefs.contingency],
  );
  return { guests: g, guestsLabel, date, ...s };
}

export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-US", opts);
