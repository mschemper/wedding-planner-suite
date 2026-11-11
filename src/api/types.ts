// API contract shared by worker/ and the client (DESIGN-v3 §3; v4 tables DESIGN-v4 §3). Pure types.
import type { CustomVenue } from "../data/custom";
import type { Quote } from "../engine/types";
import type { Address, Party, Person } from "../people/types";
import type { Fit, MustHave, Task, TimelineRow, Vendor, VenueRow } from "../plan/types";

export interface RowMeta {
  version: number;
  /** ISO UTC */
  updated_at: string;
  /** Access email */
  updated_by: string;
}
export type Versioned<T> = T & RowMeta;

export type TableName = "people" | "parties" | "venues" | "musthaves" | "fit" | "tasks" | "quotes" | "params" | "custom_venues" | "vendors" | "timeline" | "addresses";

export interface ParamRow extends RowMeta {
  key: string;
  value: unknown;
}

export interface ApiData {
  people: Versioned<Person>[];
  parties: Versioned<Party>[];
  venues: Versioned<VenueRow>[];
  musthaves: Versioned<MustHave>[];
  fit: Versioned<Fit>[];
  tasks: Versioned<Task>[];
  quotes: Versioned<Quote>[];
  /** v7: venues added in the app (researched or typed in) */
  custom_venues: Versioned<CustomVenue>[];
  /** v11 (0006): vendor bookings */
  vendors: Versioned<Vendor>[];
  /** v11 (0006): day-of run of show */
  timeline: Versioned<TimelineRow>[];
  /** v14 (0008): one mailing address per household (id = party id). Private: never in the feed. */
  addresses: Versioned<Address>[];
  params: ParamRow[];
  /** the signed-in email */
  me: string;
}

/** GET /api/feed/plan (docs/FEED.md): read-only Plan summary for the Bauhaus wall. Bump `feed` on breaking change. */
export interface PlanFeed {
  feed: number;
  /** ISO UTC */
  generated_at: string;
  /** YYYY-MM-DD, America/Chicago */
  today: string;
  /** null when no held date is set */
  wedding: { date: string; days: number; weeks: number; label: string; past: boolean; venue_status: string | null } | null;
  progress: { done: number; open: number; total: number; pct: number };
  counts: { overdue: number; week: number; nodate: number };
  /** open tasks, overdue first then by due date */
  next: { title: string; due: string | null; days: number | null; group: "overdue" | "week" | "later" | "nodate"; owner: string; category: string }[];
  /** last day of "this week" (today + 7) */
  week_end: string;
}

export interface Issue {
  level: "error" | "warning";
  /** row id the issue is about */
  where: string;
  msg: string;
}

/**
 * One save = one atomic batch of ops. Ids for people/parties/musthaves/tasks/quotes are allocated by the server.
 * A create may carry a temporary id ("tmp:<anything>") in `id`; other ops in the same batch may reference it
 * (party_id, partner_id, parent_ids, musthave_id). The response maps tmp → real ids.
 * fit: id is derived by the server as `${scenario_id}:${musthave_id}`. venues: update only (one seeded row per scenario).
 * musthaves: no delete (archive). parties: delete only when empty.
 * params: create/update with id = key and row = { value }; delete = back to the doc value.
 * people.partner_id: set it on ONE side; the server mirrors it and clears previous partners.
 * Order inside a batch matters: create a party before its people (and before its address), a must-have before its fit rows.
 * addresses (v14): id = the household id (or its tmp id); create via save(), not edit(). tasks.depends_on may carry tmp ids.
 */
export type Op =
  | { table: TableName; op: "create"; row: Record<string, unknown> }
  | { table: TableName; op: "update"; id: string; version: number; row: Record<string, unknown> }
  | { table: TableName; op: "delete"; id: string; version: number };

export interface WriteRequest {
  ops: Op[];
}
export interface WriteResult {
  ids: Record<string, string>;
  data: ApiData;
}

export interface AuditEntry {
  id: number;
  ts: string;
  who: string;
  tbl: TableName;
  row_id: string;
  op: "create" | "update" | "delete";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type ApiErrorKind = "unauthorized" | "forbidden" | "conflict" | "invalid" | "not_found" | "bad_request" | "server";
export interface ApiErrorBody {
  error: ApiErrorKind;
  message: string;
  /** invalid: issues introduced by this save */
  issues?: Issue[];
  /** conflict / not_found: the row that changed */
  row?: { table: TableName; id: string; updated_by?: string };
}
