// v14 address UI model (src/ui/people/addressModel.ts). Synthetic data only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { inviteCtx } from "../src/people/invite";
import type { Address, PeopleData } from "../src/people/types";
import { addressRows, blankForm, createOp, failText, formDirty, formFrom, formIssue, formRow, progressPct, progressText, todayIso } from "../src/ui/people/addressModel";

const D = fixture as unknown as PeopleData;
const ctx = inviteCtx(D, "ours");
const good = { ...blankForm("2026-11-10"), line1: " 742 Evergreen Terrace ", city: "Springfield", region: "il", postal: "62704" };

describe("address form", () => {
  it("defaults: US, given date, unverified", () => {
    const b = blankForm("2026-11-10");
    expect(b).toMatchObject({ country: "US", gathered: "2026-11-10", verified: false });
    expect(todayIso(new Date(2026, 10, 9))).toBe("2026-11-09");
  });
  it("issues", () => {
    expect(formIssue(blankForm("2026-11-10"))).toMatch(/street/i);
    expect(formIssue({ ...good, region: "ZZ" })).toMatch(/state/i);
    expect(formIssue({ ...good, gathered: "11/10/26" })).toMatch(/YYYY-MM-DD/);
    expect(formIssue(good)).toBeNull();
    expect(formIssue({ ...good, gathered: "" })).toBeNull();
  });
  it("row is cleaned; create op keyed by household id", () => {
    const r = formRow(good);
    expect(r).toMatchObject({ line1: "742 Evergreen Terrace", line2: null, region: "IL", country: "US", verified: false, notes: null });
    expect(createOp("p1", good)).toEqual({ table: "addresses", op: "create", row: { id: "p1", ...r } });
  });
  it("dirty compares cleaned values; round-trips", () => {
    expect(formDirty(good, { ...good, line1: "742 Evergreen Terrace  " })).toBe(false);
    expect(formDirty(good, { ...good, verified: true })).toBe(true);
    const a: Address = { id: "p1", ...formRow(good) };
    expect(formDirty(formFrom(a), good)).toBe(false);
  });
  it("failure text: expired sign-in keeps the draft, never echoes content", () => {
    expect(failText({ kind: "unauthorized", message: "x" })).toBe("Sign-in expired — reload, your draft is kept below.");
    expect(failText({ kind: "conflict", message: "x" })).toMatch(/Changed elsewhere/);
    expect(failText({ kind: "server", message: "boom" })).toBe("Not saved: boom");
  });
});

describe("addressRows", () => {
  const prog = addressRows(D, [], ctx).progress;
  it("everyone missing without addresses", () => {
    const r = addressRows(D, [], ctx);
    expect(r.missing.length).toBe(prog.invited.length);
    expect(r.have).toEqual([]);
    expect(progressText(r.progress)).toBe(`0 of ${prog.invited.length} invited households have an address`);
    expect(progressPct(r.progress)).toBe(0);
  });
  it("moves a household from missing to have, formatted; orphan goes to other", () => {
    expect(prog.invited.length).toBeGreaterThan(1);
    const id = prog.invited[0].id;
    const addrs: Address[] = [
      { id, ...formRow({ ...good, verified: true }) },
      { id: "gone", ...formRow({ ...good, line1: "1 Nowhere Rd" }) },
    ];
    const r = addressRows(D, addrs, ctx);
    expect(r.have).toHaveLength(1);
    expect(r.have[0]).toMatchObject({ id, verified: true, lines: ["742 Evergreen Terrace", "Springfield, IL 62704"] });
    expect(r.missing.some((m) => m.id === id)).toBe(false);
    expect(r.missing.length).toBe(prog.invited.length - 1);
    expect(r.other).toHaveLength(1);
    expect(r.other[0].name).toBe("Household no longer exists");
    expect(progressPct(r.progress)).toBe(Math.round(100 / prog.invited.length));
  });
});
