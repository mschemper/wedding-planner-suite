// API contract shared by worker/ and the client (DESIGN-v3 §3; v4 tables DESIGN-v4 §3). Pure types.
import type { Quote } from "../engine/types";
import type { Party, Person } from "../people/types";
import type { Fit, MustHave, Task, VenueRow } from "../plan/types";

export interface RowMeta {
  version: number;
  /** ISO UTC */
  updated_at: string;
  /** Access email */
  updated_by: string;
}
export type Versioned<T> = T & RowMeta;

export type TableName = "people" | "parties" | "venues" | "musthaves" | "fit" | "tasks" | "quotes" | "params";

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
  params: ParamRow[];
  /** the signed-in email */
  me: string;
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
 * Order inside a batch matters: create a party before its people, a must-have before its fit rows.
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
