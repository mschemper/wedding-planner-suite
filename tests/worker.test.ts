// Worker API against node:sqlite (scripts/d1-sqlite.ts) with the real migrations. DESIGN-v3 §2–3, DESIGN-v4 §3.
import { readFileSync } from "node:fs";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import pkg from "../package.json";
import type { ApiData, ApiErrorBody, Op, WriteResult } from "../src/api/types";
import { SEED_FIT, SEED_MUSTHAVES, SEED_TASKS, SEED_VENUES } from "../src/data/seed-v4";
import { SqliteD1 } from "../scripts/d1-sqlite";
import type Anthropic from "@anthropic-ai/sdk";
import { handleApi } from "../worker/api";
import type { CreateFn } from "../worker/research";
import { guardStmt } from "../worker/db";
import type { Env } from "../worker/env";
import { seedRows, seedSql, type SeedSet } from "../worker/seed";
import { AUDIT_KEEP } from "../worker/write";

const TEAM = "https://example-team.cloudflareaccess.com";
const AUD = "aud-1";
const LOCAL = "http://localhost:5173";
let db: SqliteD1;
let env: Env;
const SEED: SeedSet = { ...(fixture as unknown as SeedSet), venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, tasks: SEED_TASKS };

function freshDb() {
  db = new SqliteD1().migrate();
  for (const r of seedRows(SEED, "seed", "2026-10-21T00:00:00Z")) db.raw.prepare(r.sql).run(...(r.values as never[]));
  env = { DB: db, ASSETS: { fetch: async () => new Response("asset") }, DEV_ACCESS_EMAIL: "mark@example.com" };
}

const call = (path: string, init: RequestInit = {}, base = LOCAL, e: Env = env, jwks?: JWTVerifyGetKey) =>
  handleApi(new Request(base + path, init), e, jwks);
const write = (ops: Op[], base = LOCAL) =>
  call("/api/write", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ ops }) }, base);
const data = async () => (await (await call("/api/data")).json()) as ApiData;
const person = (d: ApiData, id: string) => d.people.find((p) => p.id === id)!;
const party = (d: ApiData, id: string) => d.parties.find((p) => p.id === id)!;
const ok = async (ops: Op[]) => {
  const r = await write(ops);
  const body = await r.json();
  expect(r.status, JSON.stringify(body)).toBe(200);
  return body as WriteResult;
};

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
  it("GET /api/data returns every v4 table with versions; no-store", async () => {
    const r = await call("/api/data");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    const d = (await r.json()) as ApiData;
    expect(d.people).toHaveLength(fixture.people.length);
    expect(d.parties).toHaveLength(fixture.parties.length);
    expect(d.venues.length).toBe(SEED_VENUES.length);
    expect(d.venues.filter((v) => v.active).map((v) => v.scenario_id).sort()).toEqual([17, 18, 4, 5].sort());
    expect(person(d, "M003").parent_ids).toEqual(["M001", "M002"]);
    expect(person(d, "C003").kids_room).toBe(true);
    expect(party(d, "H-A3").talk).toBe(true);
    expect(d.musthaves).toHaveLength(9);
    expect(d.me).toBe("mark@example.com");
  });
  it("GET /api/version returns package.json version", async () => {
    expect(await (await call("/api/version")).json()).toEqual({ version: pkg.version });
  });
  it("unknown route → JSON 404", async () => {
    const r = await call("/api/nope");
    expect(r.status).toBe(404);
    expect(((await r.json()) as ApiErrorBody).error).toBe("not_found");
  });
});

describe("writes", () => {
  it("update bumps version and records who; a stale version → 409 naming the editor, nothing written", async () => {
    const d = (await ok([{ table: "parties", op: "update", id: "H-M4", version: 1, row: { invite: "invite" } }])).data;
    expect(party(d, "H-M4")).toMatchObject({ invite: "invite", version: 2, updated_by: "mark@example.com" });
    const r = await write([
      { table: "parties", op: "update", id: "H-A2", version: 1, row: { notes: "first" } },
      { table: "parties", op: "update", id: "H-M4", version: 1, row: { invite: "no" } },
    ]);
    expect(r.status).toBe(409);
    expect(((await r.json()) as ApiErrorBody).row).toMatchObject({ id: "H-M4", updated_by: "mark@example.com" });
    expect(party(await data(), "H-A2").notes).toBeNull();
  });

  it("the batch guard rolls back every statement when a row changed underneath", async () => {
    db.raw.exec("UPDATE parties SET version = 5 WHERE id = 'H-M4'");
    await expect(db.batch([
      db.prepare("UPDATE parties SET notes = 'x' WHERE id = 'H-A2'"),
      guardStmt(db, "parties", "H-M4", 1),
    ])).rejects.toThrow(/CHECK/);
    expect(party(await data(), "H-A2").notes).toBeNull();
  });

  it("enum and type checks → 400", async () => {
    expect((await write([{ table: "parties", op: "update", id: "H-M4", version: 1, row: { invite: "maybe" } }])).status).toBe(400);
    expect((await write([{ table: "people", op: "update", id: "M001", version: 1, row: { deceased: "yes" } }])).status).toBe(400);
    expect((await write([{ table: "tasks", op: "update", id: "T001", version: 1, row: { due: "Oct 30" } }])).status).toBe(400);
    expect((await write([{ table: "people", op: "update", id: "M001", version: 1, row: { nope: 1 } }])).status).toBe(400);
  });

  it("creates a party + people with tmp ids; server allocates H/P ids and resolves refs", async () => {
    const r = await ok([
      { table: "parties", op: "create", row: { id: "tmp:h", name: "New household" } },
      { table: "people", op: "create", row: { id: "tmp:a", first: "Ash", side: "Mark", branch: "Mark's father's side", gen: 0, party_id: "tmp:h", parent_ids: ["M007", "M008"] } },
      { table: "people", op: "create", row: { id: "tmp:b", first: "Bay", side: "Mark", party_id: "tmp:h", partner_id: "tmp:a" } },
    ]);
    expect(r.ids["tmp:h"]).toBe("H001");
    expect(r.ids["tmp:a"]).toBe("P001");
    const a = person(r.data, "P001"), b = person(r.data, "P002");
    expect(a).toMatchObject({ party_id: "H001", parent_ids: ["M007", "M008"], partner_id: "P002", kind: "family", age: "adult", local: "unknown" });
    expect(b.partner_id).toBe("P001");
    expect(party(r.data, "H001").invite).toBe("undecided");
  });

  it("setting a partner on one side mirrors it and clears the old partners", async () => {
    const d = (await ok([{ table: "people", op: "update", id: "M009", version: 1, row: { partner_id: "A006" } }])).data;
    expect(person(d, "M009").partner_id).toBe("A006");
    expect(person(d, "A006").partner_id).toBe("M009");
    expect(person(d, "M010").partner_id).toBeNull();
  });

  it("deleting a person clears partner and parent links", async () => {
    const d = (await ok([{ table: "people", op: "delete", id: "M003", version: 1 }])).data;
    expect(person(d, "M004").partner_id).toBeNull();
    expect(person(d, "M005").parent_ids).toEqual(["M004"]);
  });

  it("refuses a parent loop, a missing household, and a non-empty household delete", async () => {
    expect((await write([{ table: "people", op: "update", id: "M001", version: 1, row: { parent_ids: ["M005"] } }])).status).toBe(422);
    expect((await write([{ table: "people", op: "update", id: "M001", version: 1, row: { party_id: "H-NOPE" } }])).status).toBe(422);
    expect((await write([{ table: "parties", op: "delete", id: "H-A4", version: 1 }])).status).toBe(422);
  });

  it("venues: update only; musthaves: no delete; fit id derived", async () => {
    expect((await write([{ table: "venues", op: "create", row: { scenario_id: 99 } }])).status).toBe(400);
    expect((await write([{ table: "musthaves", op: "delete", id: "MH01", version: 1 }])).status).toBe(400);
    const r = await ok([
      { table: "musthaves", op: "create", row: { id: "tmp:m", text: "Photo booth", sort: 95 } },
      { table: "fit", op: "create", row: { id: "tmp:f", scenario_id: 17, musthave_id: "tmp:m", verdict: "yes" } },
      { table: "venues", op: "update", id: "17", version: 1, row: { status: "booked" } },
    ]);
    expect(r.ids["tmp:m"]).toBe("MH10");
    expect(r.ids["tmp:f"]).toBe("17:MH10");
    expect(r.data.venues.find((v) => v.scenario_id === 17)!.status).toBe("booked");
  });

  it("added venues (v7): custom row + shortlist row + task in one save; rules", async () => {
    const venue = { scenario_id: 1000, name: "Garden Hall", location: "Chicago", kind: "local", confidence: 55, sources: ["https://example.com"],
      items: [{ cat: "Venue & site", desc: "Rental", type: "fixed", amount: 6000 }, { cat: "Food & beverage", desc: "Catering", type: "perGuest", rate: 95 }] };
    // a seeded scenario's row cannot be created; a venues row needs its custom_venues row; bad items are refused
    expect((await write([{ table: "venues", op: "create", row: { scenario_id: 17 } }])).status).toBe(400);
    expect((await write([{ table: "venues", op: "create", row: { scenario_id: 1000, active: true } }])).status).toBe(400);
    expect((await write([{ table: "custom_venues", op: "create", row: { ...venue, items: [{ cat: "Venue & site", desc: "x", type: "fixed", amount: -5 }] } }])).status).toBe(400);
    const r = await ok([
      { table: "custom_venues", op: "create", row: venue },
      { table: "venues", op: "create", row: { scenario_id: 1000, active: true, status: "researching" } },
      { table: "tasks", op: "create", row: { title: "Contact Garden Hall", category: "venue", scenario_id: 1000 } },
    ]);
    expect(r.data.custom_venues.map((v) => [v.scenario_id, v.name, v.items.length])).toEqual([[1000, "Garden Hall", 2]]);
    expect(r.data.venues.find((v) => v.scenario_id === 1000)!.active).toBe(true);
    expect((await write([{ table: "custom_venues", op: "create", row: venue }])).status).toBe(409);
    expect((await write([{ table: "custom_venues", op: "delete", id: "1000", version: 1 }])).status).toBe(400);
  });

  it("tasks: create and check off", async () => {
    let r = await ok([{ table: "tasks", op: "create", row: { title: "Book florist", owner: "Angela", category: "vendor", due: "2026-12-01" } }]);
    const id = r.ids["tmp:x"] ?? r.data.tasks.find((t) => t.title === "Book florist")!.id;
    expect(id).toBe("T012");
    r = await ok([{ table: "tasks", op: "update", id, version: 1, row: { status: "done", done_at: "2026-10-22T12:00:00Z" } }]);
    expect(r.data.tasks.find((t) => t.id === id)!.status).toBe("done");
  });

  it("settings params validate: kidsPolicy, dateWindows", async () => {
    await ok([{ table: "params", op: "create", row: { key: "kidsPolicy", value: "all" } }]);
    expect((await write([{ table: "params", op: "create", row: { key: "dateWindows", value: [{ name: "x", from: "2027-06-01", to: "2027-05-01", ref: "2027-05-15" }] } }])).status).toBe(400);
  });

  it("audit records before/after; trimmed to AUDIT_KEEP", async () => {
    await ok([{ table: "parties", op: "update", id: "H-M4", version: 1, row: { talk: true, talk_note: "ask Angela" } }]);
    const a = (await (await call("/api/audit?limit=5")).json()) as { tbl: string; before: { talk: number }; after: { talk: boolean } }[];
    expect(a[0]).toMatchObject({ tbl: "parties" });
    expect(a[0].after.talk).toBe(true);
    expect(AUDIT_KEEP).toBeGreaterThan(100);
  });

  it("seedSql renders runnable SQL", () => {
    const fresh = new SqliteD1().migrate();
    fresh.raw.exec(seedSql(seedRows(SEED, "seed", "2026-10-21T00:00:00Z")));
    expect((fresh.raw.prepare("SELECT COUNT(*) n FROM people").get() as { n: number }).n).toBe(fixture.people.length);
  });
});

describe("venue research (v7, fake Claude client — no network)", () => {
  const post = (body: unknown, fake?: CreateFn) =>
    handleApi(new Request(`${LOCAL}/api/research`, { method: "POST", headers: { "Content-Type": "application/json", Origin: LOCAL }, body: JSON.stringify(body) }), env, undefined, fake ? { research: fake } : {});
  const draft = {
    name: "Garden Hall", location: "Chicago", website: "https://gardenhall.example", kind: "local", description: "Glass conservatory.",
    capacity_seated: 120, capacity_kids: null, capacity_cocktail: 180,
    items: [
      { cat: "Venue & site", desc: "Saturday rental", type: "fixed", amount: 7000, rate: null, taxable: false, source_url: "https://gardenhall.example/pricing", note: null },
      { cat: "Food & beverage", desc: "Catering", type: "perGuest", amount: null, rate: 110, taxable: true, source_url: "javascript:alert(1)", note: "estimate" },
      { cat: "Food & beverage", desc: "Service + tax", type: "percent", amount: null, rate: 0.24, taxable: false, source_url: null, note: null },
    ],
    confidence: 60, summary: "Published rental; catering estimated.", sources: ["https://gardenhall.example/pricing", "not a link"],
  };
  const reply = (text: string, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text }] }) as unknown as Anthropic.Beta.BetaMessage;

  it("503 without a key, 400 without a name", async () => {
    expect((await post({ name: "X" })).status).toBe(503);
    expect((await post({ name: " " }, async () => reply("{}"))).status).toBe(400);
  });
  it("returns a cleaned draft; continues after pause_turn; sends web search + structured output", async () => {
    const calls: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];
    const fake: CreateFn = async (p) => { calls.push(p); return calls.length === 1 ? reply("", "pause_turn") : reply(JSON.stringify(draft)); };
    const r = await post({ name: "Garden Hall", city: "Chicago", guests: 75 }, fake);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d).toMatchObject({ name: "Garden Hall", capacity_seated: 120, capacity_kids: null, confidence: 60, sources: ["https://gardenhall.example/pricing"] });
    expect(d.items[1].source_url).toBeNull();
    expect(d.researched_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ model: "claude-opus-5-5", tools: [{ type: "web_search_20260209" }], output_config: { format: { type: "json_schema" } } });
    expect(calls[1].messages).toHaveLength(2);
  });
  it("refuses unusable output and refusals", async () => {
    const bad = { ...draft, items: [{ ...draft.items[0], amount: -1 }] };
    const dropped = await post({ name: "X" }, async () => reply(JSON.stringify(bad)));
    expect(dropped.status).toBe(200);
    expect((await dropped.json()).items).toHaveLength(0);
    expect((await post({ name: "X" }, async () => reply("", "refusal"))).status).toBe(502);
    expect((await post({ name: "X" }, async () => reply("not json"))).status).toBe(502);
  });
});

describe("venue research repairs common slips (v8 hotfix)", () => {
  it("per-guest totals become fixed lines, 22 becomes 0.22, unusable lines are dropped and named", async () => {
    const { cleanDraft } = await import("../worker/research");
    const raw = { name: "Hall", location: null, website: null, kind: "local", description: null, capacity_seated: 100, capacity_kids: null, capacity_cocktail: null,
      confidence: 40, summary: "S.", sources: [],
      items: [
        { cat: "Food & beverage", desc: "F&B minimum", type: "perGuest", amount: null, rate: 14000, taxable: true, source_url: null, note: null },
        { cat: "Food & beverage", desc: "Catering", type: "perGuest", amount: 9500, rate: null, taxable: true, source_url: null, note: null },
        { cat: "Food & beverage", desc: "Service", type: "percent", amount: null, rate: 22, taxable: false, source_url: null, note: null },
        { cat: "Venue & site", desc: "Rental", type: "fixed", amount: null, rate: 5000, taxable: false, source_url: null, note: null },
        { cat: "Nope", desc: "Weird", type: "fixed", amount: 1, rate: null, taxable: false, source_url: null, note: null },
      ] };
    const d = cleanDraft(raw, { name: "Hall" }, "2026-10-23");
    expect(d.items.map((i) => [i.type, i.amount, i.rate])).toEqual([["fixed", 14000, null], ["fixed", 9500, null], ["percent", null, 0.22], ["fixed", 5000, null]]);
    expect(d.items[0].note).toMatch(/total/);
    expect(d.summary).toContain("Weird");
  });
});
