// Export button actions: JSON + xlsx backups downloaded on the device (no addresses).
import type { InviteCtx } from "../../people/invite";
import type { PeopleData } from "../../people/types";
import { exportName, exportSheets, jsonExport } from "./model";

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportJson(d: PeopleData): string {
  download(exportName("json"), new Blob([JSON.stringify(jsonExport(d), null, 2)], { type: "application/json" }));
  return "JSON saved.";
}

export async function exportXlsx(d: PeopleData, ctx: InviteCtx): Promise<string> {
  try {
    const XLSX = await import("xlsx");
    const s = exportSheets(d, ctx);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.envelopeRows), "Envelopes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.peopleRows), "People");
    XLSX.writeFile(wb, exportName("xlsx"));
    return "Spreadsheet saved.";
  } catch (err) {
    return `Spreadsheet failed: ${String(err)}`;
  }
}
