// v14 data layer (DESIGN-v14 §4–5): task deps, month agenda, checklist template, addresses (pure + Worker). Synthetic data only.
import { beforeEach, describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import type { ApiData, Op, WriteResult } from "../src/api/types";
import { SEED_FIT, SEED_MUSTHAVES, SEED_TASKS, SEED_VENUES } from "../src/data/seed-v4";
import { addressIssue, addressProgress, cleanAddress, formatAddress } from "../src/people/address";
import { inviteCtx } from "../src/people/invite";
import type { PeopleData } from "../src/people/types";
import { cycleIds, depIssues, earliestDue, monthAgenda, readyNow, taskState, byIdMap, waitingOn, wouldCycle } from "../src/plan/deps";
import { TEMPLATE, templateDrafts, templateKey, templateOps } from "../src/plan/template";
import type { Task } from "../src/plan/types";
import { SqliteD1 } from "../scripts/d1-sqlite";
import { handleApi } from "../worker/api";
import type { Env } from "../worker/env";
import { seedRows, type SeedSet } from "../worker/seed";

const tk = (id: string, due: string | null, extra: Partial<Task> = {}): Task =>
  ({ id, title: `T ${id}`, due, owner: "Both", category: "admin", status: "open", depends_on: [], kind: "task", ...extra });

describe("deps (pure)", () => {
  const tasks = [
    tk("a", "2026-11-20", { kind: "decision" }),
    tk("b", "2026-12-05", { depends_on: ["a"] }),
    tk("c", "2026-11-01"),
    tk("d", "2026-10-01", { status: "done" }),
    tk("e", null, { depends_on: ["d"] }),
    tk("f", "2026-11-25", { depends_on: ["b"] }),
  ];
  const byId = byIdMap(tasks);
  const today = "2026-11-10";
  it("states: waiting beats overdue; done blockers do not block", () => {
    expect(taskState(tasks[1], byId, today)).toBe("waiting");
    expect(taskState(tasks[2], byId, today)).toBe("overdue");
    expect(taskState(tasks[4], byId, today)).toBe("ready");
    expect(taskState(tasks[3], byId, today)).toBe("done");
    expect(waitingOn(tasks[1], byId).map((x) => x.id)).toEqual(["a"]);
  });
  it("ready now: decisions first, then overdue, then by due", () => {
    expect(readyNow(tasks, today).map((x) => x.id)).toEqual(["a", "c", "e"]);
  });
  it("month agenda: overdue rolls into this month, undated last", () => {
    const m = monthAgenda(tasks, today);
    expect(m.map((x) => x.key)).toEqual(["2026-10", "2026-11", "2026-12", "none"]);
    expect(m[1].items.map((x) => x.task.id)).toEqual(["c", "a", "f"]);
    expect(m[1].label).toBe("November 2026");
    expect(m.at(-1)!.label).toBe("No date yet");
  });
  it("dep issues: due before a blocker; missing blocker", () => {
    const issues = depIssues([...tasks, tk("g", null, { depends_on: ["zz"] })]);
    expect(issues.map((i) => i.id).sort()).toEqual(["f", "g"]);
  });
  it("cycles", () => {
    expect(wouldCycle(tasks, "a", ["f"])).toBe(true);
    expect(wouldCycle(tasks, "a", ["a"])).toBe(true);
    expect(wouldCycle(tasks, "c", ["a"])).toBe(false);
    expect(cycleIds([{ id: "x", depends_on: ["y"] }, { id: "y", depends_on: ["x"] }, { id: "z", depends_on: ["x"] }])).toEqual(["x", "y"]);
  });
  it("earliest due = latest blocker + 1 day", () => {
    expect(earliestDue(tasks[5], byId)).toBe("2026-12-06");
    expect(earliestDue(tasks[2], byId)).toBeNull();
  });
});

describe("checklist template (pure)", () => {
  it("keys unique; deps name earlier-due items that exist", () => {
    const keys = new Set(TEMPLATE.map((m) => m.key));
    expect(keys.size).toBe(TEMPLATE.length);
    for (const m of TEMPLATE) for (const dk of m.deps ?? []) {
      const dep = TEMPLATE.find((x) => x.key === dk);
      expect(dep, `${m.key} -> ${dk}`).toBeTruthy();
      expect(dep!.before, `${m.key} due before its blocker ${dk}`).toBeGreaterThanOrEqual(m.before);
    }
    expect(cycleIds(TEMPLATE.map((m) => ({ id: m.key, depends_on: m.deps })))).toEqual([]);
  });
  it("drafts count back from the wedding, clamp to today, skip present (template or v11 milestone)", () => {
    const drafts = templateDrafts("2027-05-29", "2026-11-20", [{ source: "template:budget" }, { source: "milestone:photo" }]);
    expect(drafts.find((x) => x.key === "budget")).toBeUndefined();
    expect(drafts.find((x) => x.key === "photo-book")).toBeUndefined();
    const contract = drafts.find((x) => x.key === "joinery-contract")!;
    expect(contract).toMatchObject({ due: "2026-11-20", late: true });
    expect(drafts.find((x) => x.key === "confirm")!.due).toBe("2027-05-22");
    expect(templateKey("milestone:save-dates")).toBe("std-send");
  });
  it("ops: deps → tmp ids in the batch, existing task ids, or dropped", () => {
    const drafts = templateDrafts("2027-05-29", "2026-11-10", [{ source: "template:budget" }]);
    const ops = templateOps(drafts, new Set(["guest-list", "addresses", "std-send"]), [{ id: "T050", source: "template:budget" }]);
    const row = (k: string) => ops.find((o) => o.op === "create" && o.row.source === `template:${k}`)!.op === "create"
      ? (ops.find((o) => o.op === "create" && o.row.source === `template:${k}`) as Extract<Op, { op: "create" }>).row : null;
    expect(row("guest-list")!.depends_on).toEqual(["T050"]);
    expect(row("addresses")!.depends_on).toEqual(["tmp:guest-list"]);
    expect(row("std-send")!.depends_on).toEqual(["tmp:addresses"]); // std-design + website not chosen → dropped
  });
});

describe("addresses (pure)", () => {
  const a = { line1: "1 Main St", line2: "Apt 2", city: "Springfield", region: "il", postal: "62701", country: "us" };
  it("format + clean", () => {
    expect(formatAddress(cleanAddress(a))).toEqual(["1 Main St", "Apt 2", "Springfield, IL 62701"]);
    expect(formatAddress({ ...a, line2: null, country: "CA", region: "ON", postal: "K1A 0B1" })).toEqual(["1 Main St", "Springfield, ON K1A 0B1", "CA"]);
  });
  it("issues", () => {
    expect(addressIssue(a)).toBeNull();
    expect(addressIssue({ ...a, line1: " " })).toMatch(/street/);
    expect(addressIssue({ ...a, region: "Illinois" })).toMatch(/State/);
    expect(addressIssue({ ...a, postal: "627" })).toMatch(/ZIP/);
    expect(addressIssue({ ...a, postal: "62701-1234" })).toBeNull();
    expect(addressIssue({ ...a, country: "GB", region: null, postal: "" })).toMatch(/postal/);
  });
  it("progress over invited households", () => {
    const data = fixture as unknown as PeopleData;
    const ctx = inviteCtx(data, "ours");
    const first = data.parties.find((p) => p.invite === "invite")!;
    const p = addressProgress(data, [{ id: first.id, line1: "x", city: "y", country: "US", verified: false }, { id: "GONE", line1: "x", city: "y", country: "US", verified: false }], ctx);
    expect(p.have.map((h) => h.id)).toEqual([first.id]);
    expect(p.missing.length).toBe(p.invited.length - 1);
    expect(p.other.map((x) => x.id)).toEqual(["GONE"]);
  });
});

describe("Worker: deps + addresses", () => {
  let db: SqliteD1;
  let env: Env;
  const SEED: SeedSet = { ...(fixture as unknown as SeedSet), venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, tasks: SEED_TASKS };
  beforeEach(() => {
    db = new SqliteD1().migrate();
    for (const r of seedRows(SEED, "seed", "2026-10-21T00:00:00Z")) db.raw.prepare(r.sql).run(...(r.values as never[]));
    env = { DB: db, ASSETS: { fetch: async () => new Response("asset") }, DEV_ACCESS_EMAIL: "mark@example.com" };
  });
  const call = (path: string, init: RequestInit = {}) => handleApi(new Request("http://localhost:5173" + path, init), env);
  const write = (ops: Op[]) => call("/api/write", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" }, body: JSON.stringify({ ops }) });
  const ok = async (ops: Op[]) => {
    const r = await write(ops);
    const body = await r.json();
    expect(r.status, JSON.stringify(body)).toBe(200);
    return body as WriteResult;
  };
  const data = async () => (await (await call("/api/data")).json()) as ApiData;
  const addr = (id: string, extra = {}) => ({ table: "addresses" as const, op: "create" as const, row: { id, line1: "742 Evergreen Terrace", city: "Springfield", region: "IL", postal: "62701", ...extra } });

  it("template save resolves tmp deps; skips duplicates by source", async () => {
    const drafts = templateDrafts("2027-05-29", "2026-11-10", []);
    const r = await ok(templateOps(drafts, new Set(["budget", "guest-list"]), []));
    const gl = r.data.tasks.find((x) => x.source === "template:guest-list")!;
    expect(gl.depends_on).toEqual([r.ids["tmp:budget"]]);
    expect(gl.kind).toBe("decision");
    const again = await ok(templateOps(drafts, new Set(["budget"]), []));
    expect(again.data.tasks.filter((x) => x.source === "template:budget")).toHaveLength(1);
  });
  it("rejects a loop and a missing dep; deleting a task unhooks dependants", async () => {
    const r = await ok([{ table: "tasks", op: "create", row: { id: "tmp:a", title: "A" } }, { table: "tasks", op: "create", row: { id: "tmp:b", title: "B", depends_on: ["tmp:a"] } }]);
    const a = r.data.tasks.find((x) => x.id === r.ids["tmp:a"])!;
    expect((await write([{ table: "tasks", op: "update", id: a.id, version: a.version, row: { depends_on: [r.ids["tmp:b"]] } }])).status).toBe(422);
    expect((await write([{ table: "tasks", op: "create", row: { title: "C", depends_on: ["T999"] } }])).status).toBe(422);
    const d = await ok([{ table: "tasks", op: "delete", id: a.id, version: a.version }]);
    expect(d.data.tasks.find((x) => x.id === r.ids["tmp:b"])!.depends_on).toEqual([]);
  });
  it("an old bad dep never blocks other task edits", async () => {
    db.raw.prepare("UPDATE tasks SET depends_on = '[\"T999\"]' WHERE id = 'T001'").run();
    const t2 = (await data()).tasks.find((x) => x.id !== "T001")!;
    await ok([{ table: "tasks", op: "update", id: t2.id, version: t2.version, row: { title: "Renamed" } }]);
  });
  it("address: one per household, household must exist, defaults", async () => {
    const h = fixture.parties[1].id;
    const r = await ok([addr(h)]);
    expect(r.data.addresses[0]).toMatchObject({ id: h, country: "US", verified: false });
    expect((await write([addr(h)])).status).toBe(409);
    expect((await write([addr("H-NOPE")])).status).toBe(422);
    expect((await write([{ table: "addresses", op: "create", row: { id: h + "x", city: "x" } }])).status).toBe(400);
  });
  it("address for a household created in the same save (tmp id)", async () => {
    const r = await ok([{ table: "parties", op: "create", row: { id: "tmp:h", name: "New household" } }, addr("tmp:h")]);
    expect(r.data.addresses.map((x) => x.id)).toContain(r.ids["tmp:h"]);
  });
  it("deleting a household deletes its address; a merge carries it over", async () => {
    const d0 = await data();
    const [from, to] = ["H-A1", "H-M3"];
    await ok([addr(from)]);
    const d1 = await data();
    const moves: Op[] = d1.people.filter((p) => p.party_id === from).map((p) => ({ table: "people", op: "update", id: p.id, version: p.version, row: { party_id: to } }));
    const fromRow = d1.parties.find((p) => p.id === from)!;
    const r = await ok([...moves, { table: "parties", op: "delete", id: from, version: fromRow.version }]);
    expect(r.data.addresses.map((x) => x.id)).toEqual([to]);
    expect(d0.addresses).toEqual([]);
  });
  it("the plan feed carries no address", async () => {
    await ok([addr(fixture.parties[1].id)]);
    const f = await (await call("/api/feed/plan")).text();
    expect(f).not.toMatch(/Evergreen|Springfield|62701/);
  });
});
