// Worker API against node:sqlite (scripts/d1-sqlite.ts) with the real migration. DESIGN-v3 §2–3.
import { readFileSync } from "node:fs";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fixture from "../data/fixtures/guests.sample.json";
import type { ApiData, ApiErrorBody, Op, WriteResult } from "../src/api/types";
import type { GuestData } from "../src/guests/schema";
import { SqliteD1 } from "../scripts/d1-sqlite";
import { handleApi } from "../worker/api";
import { guardStmt } from "../worker/db";
import type { Env } from "../worker/env";
import { seedRows, seedSql } from "../worker/seed";
import { AUDIT_KEEP } from "../worker/write";

const TEAM = "https://example-team.cloudflareaccess.com";
const AUD = "aud-1";
const LOCAL = "http://localhost:5173";
let db: SqliteD1;
let env: Env;

function freshDb() {
  db = new SqliteD1().migrate();
  for (const r of seedRows(fixture as unknown as GuestData, "seed", "2026-10-21T00:00:00Z")) db.raw.prepare(r.sql).run(...(r.values as never[]));
  env = { DB: db, ASSETS: { fetch: async () => new Response("asset") }, DEV_ACCESS_EMAIL: "mark@example.com" };
}

const call = (path: string, init: RequestInit = {}, base = LOCAL, e: Env = env, jwks?: JWTVerifyGetKey) =>
  handleApi(new Request(base + path, init), e, jwks);
const write = (ops: Op[], base = LOCAL) =>
  call("/api/write", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ ops }) }, base);
const data = async () => (await (await call("/api/data")).json()) as ApiData;
const person = (d: ApiData, id: string) => d.individuals.find((p) => p.PersonID === id)!;

beforeEach(freshDb);

describe("auth", () => {
  let jwks: JWTVerifyGetKey;
  let key: CryptoKey;
  const prod = (): Env => ({ ...env, DEV_ACCESS_EMAIL: undefined, ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: `other, ${AUD}`, ALLOWED_EMAILS: "mark@example.com, angela@example.com" });
  const token = (claims: Record<string, unknown>, exp: string | number = "1h") =>
    new SignJWT({ email: "angela@example.com", ...claims }).setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(TEAM).setAudience((claims.aud as string) ?? AUD).setIssuedAt().setExpirationTime(exp).sign(key);
  const get = async (t?: string, e = prod()) =>
    call("/api/data", t ? { headers: { "Cf-Access-Jwt-Assertion": t } } : {}, "https://wedding.example.workers.dev", e, jwks);

  beforeAll(async () => {
    const kp = await generateKeyPair("RS256");
    key = kp.privateKey;
    jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(kp.publicKey)), kid: "k1", alg: "RS256" }] });
  });

  it("valid Access JWT for an allowed email → 200", async () => {
    const r = await get(await token({}));
    expect(r.status).toBe(200);
    expect(((await r.json()) as ApiData).me).toBe("angela@example.com");
  });
  it("no JWT → 401; wrong aud → 401; expired → 401; email not allowed → 403", async () => {
    expect((await get()).status).toBe(401);
    expect((await get(await token({ aud: "nope" }))).status).toBe(401);
    expect((await get(await token({}, Math.floor(Date.now() / 1000) - 3600))).status).toBe(401);
    expect((await get(await token({ email: "stranger@example.com" }))).status).toBe(403);
  });
  it("fails closed when Access vars are missing", async () => {
    expect((await get(await token({}), { ...prod(), ACCESS_AUD: "" })).status).toBe(500);
  });
  it("dev bypass is ignored on a non-localhost host", async () => {
    const r = await call("/api/data", {}, "https://wedding.example.workers.dev", env);
    expect(r.status).toBe(500);
  });
  it("wrangler.jsonc never carries the dev bypass", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).not.toMatch(/DEV_ACCESS_EMAIL"\s*:/);
  });
});

describe("csrf + routing", () => {
  it("rejects a cross-site or non-JSON write", async () => {
    const body = JSON.stringify({ ops: [] });
    expect((await call("/api/write", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body })).status).toBe(403);
    expect((await call("/api/write", { method: "POST", headers: { "Content-Type": "text/plain", Origin: LOCAL }, body })).status).toBe(403);
  });
  it("GET /api/data returns the seeded rows with versions; responses are no-store", async () => {
    const r = await call("/api/data");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    const d = (await r.json()) as ApiData;
    expect(d.households).toHaveLength(4);
    expect(person(d, "M003").ParentPersonIDs).toBe("M001,M002");
    expect(person(d, "M001").version).toBe(1);
    expect(d.me).toBe("mark@example.com");
  });
  it("unknown route → JSON 404", async () => {
    const r = await call("/api/nope");
    expect(r.status).toBe(404);
    expect(((await r.json()) as ApiErrorBody).error).toBe("not_found");
  });
});

describe("writes", () => {
  it("update bumps version and records who; a stale version → 409 naming the editor, nothing written", async () => {
    let r = await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { Locality: "Local Chicago Area" } }]);
    expect(r.status).toBe(200);
    const d = ((await r.json()) as WriteResult).data;
    expect(person(d, "M001")).toMatchObject({ Locality: "Local Chicago Area", version: 2, updated_by: "mark@example.com" });

    r = await write([
      { table: "individuals", op: "update", id: "M002", version: 1, row: { Notes: "first" } },
      { table: "individuals", op: "update", id: "M001", version: 1, row: { Notes: "stale" } },
    ]);
    expect(r.status).toBe(409);
    expect(((await r.json()) as ApiErrorBody).row).toMatchObject({ id: "M001", updated_by: "mark@example.com" });
    expect(person(await data(), "M002").Notes).toBeUndefined();
  });

  it("the batch guard rolls back every statement when a row changed underneath", async () => {
    db.raw.exec("UPDATE individuals SET version = 5 WHERE PersonID = 'M001'");
    await expect(db.batch([
      db.prepare("UPDATE individuals SET Notes = 'x' WHERE PersonID = 'M002'"),
      guardStmt(db, "individuals", "M001", 1),
    ])).rejects.toThrow(/CHECK/);
    expect(person(await data(), "M002").Notes).toBeUndefined();
  });

  it("creates a household + people with tmp ids; server allocates ids and rewrites links", async () => {
    const r = await write([
      { table: "households", op: "create", row: { HouseholdID: "tmp:h", _branch: "par", Family: "Mark", FamilySide: "Groom's father", PrimaryHouseholdName: "New" } },
      { table: "individuals", op: "create", row: { PersonID: "tmp:a", HouseholdID: "tmp:h", Family: "Mark", DisplayName: "A", AdultOrChild: "Adult", Locality: "Unknown", InviteStatus: "TBD", InviteException: "No", PartnerPersonID: "tmp:b" } },
      { table: "individuals", op: "create", row: { PersonID: "tmp:b", HouseholdID: "tmp:h", Family: "Mark", DisplayName: "B", AdultOrChild: "Adult", Locality: "Unknown", InviteStatus: "TBD", InviteException: "No", PartnerPersonID: "tmp:a" } },
      { table: "individuals", op: "create", row: { PersonID: "tmp:c", HouseholdID: "tmp:h", Family: "Mark", DisplayName: "C", AdultOrChild: "Child", Locality: "Unknown", InviteStatus: "TBD", InviteException: "No", ParentPersonIDs: "tmp:a, tmp:b" } },
    ]);
    expect(r.status).toBe(200);
    const { ids, data: d } = (await r.json()) as WriteResult;
    expect(ids).toEqual({ "tmp:h": "M-PAR-002", "tmp:a": "M006", "tmp:b": "M007", "tmp:c": "M008" });
    expect(person(d, "M006")).toMatchObject({ HouseholdID: "M-PAR-002", PartnerPersonID: "M007" });
    expect(person(d, "M008").ParentPersonIDs).toBe("M006, M007");
  });

  it("deleting a person clears partner/parent links to them (versions bumped, audited)", async () => {
    const r = await write([{ table: "individuals", op: "delete", id: "M002", version: 1 }]);
    expect(r.status).toBe(200);
    const d = ((await r.json()) as WriteResult).data;
    expect(person(d, "M001").PartnerPersonID).toBeUndefined();
    expect(person(d, "M001").version).toBe(2);
    expect(person(d, "M003").ParentPersonIDs).toBe("M001");
    const audit = (await (await call("/api/audit")).json()) as { row_id: string; op: string }[];
    expect(audit.map((a) => `${a.op}:${a.row_id}`).sort()).toEqual(["delete:M002", "update:M001", "update:M003"]);
  });

  it("household delete needs its people in the same save", async () => {
    expect((await write([{ table: "households", op: "delete", id: "A-COU-001", version: 1 }])).status).toBe(422);
    const r = await write([
      { table: "individuals", op: "delete", id: "A003", version: 1 },
      { table: "households", op: "delete", id: "A-COU-001", version: 1 },
    ]);
    expect(r.status).toBe(200);
  });

  it("rejects errors this save introduces (422 + issues), accepts saves while an old error exists elsewhere", async () => {
    let r = await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { PartnerPersonID: "GHOST" } }]);
    expect(r.status).toBe(422);
    expect(((await r.json()) as ApiErrorBody).issues?.[0].msg).toMatch(/unknown PartnerPersonID/);

    db.raw.exec("UPDATE individuals SET ParentPersonIDs = 'NOBODY' WHERE PersonID = 'A003'");
    r = await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { Notes: "ok" } }]);
    expect(r.status).toBe(200);
  });

  it("shape checks: unknown column, bad enum, missing Family → 400", async () => {
    expect((await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { Email: "x" } }])).status).toBe(400);
    expect((await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { InviteException: "Maybe" } }])).status).toBe(400);
    expect((await write([{ table: "households", op: "create", row: { PrimaryHouseholdName: "X" } }])).status).toBe(400);
  });

  it("params: create, update with version, delete = back to doc value; bad value → 400", async () => {
    expect((await write([{ table: "params", op: "create", row: { key: "dress", value: -5 } }])).status).toBe(400);
    let r = await write([{ table: "params", op: "create", row: { key: "dress", value: 3100 } }]);
    expect(r.status).toBe(200);
    expect(((await r.json()) as WriteResult).data.params).toMatchObject([{ key: "dress", value: 3100, version: 1 }]);
    expect((await write([{ table: "params", op: "create", row: { key: "dress", value: 3200 } }])).status).toBe(409);
    r = await write([{ table: "params", op: "update", id: "dress", version: 1, row: { value: 3200 } }]);
    expect(((await r.json()) as WriteResult).data.params[0]).toMatchObject({ value: 3200, version: 2 });
    r = await write([{ table: "params", op: "delete", id: "dress", version: 2 }]);
    expect(((await r.json()) as WriteResult).data.params).toEqual([]);
  });

  it("quotes: validated, stored with options JSON and boolean includes_tax", async () => {
    expect((await write([{ table: "quotes", op: "create", row: { scenario_id: 999, item_desc: "x", amount: 1, status: "received" } }])).status).toBe(400);
    const r = await write([{ table: "quotes", op: "create", row: { scenario_id: 2, item_desc: "Venue rental (Saturday)", amount: 9500, status: "received", options: { bar: "Full Bar" }, received_on: "2026-11-02" } }]);
    expect(r.status).toBe(200);
    const q = ((await r.json()) as WriteResult).data.quotes[0];
    expect(q).toMatchObject({ scenario_id: 2, amount: 9500, basis: "total", includes_tax: false, options: { bar: "Full Bar" }, version: 1 });
    expect(q.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it(`audit keeps the last ${AUDIT_KEEP}`, async () => {
    const ins = db.raw.prepare("INSERT INTO audit (ts, who, tbl, row_id, op) VALUES ('t', 'w', 'households', 'x', 'update')");
    for (let i = 0; i < AUDIT_KEEP + 20; i++) ins.run();
    await write([{ table: "individuals", op: "update", id: "M001", version: 1, row: { Notes: "n" } }]);
    expect((db.raw.prepare("SELECT COUNT(*) AS n FROM audit").get() as { n: number }).n).toBe(AUDIT_KEEP);
  });
});

describe("seed", () => {
  it("renders SQL with escaped quotes and NULLs", () => {
    const sql = seedSql(seedRows({ households: [{ HouseholdID: "M-X-001", Family: "Mark", FamilySide: "O'Brien side", PrimaryHouseholdName: "X", HouseholdType: "T" }], individuals: [], friends: [] }, "seed", "t"));
    expect(sql).toContain("'O''Brien side'");
    expect(sql).toContain("NULL");
  });
});
