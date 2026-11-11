// Joinery preferred vendors (v17): pure helpers for Day → Vendors → "Joinery preferred list". No React, no I/O.
import { PREFERRED, type PreferredCategory, type PreferredVendor } from "../../data/preferredVendors";
import type { Op } from "../../api/types";
import type { Vendor } from "../../plan/types";

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
