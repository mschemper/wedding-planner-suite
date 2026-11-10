// Pure helpers for the Day tab "Our venue" section (DESIGN-v11).
import type { Op } from "../../api/types";
import type { MilestoneDraft } from "../../plan/day";
import { addDays } from "../../plan/tasks";
import { createTaskOp } from "../plan/model";

/** One save() worth of task creates for milestone drafts: source milestone:<key>, due, owner Both, tied to the venue. */
export function milestoneOps(drafts: MilestoneDraft[], venueId: number | null, today: string): Op[] {
  return drafts.map((d) =>
    createTaskOp({ title: d.title, detail: d.detail ?? "", due: d.due, owner: "Both", category: d.category, scenario_id: venueId }, d.source, today));
}

/** Memorial Day (last Monday of May) weekend: the Fri, Sat, Sun or Mon of it. Returns the holiday date or null. */
export function memorialWeekend(date: string): string | null {
  const [y] = date.split("-").map(Number);
  let d = `${y}-05-31`;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, -1);
  const off = Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000);
  return off >= 0 && off <= 3 ? d : null;
}

/** First `max` items and how many are hidden. */
export function capList<T>(items: T[], max: number, all: boolean): { shown: T[]; hidden: number } {
  if (all || items.length <= max) return { shown: items, hidden: 0 };
  return { shown: items.slice(0, max), hidden: items.length - max };
}

/** Label for the milestone button / done state. */
export const milestoneButton = (n: number) => (n === 0 ? "All milestones are in Plan" : `Add ${n} milestone${n === 1 ? "" : "s"} to Plan`);
