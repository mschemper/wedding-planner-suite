import type { AppliesIf, Budget, BudgetRow, Category, LineItem, Options, Quote, Scenario } from "./types";

export const STOP = 25;

/** Piecewise-linear interpolation; linear extrapolation from the end segments, floored at 0. */
export function interp(anchors: [number, number][], g: number): { v: number; extrapolated: boolean } {
  if (anchors.length === 0) throw new Error("bands item needs anchors");
  if (anchors.length === 1) return { v: anchors[0][1], extrapolated: g !== anchors[0][0] };
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const line = (a: [number, number], b: [number, number]) => a[1] + ((b[1] - a[1]) * (g - a[0])) / (b[0] - a[0]);
  if (g < first[0]) return { v: Math.max(0, line(first, anchors[1])), extrapolated: true };
  if (g > last[0]) return { v: Math.max(0, line(anchors[anchors.length - 2], last)), extrapolated: true };
  for (let i = 0; i < anchors.length - 1; i++) {
    if (g >= anchors[i][0] && g <= anchors[i + 1][0]) return { v: line(anchors[i], anchors[i + 1]), extrapolated: false };
  }
  return { v: last[1], extrapolated: false };
}

export function stepVal(breaks: { upTo: number; v: number }[], g: number): number {
  for (const b of breaks) if (g <= b.upTo) return b.v;
  return breaks[breaks.length - 1].v;
}

/** "YYYY-MM-DD" → season name, or undefined when the scenario has no calendar. */
export function seasonOf(sc: Scenario, date?: string): string | undefined {
  if (!sc.seasons?.length) return undefined;
  if (!date) return sc.docSeason;
  const md = date.slice(5, 10);
  for (const s of sc.seasons) {
    const inside = s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
    if (inside) return s.name;
  }
  return sc.docSeason;
}

export function applies(a: AppliesIf | undefined, g: number, opts: Options, season?: string): boolean {
  if (!a) return true;
  if (a.seasons && (!season || !a.seasons.includes(season))) return false;
  if (a.minGuests != null && g < a.minGuests) return false;
  if (a.maxGuests != null && g > a.maxGuests) return false;
  for (const [k, v] of Object.entries(a.options ?? {})) if (opts[k] !== v) return false;
  return true;
}

export const defaultOpts = (sc: Scenario): Options => Object.fromEntries(sc.options.map((o) => [o.key, o.def]));

/** Snap to scenario range on the STOP grid. */
export const snapGuests = (sc: Scenario, g: number): number => {
  const s = guestStops(sc.min, sc.max);
  return s.reduce((best, x) => (Math.abs(x - g) < Math.abs(best - g) ? x : best), s[0]);
};

export const guestStops = (min: number, max: number): number[] => {
  const out: number[] = [];
  for (let g = Math.ceil(min / STOP) * STOP; g <= max; g += STOP) out.push(g);
  return out.length ? out : [min];
};

function itemAmount(it: Exclude<LineItem, { type: "percent" }>, g: number): { v: number; extrapolated: boolean } {
  switch (it.type) {
    case "fixed": return { v: it.amount, extrapolated: false };
    case "perGuest": return { v: (it.base ?? 0) + it.rate * g, extrapolated: false };
    case "bands": return interp(it.anchors, g);
    case "step": return { v: stepVal(it.breaks, g), extrapolated: false };
    case "minSpend": return { v: Math.max(it.min, it.rate * g), extrapolated: false };
  }
}

export interface ComputeOptions {
  /** fraction, e.g. 0.075 adds a 7.5% contingency row */
  contingency?: number;
  /** wedding date "YYYY-MM-DD"; omitted → the season the source document priced */
  date?: string;
  /** all quotes; those for this scenario with status received/accepted override rows (DESIGN-v3 §4) */
  quotes?: Quote[];
}

/** Quotes that can price this scenario under these option choices: right scenario, received/accepted, options match. */
export function applicableQuotes(sc: Scenario, quotes: Quote[] | undefined, opts: Options = defaultOpts(sc)): Quote[] {
  return (quotes ?? []).filter(
    (q) =>
      q.scenario_id === sc.id &&
      (q.status === "received" || q.status === "accepted") &&
      Object.entries(q.options ?? {}).every(([k, v]) => opts[k] === v),
  );
}

/** accepted beats received; then the latest received_on. */
function better(a: Quote, b: Quote): Quote {
  if ((a.status === "accepted") !== (b.status === "accepted")) return a.status === "accepted" ? a : b;
  return (b.received_on ?? "") > (a.received_on ?? "") ? b : a;
}

const quoteAmount = (q: Quote, g: number) => Math.round(q.basis === "perGuest" ? q.amount * g : q.amount);

export function computeBudget(sc: Scenario, guests: number, opts: Options = defaultOpts(sc), co: ComputeOptions = {}): Budget {
  const g = Number.isFinite(guests) ? Math.max(0, Math.round(guests)) : 0;
  const season = seasonOf(sc, co.date);
  const pending: { it: LineItem; rate: number }[] = [];
  const rows: BudgetRow[] = [];
  let taxBase = 0;
  const order: (BudgetRow | { pendingIdx: number })[] = [];
  const live = applicableQuotes(sc, co.quotes, opts);
  const byDesc = new Map<string, Quote>();
  let allIn: Quote | undefined;
  for (const q of live) {
    if (q.item_desc === "*") allIn = allIn ? better(allIn, q) : q;
    else byDesc.set(q.item_desc, byDesc.has(q.item_desc) ? better(byDesc.get(q.item_desc)!, q) : q);
  }
  const matched = new Set<string>();
  // Every live quote for a matched line counts as matched (the older ones are superseded, not unmatched).
  const markMatched = (desc: string) => {
    for (const q of live) if (q.item_desc === desc) matched.add(q.id);
  };

  for (const it of sc.items) {
    if (!applies(it.appliesIf, g, opts, season)) continue;
    if (it.type === "percent") {
      order.push({ pendingIdx: pending.length });
      pending.push({ it, rate: it.rate });
      continue;
    }
    const { v, extrapolated } = itemAmount(it, g);
    const q = byDesc.get(it.desc);
    markMatched(it.desc);
    const amt = q ? quoteAmount(q, g) : v;
    if (it.taxable && !(q && q.includes_tax)) taxBase += amt;
    const row: BudgetRow = q
      ? { cat: it.cat, desc: it.desc, amount: amt, extrapolated: false, quoted: true, quoteId: q.id, estimate: Math.round(v) }
      : { cat: it.cat, desc: it.desc, amount: Math.round(v), extrapolated };
    order.push(row);
  }
  for (const o of order) {
    if ("pendingIdx" in o) {
      const p = pending[o.pendingIdx];
      const est = Math.round(p.rate * taxBase);
      const q = byDesc.get(p.it.desc);
      markMatched(p.it.desc);
      rows.push(q
        ? { cat: p.it.cat, desc: p.it.desc, amount: quoteAmount(q, g), extrapolated: false, quoted: true, quoteId: q.id, estimate: est }
        : { cat: p.it.cat, desc: p.it.desc, amount: est, extrapolated: false });
    } else rows.push(o);
  }
  if (allIn) {
    const estimate = rows.reduce((s, r) => s + (r.quoted ? (r.estimate ?? r.amount) : r.amount), 0);
    rows.length = 0;
    rows.push({ cat: "Venue & site", desc: "Quoted all-in", amount: quoteAmount(allIn, g), extrapolated: false, quoted: true, quoteId: allIn.id, estimate });
    for (const q of live) if (q.item_desc === "*") matched.add(q.id);
  }
  if (co.contingency && co.contingency > 0) {
    const sub = rows.reduce((s, r) => s + r.amount, 0);
    rows.push({ cat: "Planning & tips", desc: `Contingency (${(co.contingency * 100).toFixed(1)}%)`, amount: Math.round(sub * co.contingency), extrapolated: false });
  }

  const byCat = new Map<Category, BudgetRow[]>();
  for (const r of rows) byCat.set(r.cat, [...(byCat.get(r.cat) ?? []), r]);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const warnings: string[] = [];
  if (g < sc.min || g > sc.max) warnings.push(`${g} guests is outside the modelled range (${sc.min}–${sc.max}).`);
  if (sc.capacity?.practicalMin && g < sc.capacity.practicalMin) warnings.push(`Below the venue's practical minimum (~${sc.capacity.practicalMin}).`);
  if (sc.capacity?.hardMax && g > sc.capacity.hardMax) warnings.push(`Exceeds venue capacity (~${sc.capacity.hardMax}).`);
  if (rows.some((r) => r.extrapolated)) warnings.push("Some lines are extrapolated beyond the source data points.");
  if (sc.understated && g < sc.understated.belowGuests) warnings.push(`Likely understated by $${sc.understated.low.toLocaleString()}–${sc.understated.high.toLocaleString()} (minimum spend not enforced in source).`);
  let unavailable: string | undefined;
  if (season && sc.closedSeasons?.includes(season)) unavailable = "Closed on this date (seasonal venue).";
  const seasonMin = season ? sc.seasonMinGuests?.[season] : undefined;
  if (!unavailable && seasonMin && g < seasonMin) unavailable = `Needs ${seasonMin}+ guests in ${season} season.`;
  if (unavailable) warnings.unshift(unavailable);

  const unmatchedQuotes = (co.quotes ?? []).filter(
    (q) => q.scenario_id === sc.id && (q.status === "received" || q.status === "accepted") && !matched.has(q.id),
  );
  return { guests: g, rows, byCat, total, perGuest: g ? total / g : 0, season, unavailable, warnings, ...(unmatchedQuotes.length ? { unmatchedQuotes } : {}) };
}

/** Line-item diff keyed by category; used by the compare panel. */
/**
 * What `add` more guests cost (v9, per-household cost): total at guests + add minus total at guests, same options and date.
 * null when the scenario is unpriced or either count can't be hosted. `extrapolated` = a line ran past the source or a
 * count is outside the modelled range (≈). `flat` = more guests add nothing because a flat quote covers the total.
 */
export function addedCost(sc: Scenario, guests: number, add: number, opts: Options = defaultOpts(sc), co: ComputeOptions = {}): { amount: number; extrapolated: boolean; flat: boolean } | null {
  if (sc.priced === false || !sc.items.length) return null;
  const a = computeBudget(sc, guests, opts, co);
  const b = computeBudget(sc, guests + add, opts, co);
  if (a.unavailable || b.unavailable) return null;
  const amount = b.total - a.total;
  const outside = (n: number) => n < sc.min || n > sc.max;
  return {
    amount,
    extrapolated: b.rows.some((r) => r.extrapolated) || outside(a.guests) || outside(b.guests),
    flat: add > 0 && amount === 0 && b.rows.some((r) => r.quoted),
  };
}

export function diffByCategory(a: Budget, b: Budget): { cat: Category; a: number; b: number; delta: number }[] {
  const cats = new Set<Category>([...a.byCat.keys(), ...b.byCat.keys()]);
  const sum = (bu: Budget, c: Category) => (bu.byCat.get(c) ?? []).reduce((s, r) => s + r.amount, 0);
  return [...cats].map((cat) => ({ cat, a: sum(a, cat), b: sum(b, cat), delta: sum(a, cat) - sum(b, cat) }));
}

/** Carry option choices across scenarios by position (tier 1 ↔ tier 1), so compare is like-for-like. */
export function matchOptions(from: Scenario, opts: Options, to: Scenario): Options {
  const out = defaultOpts(to);
  for (const o of to.options) {
    const src = from.options.find((x) => x.key === o.key);
    if (!src) continue;
    const idx = src.choices.indexOf(opts[o.key]);
    if (idx >= 0 && idx < o.choices.length) out[o.key] = o.choices[idx];
  }
  return out;
}
