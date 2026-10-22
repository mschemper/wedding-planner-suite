// Table layout (= migrations/0001_init.sql), row (de)serialisation and per-row shape checks.
import type { ParamRow, TableName } from "../src/api/types";
import { parseParamValue } from "../src/data/params";
import { SCENARIOS } from "../src/data/scenarios";
import { ENUMS } from "../src/guests/schema";
import type { D1Database, D1PreparedStatement } from "./env";

export type Rec = Record<string, unknown>;

export const TABLES: Record<TableName, { pk: string; cols: string[] }> = {
  households: { pk: "HouseholdID", cols: ["HouseholdID", "Family", "FamilySide", "PrimaryHouseholdName", "HouseholdType", "Notes"] },
  individuals: {
    pk: "PersonID",
    cols: ["PersonID", "HouseholdID", "FirstName", "LastName", "DisplayName", "Family", "FamilySide", "RelationshipToMark", "RelationshipToAngela",
      "GenerationGroup", "AdultOrChild", "HouseholdRole", "PartnerPersonID", "ParentPersonIDs", "InviteException", "ExceptionReason", "Locality",
      "CityState", "InvitePriority", "InviteStatus", "Notes"],
  },
  friends: {
    pk: "FriendGroupID",
    cols: ["FriendGroupID", "GroupName", "PrimaryContact", "ConnectionTo", "FriendCategory", "Ranking", "InviteTier", "Locality", "CityState",
      "PlusOneDefault", "AdultOrChild", "InviteException", "ExceptionReason", "InviteStatus", "Notes"],
  },
  quotes: { pk: "id", cols: ["id", "scenario_id", "item_desc", "options", "basis", "amount", "includes_tax", "vendor", "received_on", "status", "notes"] },
  params: { pk: "key", cols: ["key", "value"] },
};
export const META = ["version", "updated_at", "updated_by"] as const;
export const GUEST_TABLES: TableName[] = ["households", "individuals", "friends"];
export const isTable = (t: unknown): t is TableName => typeof t === "string" && t in TABLES;

/** D1 row → API row. Guest tables drop NULLs (the workbook's optional columns are absent, not null). */
export function fromDb(table: TableName, r: Rec): Rec {
  const o: Rec = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === null && GUEST_TABLES.includes(table)) continue;
    o[k] = v;
  }
  if (table === "quotes") {
    o.options = typeof r.options === "string" ? JSON.parse(r.options) : null;
    o.includes_tax = !!r.includes_tax;
  }
  if (table === "params") o.value = JSON.parse(String(r.value));
  return o;
}

/** API row → column values in TABLES order (+ meta). */
export function toDbValues(table: TableName, r: Rec): unknown[] {
  const vals = TABLES[table].cols.map((c) => {
    const v = r[c];
    if (table === "quotes" && c === "options") return v == null ? null : JSON.stringify(v);
    if (table === "quotes" && c === "includes_tax") return v ? 1 : 0;
    if (table === "params" && c === "value") return JSON.stringify(v);
    return v === undefined ? null : v;
  });
  return [...vals, ...META.map((m) => r[m])];
}

export function insertStmt(db: D1Database, table: TableName, r: Rec): D1PreparedStatement {
  const cols = [...TABLES[table].cols, ...META];
  return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...toDbValues(table, r));
}
export function updateStmt(db: D1Database, table: TableName, r: Rec): D1PreparedStatement {
  const { pk, cols } = TABLES[table];
  const set = [...cols.filter((c) => c !== pk), ...META];
  const vals = toDbValues(table, r);
  const byCol = new Map([...cols, ...META].map((c, i) => [c, vals[i]]));
  return db.prepare(`UPDATE ${table} SET ${set.map((c) => `${c} = ?`).join(", ")} WHERE ${pk} = ?`).bind(...set.map((c) => byCol.get(c)), r[pk]);
}
export const deleteStmt = (db: D1Database, table: TableName, id: string) => db.prepare(`DELETE FROM ${table} WHERE ${TABLES[table].pk} = ?`).bind(id);
/** Inserts 0 into _guard (CHECK x=1 fails → batch rolls back) unless the row still has the version we read. */
export const guardStmt = (db: D1Database, table: TableName, id: string, version: number) =>
  db.prepare(`INSERT INTO _guard (x) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${TABLES[table].pk} = ? AND version = ?)`).bind(id, version);

export interface State {
  households: Map<string, Rec>;
  individuals: Map<string, Rec>;
  friends: Map<string, Rec>;
  quotes: Map<string, Rec>;
  params: Map<string, Rec>;
}

export async function loadState(db: D1Database): Promise<State> {
  const names = Object.keys(TABLES) as TableName[];
  const res = await Promise.all(names.map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY ${TABLES[t].pk}`).all<Rec>()));
  const st = {} as State;
  names.forEach((t, i) => (st[t] = new Map(res[i].results.map((r) => [String(r[TABLES[t].pk]), fromDb(t, r)]))));
  return st;
}

export const stateToApi = (st: State, me: string) => ({
  households: [...st.households.values()],
  individuals: [...st.individuals.values()],
  friends: [...st.friends.values()],
  quotes: [...st.quotes.values()],
  params: [...st.params.values()] as unknown as ParamRow[],
  me,
});

// ---- per-row shape checks (validateGuests covers references, duplicates and the remaining enums) ----

const YESNO_COLS = new Set(["InviteException", "PlusOneDefault"]);
const ENUM_COLS: Record<string, readonly string[]> = {
  Family: ENUMS.Family, AdultOrChild: ENUMS.AdultOrChild, Locality: ENUMS.Locality, InviteStatus: ENUMS.InviteStatus,
};
const STATUSES = ["requested", "received", "accepted"];

/** Normalises a client patch: trims strings, "" → null (cleared). Returns an error message for a bad shape. */
export function normalize(table: TableName, patch: Rec, isCreate: boolean): { ok: true; row: Rec } | { ok: false; msg: string } {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ok: false, msg: "row must be an object" };
  const { cols } = TABLES[table];
  const row: Rec = {};
  for (const [k, raw] of Object.entries(patch)) {
    if (k === "_branch" && table === "households") continue;
    if (!cols.includes(k)) return { ok: false, msg: `unknown column ${table}.${k}` };
    let v = typeof raw === "string" ? raw.trim() : raw;
    if (v === "") v = null;
    row[k] = v;
  }
  if (GUEST_TABLES.includes(table)) {
    for (const [k, v] of Object.entries(row)) {
      if (k === "Ranking" && typeof v === "number") row[k] = String(v);
      else if (v !== null && typeof v !== "string") return { ok: false, msg: `${k} must be text` };
      if (v !== null && YESNO_COLS.has(k) && !ENUMS.YesNo.includes(v as "Yes")) return { ok: false, msg: `${k} must be Yes or No` };
      if (v !== null && ENUM_COLS[k] && !ENUM_COLS[k].includes(String(v))) return { ok: false, msg: `bad ${k} "${v}"` };
    }
    if (isCreate && table !== "friends" && !row.Family) return { ok: false, msg: "Family is required" };
    if (isCreate && table === "individuals" && !row.HouseholdID) return { ok: false, msg: "HouseholdID is required" };
  }
  if (table === "quotes") {
    const has = (k: string) => isCreate || k in row;
    if (has("scenario_id") && !SCENARIOS.some((s) => s.id === row.scenario_id)) return { ok: false, msg: "unknown scenario_id" };
    if (has("item_desc") && (typeof row.item_desc !== "string" || !row.item_desc)) return { ok: false, msg: "item_desc required" };
    if (has("amount") && !(typeof row.amount === "number" && Number.isFinite(row.amount) && row.amount >= 0)) return { ok: false, msg: "amount must be a number ≥ 0" };
    if (has("status") && !STATUSES.includes(String(row.status))) return { ok: false, msg: "bad status" };
    if (isCreate && row.basis == null) row.basis = "total";
    if ("basis" in row && row.basis !== "total" && row.basis !== "perGuest") return { ok: false, msg: "basis must be total or perGuest" };
    if (isCreate && row.includes_tax == null) row.includes_tax = false;
    if ("includes_tax" in row && typeof row.includes_tax !== "boolean") return { ok: false, msg: "includes_tax must be true/false" };
    if (row.options != null && (typeof row.options !== "object" || Array.isArray(row.options) || Object.values(row.options as Rec).some((v) => typeof v !== "string")))
      return { ok: false, msg: "options must map option key → choice" };
    if (row.received_on != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.received_on))) return { ok: false, msg: "received_on must be YYYY-MM-DD" };
    for (const k of ["vendor", "notes"]) if (row[k] != null && typeof row[k] !== "string") return { ok: false, msg: `${k} must be text` };
  }
  if (table === "params") {
    const p = parseParamValue(String(row.key ?? ""), row.value);
    if (!p.ok) return { ok: false, msg: p.msg };
  }
  return { ok: true, row };
}
