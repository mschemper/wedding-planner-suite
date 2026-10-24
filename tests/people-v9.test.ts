// v9 People helpers (src/ui/people/model.ts): decide-one-by-one order, seats left, ring progress, room line, tidy counts. Synthetic fixture only.
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import { inviteCtx } from "../src/people/invite";
import { buildRings } from "../src/people/rings";
import { tierCtx } from "../src/people/tier";
import type { PeopleData } from "../src/people/types";
import { costText, decideQueue, householdLocal, mainSeats, ringProgress, roomLine, seatsLeftAfter, seatsText, tidyItems, unknownLocalRows } from "../src/ui/people/model";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const ringsOf = (d: PeopleData) => buildRings(d, inviteCtx(d, "ours"), tierCtx(d));
const rings = ringsOf(D);
const rows = rings.flatMap((r) => r.rows);

describe("decide one by one", () => {
  it("queues exactly the undecided households, in ring order", () => {
    const q = decideQueue(rings, "all");
    expect(q.every((r) => r.party.invite === "undecided")).toBe(true);
    expect(q.map((r) => r.party.id)).toEqual(rows.filter((r) => r.party.invite === "undecided").map((r) => r.party.id));
    expect(q.length).toBeGreaterThan(0);
  });
  it("respects the side filter", () => {
    expect(decideQueue(rings, "friends").every((r) => r.friend)).toBe(true);
    expect(decideQueue(rings, "Mark").some((r) => r.friend)).toBe(false);
  });
  it("is empty when nobody is undecided", () => {
    const d = clone();
    d.parties.forEach((p) => { p.invite = "invite"; });
    expect(decideQueue(ringsOf(d), "all")).toEqual([]);
  });
});

describe("seats left at the room-check venue", () => {
  const row = (adults: number, kids: number, invite: "undecided" | "invite") =>
    ({ seats: { heads: adults + kids, adults, kids, expected: 0 }, party: { invite } }) as never;
  it("counts the household on top of those already invited", () => {
    expect(seatsLeftAfter({ cap: 80, invited: 70 }, row(2, 1, "undecided"), true)).toBe(8);
    expect(seatsLeftAfter({ cap: 80, invited: 70 }, row(2, 1, "undecided"), false)).toBe(7);
  });
  it("does not count an already-invited household twice", () => {
    expect(seatsLeftAfter({ cap: 80, invited: 72 }, row(2, 0, "invite"), true)).toBe(8);
  });
  it("goes negative when over", () => {
    expect(seatsLeftAfter({ cap: 10, invited: 9 }, row(3, 0, "undecided"), true)).toBe(-2);
    expect(mainSeats(row(2, 3, "undecided"), false)).toBe(5);
  });
});

describe("words and bars", () => {
  it("seat text is plain", () => {
    const s = (a: number, k: number) => seatsText({ seats: { heads: a + k, adults: a, kids: k, expected: 0 } });
    expect([s(2, 0), s(2, 1), s(1, 2), s(0, 1), s(0, 0)]).toEqual(["2 adults", "2 adults · 1 kid", "1 adult · 2 kids", "1 kid", "no one coming"]);
  });
  it("cost text always says approximately, or awaiting rates", () => {
    expect(costText({ amount: 1234 })).toBe("≈ $1,234");
    expect(costText(null)).toBe("awaiting rates");
  });
  it("ring progress", () => {
    const p = (...inv: string[]) => ringProgress(inv.map((invite) => ({ party: { invite } }) as never));
    expect(p("invite", "no", "undecided", "ifroom", "undecided")).toMatchObject({ decided: 3, total: 5, pct: 60, text: "3 of 5 decided" });
    expect(p()).toMatchObject({ total: 0, pct: 0 });
  });
  it("phone room line, with the over flag only when over", () => {
    expect(roomLine({ invited: 11, undecided: 4, cap: 82, over: 0 })).toBe("11 in · 4 undecided · 82 seats");
    expect(roomLine({ invited: 90, undecided: 0, cap: 82, over: 8 })).toBe("90 in · 0 undecided · 82 seats · over by 8");
  });
});

describe("tidy up", () => {
  it("counts every kind and sums them", () => {
    const t = tidyItems(D, rings);
    expect(t.total).toBe(t.names.length + t.unplaced + t.unknownLocal.length + t.talk.length + t.lastNames);
    expect(t.talk.every((r) => r.party.talk)).toBe(true);
  });
  it("flags a household only when every living member is unknown", () => {
    const d = clone();
    const hid = rows.find((r) => r.members.filter((m) => !m.deceased).length > 1)!.party.id;
    d.people.filter((p) => p.party_id === hid).forEach((p) => { p.local = "unknown"; });
    expect(unknownLocalRows(ringsOf(d).flatMap((r) => r.rows)).map((r) => r.party.id)).toContain(hid);
    const one = d.people.find((p) => p.party_id === hid && !p.deceased && !p.placeholder)!;
    one.local = "local";
    expect(unknownLocalRows(ringsOf(d).flatMap((r) => r.rows)).map((r) => r.party.id)).not.toContain(hid);
  });
  it("talk households are counted and drop out when cleared", () => {
    const d = clone();
    d.parties.forEach((p) => { p.talk = false; });
    expect(tidyItems(d, ringsOf(d)).talk).toHaveLength(0);
    d.parties[0].talk = true;
    expect(tidyItems(d, ringsOf(d)).talk.map((r) => r.party.id)).toEqual(ringsOf(d).flatMap((r) => r.rows).filter((r) => r.party.id === d.parties[0].id).map((r) => r.party.id));
  });
  it("household local value only when members agree", () => {
    const m = (...l: string[]) => ({ members: l.map((local) => ({ local, deceased: false, placeholder: false })) }) as never;
    expect(householdLocal(m("local", "local"))).toBe("local");
    expect(householdLocal(m("away", "away"))).toBe("away");
    expect(householdLocal(m("local", "away"))).toBeNull();
    expect(householdLocal(m("unknown"))).toBeNull();
  });
});
