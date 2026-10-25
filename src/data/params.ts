import { KIDS_POLICIES, type KidsPolicy } from "../people/types";

// Personal-cost parameters, Reconciled Master v2.0 §2.5. Change here → every scenario reprices; golden must stay green or be re-sourced (HISTORY.md).
export interface Params {
  photography: number;
  /** +$800 at 200+ guests (Field Museum) */
  secondShooter: number;
  band: number;
  /** outside the city */
  bandTravel: number;
  /** flying four musicians (Puerto Rico) */
  bandFlyIn: number;
  dress: number;
  dressShipping: number;
  hairMakeup: number;
  beautyTravel: number;
  islandHairMakeup: number;
  diyFavorsPerGuest: number;
  purchasedFavorsPerGuest: number;
  welcomeBagPerGuest: number;
  cakeBase: number;
  cakePerGuest: number;
  /** base florals by guest count; venues adjust (−400 décor-rich, −300 lakefront/designed, +200 barn) */
  floralsBase: [number, number][];
}

export const DEFAULT_PARAMS: Params = {
  photography: 4500,
  secondShooter: 800,
  band: 2000,
  bandTravel: 300,
  bandFlyIn: 4000,
  dress: 2900,
  dressShipping: 300,
  hairMakeup: 850,
  beautyTravel: 100,
  islandHairMakeup: 1000,
  diyFavorsPerGuest: 3,
  purchasedFavorsPerGuest: 5,
  welcomeBagPerGuest: 18,
  cakeBase: 100,
  cakePerGuest: 4,
  floralsBase: [[50, 1350], [75, 1600], [100, 1850], [125, 2150]],
};

export type ParamKey = keyof Params;
export const PARAM_KEYS = Object.keys(DEFAULT_PARAMS) as ParamKey[];

/** Shared planning settings stored in the same D1 `params` table (DESIGN-v4 §1). Not prices: never reprice scenarios. */
export interface DateWindow {
  name: string;
  /** YYYY-MM-DD inclusive */
  from: string;
  to: string;
  /** reference date the budget uses for this window */
  ref: string;
}
export interface Settings {
  dateWindows: DateWindow[];
  /** a date a venue is holding for us (YYYY-MM-DD) or null */
  heldDate: string | null;
  kidsPolicy: KidsPolicy;
  /** raw branch (workbook FamilySide) → display name; missing keys use defaultBranchName() */
  branchNames: Record<string, string>;
}
export const DEFAULT_SETTINGS: Settings = {
  dateWindows: [
    { name: "Late spring", from: "2027-05-01", to: "2027-06-30", ref: "2027-06-12" },
    { name: "Early fall", from: "2027-09-01", to: "2027-10-31", ref: "2027-09-18" },
  ],
  heldDate: "2027-06-12",
  kidsPolicy: "ours",
  branchNames: {},
};

/** "Pat Example (Mark's father)" → "Mark's dad's side"; anything else unchanged. */
export function defaultBranchName(raw: string): string {
  const m = /\((Mark|Angela)'s (father|mother)\)/i.exec(raw);
  if (!m) return raw;
  return `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}'s ${m[2].toLowerCase() === "father" ? "dad" : "mom"}'s side`;
}
export const branchName = (s: Settings, raw: string | null | undefined) => (raw ? s.branchNames[raw] ?? defaultBranchName(raw) : "Other");
export type SettingKey = keyof Settings;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day as YYYY-MM-DD (rejects 2027-13-45, 2027-02-30). */
export const isDay = (s: unknown): s is string => typeof s === "string" && DAY_SHAPE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const DAY = { test: (s: string) => isDay(s) };

function parseSetting(key: SettingKey, v: unknown): { ok: true; value: unknown } | { ok: false; msg: string } {
  if (key === "kidsPolicy") return (KIDS_POLICIES as readonly unknown[]).includes(v) ? { ok: true, value: v } : { ok: false, msg: "kidsPolicy must be ours, family or all" };
  if (key === "branchNames") {
    const ok = !!v && typeof v === "object" && !Array.isArray(v) && Object.entries(v).every(([k, n]) => k && typeof n === "string" && n.trim() && n.length <= 60);
    return ok ? { ok: true, value: v } : { ok: false, msg: "branchNames maps a branch to a name (1–60 characters)" };
  }
  if (key === "heldDate") return v === null || (typeof v === "string" && DAY.test(v)) ? { ok: true, value: v } : { ok: false, msg: "heldDate must be YYYY-MM-DD or null" };
  const ok = Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every((w) =>
    w && typeof w === "object" && typeof w.name === "string" && w.name.trim() && [w.from, w.to, w.ref].every((d) => typeof d === "string" && DAY.test(d)) &&
    w.from <= w.to && w.ref >= w.from && w.ref <= w.to);
  return ok ? { ok: true, value: v } : { ok: false, msg: "dateWindows needs 1–4 {name, from, to, ref} with from ≤ ref ≤ to" };
}

export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(SETTING_KEYS as string[]).includes(r.key)) continue;
    const p = parseSetting(r.key as SettingKey, r.value);
    if (p.ok) (out as unknown as Record<string, unknown>)[r.key] = p.value;
  }
  return out;
}

/** Checks one stored value (D1 `params`): a price param or a setting. Returns the value, or an error message. */
export function parseParamValue(key: string, v: unknown): { ok: true; value: unknown } | { ok: false; msg: string } {
  if ((SETTING_KEYS as string[]).includes(key)) return parseSetting(key as SettingKey, v);
  if (!(PARAM_KEYS as string[]).includes(key)) return { ok: false, msg: `unknown param "${key}"` };
  if (key === "floralsBase") {
    const ok = Array.isArray(v) && v.length >= 2 &&
      v.every((p, i) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n) && n >= 0) && (i === 0 || p[0] > v[i - 1][0]));
    return ok ? { ok: true, value: v as [number, number][] } : { ok: false, msg: "floralsBase needs 2+ [guests, amount] pairs, guests ascending" };
  }
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? { ok: true, value: v } : { ok: false, msg: `${key} must be a number ≥ 0` };
}

/** Stored overrides on top of the doc values; invalid or unknown rows are ignored (the API rejects them on write). */
export function mergeParams(rows: { key: string; value: unknown }[], base: Params = DEFAULT_PARAMS): Params {
  const out: Params = { ...base };
  for (const r of rows) {
    if (!(PARAM_KEYS as string[]).includes(r.key)) continue;
    const p = parseParamValue(r.key, r.value);
    if (p.ok) (out as unknown as Record<string, unknown>)[r.key] = p.value;
  }
  return out;
}
