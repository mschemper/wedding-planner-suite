// Venues added in the app (v7, D1 `custom_venues`): row shape, validation, and the Scenario the engine prices. Pure.
import type { Category, LineItem, Scenario } from "../engine/types";

export const BUDGET_CATEGORIES: Category[] = [
  "Venue & site", "Food & beverage", "Rentals & production", "Photography & video", "Music & entertainment", "Flowers & décor",
  "Attire, beauty & rings", "Stationery & favors", "Transportation & lodging", "Ceremony & legal", "Planning & tips", "Pre-wedding events",
];

/** One researched line: fixed amount, per-guest rate, or a percent of the taxable lines (tax + service). */
export interface CustomItem {
  cat: Category;
  desc: string;
  type: "fixed" | "perGuest" | "percent";
  /** fixed: dollars */
  amount?: number | null;
  /** perGuest: dollars per guest; percent: fraction (0.22) */
  rate?: number | null;
  taxable?: boolean;
  source_url?: string | null;
  note?: string | null;
}

export interface CustomVenue {
  scenario_id: number;
  name: string;
  location?: string | null;
  kind: "local" | "destination";
  description?: string | null;
  capacity_seated?: number | null;
  capacity_kids?: number | null;
  capacity_cocktail?: number | null;
  /** 0–100: how much to trust the estimate */
  confidence: number;
  items: CustomItem[];
  sources: string[];
  notes?: string | null;
  /** YYYY-MM-DD the research ran; null = typed in by hand */
  researched_at?: string | null;
}

export const CUSTOM_ID_MIN = 1000;
export const nextCustomId = (taken: number[]) => Math.max(CUSTOM_ID_MIN - 1, ...taken.filter((n) => n >= CUSTOM_ID_MIN)) + 1;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Problems with a line list, empty when fine (also run by the Worker on research output). */
export function itemIssues(items: unknown): string[] {
  if (!Array.isArray(items)) return ["items must be a list"];
  const out: string[] = [];
  items.forEach((x, i) => {
    const it = x as Partial<CustomItem>;
    const n = `Line ${i + 1}`;
    if (!it || typeof it !== "object") { out.push(`${n} is not an object`); return; }
    if (!it.desc || typeof it.desc !== "string") out.push(`${n} needs a description`);
    if (!BUDGET_CATEGORIES.includes(it.cat as Category)) out.push(`${n} has an unknown category`);
    if (it.type === "fixed") { if (num(it.amount) == null || it.amount! < 0 || it.amount! > 1_000_000) out.push(`${n}: amount must be 0–1,000,000`); }
    else if (it.type === "perGuest") { if (num(it.rate) == null || it.rate! < 0 || it.rate! > 2_000) out.push(`${n}: per-guest rate must be 0–2,000`); }
    else if (it.type === "percent") { if (num(it.rate) == null || it.rate! < 0 || it.rate! > 0.6) out.push(`${n}: percent must be 0–0.6 (e.g. 0.22)`); }
    else out.push(`${n} has an unknown type`);
  });
  return out;
}

function toLine(it: CustomItem): LineItem {
  const base = { cat: it.cat, desc: it.desc, taxable: it.taxable ?? (it.type !== "percent" && it.cat === "Food & beverage") };
  if (it.type === "fixed") return { ...base, type: "fixed", amount: it.amount ?? 0 };
  if (it.type === "perGuest") return { ...base, type: "perGuest", rate: it.rate ?? 0 };
  return { ...base, type: "percent", rate: it.rate ?? 0 };
}

/** The Scenario the budget engine prices for an added venue. No line items → "awaiting rates" (priced: false). */
export function customScenario(v: CustomVenue): Scenario {
  const seated = v.capacity_seated ?? undefined;
  return {
    id: v.scenario_id, name: v.name, location: v.location ?? "", kind: v.kind, desc: v.description ?? "",
    tag: v.researched_at ? "Researched" : "Added", confidence: Math.max(0, Math.min(100, Math.round(v.confidence))),
    min: 20, max: Math.max(60, seated ?? v.capacity_cocktail ?? 250), def: 75,
    capacity: seated || v.capacity_cocktail || v.capacity_kids ? { hardMax: seated, cocktail: v.capacity_cocktail ?? undefined, kids: v.capacity_kids ?? undefined } : undefined,
    kidsRoom: !!v.capacity_kids,
    priced: v.items.length > 0,
    sources: v.sources.filter((s) => /^https?:\/\//i.test(s)),
    flag: v.researched_at
      ? `Estimated from web research on ${v.researched_at}: confirm every number with the venue.`
      : "Entered by hand: confirm with the venue.",
    options: [],
    items: v.items.map(toLine),
  };
}
