// v4 planning rows (DESIGN-v4 §3): venue status, must-haves, venue fit, tasks. Pure types + enums.

export const VENUE_STATUSES = ["researching", "tour booked", "toured", "held", "quoted", "booked", "passed"] as const;
export const VERDICTS = ["yes", "partly", "no", "unknown"] as const;
export const OWNERS = ["Mark", "Angela", "Both"] as const;
export const CATEGORIES = ["venue", "vendor", "guests", "budget", "admin", "design"] as const;
export const TASK_STATUSES = ["open", "done"] as const;

export type VenueStatus = (typeof VENUE_STATUSES)[number];
export type Verdict = (typeof VERDICTS)[number];
export type Owner = (typeof OWNERS)[number];
export type Category = (typeof CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** One row per scenario (seeded). `active` = on the shortlist; everything else is Archive. */
export interface VenueRow {
  scenario_id: number;
  active: boolean;
  status: VenueStatus;
  hold_date?: string | null;
  tour_date?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  next_step?: string | null;
  notes?: string | null;
}

export interface MustHave {
  id: string;
  text: string;
  detail?: string | null;
  sort: number;
  archived: boolean;
}

/** id = `${scenario_id}:${musthave_id}` */
export interface Fit {
  id: string;
  scenario_id: number;
  musthave_id: string;
  verdict: Verdict;
  note?: string | null;
}

export interface Task {
  id: string;
  title: string;
  detail?: string | null;
  /** YYYY-MM-DD */
  due?: string | null;
  owner: Owner;
  category: Category;
  status: TaskStatus;
  done_at?: string | null;
  /** Gmail thread URL, "email", or "manual" */
  source?: string | null;
  source_date?: string | null;
  scenario_id?: number | null;
  sort?: number | null;
}

export const fitId = (scenarioId: number, musthaveId: string) => `${scenarioId}:${musthaveId}`;

// v11 Day tab (migration 0006): vendor bookings + day-of timeline.
export const VENDOR_CATEGORIES = ["catering", "bar", "photo", "video", "music", "florals", "planner", "cake", "beauty", "attire", "stationery", "rentals", "transport", "officiant", "lodging", "other"] as const;
export const VENDOR_STATUSES = ["idea", "contacted", "quoted", "booked", "passed"] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

/** A vendor we are considering or have booked (D1 `vendors`, id V01…). Money in dollars. */
export interface Vendor {
  id: string;
  category: VendorCategory;
  name: string;
  status: VendorStatus;
  /** contract / quoted total */
  amount?: number | null;
  deposit?: number | null;
  /** YYYY-MM-DD */
  deposit_due?: string | null;
  balance_due?: string | null;
  /** YYYY-MM-DD the deposit / balance was paid; null = unpaid */
  deposit_paid?: string | null;
  balance_paid?: string | null;
  /** business contact (email / phone / site) */
  contact?: string | null;
  notes?: string | null;
  /** venue this vendor is tied to (e.g. the Joinery bar), optional */
  scenario_id?: number | null;
  sort?: number | null;
}

/** One step of the wedding-day run of show (D1 `timeline`, id TL01…). */
export interface TimelineRow {
  id: string;
  /** "HH:MM" 24h; 00:00–04:59 counts as after midnight (src/plan/day.ts) */
  start: string;
  /** duration, 0–720 */
  minutes: number;
  title: string;
  place?: string | null;
  who?: string | null;
  notes?: string | null;
}
