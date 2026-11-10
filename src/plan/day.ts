// v11 Day tab logic (pure): wedding venue + countdown, plan-back milestones, sunset, timeline, vendor summary.
import type { Settings } from "../data/params";
import type { Options, Scenario } from "../engine/types";
import { applies } from "../engine/compute";
import type { Headcount } from "../people/headcount";
import type { VenueHours } from "../data/venueFacts";
import { addDays } from "./tasks";
import type { Category, Task, TimelineRow, Vendor, VendorCategory, VenueRow } from "./types";

// ---------- wedding venue + countdown ----------

const RANK: Record<string, number> = { booked: 0, held: 1, quoted: 2 };

/** The venue holding the wedding date: active row whose hold_date = settings.heldDate (booked > held > quoted). */
export function weddingVenue(venues: VenueRow[], settings: Settings): VenueRow | null {
  const d = settings.heldDate;
  if (!d) return null;
  const rows = venues.filter((v) => v.active && v.hold_date === d && v.status in RANK);
  return rows.sort((a, b) => RANK[a.status] - RANK[b.status] || a.scenario_id - b.scenario_id)[0] ?? null;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export interface WeddingCountdown { days: number; weeks: number; big: string; past: boolean }
/** "201 days" to the wedding; "Today" on the day; past = after. */
export function weddingCountdown(today: string, wedding: string): WeddingCountdown {
  const days = dayDiff(today, wedding);
  const big = days === 0 ? "Today" : days < 0 ? "Married" : `${days} day${days === 1 ? "" : "s"}`;
  return { days, weeks: Math.floor(Math.max(days, 0) / 7), big, past: days < 0 };
}

// ---------- room + bar minimum ----------

export interface RoomCheck {
  /** expected main-room heads (adults + kids unless the venue has a kids' room) */
  expected: number;
  /** heads if everyone invited comes */
  invited: number;
  cap: number | null;
  /** cap − expected (≈) */
  spare: number | null;
  over: boolean;
  kidsInMain: boolean;
}

/** Main-room check against the venue's seated cap. Kids count in the main room unless the venue has a kids' room. */
export function roomCheck(hc: Headcount, sc: Scenario): RoomCheck {
  const kidsInMain = !sc.kidsRoom;
  const invited = hc.invited.adults + (kidsInMain ? hc.invited.kids : 0);
  const share = hc.invited.heads > 0 ? invited / hc.invited.heads : 1;
  const expected = Math.round(hc.invited.expected * share);
  const cap = sc.capacity?.hardMax ?? null;
  return { expected, invited, cap, spare: cap == null ? null : cap - expected, over: cap != null && invited > cap, kidsInMain };
}

export interface BarMinimum { min: number; rate: number; perHead: number; binding: boolean; desc: string }

/** The applying minSpend line (e.g. the Joinery's $4,000 bar minimum) at `guests`: effective $ per head and whether the minimum binds. */
export function barMinimum(sc: Scenario, guests: number, opts: Options, season?: string): BarMinimum | null {
  for (const it of sc.items) {
    if (it.type !== "minSpend" || !applies(it.appliesIf, guests, opts, season)) continue;
    const total = Math.max(it.min, it.rate * guests);
    return { min: it.min, rate: it.rate, perHead: guests > 0 ? Math.round((total / guests) * 100) / 100 : 0, binding: it.min > it.rate * guests, desc: it.desc };
  }
  return null;
}

// ---------- plan-back milestones ----------

export interface Milestone {
  key: string;
  title: string;
  /** days before the wedding */
  before: number;
  category: Category;
  detail?: string;
}

/** Planning milestones counted back from the wedding (tuned for ~6 months out). `source` on the task = "milestone:<key>". */
export const MILESTONES: Milestone[] = [
  { key: "venue-contract", title: "Sign the venue contract + pay the deposit", before: 200, category: "venue", detail: "Get the date, rate, hours and band permission in writing." },
  { key: "attire", title: "Order wedding attire", before: 190, category: "design", detail: "Dresses often need 4–6 months plus alterations." },
  { key: "caterer", title: "Book the caterer (tasting first)", before: 180, category: "vendor" },
  { key: "photo", title: "Book the photographer", before: 170, category: "vendor" },
  { key: "music", title: "Confirm the band (or book a DJ)", before: 165, category: "vendor" },
  { key: "website", title: "Wedding website + RSVP page live", before: 155, category: "guests" },
  { key: "save-dates", title: "Send save-the-dates", before: 150, category: "guests", detail: "Memorial Day weekend: out-of-town guests need notice." },
  { key: "lodging", title: "Hotel room block / Mill House for out-of-town guests", before: 150, category: "admin" },
  { key: "florals", title: "Book the florist", before: 140, category: "vendor" },
  { key: "officiant", title: "Book the officiant", before: 120, category: "vendor" },
  { key: "beauty", title: "Book hair & makeup", before: 120, category: "vendor" },
  { key: "bar", title: "Choose the bar package (or BYOB plan)", before: 120, category: "budget" },
  { key: "invites-order", title: "Order invitations", before: 100, category: "design" },
  { key: "invites-mail", title: "Mail invitations", before: 70, category: "guests" },
  { key: "rsvp", title: "RSVP deadline", before: 35, category: "guests" },
  { key: "license", title: "Get the marriage license (Cook County)", before: 30, category: "admin", detail: "Valid 60 days; takes effect the day after it is issued." },
  { key: "final-count", title: "Final headcount to the caterer + venue", before: 14, category: "guests" },
  { key: "timeline-out", title: "Send the day-of timeline to vendors", before: 14, category: "vendor" },
  { key: "seating", title: "Finish the seating plan", before: 10, category: "guests" },
  { key: "final-pay", title: "Final vendor payments", before: 10, category: "budget" },
  { key: "confirm", title: "Confirm vendor arrival times", before: 7, category: "vendor" },
];

export const milestoneSource = (key: string) => `milestone:${key}`;

export interface MilestoneDraft {
  key: string;
  title: string;
  due: string;
  /** the ideal date had already passed: due moved to today */
  late: boolean;
  category: Category;
  detail?: string;
  source: string;
}

/** Milestones not yet in `tasks` (matched by source), due = wedding − before, never before today. Sorted by due. */
export function milestoneDrafts(wedding: string, today: string, tasks: Pick<Task, "source">[]): MilestoneDraft[] {
  const have = new Set(tasks.map((t) => t.source).filter(Boolean));
  return MILESTONES.filter((m) => !have.has(milestoneSource(m.key))).map((m) => {
    const ideal = addDays(wedding, -m.before);
    const late = ideal < today;
    return { key: m.key, title: m.title, due: late ? today : ideal, late, category: m.category, detail: m.detail, source: milestoneSource(m.key) };
  }).sort((a, b) => a.due.localeCompare(b.due) || a.key.localeCompare(b.key));
}

// ---------- sunset ----------

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Sunset as a UTC Date (NOAA almanac algorithm, ±2 min). null if the sun does not set. */
export function sunsetUtc(day: string, lat: number, lon: number): Date | null {
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const lngHour = lon / 15;
  const t = n + (18 - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = mod(M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634, 360);
  let RA = mod(deg(Math.atan(0.91764 * Math.tan(rad(L)))), 360);
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * Math.sin(rad(L));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH < -1 || cosH > 1) return null;
  const H = deg(Math.acos(cosH)) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  let ut = mod(T - lngHour, 24);
  // keep the local solar hour (ut + lngHour) inside the asked day: west of Greenwich an evening sunset is on the next UTC day
  if (ut + lngHour < 0) ut += 24;
  else if (ut + lngHour >= 24) ut -= 24;
  return new Date(Date.UTC(y, m - 1, d) + Math.round(ut * 3_600_000));
}

/** The Joinery, Logan Square. */
export const CHICAGO = { lat: 41.918, lon: -87.705 };

/** Local sunset "HH:MM" (America/Chicago) for a day. */
export function sunsetLocal(day: string, at = CHICAGO): string | null {
  const u = sunsetUtc(day, at.lat, at.lon);
  if (!u) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hour12: false }).format(u);
}

// ---------- timeline ----------

/** Minutes from the day's start; 00:00–04:59 count as after midnight (+24 h). */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h < 5 ? h + 24 : h) * 60 + m;
}
/** "HH:MM" from minutes (wraps past midnight). */
export function fromMin(min: number): string {
  const x = mod(min, 1440);
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}
/** "5:30 PM" display. */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const sortTimeline = <T extends Pick<TimelineRow, "start" | "minutes" | "id">>(rows: T[]): T[] =>
  [...rows].sort((a, b) => toMin(a.start) - toMin(b.start) || b.minutes - a.minutes || a.id.localeCompare(b.id));

export const endOf = (r: Pick<TimelineRow, "start" | "minutes">) => fromMin(toMin(r.start) + r.minutes);

export interface TimelineIssue { id: string; msg: string }
const AWAY = /\b(home|hotel|church|away|off[- ]site|getting ready|hideout|mill house)\b/i;

/** Steps at the venue (place empty or not marked away) that start before opening or end after close + breakdown. */
export function timelineIssues(rows: TimelineRow[], hours: VenueHours): TimelineIssue[] {
  const open = toMin(hours.open);
  const close = hours.close === "24:00" ? 24 * 60 : toMin(hours.close);
  const out: TimelineIssue[] = [];
  for (const r of rows) {
    if (r.place && AWAY.test(r.place)) continue;
    const s = toMin(r.start);
    const e = s + r.minutes;
    if (s < open) out.push({ id: r.id, msg: `starts before the venue opens (${clock(hours.open)})` });
    else if (e > close + hours.cleanupMin) out.push({ id: r.id, msg: `runs past the venue's breakdown window (${clock(fromMin(close + hours.cleanupMin))})` });
  }
  return out;
}

/** Index of the first step that starts after sunset (marker goes before it). Expects `sortTimeline` output. */
export function sunsetIndex(rows: Pick<TimelineRow, "start" | "minutes">[], sunset: string): number {
  const s = toMin(sunset);
  const i = rows.findIndex((r) => toMin(r.start) > s);
  return i < 0 ? rows.length : i;
}

/** Starter run of show for the Joinery (2 PM – midnight, 5-hour bar). Rows without ids → create ops. */
export const TIMELINE_TEMPLATE: Omit<TimelineRow, "id">[] = [
  { start: "11:00", minutes: 180, title: "Hair & makeup", place: "Getting ready (Hideout apartment)", who: null, notes: null },
  { start: "14:00", minutes: 120, title: "Vendor load-in + setup", place: "The Joinery", who: "Caterer, florist, band", notes: "Rental starts 2 PM" },
  { start: "16:00", minutes: 45, title: "Couple + family photos", place: "Patio", who: "Photographer", notes: null },
  { start: "16:45", minutes: 15, title: "Guests arrive", place: "The Joinery", who: null, notes: null },
  { start: "17:00", minutes: 30, title: "Ceremony", place: "Patio or main space", who: "Officiant", notes: null },
  { start: "17:30", minutes: 60, title: "Cocktail hour (bar opens)", place: "Cocktail area", who: "Bar", notes: "5-hour bar package starts" },
  { start: "18:30", minutes: 210, title: "Kids' party upstairs", place: "Upstairs lounge", who: "Sitters", notes: "Confirm with the venue" },
  { start: "18:30", minutes: 15, title: "Grand entrance", place: "Main space", who: null, notes: null },
  { start: "18:45", minutes: 75, title: "Dinner", place: "Main space", who: "Caterer", notes: null },
  { start: "20:00", minutes: 15, title: "Toasts", place: "Main space", who: null, notes: null },
  { start: "20:15", minutes: 15, title: "Sunset photos", place: "Patio", who: "Photographer", notes: null },
  { start: "20:30", minutes: 10, title: "First dance", place: "Main space", who: "Band", notes: null },
  { start: "20:40", minutes: 185, title: "Dancing", place: "Main space", who: "Joel Paterson and Friends", notes: null },
  { start: "22:00", minutes: 30, title: "Late-night food", place: "Main space", who: "Caterer", notes: null },
  { start: "22:30", minutes: 0, title: "Bar closes (5-hour package)", place: "Cocktail area", who: "Bar", notes: "Extend: $5–12 pp per extra hour" },
  { start: "23:45", minutes: 15, title: "Last song + send-off", place: "The Joinery", who: null, notes: null },
  { start: "00:00", minutes: 90, title: "Vendor breakdown", place: "The Joinery", who: "All vendors", notes: "1.5 h allowed after midnight" },
];

// ---------- vendors ----------

/** Categories the Day tab lists by default, in planning order. */
export const CORE_VENDORS: VendorCategory[] = ["catering", "bar", "photo", "music", "florals", "cake", "beauty", "officiant", "planner", "stationery"];

const STATUS_RANK: Record<string, number> = { booked: 0, quoted: 1, contacted: 2, idea: 3, passed: 4 };

export interface CategoryStatus { category: VendorCategory; best: Vendor | null; count: number }
export interface Payment { vendor: Vendor; kind: "deposit" | "balance"; due: string; amount: number | null; overdue: boolean }
export interface VendorSummary {
  byCategory: CategoryStatus[];
  /** core categories with a booked vendor */
  booked: number;
  coreTotal: number;
  /** sum of booked amounts */
  committed: number;
  /** unpaid deposits + balances of booked/quoted vendors with a due date, soonest first */
  payments: Payment[];
  /** first unpaid payment (overdue ones come first by date) */
  next: Payment | null;
  overdue: number;
}

export function vendorSummary(vendors: Vendor[], today: string): VendorSummary {
  const cats = [...CORE_VENDORS, ...new Set(vendors.map((v) => v.category).filter((c) => !CORE_VENDORS.includes(c)))];
  const byCategory = cats.map((category) => {
    const rows = vendors.filter((v) => v.category === category);
    const best = [...rows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.id.localeCompare(b.id))[0] ?? null;
    return { category, best, count: rows.length };
  });
  const booked = byCategory.filter((c) => CORE_VENDORS.includes(c.category) && c.best?.status === "booked").length;
  const committed = vendors.filter((v) => v.status === "booked").reduce((s, v) => s + (v.amount ?? 0), 0);
  const payments: Payment[] = [];
  for (const v of vendors) {
    if (v.status !== "booked" && v.status !== "quoted") continue;
    if (v.deposit_due && !v.deposit_paid) payments.push({ vendor: v, kind: "deposit", due: v.deposit_due, amount: v.deposit ?? null, overdue: v.deposit_due < today });
    if (v.balance_due && !v.balance_paid)
      payments.push({ vendor: v, kind: "balance", due: v.balance_due, amount: v.amount != null ? v.amount - (v.deposit ?? 0) : null, overdue: v.balance_due < today });
  }
  payments.sort((a, b) => a.due.localeCompare(b.due) || a.vendor.id.localeCompare(b.vendor.id));
  return { byCategory, booked, coreTotal: CORE_VENDORS.length, committed, payments, next: payments[0] ?? null, overdue: payments.filter((x) => x.overdue).length };
}

export const VENDOR_LABEL: Record<VendorCategory, string> = {
  catering: "Catering", bar: "Bar", photo: "Photography", video: "Video", music: "Music", florals: "Florals", planner: "Planner / coordinator",
  cake: "Cake", beauty: "Hair & makeup", attire: "Attire", stationery: "Stationery", rentals: "Rentals", transport: "Transport",
  officiant: "Officiant", lodging: "Lodging", other: "Other",
};
