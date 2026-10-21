import { describe, expect, it } from "vitest";
import fixture from "../data/fixtures/guests.sample.json";
import type { GuestData } from "../src/guests/schema";
import { validateGuests } from "../src/guests/validate";
import { forecastAttendance } from "../src/guests/attendance";
import { parseSheets } from "../src/guests/parse";

const d = fixture as unknown as GuestData;

describe("guest data", () => {
  it("fixture validates with no errors", () => {
    expect(validateGuests(d).filter((i) => i.level === "error")).toEqual([]);
  });
  it("catches bad references", () => {
    const bad: GuestData = { ...d, individuals: [...d.individuals, { ...d.individuals[0], PersonID: "X1", HouseholdID: "NOPE", PartnerPersonID: "GHOST" }] };
    const msgs = validateGuests(bad).map((i) => i.msg).join("|");
    expect(msgs).toMatch(/unknown HouseholdID/);
    expect(msgs).toMatch(/unknown PartnerPersonID/);
  });
  it("forecast: declined excluded, accepted counted at 1, plus-ones doubled", () => {
    const f = forecastAttendance(d);
    // 7 individuals invited (1 declined) + friends 2 + 1 = 10
    expect(f.invited).toBe(10);
    expect(f.children).toBe(1);
    // M001 .55 + M002 1 + 3×.85 + 2×.78 + F001 2×.85 + F002 .55 = 7.91
    expect(f.expected).toBe(8);
  });
  it("destination uses flat acceptance", () => {
    expect(forecastAttendance(d, "destination").expected).toBe(Math.round(1 + 9 * 0.45));
  });
  it("parseSheets drops blank rows and trims", () => {
    const g = parseSheets({ Households: [{ HouseholdID: " H1 ", Family: "Mark" }, { HouseholdID: null }], Individuals: [] });
    expect(g.households).toEqual([{ HouseholdID: "H1", Family: "Mark" }]);
  });
});
