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

/** Checks one stored value (D1 `params`). Returns the value, or an error message. */
export function parseParamValue(key: string, v: unknown): { ok: true; value: Params[ParamKey] } | { ok: false; msg: string } {
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
    const p = parseParamValue(r.key, r.value);
    if (p.ok) (out as unknown as Record<string, unknown>)[r.key] = p.value;
  }
  return out;
}
