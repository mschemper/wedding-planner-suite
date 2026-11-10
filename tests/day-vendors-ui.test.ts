import { describe, expect, it } from "vitest";
import { checkDraft, createVendorOp, deleteVendorOp, draftOf, emptyDraft, markPaidPatch, parseMoney, updatePatch, vendorChanges } from "../src/ui/day/vendorsModel";
import type { Vendor } from "../src/plan/types";

const v: Vendor = { id: "V01", category: "bar", name: "Joinery Bar", status: "quoted", amount: 4000, deposit: 1000, deposit_due: "2026-12-01", balance_due: "2027-05-01", scenario_id: 7 };

describe("vendorsModel", () => {
  it("parses money", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("$1,200")).toBe(1200);
    expect(parseMoney("-5")).toBeNaN();
    expect(parseMoney("abc")).toBeNaN();
  });
  it("validates", () => {
    expect(checkDraft(emptyDraft()).errors).toContain("Name is required.");
    const d = { ...emptyDraft("bar", "X"), amount: "x", deposit_due: "12/1/26" };
    expect(checkDraft(d).errors.length).toBe(2);
    const w = checkDraft({ ...emptyDraft("bar", "X"), amount: "100", deposit: "200" });
    expect(w.errors).toEqual([]);
    expect(w.warnings.length).toBe(1);
  });
  it("diffs only changed fields", () => {
    expect(vendorChanges(v, draftOf(v))).toEqual({});
    expect(vendorChanges(v, { ...draftOf(v), status: "booked", amount: "4500", notes: "  hi " })).toEqual({ status: "booked", amount: 4500, notes: "hi" });
    expect(updatePatch(v, { ...draftOf(v), deposit_due: "" }).row).toEqual({ deposit_due: null });
  });
  it("builds ops", () => {
    const op = createVendorOp({ ...emptyDraft("photo", " Ann ", 7), amount: "2000" });
    expect(op).toMatchObject({ table: "vendors", op: "create", row: { category: "photo", name: "Ann", status: "idea", amount: 2000, deposit: null, scenario_id: 7 } });
    expect(deleteVendorOp(v, 3)).toEqual({ table: "vendors", op: "delete", id: "V01", version: 3 });
  });
  it("mark paid sets today", () => {
    expect(markPaidPatch({ vendor: v, kind: "deposit" }, "2026-11-09")).toEqual({ table: "vendors", id: "V01", row: { deposit_paid: "2026-11-09" } });
    expect(markPaidPatch({ vendor: v, kind: "balance" }, "2026-11-09").row).toEqual({ balance_paid: "2026-11-09" });
  });
});
