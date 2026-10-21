// Usage: npm run import:guests -- <path/to/workbook.xlsx>   (default: data/private/guests.xlsx)
// Writes data/private/guests.json (gitignored). Exits 1 on validation errors.
// SheetJS (not exceljs): the workbook is OpenXML-SDK output with prefixed (x:) namespaces, which exceljs cannot parse.
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parseSheets, type Row } from "../src/guests/parse";
import { validateGuests } from "../src/guests/validate";
import { forecastAttendance } from "../src/guests/attendance";

const src = resolve(process.argv[2] ?? "data/private/guests.xlsx");
const out = resolve("data/private/guests.json");

const wb = XLSX.read(readFileSync(src), { type: "buffer" });
const rows = (name: string): Row[] => {
  const ws = wb.Sheets[name];
  return ws ? XLSX.utils.sheet_to_json<Row>(ws, { defval: null }) : [];
};

const data = parseSheets({ Households: rows("Households"), Individuals: rows("Individuals"), Friends: rows("Friends") }, basename(src));
const issues = validateGuests(data);
for (const i of issues) console.log(`${i.level.toUpperCase().padEnd(5)} ${i.where}: ${i.msg}`);
mkdirSync(resolve("data/private"), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 2));
const f = forecastAttendance(data);
console.log(`\n${data.households.length} households · ${data.individuals.length} individuals · ${data.friends.length} friend groups`);
console.log(`invited ${f.invited} (${f.adults} adults, ${f.children} children) → expected ~${f.expected} (local scenario)`);
console.log(`wrote ${out}`);
if (issues.some((i) => i.level === "error")) process.exit(1);
