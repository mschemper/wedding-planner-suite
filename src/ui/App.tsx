import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { GuestsScreen } from "./guests/GuestsScreen";
import { QuotesScreen } from "./quotes/QuotesScreen";
import { useData } from "./data";
import { NavContext, type Nav, type Tab } from "./nav";
import { loadPrefs, savePrefs, type Prefs } from "./prefs";
import { BudgetScreen } from "./shell/BudgetScreen";

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "budget", label: "Budget", short: "Budget" },
  { id: "guests", label: "Guests", short: "Guests" },
  { id: "quotes", label: "Quotes & prices", short: "Quotes" },
];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => savePrefs(prefs), [prefs]);
  const set = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const data = useData();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const nav = useMemo<Nav>(
    () => ({
      tab: prefs.tab,
      setTab: (tab) => set({ tab }),
      priceAt: (g) => set({ guests: clamp(Math.round(g), 20, 300), selected: null, tab: "budget" }),
    }),
    [prefs.tab, set],
  );

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === prefs.tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    set({ tab: TABS[next].id });
    tabRefs.current[TABS[next].id]?.focus();
  };

  const signIn = (data.error ?? "").toLowerCase().includes("sign");

  return (
    <NavContext.Provider value={nav}>
      <div className="shell-bar">
        <div className="shell-inner">
          <header className="header">
            <div className="header-icon" aria-hidden>🌸</div>
            <div>
              <h1>Mark &amp; Angela</h1>
              <p>Wedding Planner</p>
            </div>
          </header>
          <div className="tabs" role="tablist" aria-label="Sections" onKeyDown={onKey}>
            {TABS.map((t) => (
              <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} role="tab" id={`tab-${t.id}`} aria-selected={prefs.tab === t.id}
                aria-controls="tabpanel" tabIndex={prefs.tab === t.id ? 0 : -1} className={`tab ${prefs.tab === t.id ? "active" : ""}`} onClick={() => set({ tab: t.id })}>
                <span className="tab-long">{t.label}</span><span className="tab-short">{t.short}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <main className="container" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${prefs.tab}`}>
        {data.offline && (
          <p className="status-line">
            <span className="chip">Offline copy · read-only</span>
            {data.sample && <span className="chip burnt">sample data</span>}
          </p>
        )}
        {data.status === "loading" && <p className="status-line" role="status">Loading your plan…</p>}
        {data.status === "error" && (
          <div className="flag warn" role="alert">
            <strong>Could not load · </strong>{data.error}
            <div><button className="link-btn" onClick={() => (signIn ? window.location.reload() : void data.reload())}>Reload</button></div>
          </div>
        )}
        {data.status === "ready" && (
          prefs.tab === "budget" ? <BudgetScreen prefs={prefs} set={set} /> : prefs.tab === "guests" ? <GuestsScreen /> : <QuotesScreen />
        )}
      </main>
    </NavContext.Provider>
  );
}
