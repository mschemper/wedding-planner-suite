// Joinery preferred vendors (v17): pure helpers for Day → Vendors → "Joinery preferred list". No React, no I/O.
import { PREFERRED, type PreferredCategory, type PreferredVendor } from "../../data/preferredVendors";
import type { Op } from "../../api/types";
import type { Task, Vendor } from "../../plan/types";
import { templateKey } from "../../plan/template";

export const PREFERRED_TABS: { value: PreferredCategory; label: string }[] = [
  { value: "catering", label: "Catering" }, { value: "photo", label: "Photo/Video" }, { value: "planner", label: "Planner" },
  { value: "florals", label: "Floral" }, { value: "music", label: "DJ" },
];

const norm = (s: string) => s.toLowerCase().replace(/\band\b|&/g, "+").replace(/[^a-z0-9+]/g, "");

/** The vendor row already tracking this preferred vendor (same category, name match ignoring case/punctuation). */
export const trackedAs = (p: Pick<PreferredVendor, "name" | "category">, vendors: Vendor[]): Vendor | undefined =>
  vendors.find((v) => v.category === p.category && (norm(v.name) === norm(p.name) || norm(v.name).startsWith(norm(p.name))));

/** Planner offers day-of / month-of coordination (from the researched service text or tags). */
export const offersDayOf = (p: Pick<PreferredVendor, "service" | "style" | "notes">): boolean =>
  /day[- ]of|month[- ]of/i.test(`${p.service ?? ""} ${p.style.join(" ")} ${p.notes ?? ""}`);

/** One category, marked-on-paper first (planners: day-of first), then list order; `markedOnly` keeps only the paper-marked ones. */
export function preferredIn(cat: PreferredCategory, opts: { markedOnly?: boolean; query?: string } = {}, list = PREFERRED): PreferredVendor[] {
  const q = norm(opts.query ?? "");
  return list
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.category === cat && (!opts.markedOnly || p.marked) && (!q || norm(`${p.name} ${p.style.join(" ")} ${p.blurb ?? ""}`).includes(q)))
    .sort((a, b) => Number(!!b.p.marked) - Number(!!a.p.marked) || (cat === "planner" ? Number(offersDayOf(b.p)) - Number(offersDayOf(a.p)) : 0) || a.i - b.i)
    .map(({ p }) => p);
}

/** Create op: the preferred vendor becomes a vendor row with status "idea" (the shortlist). */
export function shortlistOp(p: PreferredVendor, venueId: number): Op {
  const notes = [p.blurb, p.price ? `Price (published): ${p.price}` : null, "From The Joinery preferred list"].filter(Boolean).join(" · ");
  return { table: "vendors", op: "create", row: { category: p.category, name: p.name, status: "idea", contact: p.website ?? null, notes, scenario_id: venueId } };
}

/** "3 of 21 shortlisted" per category. */
export const shortlistCount = (cat: PreferredCategory, vendors: Vendor[], list = PREFERRED) => {
  const all = list.filter((p) => p.category === cat);
  return { total: all.length, tracked: all.filter((p) => trackedAs(p, vendors)).length };
};

const KEY_TYPE: Record<string, PreferredCategory> = {
  caterer: "catering", "caterer-book": "catering", "menu-final": "catering",
  photo: "photo", "photo-book": "photo", "engagement-photos": "photo",
  planner: "planner", "planner-book": "planner",
  florist: "florals", "florist-book": "florals",
  music: "music", "music-book": "music",
};
const WORDS: [RegExp, PreferredCategory][] = [
  [/\bcater|\bmenu\b|tasting/i, "catering"], [/photo|video/i, "photo"], [/planner|coordinator/i, "planner"],
  [/\bflor|flower|bouquet/i, "florals"], [/\bdjs?\b|music|\bbands?\b/i, "music"],
];

/** v18: the Joinery preferred vendor type a task is about (checklist key first, then title words for vendor tasks), or null. */
export function taskVendorType(t: Pick<Task, "source" | "title" | "category">): PreferredCategory | null {
  const k = templateKey(t.source);
  if (k) return KEY_TYPE[k] ?? null;
  if (t.category !== "vendor") return null;
  return WORDS.find(([re]) => re.test(t.title))?.[1] ?? null;
}

const NOUN: Record<PreferredCategory, [string, string]> = {
  catering: ["caterer", "caterers"], photo: ["photographer", "photographers"], planner: ["planner", "planners"], florals: ["florist", "florists"], music: ["DJ", "DJs"],
};
/** "21 Joinery caterers · 2 shortlisted" */
export function preferredLine(cat: PreferredCategory, vendors: Vendor[], list = PREFERRED): string {
  const c = shortlistCount(cat, vendors, list);
  return `${c.total} Joinery ${NOUN[cat][c.total === 1 ? 0 : 1]}${c.tracked ? ` · ${c.tracked} shortlisted` : ""}`;
}
export const preferredNoun = (cat: PreferredCategory) => NOUN[cat][1];
