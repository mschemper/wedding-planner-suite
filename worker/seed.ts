// GuestData → INSERT rows for D1 (one-time seed; DESIGN-v3 §2). Pure: scripts/seed-d1.ts renders SQL text, the dev server binds params.
import type { TableName } from "../src/api/types";
import type { GuestData } from "../src/guests/schema";
import { META, TABLES, toDbValues, type Rec } from "./db";

export interface SeedRow {
  table: TableName;
  sql: string;
  values: unknown[];
}

export function seedRows(d: GuestData, who: string, now = new Date().toISOString()): SeedRow[] {
  const out: SeedRow[] = [];
  const add = (table: TableName, rows: object[]) => {
    const cols = [...TABLES[table].cols, ...META];
    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
    for (const r of rows) {
      const row: Rec = { ...(r as Rec), version: 1, updated_at: now, updated_by: who };
      if (table === "friends" && typeof row.Ranking === "number") row.Ranking = String(row.Ranking);
      out.push({ table, sql, values: toDbValues(table, row) });
    }
  };
  add("households", d.households);
  add("individuals", d.individuals);
  add("friends", d.friends);
  return out;
}

const lit = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

/** SQL text for `wrangler d1 execute --file`. */
export const seedSql = (rows: SeedRow[]) =>
  rows.map((r) => { let i = 0; return r.sql.replace(/\?/g, () => lit(r.values[i++])) + ";"; }).join("\n") + "\n";
