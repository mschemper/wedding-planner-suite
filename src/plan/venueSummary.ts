// One summary per venue for Today + Venues (DESIGN-v4 §4). Pure: engine + headcount + fit; no React.
import { computeBudget, defaultOpts, snapGuests } from "../engine/compute";
import type { Budget, Quote, Scenario } from "../engine/types";
import type { DateWindow } from "../data/params";
import { cutoff, type Cutoff, type Headcount } from "../people/headcount";
import { fitScore, type FitScore } from "./fit";
import type { Fit, MustHave, VenueRow } from "./types";

export interface VenueSummary {
  scenario: Scenario;
  row: VenueRow | undefined;
  active: boolean;
  priced: boolean;
  /** guests the budget was computed at (snapped into the scenario's modelled range when outside) */
  guests: number;
  snapped: boolean;
  /** budget at the compare date; undefined when not priced */
  budget?: Budget;
  /** totals at each date window's reference date (same guests) */
  byWindow: { name: string; ref: string; total?: number; unavailable?: string }[];
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

const inRange = (s: Scenario, g: number) => g >= s.min && g <= s.max;

export function summarize(s: Scenario, i: SummaryInput): VenueSummary {
  const row = i.venues.find((v) => v.scenario_id === s.id);
  const priced = s.priced !== false && s.items.length > 0;
  const guests = inRange(s, i.guests) ? Math.round(i.guests) : snapGuests(s, i.guests);
  const co = (date: string) => ({ date, contingency: i.contingency, quotes: i.quotes });
  const budget = priced ? computeBudget(s, guests, defaultOpts(s), co(i.date)) : undefined;
  const byWindow = i.windows.map((w) => {
    if (!priced) return { name: w.name, ref: w.ref };
    const b = computeBudget(s, guests, defaultOpts(s), co(w.ref));
    return { name: w.name, ref: w.ref, total: b.total, unavailable: b.unavailable };
  });
  const cap = s.capacity?.hardMax;
  const c = cap ? cutoff(i.headcount, cap, !!s.kidsRoom, s.capacity?.kids) : undefined;
  return {
    scenario: s, row, active: !!row?.active, priced, guests, snapped: guests !== Math.round(i.guests), budget, byWindow,
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
