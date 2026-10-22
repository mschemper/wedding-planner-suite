// Seed dataset → INSERT rows for D1 (DESIGN-v4 §5, §7). Pure: scripts/seed-v4.ts renders SQL text; the dev server and tests bind params.
import type { TableName } from "../src/api/types";
import { colNames, META, toDbValues, type Rec } from "./db";

export type SeedSet = Partial<Record<TableName, object[]>>;

export interface SeedRow {
  table: TableName;
  sql: string;
  values: unknown[];
}

/** Parents before children: parties before people, musthaves before fit. */
const ORDER: TableName[] = ["parties", "people", "venues", "musthaves", "fit", "tasks", "quotes", "params"];

export function seedRows(d: SeedSet, who: string, now = new Date().toISOString()): SeedRow[] {
  const out: SeedRow[] = [];
  for (const table of ORDER) {
    const rows = d[table];
    if (!rows?.length) continue;
    const cols = [...colNames(table), ...META];
    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
    for (const r of rows) out.push({ table, sql, values: toDbValues(table, { ...(r as Rec), version: 1, updated_at: now, updated_by: who }) });
  }
  return out;
}

const lit = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

/** SQL text for `wrangler d1 execute --file`. */
export const seedSql = (rows: SeedRow[]) =>
  rows.map((r) => { let i = 0; return r.sql.replace(/\?/g, () => lit(r.values[i++])) + ";"; }).join("\n") + "\n";
