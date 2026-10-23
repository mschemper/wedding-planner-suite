// Pure helpers for the Venues tab (DESIGN-v4 §2). No React, no I/O: unit-tested in tests/venues-ui.test.ts.
import { parseParamValue, type DateWindow } from "../../data/params";
import type { Op } from "../../api/types";
import { itemIssues, nextCustomId, type CustomItem, type CustomVenue } from "../../data/custom";
import type { Category } from "../../engine/types";
import type { Headcount, Tally } from "../../people/headcount";
import { addDays } from "../../plan/tasks";
import type { ResearchDraft } from "../../../worker/research";
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

/** "66 adults of 82 ✓ · 9 kids of 20 upstairs ✓" / "adults over by 4 (cap 82)"; cocktail cap appended when set. */
export function capacityText(v: VenueSummary): string {
  const c = v.capacity;
  if (!c) return v.scenario.capacity?.cocktail ? `No seated cap published · cocktail ${v.scenario.capacity.cocktail}` : "No seated cap published";
  const who = v.scenario.kidsRoom ? "adults" : "guests (adults + kids)";
  let t = c.spare >= 0 ? `${c.used} ${who} of ${c.cap} ✓` : `${v.scenario.kidsRoom ? "Adults" : "Guests"} over by ${-c.spare} (${c.used} vs cap ${c.cap})`;
  if (v.scenario.kidsRoom) {
    const kid = (n: number) => `${n} kid${n === 1 ? "" : "s"}`;
    t += c.kidsCap == null ? ` · ${kid(c.kids)} upstairs` : c.kidsSpare! >= 0 ? ` · ${kid(c.kids)} of ${c.kidsCap} upstairs ✓` : ` · kids over by ${-c.kidsSpare!} (${c.kids} vs ${c.kidsCap} upstairs)`;
  }
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

/** Quote form checks (REVIEW-v6 Q2): an applied quote needs a source; $0 needs a reason. Returns the first problem or "". */
export function quoteIssue(q: { amount: string; status: string; vendor: string; notes: string }): string {
  const n = Number(q.amount.replace(/[$,\s]/g, ""));
  if (!q.amount.trim() || !Number.isFinite(n) || n < 0) return "Amount must be a number of 0 or more.";
  if (q.status !== "requested" && !q.vendor.trim()) return "Who quoted this? Add the vendor (received and accepted quotes change the budget).";
  if (n === 0 && q.status !== "requested" && !q.notes.trim()) return "$0 removes this line from the budget. Say why in Notes (e.g. included in the venue package).";
  return "";
}

/** Short capacity line for tiles: "Adults 51/82 ✓ · kids 12/20 ✓" (guests 63/82 when there is no kids' room). */
export function capacityShort(v: VenueSummary): string {
  const c = v.capacity;
  if (!c) return "Capacity not set";
  const mark = (spare: number) => (spare >= 0 ? "✓" : "✕");
  let t = `${v.scenario.kidsRoom ? "Adults" : "Guests"} ${c.used}/${c.cap} ${mark(c.spare)}`;
  if (v.scenario.kidsRoom) t += c.kidsCap == null ? ` · kids ${c.kids}` : ` · kids ${c.kids}/${c.kidsCap} ${mark(c.kidsSpare!)}`;
  return t;
}

/** Adults and kids that make up `guests` at the chosen basis (proportional to the decided heads; parts add up). null = no split known. */
export function guestSplit(hc: Headcount, basis: string, guests: number): { adults: number; kids: number } | null {
  if (basis === "custom" || guests <= 0) return null;
  const tallies: Tally[] = basis === "considered" ? [hc.invited, hc.ifroom, hc.undecided] : [hc.invited];
  const adults = tallies.reduce((n, t) => n + t.adults, 0);
  const kids = tallies.reduce((n, t) => n + t.kids, 0);
  if (adults + kids <= 0) return null;
  const a = Math.round((guests * adults) / (adults + kids));
  return { adults: a, kids: guests - a };
}
export const splitText = (s: { adults: number; kids: number } | null) =>
  (s ? ` (${s.adults} adult${s.adults === 1 ? "" : "s"}, ${s.kids} kid${s.kids === 1 ? "" : "s"})` : "");

// ---- Add venue (v7) ----

export interface ItemDraft {
  cat: Category;
  desc: string;
  type: CustomItem["type"];
  /** text as typed: dollars (fixed), dollars per guest, or percent ("22" = 22 %) */
  value: string;
  taxable: boolean;
  source_url: string;
  note: string;
}
export interface VenueFormDraft {
  name: string; location: string; website: string; kind: "local" | "destination"; description: string;
  seated: string; kids: string; cocktail: string; confidence: string; summary: string;
  sources: string[]; researched_at: string | null; items: ItemDraft[];
}

/** "$1,200" -> 1200; "" or junk -> null. */
export function parseNum(s: string): number | null {
  const t = s.replace(/[$,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
/** 0.22 -> "22" (percent as people type it). */
export const percentText = (rate: number | null | undefined) => (rate == null ? "" : String(Math.round(rate * 10000) / 100));
/** "22" or "22%" -> 0.22 (stored as a fraction). */
export function percentFromText(s: string): number | null {
  const n = parseNum(s.replace(/%/g, ""));
  return n == null ? null : Math.round(n * 100) / 10000;
}

const intText = (n: number | null | undefined) => (n ? String(n) : "");
export const blankItem = (): ItemDraft => ({ cat: "Venue & site", desc: "", type: "fixed", value: "", taxable: false, source_url: "", note: "" });
export const blankDraft = (name = "", location = ""): VenueFormDraft => ({
  name, location, website: "", kind: "local", description: "", seated: "", kids: "", cocktail: "", confidence: "30", summary: "",
  sources: [], researched_at: null, items: [],
});

export function draftFromResearch(r: ResearchDraft): VenueFormDraft {
  return {
    name: r.name, location: r.location ?? "", website: r.website ?? "", kind: r.kind, description: r.description ?? "",
    seated: intText(r.capacity_seated), kids: intText(r.capacity_kids), cocktail: intText(r.capacity_cocktail),
    confidence: String(r.confidence), summary: r.summary, sources: r.sources, researched_at: r.researched_at,
    items: r.items.map((it) => ({
      cat: it.cat, desc: it.desc, type: it.type, taxable: !!it.taxable, source_url: it.source_url ?? "", note: it.note ?? "",
      value: it.type === "fixed" ? String(it.amount ?? "") : it.type === "perGuest" ? String(it.rate ?? "") : percentText(it.rate),
    })),
  };
}

export function itemFromDraft(d: ItemDraft): CustomItem {
  const n = d.type === "percent" ? percentFromText(d.value) : parseNum(d.value);
  return {
    cat: d.cat, desc: d.desc.trim(), type: d.type, taxable: d.taxable,
    amount: d.type === "fixed" ? n : null, rate: d.type === "fixed" ? null : n,
    source_url: safeUrl(d.source_url) ?? null, note: d.note.trim() || null,
  };
}

/** The row to store (scenario_id given by the caller). Website goes first in sources; the summary is kept as notes. */
export function venueFromDraft(d: VenueFormDraft, scenarioId: number): CustomVenue {
  const opt = (s: string) => { const n = parseNum(s); return n == null || n <= 0 ? null : Math.round(n); };
  const links = [safeUrl(d.website), ...d.sources.map(safeUrl)].filter((u): u is string => !!u);
  return {
    scenario_id: scenarioId, name: d.name.trim(), location: d.location.trim() || null, kind: d.kind, description: d.description.trim() || null,
    capacity_seated: opt(d.seated), capacity_kids: opt(d.kids), capacity_cocktail: opt(d.cocktail),
    confidence: Math.max(0, Math.min(100, Math.round(parseNum(d.confidence) ?? 0))), items: d.items.map(itemFromDraft),
    sources: [...new Set(links)], notes: d.summary.trim() || null, researched_at: d.researched_at,
  };
}

/** Problems that block "Add as potential venue" (empty = fine). */
export function draftIssues(d: VenueFormDraft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push("The venue needs a name.");
  for (const [label, v] of [["Adults seated", d.seated], ["Kids' room seats", d.kids], ["Cocktail", d.cocktail]] as const) {
    if (v.trim() && (parseNum(v) == null || parseNum(v)! < 0)) out.push(`${label} must be a number of 0 or more.`);
  }
  const c = parseNum(d.confidence);
  if (c == null || c < 0 || c > 100) out.push("Confidence must be between 0 and 100.");
  if (d.website.trim() && !safeUrl(d.website)) out.push("The website must start with http:// or https://.");
  return [...out, ...itemIssues(d.items.map(itemFromDraft))];
}

export function confidenceWords(n: number): string {
  if (n >= 80) return "firm: published prices";
  if (n >= 60) return "decent: some prices confirmed";
  if (n >= 40) return "rough: several guesses";
  return "a guess: ask the venue before relying on it";
}

export const NEW_VENUE_STEP = "Ask for pricing, F&B minimum and 2027 dates";

/** The three writes for an added venue, in order (venue row, shortlist row, follow-up task due in 7 days). */
export function addVenueOps(d: VenueFormDraft, existingIds: number[], today: string): Op[] {
  const id = nextCustomId(existingIds);
  const v = venueFromDraft(d, id);
  const detail = (safeUrl(d.website) ?? d.summary.trim()).slice(0, 160);
  return [
    { table: "custom_venues", op: "create", row: { ...v } },
    { table: "venues", op: "create", row: { scenario_id: id, active: true, status: "researching", next_step: NEW_VENUE_STEP } },
    { table: "tasks", op: "create", row: { title: `Contact ${v.name} for pricing, F&B minimum and 2027 dates`, detail: detail || null, due: addDays(today, 7), owner: "Both", category: "venue", source: "manual", scenario_id: id } },
  ];
}
