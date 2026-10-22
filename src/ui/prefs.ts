import type { Tab } from "./nav";

// Per-viewer conveniences only (DESIGN-v4 §2 "Prefs"). Storage can be missing or throw (private mode, file://): always fall back.
export type GuestBasis = "expected" | "ceiling" | "custom";
export type PeopleView = "decide" | "garden" | "friends" | "envelopes";

export interface Prefs {
  tab: Tab;
  /** what the venue budgets are priced at */
  guestBasis: GuestBasis;
  /** used when guestBasis = custom */
  guests: number;
  /** compare date (YYYY-MM-DD); null = the held date, else the first window's reference date */
  date: string | null;
  contingency: number;
  /** venue detail open on the Venues tab */
  selected: number | null;
  /** venue used for the capacity bar on People → Decide */
  capacityVenue: number;
  /** null = by screen width (garden ≥ 860px, decide below) */
  peopleView: PeopleView | null;
  theme: "auto" | "day" | "dusk";
}

const KEY = "wps.prefs.v2";
const OLD_KEY = "wps.prefs.v1";
export const DEFAULT_PREFS: Prefs = {
  tab: "today", guestBasis: "expected", guests: 75, date: null, contingency: 0, selected: null, capacityVenue: 17, peopleView: null, theme: "auto",
};

const TABS: Tab[] = ["today", "venues", "people", "plan"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null") as { tab?: string; guests?: number; contingency?: number } | null;
      if (!old) return DEFAULT_PREFS;
      const tab: Tab = old.tab === "guests" ? "people" : old.tab === "budget" || old.tab === "quotes" ? "venues" : "today";
      return { ...DEFAULT_PREFS, tab, contingency: Number.isFinite(old.contingency) ? Number(old.contingency) : 0 };
    }
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      tab: TABS.includes(p.tab as Tab) ? (p.tab as Tab) : DEFAULT_PREFS.tab,
      guestBasis: p.guestBasis === "ceiling" || p.guestBasis === "custom" ? p.guestBasis : "expected",
      guests: Number.isFinite(p.guests) ? Number(p.guests) : DEFAULT_PREFS.guests,
      date: typeof p.date === "string" && DAY.test(p.date) ? p.date : null,
      contingency: Number.isFinite(p.contingency) ? Number(p.contingency) : 0,
      selected: typeof p.selected === "number" ? p.selected : null,
      capacityVenue: typeof p.capacityVenue === "number" ? p.capacityVenue : DEFAULT_PREFS.capacityVenue,
      peopleView: ["decide", "garden", "friends", "envelopes"].includes(String(p.peopleView)) ? (p.peopleView as PeopleView) : null,
      theme: p.theme === "day" || p.theme === "dusk" ? p.theme : "auto",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}
