// Venue budget detail (v3 DetailView, carried into v4 Venues): breakdown, compare, options, quote actions. GuestPicker for custom counts.
import { useEffect, useMemo, useState } from "react";
import { computeBudget, type ComputeOptions, defaultOpts, diffByCategory, guestStops, matchOptions, snapGuests } from "../../engine/compute";
import type { Budget, Options, Scenario } from "../../engine/types";
import { money, signedMoney } from "../format";
import { QuoteLineAction } from "./QuoteLineAction";

export const CONTINGENCIES = [0, 0.05, 0.075, 0.1];
export const HOME_STOPS = guestStops(50, 250);

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const quotedCount = (b: Budget) => {
  let n = 0;
  for (const rows of b.byCat.values()) for (const r of rows) if (r.quoted) n++;
  return n;
};

/** Typing edits a draft; Enter or blur commits it, clamped. A controlled input that rejected every keystroke could not be typed into (v2 bug). */
export function GuestPicker({ stops, value, onChange, min, max }: { stops: number[]; value: number; onChange: (g: number) => void; min: number; max: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (Number.isFinite(n) && draft.trim() !== "") onChange(clamp(n, min, max));
    else setDraft(String(value));
  };
  return (
    <div className="picker">
      <div className="toggle-group" role="group" aria-label="Guest count">
        {stops.map((g) => (
          <button key={g} className={`toggle-btn ${g === value ? "active" : ""}`} aria-pressed={g === value} onClick={() => onChange(g)}>{g}</button>
        ))}
      </div>
      <label className="custom">
        or exactly
        <input type="number" inputMode="numeric" min={min} max={max} value={draft}
          onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
      </label>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function OptionToggles({ sc, opts, onChange }: { sc: Scenario; opts: Options; onChange: (o: Options) => void }) {
  return (
    <>
      {sc.options.map((o) => (
        <div key={o.key} style={{ marginTop: 14 }}>
          <div className="panel-label" id={`opt-${o.key}`}>{o.label}</div>
          <div className="toggle-group" role="group" aria-labelledby={`opt-${o.key}`}>
            {o.choices.map((c) => (
              <button key={c} className={`toggle-btn ${opts[o.key] === c ? "active teal" : ""}`} aria-pressed={opts[o.key] === c} onClick={() => onChange({ ...opts, [o.key]: c })}>{c}</button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function DetailView({ sc, scenarios, initialGuests, settings, onBack }: { sc: Scenario; scenarios: Scenario[]; initialGuests: number; settings: ComputeOptions; onBack: () => void }) {
  const [guests, setGuests] = useState(() => (initialGuests >= sc.min && initialGuests <= sc.max ? initialGuests : snapGuests(sc, initialGuests)));
  const [opts, setOpts] = useState<Options>(() => defaultOpts(sc));
  const [compareId, setCompareId] = useState(sc.id === 2 ? 1 : 2);
  useEffect(() => window.scrollTo(0, 0), []);

  const budget = useMemo(() => computeBudget(sc, guests, opts, settings), [sc, guests, opts, settings]);
  const cmpSc = scenarios.find((x) => x.id === compareId) ?? scenarios.find((x) => x.id !== sc.id) ?? sc;
  const cmpGuests = guests >= cmpSc.min && guests <= cmpSc.max ? guests : snapGuests(cmpSc, guests);
  const cmpOpts = useMemo(() => matchOptions(sc, opts, cmpSc), [sc, opts, cmpSc]);
  const cmpBudget = useMemo(() => computeBudget(cmpSc, cmpGuests, cmpOpts, settings), [cmpSc, cmpGuests, cmpOpts, settings]);
  const catDiff = useMemo(() => diffByCategory(budget, cmpBudget), [budget, cmpBudget]);

  const diff = budget.total - cmpBudget.total;
  const pct = cmpBudget.total ? (diff / cmpBudget.total) * 100 : 0;
  const isSelf = sc.id === cmpSc.id;

  return (
    <>
      <button className="back-btn" onClick={onBack}>← All scenarios</button>
      <article className="detail-card">
        <div className={`detail-header kind-${sc.benchmark ? "bench" : sc.baseline ? "base" : sc.kind}`}>
          <div className="detail-header-text">
            <h2>{sc.name}</h2>
            <p>{sc.location} · confidence {sc.confidence}%{budget.season ? ` · ${budget.season} season on ${fmtDate(settings.date ?? "")}` : ""}</p>
          </div>
        </div>
        <div className="detail-content">
          <p className="desc">{sc.desc}</p>
          {sc.flag && <div className="flag"><strong>Planner's note · </strong>{sc.flag}</div>}
          {sc.rangeNote && <div className="flag"><strong>Range · </strong>{sc.rangeNote}</div>}
          {sc.seasonSource && <div className="flag"><strong>Season source · </strong>{sc.seasonSource}</div>}
          {budget.warnings.map((w) => <div key={w} className="flag warn" role="status"><strong>Check · </strong>{w}</div>)}

          <div className="panel" style={{ marginTop: 18 }}>
            <div className="panel-label">Guest count</div>
            <GuestPicker stops={guestStops(sc.min, sc.max)} value={guests} onChange={setGuests} min={sc.min} max={sc.max} />
            <OptionToggles sc={sc} opts={opts} onChange={setOpts} />
          </div>

          <div className="layout">
            <div className="layout-table">
              <div className="total-banner">
                <div className="total-banner-label">Estimated total · {guests} guests · {money(budget.perGuest)}/guest</div>
                <div className="total-banner-amount">{money(budget.total)}</div>
                {!isSelf && (
                  <div className="total-banner-text">
                    <strong className={diff < 0 ? "good" : "bad"}>{diff < 0 ? "▼ " : "▲ "}{signedMoney(diff)}</strong> ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%) vs. {cmpSc.name} at {cmpGuests}{Object.keys(cmpOpts).length ? ` · ${Object.values(cmpOpts).join(", ")}` : ""}
                  </div>
                )}
              </div>

              <label className="cmp-label">Compare against
                <select value={compareId} onChange={(e) => setCompareId(Number(e.target.value))}>
                  {scenarios.map((s) => <option key={s.id} value={s.id}>{s.baseline ? "★ " : s.benchmark ? "◆ " : ""}{s.name}</option>)}
                </select>
              </label>

              <BudgetTable sc={sc} budget={budget} catDiff={catDiff} isSelf={isSelf} options={opts} guests={guests} />
            </div>

            <div className="layout-compare">
              <h3 className="section-title">Where the difference comes from</h3>
              {isSelf ? (
                <div className="compare-box">Pick another scenario to compare.</div>
              ) : (
                <div className={`compare-box ${diff < 0 ? "cheaper" : "expensive"}`}>
                  {catDiff.filter((c) => c.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((c) => (
                    <div key={c.cat} className="cmp-row">
                      <span>{c.cat}</span>
                      <span className={c.delta < 0 ? "good" : "bad"}>{signedMoney(c.delta)}</span>
                    </div>
                  ))}
                  <div className="cmp-row total"><span>Net</span><span className={diff < 0 ? "good" : "bad"}>{signedMoney(diff)}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

function BudgetTable({ sc, budget, catDiff, isSelf, options, guests }: { sc: Scenario; budget: Budget; catDiff: ReturnType<typeof diffByCategory>; isSelf: boolean; options: Options; guests: number }) {
  return (
    <div className="budget-table" role="table" aria-label="Budget breakdown">
      <div className="budget-header" role="row"><span role="columnheader">Line item</span><span className="amts"><span role="columnheader">Amount</span><span role="columnheader">Δ cat.</span></span></div>
      {[...budget.byCat.entries()].map(([cat, rows]) => {
        const sub = rows.reduce((s, r) => s + r.amount, 0);
        const d = catDiff.find((x) => x.cat === cat)?.delta ?? 0;
        return (
          <div key={cat} role="rowgroup">
            <div className="budget-cat-header" role="row">
              <span className="budget-cat-title" role="rowheader">{cat}</span>
              <span className="amts"><span role="cell">{money(sub)}</span><span role="cell" className={`delta ${d < 0 ? "good" : d > 0 ? "bad" : ""}`}>{isSelf || !d ? "" : signedMoney(d)}</span></span>
            </div>
            {rows.map((r, i) => (
              <div key={`${r.desc}-${i}`} className={`budget-row ${i % 2 ? "odd" : "even"}`} role="row">
                <span className="budget-row-desc" role="cell">{r.desc}{r.extrapolated && <span className="extrap" title="Extrapolated beyond source data points"> ≈</span>}</span>
                <span className="amts"><span role="cell">{money(r.amount)}</span><span /></span>
                {!r.desc.startsWith("Contingency (") && <span className="row-action"><QuoteLineAction scenario={sc} row={r} options={options} guests={guests} /></span>}
              </div>
            ))}
          </div>
        );
      })}
      <div className="budget-total" role="row"><span role="rowheader">Grand total</span><span role="cell">{money(budget.total)}</span></div>
    </div>
  );
}
