// Pure helpers for the Venues tab (DESIGN-v4 §2). No React, no I/O: unit-tested in tests/venues-ui.test.ts.
import { parseParamValue, type DateWindow } from "../../data/params";
import type { Op } from "../../api/types";
import type { FitScore } from "../../plan/fit";
import { NEXT_VERDICT, verdictOf } from "../../plan/fit";
import { fitId, type Fit, type Verdict, type VenueRow, type VenueStatus } from "../../plan/types";
import type { VenueSummary } from "../../plan/venueSummary";
import type { ChipTone } from "../kit/kit";

/** Chip tone per status: held = peony, booked = euc, quoted/toured = gold, the rest plain. */
export function statusTone(s: VenueStatus | undefined): ChipTone {
  if (s === "held") return "peony";
  if (s === "booked") return "euc";
  if (s === "quoted" || s === "toured") return "gold";
  return "plain";
}

const STATUS_ORDER: VenueStatus[] = ["booked", "held", "quoted", "toured", "tour booked", "researching", "passed"];
/** Lower = nearer the top (same order as summarizeAll). Unknown statuses sort last. */
export const statusRank = (s: VenueStatus | undefined) => {
  const i = STATUS_ORDER.indexOf(s ?? "researching");
  return i < 0 ? STATUS_ORDER.length : i;
};

export const statusLabel = (s: VenueStatus | undefined) => {
  const t = s ?? "researching";
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export type FitWrite =
  | { kind: "edit"; patches: { table: "fit"; id: string; row: Record<string, unknown> }[] }
  | { kind: "create"; ops: Op[] };

/** Tap on a matrix cell: update the existing fit row (Undo via edit) or create it. */
export function cycleFitWrite(fit: Fit[], scenarioId: number, musthaveId: string): { next: Verdict; write: FitWrite } {
  const cur = verdictOf(fit, scenarioId, musthaveId);
  const next = NEXT_VERDICT[cur?.verdict ?? "unknown"];
  if (cur) return { next, write: { kind: "edit", patches: [{ table: "fit", id: fitId(scenarioId, musthaveId), row: { verdict: next } }] } };
  return { next, write: { kind: "create", ops: [{ table: "fit", op: "create", row: { scenario_id: scenarioId, musthave_id: musthaveId, verdict: next } }] } };
}

/** Note change: same split. The verdict of a new row defaults to unknown. */
export function noteWrite(fit: Fit[], scenarioId: number, musthaveId: string, note: string): FitWrite {
  const text = note.trim() || null;
  if (verdictOf(fit, scenarioId, musthaveId)) return { kind: "edit", patches: [{ table: "fit", id: fitId(scenarioId, musthaveId), row: { note: text } }] };
  return { kind: "create", ops: [{ table: "fit", op: "create", row: { scenario_id: scenarioId, musthave_id: musthaveId, verdict: "unknown", note: text } }] };
}

/** "Fit 8 of 10 · 1 partly · 2 unknown" (yes count of all active must-haves). */
export function fitText(f: FitScore): string {
  const total = f.yes + f.partly + f.no + f.unknown;
  if (!total) return "No must-haves yet";
  let t = `Fit ${f.yes} of ${total}`;
  if (f.partly) t += ` · ${f.partly} partly`;
  if (f.no) t += ` · ${f.no} no`;
  if (f.unknown) t += ` · ${f.unknown} unknown`;
  return t;
}

/** Fit bar width, 0-100 (empty when nothing is answered). */
export const fitPct = (f: FitScore) => (f.score == null ? 0 : Math.round(f.score * 100));

/** "66 adults seated of 82 ✓ · kids upstairs" / "over by 4 (cap 82)"; cocktail cap appended when set. */
export function capacityText(v: VenueSummary): string {
  const c = v.capacity;
  if (!c) return v.scenario.capacity?.cocktail ? `No seated cap published · cocktail ${v.scenario.capacity.cocktail}` : "No seated cap published";
  const who = v.scenario.kidsRoom ? "adults" : "guests";
  let t = c.ok ? `${c.used} ${who} seated of ${c.cap} ✓` : `Over by ${-c.spare} (${c.used} ${who} vs cap ${c.cap})`;
  if (v.scenario.kidsRoom) t += " · kids upstairs";
  if (c.cocktail) t += ` · cocktail ${c.cocktail}`;
  return t;
}

/** Totals per window: "Late spring $41,800 · Early fall unavailable (reason)". `fmt` formats money. */
export function windowParts(v: VenueSummary, fmt: (n: number) => string): { name: string; text: string; bad: boolean }[] {
  return v.byWindow.map((w) => {
    if (w.unavailable) return { name: w.name, text: `unavailable: ${w.unavailable}`, bad: true };
    if (w.total == null) return { name: w.name, text: "awaiting rate sheet", bad: false };
    return { name: w.name, text: fmt(w.total), bad: false };
  });
}

/** Only http(s) links are rendered as sources. */
export const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null);
export const telHref = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");
export const mailHref = (e: string) => "mailto:" + e.trim();

export const EDIT_FIELDS = ["hold_date", "tour_date", "contact_name", "contact_email", "contact_phone", "next_step", "notes"] as const;
export type EditField = (typeof EDIT_FIELDS)[number];
export type VenueDraft = Record<EditField, string>;

export const draftOf = (r: VenueRow | undefined): VenueDraft =>
  Object.fromEntries(EDIT_FIELDS.map((k) => [k, (r?.[k] as string | null | undefined) ?? ""])) as VenueDraft;

/** Only changed fields; blanks become null. Empty object = nothing to save. */
export function venuePatch(row: VenueRow | undefined, d: VenueDraft): Record<string, string | null> {
  const before = draftOf(row);
  const out: Record<string, string | null> = {};
  for (const k of EDIT_FIELDS) {
    const v = d[k].trim();
    if (v !== before[k].trim()) out[k] = v === "" ? null : v;
  }
  return out;
}

/** Date window editor drafts -> validated value, or the parseParamValue message. */
export interface WindowDraft { name: string; from: string; to: string; ref: string }
export const windowsToDraft = (w: DateWindow[]): WindowDraft[] => w.map((x) => ({ ...x }));
export function parseWindows(d: WindowDraft[]): { ok: true; value: DateWindow[] } | { ok: false; msg: string } {
  const value = d.map((w) => ({ name: w.name.trim(), from: w.from, to: w.to, ref: w.ref }));
  const p = parseParamValue("dateWindows", value);
  return p.ok ? { ok: true, value } : { ok: false, msg: p.msg };
}
export function parseHeld(s: string): { ok: true; value: string | null } | { ok: false; msg: string } {
  const v = s.trim() === "" ? null : s.trim();
  const p = parseParamValue("heldDate", v);
  return p.ok ? { ok: true, value: v } : { ok: false, msg: p.msg };
}

/** Chip label for a window: "Late spring · Sat Jun 12". */
export function windowLabel(w: DateWindow, fmtDay: (d: string) => string): string {
  return `${w.name} · ${fmtDay(w.ref)}`;
}

/** Which compare-date chip is lit: "held", a window ref, or null (custom date). */
export function dateChoice(date: string, held: string | null, windows: DateWindow[]): string | null {
  if (held && date === held) return "held";
  return windows.find((w) => w.ref === date)?.ref ?? null;
}
