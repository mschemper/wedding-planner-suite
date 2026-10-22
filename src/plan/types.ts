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
