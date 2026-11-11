// Pure helpers behind Day > Our venue and the Today venue card (DESIGN-v11).
import { describe, expect, it } from "vitest";
import { capList, contactParts, memorialWeekend } from "../src/ui/day/ourVenueModel";
import { roomLine, weddingSub } from "../src/ui/today/model";

const WED = "2027-05-29";

describe("helpers", () => {
  it("memorialWeekend finds the holiday", () => {
    expect(memorialWeekend("2027-05-29")).toBe("2027-05-31");
    expect(memorialWeekend("2027-05-31")).toBe("2027-05-31");
    expect(memorialWeekend("2027-06-12")).toBeNull();
  });
  it("capList caps at max unless all", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7];
    expect(capList(xs, 5, false)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 2 });
    expect(capList(xs, 5, true).shown).toHaveLength(7);
    expect(capList([1], 5, false).hidden).toBe(0);
  });
  it("contactParts links emails and phone numbers", () => {
    const p = contactParts("Shay, Director: shay@x.com · 219-308-1926");
    expect(p.filter((x) => x.href).map((x) => x.href)).toEqual(["mailto:shay@x.com", "tel:+12193081926"]);
    expect(p.map((x) => x.text).join("")).toBe("Shay, Director: shay@x.com · 219-308-1926");
    expect(contactParts("2533 W Homer St, Chicago")).toEqual([{ text: "2533 W Homer St, Chicago" }]);
  });
  it("labels", () => {
    expect(weddingSub(WED, "The Joinery")).toBe("to Sat, May 29, 2027 · The Joinery");
    expect(roomLine(64, 160)).toBe("≈ 64 / 160 seats");
    expect(roomLine(64, null)).toBe("≈ 64 expected");
  });
});
