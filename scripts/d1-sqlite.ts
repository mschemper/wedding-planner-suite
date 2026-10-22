// D1-compatible adapter over node:sqlite (Node ≥22.13). Used by tests/worker.test.ts and the vite dev /api middleware,
// because workerd (wrangler dev / vitest-pool-workers) crashes on Mark's PC (docs/HISTORY.md v3). Implements only worker/env.ts D1Database.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncT } from "node:sqlite";

// require(), not import: vite 5 does not know node:sqlite as a builtin and strips the node: prefix.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = DatabaseSyncT;
import type { D1Database, D1PreparedStatement, D1Result } from "../worker/env";

type SqlValue = null | number | bigint | string | Uint8Array;
const val = (v: unknown): SqlValue => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : (v as SqlValue));

class Stmt implements D1PreparedStatement {
  constructor(private db: DatabaseSync, readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]): D1PreparedStatement {
    return new Stmt(this.db, this.sql, values);
  }
  private s() {
    return this.db.prepare(this.sql);
  }
  async first<T>(): Promise<T | null> {
    return ((this.s().get(...this.values.map(val)) as T) ?? null);
  }
  async all<T>(): Promise<D1Result<T>> {
    return { results: this.s().all(...this.values.map(val)) as T[] };
  }
  async run(): Promise<D1Result> {
    return this.runSync();
  }
  runSync(): D1Result {
    const r = this.s().run(...this.values.map(val));
    return { results: [], meta: { changes: Number(r.changes) } };
  }
}

export class SqliteD1 implements D1Database {
  readonly raw: DatabaseSync;
  constructor(path = ":memory:") {
    this.raw = new DatabaseSync(path);
    this.raw.exec("PRAGMA foreign_keys = ON;");
  }
  prepare(sql: string): D1PreparedStatement {
    return new Stmt(this.raw, sql);
  }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    this.raw.exec("BEGIN");
    try {
      const out = statements.map((s) => (s as Stmt).runSync());
      this.raw.exec("COMMIT");
      return out;
    } catch (e) {
      this.raw.exec("ROLLBACK");
      throw e;
    }
  }
  /** Applies migrations/*.sql in order. */
  migrate(files = ["migrations/0001_init.sql", "migrations/0002_garden.sql"]): this {
    for (const f of files) this.raw.exec(readFileSync(f, "utf8"));
    return this;
  }
  get empty(): boolean {
    return !this.raw.prepare("SELECT 1 FROM people LIMIT 1").get();
  }
}
