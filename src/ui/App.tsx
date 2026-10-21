import { useMemo, useState } from "react";
import { SCENARIOS, scenarioById } from "../data/scenarios";
import { computeBudget, defaultOpts, diffByCategory, guestStops, snapGuests } from "../engine/compute";
import type { Options, Scenario } from "../engine/types";
import { GUESTS, GUESTS_ARE_SAMPLE } from "../guests/load";
import { forecastAttendance } from "../guests/attendance";
import { money, MONTHS, signedMoney } from "./format";

export interface Settings {
  month: number;
  contingency: number;
}

const CONTINGENCIES = [0, 0.05, 0.075, 0.1];
const HOME_STOPS = guestStops(50, 250);

/** Scenario can honestly be priced at g: inside modelled range and venue capacity. */
const priceable = (s: Scenario, g: number) =>
  g >= s.min && g <= s.max && !(s.capacity?.hardMax && g > s.capacity.hardMax) && !(s.capacity?.practicalMin && g < s.capacity.practicalMin);

export function App() {
  const [selected, setSelected] = useState<number | null>(null);
  const [guests, setGuests] = useState(75);
  const [settings, setSettings] = useState<Settings>({ month: 4, contingency: 0 });

  // All hooks before any early return (v1 crashed here: useMemo after conditional return).
  const cheapestId = useMemo(() => {
    let best: number | null = null, bv = Infinity;
    for (const s of SCENARIOS) {
      if (s.benchmark || !priceable(s, guests)) continue;
      const b = computeBudget(s, guests, defaultOpts(s), settings);
      if (b.warnings.some((w) => w.includes("closed"))) continue;
      if (b.total < bv) { bv = b.total; best = s.id; }
    }
    return best;
  }, [guests, settings]);

  if (selected != null) {
    return <DetailView sc={scenarioById(selected)} initialGuests={guests} settings={settings} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="container">
      <Header />
      <div className="intro-card">
        Pick a guest count to compare every venue on equal footing, then tap a card for its full budget. <strong>◆ Benchmarks</strong> are reference points; <strong>★ Baseline</strong> is the working plan.
        Figures are Reconciled Master v2.0 (June 2026) estimates, ±10–15% vs. signed contracts.
      </div>

      <GuestListPanel onUse={setGuests} />

      <div className="panel">
        <div className="panel-head">
          <span className="panel-label">Compare all venues at</span>
          <span className="guest-count">{guests} guests</span>
        </div>
        <GuestPicker stops={HOME_STOPS} value={guests} onChange={setGuests} min={20} max={300} />
        <SettingsBar settings={settings} onChange={setSettings} />
      </div>

      <div className="grid">
        {SCENARIOS.map((s) => {
          const inRange = priceable(s, guests);
          const eff = inRange ? guests : snapGuests(s, guests);
          const b = computeBudget(s, eff, defaultOpts(s), settings);
          const closed = b.warnings.some((w) => w.includes("closed"));
          return (
            <button key={s.id} className={`card ${s.id === cheapestId ? "best-value" : ""} ${!inRange || closed ? "dim" : ""}`} onClick={() => setSelected(s.id)}>
              <div className={`card-band kind-${s.benchmark ? "bench" : s.baseline ? "base" : s.kind}`} />
              <div className="card-content">
                <div className="chips">
                  {s.baseline && <span className="chip teal">★ Baseline</span>}
                  {s.benchmark && <span className="chip mustard">◆ Benchmark</span>}
                  <span className="chip" title="Source confidence">{s.confidence}%</span>
                  {closed && <span className="chip burnt">Closed in {MONTHS[settings.month - 1]}</span>}
                </div>
                <div className="card-title">{s.name}</div>
                <div className="card-location">{s.location}</div>
                <div style={{ flex: 1 }} />
                {s.id === cheapestId && <span className="chip sage">✦ Best value at {guests}</span>}
                <div className="card-bottom">
                  <div className="card-guests">{inRange ? `${eff} guests` : `shown at ${eff} (range ${s.capacity?.practicalMin ?? s.min}–${Math.min(s.max, s.capacity?.hardMax ?? s.max)})`}</div>
                  <div className="card-price">{money(b.total)}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="footer">
        Reconciled Master v2.0 · Chicago, June 2026. Benchmarks 14–16 are interpolated from source totals at 75/125/200/250. Dimmed cards are outside their venue's range at this count or closed in the selected month.
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="header">
      <div className="header-icon" aria-hidden>🌸</div>
      <div>
        <h1>Mark &amp; Angela</h1>
        <p>Wedding Budget Studio</p>
      </div>
    </div>
  );
}

function GuestPicker({ stops, value, onChange, min, max }: { stops: number[]; value: number; onChange: (g: number) => void; min: number; max: number }) {
  return (
    <div className="picker">
      <div className="toggle-group">
        {stops.map((g) => (
          <button key={g} className={`toggle-btn ${g === value ? "active" : ""}`} onClick={() => onChange(g)}>{g}</button>
        ))}
      </div>
      <label className="custom">
        or exactly
        <input type="number" min={min} max={max} value={value} onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n));
        }} />
      </label>
    </div>
  );
}

function SettingsBar({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="settings">
      <label>Wedding month
        <select value={settings.month} onChange={(e) => onChange({ ...settings, month: Number(e.target.value) })}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m} 2027</option>)}
        </select>
      </label>
      <label>Contingency
        <select value={settings.contingency} onChange={(e) => onChange({ ...settings, contingency: Number(e.target.value) })}>
          {CONTINGENCIES.map((c) => <option key={c} value={c}>{c ? `${(c * 100).toFixed(1)}%` : "None"}</option>)}
        </select>
      </label>
    </div>
  );
}

function GuestListPanel({ onUse }: { onUse: (g: number) => void }) {
  const f = useMemo(() => forecastAttendance(GUESTS), []);
  return (
    <div className="panel guest-panel">
      <div className="panel-head">
        <span className="panel-label">From the guest list{GUESTS_ARE_SAMPLE && <span className="chip burnt" style={{ marginLeft: 8 }}>sample data</span>}</span>
      </div>
      <div className="stat-strip">
        <Stat label="Households" value={String(GUESTS.households.length)} />
        <Stat label="Invited" value={`${f.invited}`} sub={`${f.adults} adults · ${f.children} kids`} />
        <Stat label="Expected (local)" value={`~${f.expected}`} sub="§2.3 acceptance rates" />
      </div>
      <div className="row-gap">
        <button className="link-btn" onClick={() => onUse(f.expected)}>Price at expected ({f.expected})</button>
        <button className="link-btn" onClick={() => onUse(f.ceiling)}>Price at full acceptance ({f.ceiling})</button>
      </div>
      {GUESTS_ARE_SAMPLE && <p className="hint">Run <code>npm run import:guests</code> to load the real workbook (stays local; gitignored).</p>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function DetailView({ sc, initialGuests, settings, onBack }: { sc: Scenario; initialGuests: number; settings: Settings; onBack: () => void }) {
  const [guests, setGuests] = useState(() => (initialGuests >= sc.min && initialGuests <= sc.max ? initialGuests : snapGuests(sc, initialGuests)));
  const [opts, setOpts] = useState<Options>(() => defaultOpts(sc));
  const [compareId, setCompareId] = useState(sc.id === 2 ? 1 : 2);

  const budget = useMemo(() => computeBudget(sc, guests, opts, settings), [sc, guests, opts, settings]);
  const cmpSc = scenarioById(compareId);
  const cmpGuests = guests >= cmpSc.min && guests <= cmpSc.max ? guests : snapGuests(cmpSc, guests);
  const cmpBudget = useMemo(() => computeBudget(cmpSc, cmpGuests, defaultOpts(cmpSc), settings), [cmpSc, cmpGuests, settings]);
  const catDiff = useMemo(() => diffByCategory(budget, cmpBudget), [budget, cmpBudget]);

  const diff = budget.total - cmpBudget.total;
  const pct = cmpBudget.total ? (diff / cmpBudget.total) * 100 : 0;
  const isSelf = sc.id === cmpSc.id;

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← All scenarios</button>
      <div className="detail-card">
        <div className={`detail-header kind-${sc.benchmark ? "bench" : sc.baseline ? "base" : sc.kind}`}>
          <div className="detail-header-text">
            <h2>{sc.name}</h2>
            <p>{sc.location} · confidence {sc.confidence}%</p>
          </div>
        </div>
        <div className="detail-content">
          <p className="desc">{sc.desc}</p>
          {sc.flag && <div className="flag"><strong>Planner's note · </strong>{sc.flag}</div>}
          {sc.rangeNote && <div className="flag"><strong>Range · </strong>{sc.rangeNote}</div>}
          {budget.warnings.map((w) => <div key={w} className="flag warn"><strong>Check · </strong>{w}</div>)}

          <div className="panel" style={{ marginTop: 18 }}>
            <div className="panel-label">Guest count</div>
            <GuestPicker stops={guestStops(sc.min, sc.max)} value={guests} onChange={setGuests} min={10} max={400} />
            {sc.options.map((o) => (
              <div key={o.key} style={{ marginTop: 14 }}>
                <div className="panel-label">{o.label}</div>
                <div className="toggle-group">
                  {o.choices.map((c) => (
                    <button key={c} className={`toggle-btn ${opts[o.key] === c ? "active teal" : ""}`} onClick={() => setOpts({ ...opts, [o.key]: c })}>{c}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="layout">
            <div className="layout-table">
              <div className="total-banner">
                <div className="total-banner-label">Estimated total · {guests} guests · {money(budget.perGuest)}/guest</div>
                <div className="total-banner-amount">{money(budget.total)}</div>
                {!isSelf && (
                  <div className="total-banner-text">
                    <strong className={diff < 0 ? "good" : "bad"}>{diff < 0 ? "▼ " : "▲ "}{signedMoney(diff)}</strong> ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%) vs. {cmpSc.name} at {cmpGuests}
                  </div>
                )}
              </div>

              <label className="cmp-label">Compare against
                <select value={compareId} onChange={(e) => setCompareId(Number(e.target.value))}>
                  {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.baseline ? "★ " : s.benchmark ? "◆ " : ""}{s.name}</option>)}
                </select>
              </label>

              <div className="budget-table">
                <div className="budget-header"><span>Line item</span><span className="amts"><span>Amount</span><span>Δ cat.</span></span></div>
                {[...budget.byCat.entries()].map(([cat, rows]) => {
                  const sub = rows.reduce((s, r) => s + r.amount, 0);
                  const d = catDiff.find((x) => x.cat === cat)?.delta ?? 0;
                  return (
                    <div key={cat}>
                      <div className="budget-cat-header">
                        <span className="budget-cat-title">{cat}</span>
                        <span className="amts"><span>{money(sub)}</span><span className={`delta ${d < 0 ? "good" : d > 0 ? "bad" : ""}`}>{isSelf || !d ? "" : signedMoney(d)}</span></span>
                      </div>
                      {rows.map((r, i) => (
                        <div key={`${r.desc}-${i}`} className={`budget-row ${i % 2 ? "odd" : "even"}`}>
                          <span className="budget-row-desc">{r.desc}{r.extrapolated && <span className="extrap" title="Extrapolated beyond source data points"> ≈</span>}</span>
                          <span className="amts"><span>{money(r.amount)}</span><span /></span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="budget-total"><span>Grand total</span><span>{money(budget.total)}</span></div>
              </div>
            </div>

            <div className="layout-compare">
              <div className="section-title">Where the difference comes from</div>
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
      </div>
    </div>
  );
}
