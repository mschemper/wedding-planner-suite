// Shell (DESIGN-v4 §2, §6): garden header, four tabs (top pills; bottom bar on phones), prefs + nav contexts, Undo toast.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useData } from "./data";
import { FlagBand, Garland, LeafDivider } from "./garden/motifs";
import { UndoToast } from "./kit/kit";
import { AskButton } from "./ask/AskPanel";
import { NavContext, type Nav, type Tab } from "./nav";
import { PeopleScreen } from "./people/PeopleScreen";
import { PlanScreen } from "./plan/PlanScreen";
import { loadPrefs, savePrefs, type Prefs } from "./prefs";
import { TodayScreen } from "./today/TodayScreen";
import { PrefsContext } from "./usePrefs";
import { VenuesScreen } from "./venues/VenuesScreen";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "✿" },
  { id: "venues", label: "Venues", icon: "⌂" },
  { id: "people", label: "People", icon: "❦" },
  { id: "plan", label: "Plan", icon: "✓" },
];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const THEME_NEXT = { auto: "day", day: "dusk", dusk: "auto" } as const;
const THEME_LABEL = { auto: "Theme: automatic", day: "Theme: day", dusk: "Theme: dusk" } as const;

export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => savePrefs(prefs), [prefs]);
  const set = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const [focus, setFocus] = useState<Nav["focus"]>({});
  const data = useData();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "auto") delete root.dataset.theme; else root.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const nav = useMemo<Nav>(() => ({
    tab: prefs.tab,
    setTab: (tab) => { set({ tab }); window.scrollTo({ top: 0 }); },
    openVenue: (id) => { set({ tab: "venues", selected: id }); setFocus({ venue: id }); window.scrollTo({ top: 0 }); },
    openPerson: (id) => { set({ tab: "people" }); setFocus({ person: id }); },
    openTask: (id) => { set({ tab: "plan" }); setFocus({ task: id }); },
    priceAt: (g) => { set({ tab: "venues", guestBasis: "custom", guests: clamp(Math.round(g), 20, 300), selected: null }); window.scrollTo({ top: 0 }); },
    focus,
    clearFocus: () => setFocus({}),
  }), [prefs.tab, set, focus]);

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === prefs.tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    nav.setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const signIn = data.errorKind === "unauthorized";
  const prefsCtx = useMemo(() => ({ prefs, set }), [prefs, set]);

  return (
    <PrefsContext.Provider value={prefsCtx}>
      <NavContext.Provider value={nav}>
        <header className="g-top">
          <Garland />
          <button type="button" className="k-icon-btn g-theme" onClick={() => set({ theme: THEME_NEXT[prefs.theme] })}
            aria-label={`${THEME_LABEL[prefs.theme]}. Change theme.`} title={THEME_LABEL[prefs.theme]}>
            {prefs.theme === "dusk" ? "☾" : prefs.theme === "day" ? "☀" : "◐"}
          </button>
          <h1 className="g-title">Mark &amp; Angela</h1>
          <div className="g-sub">Chicago · Prairie Garden · 2027</div>
          <LeafDivider />
          <FlagBand />
          <nav className="g-tabs" role="tablist" aria-label="Sections" onKeyDown={onKey}>
            {TABS.map((t) => (
              <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} role="tab" id={`tab-${t.id}`} aria-selected={prefs.tab === t.id}
                aria-controls="tabpanel" tabIndex={prefs.tab === t.id ? 0 : -1} className="g-tab" onClick={() => nav.setTab(t.id)}>
                <span className="g-tab-icon" aria-hidden="true">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
        </header>
        <main className="container" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${prefs.tab}`}>
          {data.offline && <p className="status-line"><span className="k-chip k-chip-gold">Offline copy · read-only budget</span></p>}
          {data.status === "loading" && <p className="status-line" role="status">Loading your plan…</p>}
          {data.error && (data.status === "error" || data.status === "ready") && (
            <div className="flag warn" role="alert">
              <strong>{data.status === "ready" ? "Could not refresh · " : "Could not load · "}</strong>{data.error}
              <div><button className="k-btn k-btn-quiet" onClick={() => (signIn ? window.location.reload() : void data.reload())}>Reload</button></div>
            </div>
          )}
          {data.status === "ready" && (
            prefs.tab === "today" ? <TodayScreen /> : prefs.tab === "venues" ? <VenuesScreen /> : prefs.tab === "people" ? <PeopleScreen /> : <PlanScreen />
          )}
        </main>
        <UndoToast />
        <AskButton />
      </NavContext.Provider>
    </PrefsContext.Provider>
  );
}
