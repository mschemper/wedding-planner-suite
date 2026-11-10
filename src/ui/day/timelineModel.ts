// Pure model for the Day timeline sheet: draft, validation, diff, op builders (DESIGN-v11 Timeline).
import type { Op } from "../../api/types";
import { TIMELINE_TEMPLATE } from "../../plan/day";
import type { TimelineRow } from "../../plan/types";

export interface TimelineDraft { start: string; minutes: string; title: string; place: string; who: string; notes: string }

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_MINUTES = 720;

export const emptyDraft = (): TimelineDraft => ({ start: "12:00", minutes: "30", title: "", place: "", who: "", notes: "" });

export const draftOf = (r: TimelineRow): TimelineDraft => ({
  start: r.start, minutes: String(r.minutes), title: r.title, place: r.place ?? "", who: r.who ?? "", notes: r.notes ?? "",
});

/** Integer 0–720 from a draft string, else null. */
export function parseMinutes(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= MAX_MINUTES ? n : null;
}

/** First validation problem, or null. */
export function draftError(d: TimelineDraft): string | null {
  if (!d.title.trim()) return "Give the step a title.";
  if (!TIME_RE.test(d.start)) return "Start must be a time (HH:MM, 00:00–23:59).";
  if (parseMinutes(d.minutes) == null) return `Minutes must be a whole number from 0 to ${MAX_MINUTES}.`;
  return null;
}

const nul = (s: string) => (s.trim() === "" ? null : s.trim());

/** Full row fields from a valid draft. */
export function rowOf(d: TimelineDraft): Omit<TimelineRow, "id"> {
  return { start: d.start, minutes: parseMinutes(d.minutes) ?? 0, title: d.title.trim(), place: nul(d.place), who: nul(d.who), notes: nul(d.notes) };
}

/** Changed fields only (for edit()). */
export function timelineChanges(row: TimelineRow, d: TimelineDraft): Record<string, unknown> {
  const next = rowOf(d);
  const out: Record<string, unknown> = {};
  for (const k of ["start", "minutes", "title", "place", "who", "notes"] as const) {
    if ((row[k] ?? null) !== next[k]) out[k] = next[k];
  }
  return out;
}

export const createOp = (d: TimelineDraft): Op => ({ table: "timeline", op: "create", row: { ...rowOf(d) } });
export const deleteOp = (id: string, version: number): Op => ({ table: "timeline", op: "delete", id, version });

/** One create op per template row (single save). */
export const templateOps = (): Op[] => TIMELINE_TEMPLATE.map((r) => ({ table: "timeline", op: "create", row: { ...r } }));
