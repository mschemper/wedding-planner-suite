// Per-viewer conveniences only. Storage can be missing or throw (private mode, file://): always fall back to defaults.
export interface Prefs {
  guests: number;
  date: string;
  contingency: number;
  selected: number | null;
}

const KEY = "wps.prefs.v1";
export const DEFAULT_PREFS: Prefs = { guests: 75, date: "2027-04-24", contingency: 0, selected: null };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      guests: Number.isFinite(p.guests) ? Number(p.guests) : DEFAULT_PREFS.guests,
      date: typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : DEFAULT_PREFS.date,
      contingency: Number.isFinite(p.contingency) ? Number(p.contingency) : DEFAULT_PREFS.contingency,
      selected: typeof p.selected === "number" ? p.selected : null,
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
