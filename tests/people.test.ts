// v4 people logic: effective invite, headcount + cutoff, kin, garden, validation, workbook import parity (DESIGN-v4 §4–5).
import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/garden.sample.json";
import v3sample from "../data/fixtures/guests.sample.json";
import { forecastAttendance } from "../src/guests/attendance";
import type { GuestData } from "../src/guests/schema";
import { fromWorkbook } from "../src/people/fromWorkbook";
import { buildGarden, relativeDefaults } from "../src/people/garden";
import { cutoff, headcount } from "../src/people/headcount";
import { effectiveInvite, inviteCtx } from "../src/people/invite";
import { anchorFor, graph, relationText } from "../src/people/kin";
import type { PeopleData, Person } from "../src/people/types";
import { validatePeople } from "../src/people/validate";

const D = fixture as unknown as PeopleData;
const clone = (): PeopleData => JSON.parse(JSON.stringify(D));
const P = (d: PeopleData, id: string) => d.people.find((p) => p.id === id)!;

describe("effective invite", () => {
  it("couple, placeholder and deceased are not guests", () => {
    const c = inviteCtx(D, "ours");
    expect(effectiveInvite(P(D, "C001"), c)).toBeNull();
    expect(effectiveInvite(P(D, "G-M-1"), c)).toBeNull();
    expect(effectiveInvite(P(D, "A005"), c)).toBeNull();
  });
  it("kids follow the policy unless the household overrides", () => {
    expect(effectiveInvite(P(D, "M005"), inviteCtx(D, "ours"))).toBe("no");
    expect(effectiveInvite(P(D, "C003"), inviteCtx(D, "ours"))).toBe("invite");
    expect(effectiveInvite(P(D, "M005"), inviteCtx(D, "family"))).toBe("invite");
    const d = clone();
    d.parties.find((x) => x.id === "H-M2")!.kids = "in";
    expect(effectiveInvite(P(d, "M005"), inviteCtx(d, "ours"))).toBe("invite");
  });
  it("a person override beats the household", () => {
    const d = clone();
    P(d, "M010").override = "no";
    expect(effectiveInvite(P(d, "M010"), inviteCtx(d, "ours"))).toBe("no");
  });
});

describe("headcount", () => {
  it("splits invited / if room / undecided / no, adults vs kids' room, plus-ones", () => {
    const h = headcount(D, "ours");
    // invited: H-C1 Wren(kid) + H-M1 2 + H-M2 2 adults (kids out) + H-M3 2 + H-A1 2 + H-A2 1 + F-1 2
    expect(h.invited).toMatchObject({ heads: 12, adults: 11, kids: 1 });
    expect(h.ifroom.heads).toBe(2); // Nettle + Sage (Oak deceased)
    expect(h.undecided.heads).toBe(4); // Hazel, Iris, Rowan + plus-one
    expect(h.no.heads).toBe(3); // Olive + Daisy + Elm (kids out)
    expect(h.ranked.map((r) => r.party.id)).toEqual(["F-3", "H-A3"]);
  });
  it("cutoff: kids skip the main room only where there is a kids' room", () => {
    const h = headcount(D, "all");
    expect(cutoff(h, 82, true)).toMatchObject({ used: 11, spare: 71, fits: 2 });
    expect(cutoff(h, 14, false)).toMatchObject({ used: 14, spare: 0, fits: 0 });
  });
});

describe("kin", () => {
  const g = graph(D.people);
  const rel = (id: string) => relationText(g, anchorFor(D.people, P(D, id).side), P(D, id));
  it("derives core relations and keeps a gendered label when it matches", () => {
    expect(rel("M001")).toBe("Father");
    expect(rel("M003")).toBe("Brother");
    expect(rel("M005")).toBe("Niece");
    expect(rel("M007")).toBe("Aunt");
    expect(rel("M009")).toBe("Cousin");
    expect(rel("M010")).toBe("Cousin-in-law");
    expect(rel("C003")).toBe("Daughter");
  });
  it("falls back to the label when links are missing", () => {
    expect(rel("A006")).toBe("Cousin");
    expect(rel("F-2-1")).toBe("friend");
  });
});

describe("garden", () => {
  it("beds by side and branch, rows by generation, friends by circle; edges only where linked", () => {
    const gd = buildGarden(D);
    expect(gd.couple.map((p) => p.first)).toEqual(["Mark", "Angela"]);
    expect(gd.beds.map((b) => `${b.side}:${b.branch}`)).toEqual(["Mark:Mark's father's side", "Mark:Mark's mother's side", "Angela:Angela's father's side"]);
    expect(gd.beds[0].rows.map((r) => r.gen)).toEqual([-2, -1, 0, 1]);
    expect(gd.circles.map((c) => c.circle)).toEqual(["Work", "Neighbors", "College"]);
    expect(gd.edges.some((e) => e.kind === "parent" && e.from === "M007" && e.to === "M009")).toBe(true);
    expect(gd.edges.filter((e) => e.kind === "partner" && e.from === "M001").length).toBe(1);
  });
  it("Add relative pre-fills links, branch, generation and household", () => {
    const of = P(D, "M009") as Person;
    expect(relativeDefaults(of, "child")).toMatchObject({ gen: 1, age: "child", parent_ids: ["M009", "M010"], party_id: "H-M4", branch: of.branch });
    expect(relativeDefaults(of, "parent")).toMatchObject({ gen: -1, age: "adult" });
  });
});

describe("validate", () => {
  it("fixture is clean", () => {
    expect(validatePeople(D).filter((i) => i.level === "error")).toEqual([]);
  });
  it("catches loops, one-sided partners, missing households, placeholder in a household", () => {
    const d = clone();
    P(d, "M001").parent_ids = ["M005"];
    P(d, "M009").partner_id = "A006";
    P(d, "A003").party_id = null;
    P(d, "G-M-1").party_id = "H-M1";
    const msgs = validatePeople(d).filter((i) => i.level === "error").map((i) => `${i.where} ${i.msg}`);
    expect(msgs.some((m) => /loop/.test(m))).toBe(true);
    expect(msgs.some((m) => /M009 partner link .* one-sided/.test(m))).toBe(true);
    expect(msgs.some((m) => /A003 needs a household/.test(m))).toBe(true);
    expect(msgs.some((m) => /G-M-1 a tree-only placeholder/.test(m))).toBe(true);
  });
});

describe("workbook import", () => {
  it("v3 parity: everyone v3 counted is 'considered' in v4 at the same rates", () => {
    const g = v3sample as unknown as GuestData;
    const r = fromWorkbook(g);
    const v3 = forecastAttendance(g);
    const h = headcount(r, "all");
    // v4 keeps a Declined person as invited with rsvp declined (expected 0); v3 dropped them from the count
    const declined = r.people.filter((p) => p.rsvp === "declined").length;
    expect(h.invited.heads + h.ifroom.heads + h.undecided.heads - declined).toBe(v3.invited);
    expect(Math.round(h.invited.expected + h.ifroom.expected + h.undecided.expected)).toBe(v3.expected);
    expect(validatePeople(r).filter((i) => i.level === "error" && !/couple rows/.test(i.msg))).toEqual([]);
  });
  it("maps statuses with precedence, infers partners and children's parents", () => {
    const g: GuestData = {
      households: [{ HouseholdID: "M-X-001", Family: "Mark", FamilySide: "Side", PrimaryHouseholdName: "X", HouseholdType: "Cousin household" }],
      individuals: [
        { PersonID: "M1", HouseholdID: "M-X-001", FirstName: "A", LastName: "X", DisplayName: "A X", Family: "Mark", FamilySide: "Side", GenerationGroup: "Cousin", AdultOrChild: "Adult", HouseholdRole: "Head of household", InviteException: "No", Locality: "Out of Town", InvitePriority: "Review", InviteStatus: "Accepted" },
        { PersonID: "M2", HouseholdID: "M-X-001", FirstName: "B", LastName: "X", DisplayName: "B X", Family: "Mark", FamilySide: "Side", GenerationGroup: "Cousin spouse", AdultOrChild: "Adult", HouseholdRole: "Spouse/partner", InviteException: "No", Locality: "Unknown", InvitePriority: "Core", InviteStatus: "TBD" },
        { PersonID: "M3", HouseholdID: "M-X-001", FirstName: "C", LastName: "X", DisplayName: "C X", Family: "Mark", FamilySide: "Side", GenerationGroup: "Cousin child", AdultOrChild: "Child", HouseholdRole: "Child", InviteException: "No", Locality: "Unknown", InvitePriority: "Not Invite", InviteStatus: "TBD" },
      ] as GuestData["individuals"],
      friends: [],
    };
    const r = fromWorkbook(g);
    const p = (id: string) => r.people.find((x) => x.id === id)!;
    expect(p("M1")).toMatchObject({ rsvp: "accepted", local: "away", partner_id: "M2" });
    expect(p("M2").partner_id).toBe("M1");
    expect(p("M3").parent_ids).toEqual(["M1", "M2"]);
    expect(r.parties[0].invite).toBe("invite");
    expect(r.report.inferredPartners).toBe(1);
  });
});
