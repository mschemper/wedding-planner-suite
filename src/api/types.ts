// API contract shared by worker/ and the client (DESIGN-v3 §3). Pure types.
import type { Quote } from "../engine/types";
import type { Issue } from "../guests/validate";
import type { FriendGroup, Household, Individual } from "../guests/schema";

export interface RowMeta {
  version: number;
  /** ISO UTC */
  updated_at: string;
  /** Access email */
  updated_by: string;
}
export type Versioned<T> = T & RowMeta;

export type TableName = "households" | "individuals" | "friends" | "quotes" | "params";

export interface ParamRow extends RowMeta {
  key: string;
  value: unknown;
}

export interface ApiData {
  households: Versioned<Household>[];
  individuals: Versioned<Individual>[];
  friends: Versioned<FriendGroup>[];
  quotes: Versioned<Quote>[];
  params: ParamRow[];
  /** the signed-in email */
  me: string;
}

/**
 * One save = one atomic batch of ops. Ids for households/individuals/friends/quotes are allocated by the server.
 * A create may carry a temporary id ("tmp:<anything>") in its id column; other ops in the same batch may reference it
 * (HouseholdID, PartnerPersonID, ParentPersonIDs). The response maps tmp → real ids.
 * households create: optional `_branch` (2–4 letters) → id `{M|A}-{BRANCH}-{NNN}`; default from PrimaryHouseholdName.
 * params: create/update with id = key and row = { value }; delete = back to the doc value.
 * Order inside a batch matters: create a household before its people; delete people before their household.
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
  before: unknown;
  after: unknown;
}

export type ApiErrorKind = "unauthorized" | "forbidden" | "conflict" | "invalid" | "not_found" | "bad_request" | "server";
export interface ApiErrorBody {
  error: ApiErrorKind;
  message: string;
  /** invalid: validateGuests issues introduced by this save */
  issues?: Issue[];
  /** conflict / not_found: the row that changed */
  row?: { table: TableName; id: string; updated_by?: string };
}
