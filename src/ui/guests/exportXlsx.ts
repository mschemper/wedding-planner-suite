// Client-side xlsx export (SheetJS, loaded on demand). Same sheet layout as the workbook; no version/updated_* columns.
import type { GuestData } from "../../guests/schema";
import { FRIEND_COLS, HH_COLS, PERSON_COLS } from "./model";

export async function exportXlsx(d: GuestData, now = new Date()): Promise<string> {
  const XLSX = await import("xlsx");
  const sheet = (rows: object[], cols: readonly string[]) =>
    XLSX.utils.json_to_sheet(rows.map((r) => Object.fromEntries(cols.map((c) => [c, (r as Record<string, unknown>)[c] ?? ""]))), { header: [...cols] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(d.households, HH_COLS), "Households");
  XLSX.utils.book_append_sheet(wb, sheet(d.individuals, PERSON_COLS), "Individuals");
  XLSX.utils.book_append_sheet(wb, sheet(d.friends, FRIEND_COLS), "Friends");
  const p = (n: number) => String(n).padStart(2, "0");
  const name = `guests-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.xlsx`;
  XLSX.writeFile(wb, name);
  return name;
}
