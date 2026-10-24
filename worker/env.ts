// Minimal binding types (the subset this Worker uses). Own types instead of @cloudflare/workers-types so worker/ shares the
// app's tsconfig, and tests/dev can pass the node:sqlite adapter (scripts/d1-sqlite.ts).
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta?: { changes?: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  /** one transaction: any failing statement rolls back all */
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface Env {
  DB: D1Database;
  ASSETS: { fetch(req: Request): Promise<Response> };
  /** e.g. "https://<team>.cloudflareaccess.com" (https:// optional) */
  ACCESS_TEAM_DOMAIN?: string;
  /** comma list of Access application AUD tags */
  ACCESS_AUD?: string;
  /** comma list; only these emails may use the API */
  ALLOWED_EMAILS?: string;
  /** local dev only, from .dev.vars or the vite dev middleware; honoured only on localhost */
  DEV_ACCESS_EMAIL?: string;
}
