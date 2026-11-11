// "To review" deck model (src/ui/people/reviewModel.ts). Synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { inviteCtx } from "../src/people/invite";
import { buildRings } from "../src/people/rings";
import { tierCtx } from "../src/people/tier";
import type { Address, PeopleData } from "../src/people/types";
import { addressRows, blankForm, formRow } from "../src/ui/people/addressModel";
import {
  actionFor, buildDeck, CHOICES, choiceByKey, choiceFor, deckCounts, decidePatches, isResolved, QUESTION, swipeDir, TYPE_ORDER,
} from "../src/ui/people/reviewModel";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const deck = (d: PeopleData, addresses: Address[] = []) => {
  const ctx = inviteCtx(d, "ours");
  return buildDeck({ data: d, rings: buildRings(d, ctx, tierCtx(d)), addresses, ctx });
};

describe("buildDeck", () => {
  it("holds every outstanding type, grouped in order, with unique keys", () => {
    const d = clone();
    d.parties[0].talk = true;
    const friend = d.people.find((p) => p.kind === "friend" && !p.placeholder && !p.deceased)!;
    friend.last = null;
    const items = deck(d);
    expect(new Set(items.map((x) => x.key)).size).toBe(items.length);
    const order = items.map((x) => TYPE_ORDER.indexOf(x.type));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const c = deckCounts(items);
    expect(c.undecided).toBe(d.parties.filter((p) => p.invite === "undecided").length);
    expect(c.talk).toBe(d.parties.filter((p) => p.talk).length);
    expect(c.lastname).toBeGreaterThanOrEqual(1);
    expect(items.find((x) => x.type === "lastname" && x.personId === friend.id)).toBeTruthy();
    expect(c.address).toBe(addressRows(D, [], inviteCtx(D, "ours")).missing.length);
  });
  it("address cards drop once the household has an address", () => {
    const missing = addressRows(D, [], inviteCtx(D, "ours")).missing;
    expect(missing.length).toBeGreaterThan(0);
    const a: Address = { id: missing[0].id, ...formRow({ ...blankForm("2026-11-10"), line1: "1 Test St", city: "Testville", region: "IL", postal: "62704" }) };
    const items = deck(D, [a]);
    expect(items.some((x) => x.type === "address" && x.partyId === a.id)).toBe(false);
    expect(deckCounts(items).address).toBe(missing.length - 1);
  });
  it("does not change when a household is decided after the snapshot (ids only)", () => {
    const snap = deck(D);
    const d = clone();
    const first = snap.find((x) => x.type === "undecided")!;
    d.parties.find((p) => p.id === first.partyId)!.invite = "invite";
    expect(snap.find((x) => x.key === first.key)).toBeTruthy();
    expect(isResolved(first, d, [])).toBe(true);
    expect(isResolved(first, D, [])).toBe(false);
  });
});

describe("swipe mapping", () => {
  it("undecided: right invite, left no, up if room", () => {
    expect(actionFor("undecided", "right")).toEqual({ kind: "decide", value: "invite", clearTalk: false });
    expect(actionFor("undecided", "left")).toEqual({ kind: "decide", value: "no", clearTalk: false });
    expect(actionFor("undecided", "up")).toEqual({ kind: "decide", value: "ifroom", clearTalk: false });
  });
  it("talk: invite / no clear the flag, up keeps talking", () => {
    expect(actionFor("talk", "right")).toEqual({ kind: "decide", value: "invite", clearTalk: true });
    expect(actionFor("talk", "left")).toEqual({ kind: "decide", value: "no", clearTalk: true });
    expect(actionFor("talk", "up")).toEqual({ kind: "skip" });
  });
  it("local: right local, left away, up skip", () => {
    expect(actionFor("local", "right")).toEqual({ kind: "local", value: "local" });
    expect(actionFor("local", "left")).toEqual({ kind: "local", value: "away" });
    expect(actionFor("local", "up")).toEqual({ kind: "skip" });
  });
  it("address and last name: right opens, left / up skip", () => {
    for (const t of ["address", "lastname"] as const) {
      expect(actionFor(t, "right")).toEqual({ kind: "open" });
      expect(actionFor(t, "left")).toEqual({ kind: "skip" });
      expect(actionFor(t, "up")).toEqual({ kind: "skip" });
    }
  });
  it("a card already done only skips on", () => {
    expect(actionFor("address", "right", true)).toEqual({ kind: "skip" });
    expect(choiceByKey("undecided", "1", true)).toBeUndefined();
  });
  it("every type asks in words; 1/2/3 match the buttons", () => {
    for (const t of TYPE_ORDER) {
      expect(QUESTION[t]).toMatch(/\?$/);
      expect(CHOICES[t].length).toBeGreaterThanOrEqual(2);
      for (const c of CHOICES[t]) { expect(choiceByKey(t, c.key)).toBe(c); expect(choiceFor(t, c.dir)).toBe(c); }
    }
    expect(choiceByKey("undecided", "2")?.label).toBe("If room");
  });
});

describe("swipeDir thresholds", () => {
  it("commits past 30% width / 25% height, else springs back", () => {
    expect(swipeDir(100, 0, 300, 400)).toBe("right");
    expect(swipeDir(-100, 5, 300, 400)).toBe("left");
    expect(swipeDir(80, 0, 300, 400)).toBeNull();
    expect(swipeDir(0, -110, 300, 400)).toBe("up");
    expect(swipeDir(0, -90, 300, 400)).toBeNull();
    expect(swipeDir(0, 200, 300, 400)).toBeNull();
    expect(swipeDir(120, -130, 300, 400)).toBe("up");
  });
});

describe("decidePatches", () => {
  const p = D.parties.find((x) => x.invite === "undecided")!;
  it("one patch; talk flag clears in the same save", () => {
    expect(decidePatches({ ...p, talk: true }, "invite", true).patches).toEqual([{ table: "parties", id: p.id, row: { invite: "invite", talk: false } }]);
    expect(decidePatches(p, "no", false).patches).toEqual([{ table: "parties", id: p.id, row: { invite: "no" } }]);
  });
  it("nothing to save when already so", () => {
    expect(decidePatches({ ...p, invite: "invite", talk: false }, "invite", true).patches).toEqual([]);
  });
});
