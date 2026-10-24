import type { Tab } from "./nav";

// Per-viewer conveniences only (DESIGN-v4 §2 "Prefs"). Storage can be missing or throw (private mode, file://): always fall back.
/** considered = expected if every undecided / if-room household is invited too (default while deciding) */
export type GuestBasis = "considered" | "expected" | "ceiling" | "custom";
export type PeopleView = "decide" | "family";

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
  /** venue used for the room check on the People tab */
  capacityVenue: number;
  /** null = Decide */
  peopleView: PeopleView | null;
  theme: "auto" | "day" | "dusk";
}

const KEY = "wps.prefs.v2";
const OLD_KEY = "wps.prefs.v1";
export const DEFAULT_PREFS: Prefs = {
  tab: "today", guestBasis: "considered", guests: 75, date: null, contingency: 0, selected: null, capacityVenue: 17, peopleView: null, theme: "auto",
};

/** v4 values: garden → family, envelopes → decide. v9: the Friends view folded into Decide. */
function migrateView(v: unknown): PeopleView | null {
  if (v === "garden") return "family";
  if (v === "envelopes") return "decide";
  if (v === "friends") return "decide";
  return v === "decide" || v === "family" ? v : null;
}

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
      guestBasis: p.guestBasis === "ceiling" || p.guestBasis === "custom" || p.guestBasis === "expected" ? p.guestBasis : "considered",
      guests: Number.isFinite(p.guests) ? Number(p.guests) : DEFAULT_PREFS.guests,
      date: typeof p.date === "string" && DAY.test(p.date) ? p.date : null,
      contingency: Number.isFinite(p.contingency) ? Number(p.contingency) : 0,
      selected: typeof p.selected === "number" ? p.selected : null,
      capacityVenue: typeof p.capacityVenue === "number" ? p.capacityVenue : DEFAULT_PREFS.capacityVenue,
      peopleView: migrateView(p.peopleView),
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
