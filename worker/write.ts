// One save = one D1 batch (one transaction). DESIGN-v3 §2 + DESIGN-v4 §3: version check → 409, validatePeople on the post-write
// state → 422 (only errors this save introduces), server-allocated ids, partner mirroring, refs cleared on person delete, audit + trim.
import type { ApiErrorBody, Issue, Op, TableName } from "../src/api/types";
import { CUSTOM_ID_MIN, itemIssues } from "../src/data/custom";
import { mergeSettings } from "../src/data/params";
import type { PeopleData } from "../src/people/types";
import { validatePeople } from "../src/people/validate";
import { deleteStmt, guardStmt, insertStmt, isTable, loadState, normalize, SPECS, updateStmt, type Rec, type State } from "./db";
import type { D1Database, D1PreparedStatement } from "./env";

export const AUDIT_KEEP = 1000;
const MAX_OPS = 500;

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
const clone = (st: State): State => Object.fromEntries(Object.entries(st).map(([k, m]) => [k, new Map([...m].map(([id, r]) => [id, { ...r }]))])) as unknown as State;
const peopleOf = (st: State): PeopleData => ({ people: [...st.people.values()], parties: [...st.parties.values()] } as unknown as PeopleData);
const policyOf = (st: State) => mergeSettings([...st.params.values()] as { key: string; value: unknown }[]).kidsPolicy;

function nextSeq(ids: Iterable<string>, prefix: string): number {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Ref columns that may carry tmp ids, per table. */
const REFS: Partial<Record<TableName, string[]>> = { people: ["party_id", "partner_id", "parent_ids"], fit: ["musthave_id"] };

export async function applyWrite(db: D1Database, ops: unknown, who: string, now = new Date().toISOString()): Promise<WriteOutcome> {
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS) return fail(400, "bad_request", `ops must be a list of 1–${MAX_OPS}`);
  for (const o of ops as Op[]) {
    if (!o || !isTable(o.table) || !["create", "update", "delete"].includes(o.op)) return fail(400, "bad_request", "each op needs table and op");
    if (o.op !== "create" && (typeof o.id !== "string" || !Number.isInteger(o.version))) return fail(400, "bad_request", "update/delete need id and version");
    if (o.op === "create" && !SPECS[o.table].create) return fail(400, "bad_request", `${o.table} rows cannot be created`);
    if (o.op === "delete" && !SPECS[o.table].del) return fail(400, "bad_request", `${o.table} rows cannot be deleted${o.table === "musthaves" ? " — archive instead" : ""}`);
    if (o.table === "custom_venues" && o.op !== "delete" && o.row && "items" in o.row) {
      const bad = itemIssues(o.row.items);
      if (bad.length) return fail(400, "bad_request", bad.slice(0, 3).join("; "));
    }
  }
  const orig = await loadState(db);
  const st = clone(orig);
  const touches = new Map<string, Touch>();
  const key = (t: TableName, id: string) => `${t}\u0000${id}`;

  // 1. ids for creates (tmp → real). fit ids are derived after refs resolve.
  const ids: Record<string, string> = {};
  const createIds = new Map<Op, string>();
  const taken: Partial<Record<TableName, Set<string>>> = {};
  for (const o of ops as Op[]) {
    if (o.op !== "create") continue;
    const row = (o.row ?? {}) as Rec;
    const spec = SPECS[o.table];
    let id: string;
    if (spec.prefix) {
      const used = (taken[o.table] ??= new Set(st[o.table].keys()));
      id = `${spec.prefix}${String(nextSeq(used, spec.prefix)).padStart(spec.width ?? 3, "0")}`;
      used.add(id);
    } else if (o.table === "quotes") id = crypto.randomUUID();
    else if (o.table === "venues" || o.table === "custom_venues") {
      // v7: only venues added in the app; the code scenarios' rows are seeded
      const n = Number(row.scenario_id);
      if (!Number.isInteger(n) || n < CUSTOM_ID_MIN) return fail(400, "bad_request", `only added venues (id ${CUSTOM_ID_MIN}+) can be created`);
      id = String(n);
      if (st[o.table].has(id)) return fail(409, "conflict", `venue ${id} already exists — reload`, { row: { table: o.table, id } });
      if (o.table === "venues" && !st.custom_venues.has(id) && !(ops as Op[]).some((x) => x.op === "create" && x.table === "custom_venues" && Number((x.row ?? {}).scenario_id) === n))
        return fail(400, "bad_request", `venue ${id} needs its custom_venues row`);
    }
    else if (o.table === "params") {
      id = String(row.key ?? "");
      if (st.params.has(id)) return fail(409, "conflict", `${id} was already changed`, { row: { table: "params", id, updated_by: String(st.params.get(id)!.updated_by) } });
    } else id = ""; // fit: below
    if (isTmp(row[spec.pk])) ids[row[spec.pk] as string] = id;
    createIds.set(o, id);
  }
  const resolve = (v: unknown): unknown => (Array.isArray(v) ? v.map(resolve) : isTmp(v) ? (ids[v] ?? v) : v);
  const hasTmp = (v: unknown): boolean => (Array.isArray(v) ? v.some(hasTmp) : isTmp(v));

  // 2. apply ops in memory
  for (const o of ops as Op[]) {
    const { pk } = SPECS[o.table];
    const map = st[o.table];
    const refs = REFS[o.table] ?? [];
    if (o.op === "create") {
      const raw: Rec = { ...(o.row ?? {}) };
      if (o.table !== "params" && o.table !== "venues" && o.table !== "custom_venues") delete raw[pk];
      const n = normalize(o.table, raw, true);
      if (!n.ok) return fail(400, "bad_request", n.msg);
      for (const c of refs) if (c in n.row) n.row[c] = resolve(n.row[c]);
      if (Object.values(n.row).some(hasTmp)) return fail(400, "bad_request", "reference to an unknown tmp: id");
      let id = createIds.get(o)!;
      if (o.table === "fit") {
        id = `${n.row.scenario_id}:${n.row.musthave_id}`;
        const tmp = (o.row ?? {})[pk];
        if (isTmp(tmp)) ids[tmp] = id;
      }
      if (map.has(id) || touches.has(key(o.table, id))) return fail(409, "conflict", `${id} already exists — reload`, { row: { table: o.table, id } });
      const row: Rec = { ...n.row, [pk]: SPECS[o.table].cols[0].type === "int" ? Number(id) : id, version: 1, updated_at: now, updated_by: who };
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
    if (pk in n.row && String(n.row[pk]) !== o.id) return fail(400, "bad_request", `${pk} cannot change`);
    if (o.table === "fit" && ("scenario_id" in n.row || "musthave_id" in n.row)) return fail(400, "bad_request", "fit scenario/must-have cannot change");
    const row: Rec = { ...cur };
    for (const [c, v] of Object.entries(n.row)) row[c] = refs.includes(c) ? resolve(v) : v;
    if (Object.values(row).some(hasTmp)) return fail(400, "bad_request", "reference to an unknown tmp: id");
    Object.assign(row, { version: Number(cur.version) + 1, updated_at: now, updated_by: who });
    map.set(o.id, row);
    touches.set(k, { table: o.table, id: o.id, op: "update", read: cur, after: row });
  }

  /** Change a row the client did not send (partner mirror, ref clearing): one version bump per save. */
  const sideEdit = (table: TableName, id: string, mutate: (r: Rec) => void) => {
    const base = st[table].get(id);
    if (!base) return;
    const row: Rec = { ...base };
    mutate(row);
    const k = key(table, id);
    const prev = touches.get(k);
    if (prev) prev.after = row;
    else {
      Object.assign(row, { version: Number(base.version) + 1, updated_at: now, updated_by: who });
      touches.set(k, { table, id, op: "update", read: orig[table].get(id) ?? null, after: row });
    }
    st[table].set(id, row);
  };

  // 3. partner mirror: the side the client set wins; previous partners are cleared.
  for (const t of [...touches.values()]) {
    if (t.table !== "people" || t.op === "delete") continue;
    const now_ = t.after!.partner_id as string | null | undefined;
    const before = t.read?.partner_id as string | null | undefined;
    if ((now_ ?? null) === (before ?? null)) continue;
    if (before && before !== now_) sideEdit("people", before, (r) => { if (r.partner_id === t.id) r.partner_id = null; });
    if (now_) {
      const q = st.people.get(now_);
      if (q?.partner_id && q.partner_id !== t.id) sideEdit("people", String(q.partner_id), (r) => { if (r.partner_id === now_) r.partner_id = null; });
      sideEdit("people", now_, (r) => { r.partner_id = t.id; });
    }
  }

  // 4. person deleted → clear partner_id / parent_ids pointing at them
  const gone = new Set([...touches.values()].filter((t) => t.table === "people" && t.op === "delete").map((t) => t.id));
  if (gone.size) {
    for (const [id, p] of st.people) {
      const parents = (p.parent_ids as string[]) ?? [];
      const partner = gone.has(String(p.partner_id ?? ""));
      if (!partner && !parents.some((x) => gone.has(x))) continue;
      sideEdit("people", id, (r) => {
        if (partner) r.partner_id = null;
        r.parent_ids = parents.filter((x) => !gone.has(x));
      });
    }
  }
  for (const t of touches.values()) {
    if (t.op !== "delete") continue;
    if (t.table === "parties" && [...st.people.values()].some((p) => p.party_id === t.id))
      return fail(422, "invalid", `${t.id} still has people — move or delete them in the same save`);
  }
  for (const f of st.fit.values()) {
    if (!st.musthaves.has(String(f.musthave_id))) return fail(422, "invalid", `must-have ${f.musthave_id} does not exist`);
  }

  // 5. validation: reject only errors this save introduces
  if ([...touches.values()].some((t) => t.table === "people" || t.table === "parties" || (t.table === "params" && t.id === "kidsPolicy"))) {
    const sig = (i: Issue) => `${i.where}|${i.msg}`;
    const before = new Set(validatePeople(peopleOf(orig), policyOf(orig)).filter((i) => i.level === "error").map(sig));
    const introduced = validatePeople(peopleOf(st), policyOf(st)).filter((i) => i.level === "error" && !before.has(sig(i)));
    if (introduced.length) return fail(422, "invalid", introduced.map((i) => `${i.where}: ${i.msg}`).join("; "), { issues: introduced });
  }

  // 6. one batch: guards, writes (parents first: parties/musthaves created first, deleted last), audit, trim
  const all = [...touches.values()];
  const parentTable = (t: Touch) => t.table === "parties" || t.table === "musthaves";
  const rank = (t: Touch) => (parentTable(t) ? (t.op === "create" ? 0 : t.op === "delete" ? 3 : 1) : t.op === "delete" ? 2 : 1);
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
