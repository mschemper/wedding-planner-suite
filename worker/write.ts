// One save = one D1 batch (one transaction). DESIGN-v3 §2: version check → 409, validateGuests on the post-write state → 422,
// server-allocated ids, partner/parent references cleared on person delete, audit + trim.
import type { ApiErrorBody, Op, TableName } from "../src/api/types";
import type { GuestData } from "../src/guests/schema";
import { validateGuests, type Issue } from "../src/guests/validate";
import { deleteStmt, guardStmt, GUEST_TABLES, insertStmt, isTable, loadState, normalize, TABLES, updateStmt, type Rec, type State } from "./db";
import type { D1Database, D1PreparedStatement } from "./env";

export const AUDIT_KEEP = 1000;
const MAX_OPS = 500;
const REF_COLS = ["HouseholdID", "PartnerPersonID", "ParentPersonIDs"];

type Fail = { ok: false; status: number; body: ApiErrorBody };
export type WriteOutcome = { ok: true; ids: Record<string, string> } | Fail;

const fail = (status: number, error: ApiErrorBody["error"], message: string, extra: Partial<ApiErrorBody> = {}): Fail =>
  ({ ok: false, status, body: { error, message, ...extra } });

interface Touch {
  table: TableName;
  id: string;
  op: "create" | "update" | "delete";
  /** row as read (null for a create) */
  read: Rec | null;
  after: Rec | null;
}

const isTmp = (v: unknown): v is string => typeof v === "string" && v.startsWith("tmp:");
const splitIds = (v: unknown) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const clone = (st: State): State => Object.fromEntries(Object.entries(st).map(([k, m]) => [k, new Map([...m].map(([id, r]) => [id, { ...r }]))])) as unknown as State;
const guestsOf = (st: State): GuestData => ({
  households: [...st.households.values()], individuals: [...st.individuals.values()], friends: [...st.friends.values()],
} as unknown as GuestData);

function nextSeq(ids: Iterable<string>, re: RegExp): number {
  let max = 0;
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
const pad3 = (n: number) => String(n).padStart(3, "0");
const branchOf = (row: Rec) => {
  const given = String(row._branch ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (given.length >= 2) return given.slice(0, 4);
  const fromName = String(row.PrimaryHouseholdName ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return fromName.length >= 2 ? fromName : "HH";
};

/** Allocates an id for a create; `taken` holds every id already used (DB + this batch). */
function allocate(table: TableName, row: Rec, taken: Set<string>): string {
  const f = row.Family === "Angela" ? "A" : "M";
  const esc = (s: string) => s.replace(/[-]/g, "\\-");
  let id: string;
  switch (table) {
    case "individuals": id = `${f}${pad3(nextSeq(taken, new RegExp(`^${f}(\\d+)$`)))}`; break;
    case "households": { const p = `${f}-${branchOf(row)}-`; id = `${p}${pad3(nextSeq(taken, new RegExp(`^${esc(p)}(\\d+)$`)))}`; break; }
    case "friends": id = `F${pad3(nextSeq(taken, /^F(\d+)$/))}`; break;
    case "quotes": id = crypto.randomUUID(); break;
    case "params": id = String(row.key ?? ""); break;
  }
  taken.add(id);
  return id;
}

export async function applyWrite(db: D1Database, ops: unknown, who: string, now = new Date().toISOString()): Promise<WriteOutcome> {
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS) return fail(400, "bad_request", `ops must be a list of 1–${MAX_OPS}`);
  for (const o of ops as Op[]) {
    if (!o || !isTable(o.table) || !["create", "update", "delete"].includes(o.op)) return fail(400, "bad_request", "each op needs table and op");
    if (o.op !== "create" && (typeof o.id !== "string" || !Number.isInteger(o.version))) return fail(400, "bad_request", "update/delete need id and version");
  }
  const orig = await loadState(db);
  const st = clone(orig);
  const touches = new Map<string, Touch>();
  const key = (t: TableName, id: string) => `${t}\u0000${id}`;

  // 1. ids for creates (tmp → real)
  const ids: Record<string, string> = {};
  const createIds = new Map<Op, string>();
  const taken = new Set<string>([...st.households.keys(), ...st.individuals.keys(), ...st.friends.keys()]);
  for (const o of ops as Op[]) {
    if (o.op !== "create") continue;
    const row = (o.row ?? {}) as Rec;
    const pk = TABLES[o.table].pk;
    if (o.table === "params" && st.params.has(String(row.key))) {
      return fail(409, "conflict", `${row.key} was already changed`, { row: { table: "params", id: String(row.key), updated_by: String(st.params.get(String(row.key))!.updated_by) } });
    }
    const id = allocate(o.table, row, taken);
    if (isTmp(row[pk])) ids[row[pk] as string] = id;
    createIds.set(o, id);
  }
  const resolve = (v: unknown, col: string): unknown => {
    if (col === "ParentPersonIDs" && typeof v === "string") return splitIds(v).map((x) => ids[x] ?? x).join(", ");
    return isTmp(v) ? (ids[v] ?? v) : v;
  };

  // 2. apply ops in memory
  for (const o of ops as Op[]) {
    const { pk } = TABLES[o.table];
    const map = st[o.table];
    if (o.op === "create") {
      const id = createIds.get(o)!;
      const n = normalize(o.table, o.row ?? {}, true);
      if (!n.ok) return fail(400, "bad_request", n.msg);
      const row: Rec = { ...n.row, [pk]: id, version: 1, updated_at: now, updated_by: who };
      for (const c of REF_COLS) if (c in row) row[c] = resolve(row[c], c);
      if (Object.values(row).some(isTmp)) return fail(400, "bad_request", "reference to an unknown tmp: id");
      map.set(id, row);
      touches.set(key(o.table, id), { table: o.table, id, op: "create", read: null, after: row });
      continue;
    }
    const cur = map.get(o.id);
    const k = key(o.table, o.id);
    if (touches.has(k)) return fail(400, "bad_request", `${o.id} appears twice in one save`);
    if (!cur) return fail(404, "not_found", `${o.id} no longer exists — reload`, { row: { table: o.table, id: o.id } });
    if (cur.version !== o.version) {
      return fail(409, "conflict", `${cur.updated_by} changed ${o.id} — reload`, { row: { table: o.table, id: o.id, updated_by: String(cur.updated_by) } });
    }
    if (o.op === "delete") {
      map.delete(o.id);
      touches.set(k, { table: o.table, id: o.id, op: "delete", read: cur, after: null });
      continue;
    }
    const patch = o.table === "params" ? { ...(o.row ?? {}), key: o.id } : (o.row ?? {});
    const n = normalize(o.table, patch, false);
    if (!n.ok) return fail(400, "bad_request", n.msg);
    if (pk in n.row && n.row[pk] !== o.id) return fail(400, "bad_request", `${pk} cannot change`);
    const row: Rec = { ...cur };
    for (const [c, v] of Object.entries(n.row)) {
      if (v === null && GUEST_TABLES.includes(o.table)) delete row[c];
      else row[c] = REF_COLS.includes(c) ? resolve(v, c) : v;
    }
    Object.assign(row, { version: Number(cur.version) + 1, updated_at: now, updated_by: who });
    map.set(o.id, row);
    touches.set(k, { table: o.table, id: o.id, op: "update", read: cur, after: row });
  }

  // 3. person deleted → clear PartnerPersonID / ParentPersonIDs that point at them
  const gone = new Set([...touches.values()].filter((t) => t.table === "individuals" && t.op === "delete").map((t) => t.id));
  if (gone.size) {
    for (const [id, p] of st.individuals) {
      const partner = gone.has(String(p.PartnerPersonID ?? ""));
      const parents = splitIds(p.ParentPersonIDs);
      const keptParents = parents.filter((x) => !gone.has(x));
      if (!partner && keptParents.length === parents.length) continue;
      const row: Rec = { ...p };
      if (partner) delete row.PartnerPersonID;
      if (keptParents.length) row.ParentPersonIDs = keptParents.join(", "); else delete row.ParentPersonIDs;
      const k = key("individuals", id);
      const prev = touches.get(k);
      if (prev) prev.after = Object.assign(row, { version: row.version, updated_at: now, updated_by: who });
      else {
        Object.assign(row, { version: Number(p.version) + 1, updated_at: now, updated_by: who });
        touches.set(k, { table: "individuals", id, op: "update", read: orig.individuals.get(id) ?? null, after: row });
      }
      st.individuals.set(id, row);
    }
  }
  for (const t of touches.values()) {
    if (t.table === "households" && t.op === "delete" && [...st.individuals.values()].some((p) => p.HouseholdID === t.id))
      return fail(422, "invalid", `${t.id} still has people — delete or move them in the same save`);
  }

  // 4. validation: reject only errors this save introduces
  if ([...touches.values()].some((t) => GUEST_TABLES.includes(t.table))) {
    const sig = (i: Issue) => `${i.where}|${i.msg}`;
    const before = new Set(validateGuests(guestsOf(orig)).filter((i) => i.level === "error").map(sig));
    const introduced = validateGuests(guestsOf(st)).filter((i) => i.level === "error" && !before.has(sig(i)));
    if (introduced.length) return fail(422, "invalid", introduced.map((i) => `${i.where}: ${i.msg}`).join("; "), { issues: introduced });
  }

  // 5. one batch: guards, writes (households created first, deleted last), audit, trim
  const all = [...touches.values()];
  const rank = (t: Touch) => (t.table === "households" ? (t.op === "create" ? 0 : t.op === "delete" ? 3 : 1) : t.op === "delete" ? 2 : 1);
  const stmts: D1PreparedStatement[] = [];
  for (const t of all) if (t.read) stmts.push(guardStmt(db, t.table, t.id, Number(t.read.version)));
  for (const t of [...all].sort((a, b) => rank(a) - rank(b))) {
    stmts.push(t.op === "create" ? insertStmt(db, t.table, t.after!) : t.op === "update" ? updateStmt(db, t.table, t.after!) : deleteStmt(db, t.table, t.id));
  }
  for (const t of all) {
    stmts.push(db.prepare("INSERT INTO audit (ts, who, tbl, row_id, op, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(now, who, t.table, t.id, t.op, t.read ? JSON.stringify(t.read) : null, t.after ? JSON.stringify(t.after) : null));
  }
  stmts.push(db.prepare(`DELETE FROM audit WHERE id <= (SELECT id FROM audit ORDER BY id DESC LIMIT 1 OFFSET ${AUDIT_KEEP})`));
  try {
    await db.batch(stmts);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/CHECK constraint|UNIQUE constraint|PRIMARY KEY/i.test(msg)) return fail(409, "conflict", "Someone else saved at the same moment — reload and try again");
    if (/FOREIGN KEY/i.test(msg)) return fail(422, "invalid", "A person must belong to an existing household");
    throw e;
  }
  return { ok: true, ids };
}
