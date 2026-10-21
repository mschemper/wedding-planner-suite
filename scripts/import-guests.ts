// Usage: npm run import:guests -- <path/to/workbook.xlsx>   (default: data/private/guests.xlsx)
// Writes data/private/guests.json (gitignored). Exits 1 on validation errors.
// SheetJS (not exceljs): the workbook is OpenXML-SDK output with prefixed (x:) namespaces, which exceljs cannot parse.
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parseSheets, type Row } from "../src/guests/parse";
import { validateGuests } from "../src/guests/validate";
import { forecastAttendance } from "../src/guests/attendance";

const src = resolve(process.argv[2] ?? "data/private/guests.xlsx");
const out = resolve("data/private/guests.json");

if (!existsSync(src)) { console.error(`ERROR workbook not found: ${src}`); process.exit(1); }
const wb = XLSX.read(readFileSync(src), { type: "buffer", cellDates: true });
const rows = (name: string, required: boolean): Row[] => {
  const ws = wb.Sheets[name];
  if (!ws) {
    if (required) { console.error(`ERROR sheet "${name}" not found (sheets: ${wb.SheetNames.join(", ")})`); process.exit(1); }
    return [];
  }
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true });
};

const data = parseSheets({ Households: rows("Households", true), Individuals: rows("Individuals", true), Friends: rows("Friends", false) }, basename(src));
const issues = validateGuests(data);
if (!data.households.length || !data.individuals.length)
  issues.push({ level: "error", where: "workbook", msg: "Households or Individuals produced 0 rows (header row moved or renamed?)" });
for (const i of issues) console.log(`${i.level.toUpperCase().padEnd(5)} ${i.where}: ${i.msg}`);
mkdirSync(resolve("data/private"), { recursive: true });
const failed = issues.some((i) => i.level === "error");
// Never replace a good guests.json with a failed import; the app keeps the last good one.
writeFileSync(failed ? out.replace(/\.json$/, ".rejected.json") : out, JSON.stringify(data, null, 2));
const f = forecastAttendance(data);
console.log(`\n${data.households.length} households · ${data.individuals.length} individuals · ${data.friends.length} friend groups`);
console.log(`invited ${f.invited} (${f.adults} adults, ${f.children} children) → expected ~${f.expected} (local scenario)`);
console.log(failed ? `NOT written: errors above. Draft at ${out.replace(/\.json$/, ".rejected.json")}` : `wrote ${out}`);
if (failed) process.exit(1);
