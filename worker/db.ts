// Table specs (= migrations 0001 quotes/params + 0002 v4 tables), row (de)serialisation and per-row shape checks.
import type { ApiData, ParamRow, TableName } from "../src/api/types";
import { parseParamValue } from "../src/data/params";
import { SCENARIOS } from "../src/data/scenarios";
import { AGES, KIDS_RULES, KINDS, DECISIONS, LOCALS, OVERRIDES, RSVPS, SIDES } from "../src/people/types";
import { CATEGORIES, OWNERS, TASK_STATUSES, VENUE_STATUSES, VERDICTS } from "../src/plan/types";
import type { D1Database, D1PreparedStatement } from "./env";

export type Rec = Record<string, unknown>;

type ColType = "text" | "int" | "real" | "bool" | "json" | "ids";
export interface Col {
  name: string;
  type: ColType;
  required?: boolean;
  enum?: readonly string[];
  /** YYYY-MM-DD */
  date?: boolean;
  /** value on create when absent */
  def?: unknown;
}
export interface Spec {
  pk: string;
  cols: Col[];
  /** server id prefix + zero-pad width (people P001, parties H001, musthaves MH01, tasks T001) */
  prefix?: string;
  width?: number;
  /** create / delete through /api/write allowed */
  create: boolean;
  del: boolean;
}

const t = (name: string, extra: Partial<Col> = {}): Col => ({ name, type: "text", ...extra });
const i = (name: string, extra: Partial<Col> = {}): Col => ({ name, type: "int", ...extra });
const b = (name: string, def = false): Col => ({ name, type: "bool", def });
const e = (name: string, values: readonly string[], def?: string, required = def !== undefined): Col => ({ name, type: "text", enum: values, def, required });

export const SPECS: Record<TableName, Spec> = {
  people: {
    pk: "id", prefix: "P", width: 3, create: true, del: true,
    cols: [t("id"), t("first", { required: true }), t("last"), t("nick"), e("side", SIDES, undefined, true), t("branch"), i("gen"),
      e("kind", KINDS, "family"), t("party_id"), t("partner_id"), { name: "parent_ids", type: "ids", def: [] }, e("age", AGES, "adult"),
      e("override", OVERRIDES, undefined, false), e("rsvp", RSVPS, "none"), b("deceased"), b("placeholder"), e("local", LOCALS, "unknown"),
      t("circle"), b("plus_one"), b("kids_room"), t("label"), t("notes"), i("sort")],
  },
  parties: {
    pk: "id", prefix: "H", width: 3, create: true, del: true,
    cols: [t("id"), t("name", { required: true }), e("invite", DECISIONS, "undecided"), e("kids", KIDS_RULES, "policy"), i("rank"),
      b("talk"), t("talk_note"), t("notes")],
  },
  venues: {
    pk: "scenario_id", create: false, del: false,
    cols: [i("scenario_id", { required: true }), b("active"), e("status", VENUE_STATUSES, "researching"), t("hold_date", { date: true }),
      t("tour_date", { date: true }), t("contact_name"), t("contact_email"), t("contact_phone"), t("next_step"), t("notes")],
  },
  musthaves: {
    pk: "id", prefix: "MH", width: 2, create: true, del: false,
    cols: [t("id"), t("text", { required: true }), t("detail"), i("sort", { def: 0, required: true }), b("archived")],
  },
  fit: {
    pk: "id", create: true, del: true,
    cols: [t("id"), i("scenario_id", { required: true }), t("musthave_id", { required: true }), e("verdict", VERDICTS, "unknown"), t("note")],
  },
  tasks: {
    pk: "id", prefix: "T", width: 3, create: true, del: true,
    cols: [t("id"), t("title", { required: true }), t("detail"), t("due", { date: true }), e("owner", OWNERS, "Both"),
      e("category", CATEGORIES, "admin"), e("status", TASK_STATUSES, "open"), t("done_at"), t("source"), t("source_date", { date: true }),
      i("scenario_id"), i("sort")],
  },
  quotes: {
    pk: "id", create: true, del: true,
    cols: [t("id"), i("scenario_id", { required: true }), t("item_desc", { required: true }), { name: "options", type: "json" },
      e("basis", ["total", "perGuest"], "total"), { name: "amount", type: "real", required: true }, b("includes_tax"), t("vendor"),
      t("received_on", { date: true }), e("status", ["requested", "received", "accepted"], undefined, true), t("notes")],
  },
  params: { pk: "key", create: true, del: true, cols: [t("key", { required: true }), { name: "value", type: "json" }] },
};

export const TABLE_NAMES = Object.keys(SPECS) as TableName[];
export const META = ["version", "updated_at", "updated_by"] as const;
export const isTable = (x: unknown): x is TableName => typeof x === "string" && x in SPECS;
export const colNames = (table: TableName) => SPECS[table].cols.map((c) => c.name);

/** D1 row → API row. */
export function fromDb(table: TableName, r: Rec): Rec {
  const o: Rec = { ...r };
  for (const c of SPECS[table].cols) {
    const v = r[c.name];
    if (c.type === "bool") o[c.name] = !!v;
    else if ((c.type === "json" || c.type === "ids") && typeof v === "string") o[c.name] = JSON.parse(v);
    else if (c.type === "ids") o[c.name] = [];
  }
  return o;
}

/** API row → column values in spec order (+ meta). */
export function toDbValues(table: TableName, r: Rec): unknown[] {
  const vals = SPECS[table].cols.map((c) => {
    const v = r[c.name];
    if (v === undefined || v === null) return c.type === "ids" ? "[]" : null;
    if (c.type === "bool") return v ? 1 : 0;
    if (c.type === "json" || c.type === "ids") return JSON.stringify(v);
    return v;
  });
  return [...vals, ...META.map((m) => r[m])];
}

export function insertStmt(db: D1Database, table: TableName, r: Rec): D1PreparedStatement {
  const cols = [...colNames(table), ...META];
  return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...toDbValues(table, r));
}
export function updateStmt(db: D1Database, table: TableName, r: Rec): D1PreparedStatement {
  const { pk } = SPECS[table];
  const all = [...colNames(table), ...META];
  const vals = toDbValues(table, r);
  const set = all.filter((c) => c !== pk);
  return db.prepare(`UPDATE ${table} SET ${set.map((c) => `${c} = ?`).join(", ")} WHERE ${pk} = ?`)
    .bind(...set.map((c) => vals[all.indexOf(c)]), r[pk]);
}
export const deleteStmt = (db: D1Database, table: TableName, id: string) =>
  db.prepare(`DELETE FROM ${table} WHERE ${SPECS[table].pk} = ?`).bind(pkValue(table, id));
/** Inserts 0 into _guard (CHECK x=1 fails → batch rolls back) unless the row still has the version we read. */
export const guardStmt = (db: D1Database, table: TableName, id: string, version: number) =>
  db.prepare(`INSERT INTO _guard (x) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${SPECS[table].pk} = ? AND version = ?)`)
    .bind(pkValue(table, id), version);
const pkValue = (table: TableName, id: string) => (SPECS[table].cols[0].type === "int" ? Number(id) : id);

export type State = Record<TableName, Map<string, Rec>>;

export async function loadState(db: D1Database): Promise<State> {
  const res = await Promise.all(TABLE_NAMES.map((tb) => db.prepare(`SELECT * FROM ${tb} ORDER BY ${SPECS[tb].pk}`).all<Rec>()));
  const st = {} as State;
  TABLE_NAMES.forEach((tb, n) => (st[tb] = new Map(res[n].results.map((r) => [String(r[SPECS[tb].pk]), fromDb(tb, r)]))));
  return st;
}

export const stateToApi = (st: State, me: string): ApiData => ({
  people: [...st.people.values()],
  parties: [...st.parties.values()],
  venues: [...st.venues.values()],
  musthaves: [...st.musthaves.values()],
  fit: [...st.fit.values()],
  tasks: [...st.tasks.values()],
  quotes: [...st.quotes.values()],
  params: [...st.params.values()] as unknown as ParamRow[],
  me,
}) as unknown as ApiData;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalises a client patch: trims strings, "" → null (cleared), fills defaults on create. Returns an error for a bad shape. */
export function normalize(table: TableName, patch: Rec, isCreate: boolean): { ok: true; row: Rec } | { ok: false; msg: string } {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ok: false, msg: "row must be an object" };
  const spec = SPECS[table];
  const byName = new Map(spec.cols.map((c) => [c.name, c]));
  const row: Rec = {};
  for (const [k, raw] of Object.entries(patch)) {
    const c = byName.get(k);
    if (!c) return { ok: false, msg: `unknown column ${table}.${k}` };
    let v = typeof raw === "string" ? raw.trim() : raw;
    if (v === "") v = null;
    if (v !== null && v !== undefined) {
      switch (c.type) {
        case "text": if (typeof v !== "string") return { ok: false, msg: `${k} must be text` }; break;
        case "int": if (!Number.isInteger(v)) return { ok: false, msg: `${k} must be a whole number` }; break;
        case "real": if (!(typeof v === "number" && Number.isFinite(v))) return { ok: false, msg: `${k} must be a number` }; break;
        case "bool": if (v === 0 || v === 1) v = !!v; if (typeof v !== "boolean") return { ok: false, msg: `${k} must be true/false` }; break;
        case "ids": if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !x)) return { ok: false, msg: `${k} must be a list of ids` };
          v = [...new Set(v as string[])]; break;
        case "json": break;
      }
      if (c.enum && !c.enum.includes(String(v))) return { ok: false, msg: `bad ${k} "${v}"` };
      if (c.date && !DATE.test(String(v))) return { ok: false, msg: `${k} must be YYYY-MM-DD` };
    }
    row[k] = v ?? null;
  }
  for (const c of spec.cols) {
    if (c.name === spec.pk && spec.prefix) continue;
    if (isCreate && (row[c.name] === undefined || row[c.name] === null) && c.def !== undefined) row[c.name] = c.def;
    const missing = isCreate ? row[c.name] == null : c.name in row && row[c.name] == null;
    if (c.required && missing && !(table === "params" && c.name === "key")) return { ok: false, msg: `${c.name} is required` };
  }
  if (table === "quotes") {
    if ("scenario_id" in row && !SCENARIOS.some((s) => s.id === row.scenario_id)) return { ok: false, msg: "unknown scenario_id" };
    if ("amount" in row && row.amount != null && (row.amount as number) < 0) return { ok: false, msg: "amount must be a number ≥ 0" };
    if (row.options != null && (typeof row.options !== "object" || Array.isArray(row.options) || Object.values(row.options as Rec).some((v) => typeof v !== "string")))
      return { ok: false, msg: "options must map option key → choice" };
  }
  if ((table === "fit" || table === "tasks") && row.scenario_id != null && !SCENARIOS.some((s) => s.id === row.scenario_id))
    return { ok: false, msg: "unknown scenario_id" };
  if (table === "params") {
    const p = parseParamValue(String(row.key ?? ""), row.value);
    if (!p.ok) return { ok: false, msg: p.msg };
  }
  return { ok: true, row };
}
