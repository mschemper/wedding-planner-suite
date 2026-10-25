// One summary per venue for Today + Venues (DESIGN-v4 §4). Pure: engine + headcount + fit; no React.
import { addedCost, computeBudget, defaultOpts, snapGuests } from "../engine/compute";
import type { Budget, Quote, Scenario } from "../engine/types";
import type { DateWindow } from "../data/params";
import { cutoff, type Cutoff, type Headcount } from "../people/headcount";
import { fitScore, type FitScore } from "./fit";
import { addDays } from "./tasks";
import type { Fit, MustHave, VenueRow } from "./types";

export interface VenueSummary {
  scenario: Scenario;
  row: VenueRow | undefined;
  active: boolean;
  priced: boolean;
  /** guests the budget was computed at (snapped into the scenario's modelled range when outside) */
  guests: number;
  snapped: boolean;
  /** the count that was asked for (before snapping) */
  asked: number;
  /** budget at the compare date; undefined when not priced */
  budget?: Budget;
  /** totals at each date window's reference date (same guests), plus the cheapest and dearest Saturday in the window (v10) */
  byWindow: WindowTotal[];
  /** main-room check at full acceptance; undefined when the scenario has no seated cap */
  capacity?: Cutoff & { cocktail?: number; ok: boolean };
  fit: FitScore;
}

export interface SummaryInput {
  scenarios: Scenario[];
  venues: VenueRow[];
  musthaves: MustHave[];
  fit: Fit[];
  quotes: Quote[];
  headcount: Headcount;
  /** guests to price at (UI picks: expected by default) */
  guests: number;
  date: string;
  windows: DateWindow[];
  contingency?: number;
}

export interface WindowTotal {
  name: string; ref: string; total?: number; unavailable?: string;
  low?: { total: number; date: string }; high?: { total: number; date: string };
  /** some Saturdays in the window can't be hosted (but not all) */
  someUnavailable?: boolean;
}

const inRange = (s: Scenario, g: number) => g >= s.min && g <= s.max;

/** Every Saturday from `from` to `to` (YYYY-MM-DD, inclusive). */
export function saturdays(from: string, to: string): string[] {
  const out: string[] = [];
  let d = from;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 6) d = addDays(d, 1);
  for (; d <= to; d = addDays(d, 7)) out.push(d);
  return out;
}

/** v9: what one household (`add` heads) adds at this venue, priced like its summary (date, quotes, contingency). */
export function householdCost(s: Scenario, i: Pick<SummaryInput, "quotes" | "date" | "contingency">, guests: number, add: number) {
  const g = inRange(s, guests) ? Math.round(guests) : snapGuests(s, guests);
  return addedCost(s, g, add, defaultOpts(s), { date: i.date, contingency: i.contingency, quotes: i.quotes });
}

export function summarize(s: Scenario, i: SummaryInput): VenueSummary {
  const row = i.venues.find((v) => v.scenario_id === s.id);
  const priced = s.priced !== false && s.items.length > 0;
  const guests = inRange(s, i.guests) ? Math.round(i.guests) : snapGuests(s, i.guests);
  const co = (date: string) => ({ date, contingency: i.contingency, quotes: i.quotes });
  const budget = priced ? computeBudget(s, guests, defaultOpts(s), co(i.date)) : undefined;
  const byWindow = i.windows.map((w): WindowTotal => {
    if (!priced) return { name: w.name, ref: w.ref };
    const b = computeBudget(s, guests, defaultOpts(s), co(w.ref));
    const sats = saturdays(w.from, w.to).map((d) => ({ date: d, b: computeBudget(s, guests, defaultOpts(s), co(d)) }));
    const ok = sats.filter((x) => !x.b.unavailable);
    if (!ok.length) return { name: w.name, ref: w.ref, total: b.total, unavailable: b.unavailable ?? sats[0]?.b.unavailable };
    const low = ok.reduce((m, x) => (x.b.total < m.b.total ? x : m));
    const high = ok.reduce((m, x) => (x.b.total > m.b.total ? x : m));
    return {
      name: w.name, ref: w.ref, total: b.total, unavailable: b.unavailable,
      low: { total: low.b.total, date: low.date }, high: { total: high.b.total, date: high.date },
      ...(ok.length < sats.length ? { someUnavailable: true } : {}),
    };
  });
  const cap = s.capacity?.hardMax;
  const c = cap ? cutoff(i.headcount, cap, !!s.kidsRoom, s.capacity?.kids) : undefined;
  return {
    scenario: s, row, active: !!row?.active, priced, guests, snapped: guests !== Math.round(i.guests), asked: Math.round(i.guests), budget, byWindow,
    capacity: c && { ...c, cocktail: s.capacity?.cocktail, ok: c.spare >= 0 && (c.kidsSpare == null || c.kidsSpare >= 0) },
    fit: fitScore(s.id, i.musthaves, i.fit),
  };
}

/** Active venues first (status order), then archive by name. */
export function summarizeAll(i: SummaryInput): { active: VenueSummary[]; archive: VenueSummary[] } {
  const all = i.scenarios.map((s) => summarize(s, i));
  const order = ["booked", "held", "quoted", "toured", "tour booked", "researching", "passed"];
  const rank = (v: VenueSummary) => order.indexOf(v.row?.status ?? "researching");
  return {
    active: all.filter((v) => v.active).sort((a, b) => rank(a) - rank(b) || a.scenario.name.localeCompare(b.scenario.name)),
    archive: all.filter((v) => !v.active).sort((a, b) => a.scenario.name.localeCompare(b.scenario.name)),
  };
}
