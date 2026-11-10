// Pure helpers for the Day > Vendors section (DESIGN-v11): draft <-> row, validation, ops, mark-paid.
import type { Op } from "../../api/types";
import type { Patch } from "../data";
import { isDay } from "../../data/params";
import type { Payment } from "../../plan/day";
import { VENDOR_CATEGORIES, VENDOR_STATUSES, type Vendor, type VendorCategory, type VendorStatus } from "../../plan/types";

export interface VendorDraft {
  category: VendorCategory; name: string; status: VendorStatus;
  /** money as typed text; parsed on Save */
  amount: string; deposit: string;
  deposit_due: string; deposit_paid: string; balance_due: string; balance_paid: string;
  contact: string; notes: string; scenario_id: number | null;
}

export const STATUS_LABEL: Record<VendorStatus, string> = { idea: "Idea", contacted: "Contacted", quoted: "Quoted", booked: "Booked", passed: "Passed" };
/** Shape marker so status never relies on colour alone. */
export const STATUS_MARK: Record<VendorStatus, string> = { idea: "○", contacted: "◔", quoted: "◑", booked: "●", passed: "✕" };

export const emptyDraft = (category: VendorCategory = "catering", name = "", scenario_id: number | null = null): VendorDraft => ({
  category, name, status: "idea", amount: "", deposit: "", deposit_due: "", deposit_paid: "", balance_due: "", balance_paid: "", contact: "", notes: "", scenario_id,
});

const numText = (n: number | null | undefined) => (n == null ? "" : String(n));
export const draftOf = (v: Vendor): VendorDraft => ({
  category: v.category, name: v.name, status: v.status, amount: numText(v.amount), deposit: numText(v.deposit),
  deposit_due: v.deposit_due ?? "", deposit_paid: v.deposit_paid ?? "", balance_due: v.balance_due ?? "", balance_paid: v.balance_paid ?? "",
  contact: v.contact ?? "", notes: v.notes ?? "", scenario_id: v.scenario_id ?? null,
});

/** "" -> null; valid non-negative number -> n; anything else -> NaN. */
export function parseMoney(s: string): number | null {
  const t = s.trim().replace(/[$,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export interface DraftCheck { errors: string[]; warnings: string[] }
export function checkDraft(d: VendorDraft): DraftCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!d.name.trim()) errors.push("Name is required.");
  if (!VENDOR_CATEGORIES.includes(d.category)) errors.push("Pick a category.");
  if (!VENDOR_STATUSES.includes(d.status)) errors.push("Pick a status.");
  const amount = parseMoney(d.amount);
  const deposit = parseMoney(d.deposit);
  if (Number.isNaN(amount)) errors.push("Amount must be a number, 0 or more.");
  if (Number.isNaN(deposit)) errors.push("Deposit must be a number, 0 or more.");
  for (const [label, v] of [["Deposit due", d.deposit_due], ["Deposit paid", d.deposit_paid], ["Balance due", d.balance_due], ["Balance paid", d.balance_paid]] as const)
    if (v && !isDay(v)) errors.push(`${label} must be YYYY-MM-DD.`);
  if (amount != null && deposit != null && !Number.isNaN(amount) && !Number.isNaN(deposit) && deposit > amount) warnings.push("Deposit is more than the amount.");
  return { errors, warnings };
}

const rowOf = (d: VendorDraft): Record<string, unknown> => ({
  category: d.category, name: d.name.trim(), status: d.status,
  amount: parseMoney(d.amount), deposit: parseMoney(d.deposit),
  deposit_due: d.deposit_due || null, deposit_paid: d.deposit_paid || null, balance_due: d.balance_due || null, balance_paid: d.balance_paid || null,
  contact: d.contact.trim() || null, notes: d.notes.trim() || null, scenario_id: d.scenario_id,
});

/** Only the fields that differ from the stored vendor. */
export function vendorChanges(v: Vendor, d: VendorDraft): Record<string, unknown> {
  const cur = rowOf(draftOf(v));
  return Object.fromEntries(Object.entries(rowOf(d)).filter(([k, x]) => x !== cur[k]));
}

export const createVendorOp = (d: VendorDraft): Op => ({ table: "vendors", op: "create", row: rowOf(d) });
export const deleteVendorOp = (v: Pick<Vendor, "id">, version: number): Op => ({ table: "vendors", op: "delete", id: v.id, version });
export const updatePatch = (v: Vendor, d: VendorDraft): Patch => ({ table: "vendors", id: v.id, row: vendorChanges(v, d) });

/** One-tap "Mark paid": sets deposit_paid / balance_paid to today. */
export const markPaidPatch = (p: Pick<Payment, "vendor" | "kind">, today: string): Patch => ({
  table: "vendors", id: p.vendor.id, row: p.kind === "deposit" ? { deposit_paid: today } : { balance_paid: today },
});
export const markPaidLabel = (p: Pick<Payment, "vendor" | "kind">) => `Paid ${p.kind}: ${p.vendor.name}`;
export const paymentText = (p: Pick<Payment, "kind">) => (p.kind === "deposit" ? "Deposit" : "Balance");
