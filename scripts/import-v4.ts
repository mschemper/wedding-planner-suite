// Usage: npm run import:v4 -- [path/to/workbook.xlsx]   (default data/private/guests-v4.xlsx)
// Writes data/private/garden.json + data/private/import-review.json (gitignored). Prints counts only, never names (AGENTS "Private data").
// SheetJS (not exceljs): the workbook is OpenXML-SDK output with prefixed (x:) namespaces, which exceljs cannot parse.
import * as XLSX from "xlsx";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { forecastAttendance } from "../src/guests/attendance";
import { parseSheets, type Row } from "../src/guests/parse";
import { fromWorkbook } from "../src/people/fromWorkbook";
import { headcount } from "../src/people/headcount";
import { validatePeople } from "../src/people/validate";

const src = resolve(process.argv[2] ?? "data/private/guests-v4.xlsx");
if (!existsSync(src)) { console.error(`ERROR workbook not found: ${src}`); process.exit(1); }
const wb = XLSX.read(readFileSync(src), { type: "buffer", cellDates: true });
const rows = (name: string): Row[] => (wb.Sheets[name] ? XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null, raw: true }) : []);
const g = parseSheets({ Households: rows("Households"), Individuals: rows("Individuals"), Friends: rows("Friends") }, basename(src));
if (!g.households.length || !g.individuals.length) { console.error("ERROR Households or Individuals produced 0 rows"); process.exit(1); }

const r = fromWorkbook(g);
const data = { people: r.people, parties: r.parties };
const issues = validatePeople(data);
const errors = issues.filter((i) => i.level === "error");
mkdirSync(resolve("data/private"), { recursive: true });
writeFileSync(resolve("data/private/import-review.json"), JSON.stringify({ review: r.review, issues }, null, 1));
for (const [k, v] of Object.entries(r.report)) console.log(`${k.padEnd(18)} ${v}`);

// v3 parity: v3 counted every non-declined row (incl. couple + deceased); v4 counts invite + ifroom + undecided, excluding those.
const v3 = forecastAttendance(g);
const hc = headcount(data, "ours");
const v4all = hc.invited.expected + hc.ifroom.expected + hc.undecided.expected;
console.log(`\nv3 forecast   invited ${v3.invited} · expected ${v3.expected}`);
console.log(`v4 considered heads ${hc.invited.heads + hc.ifroom.heads + hc.undecided.heads} · expected ${Math.round(v4all)}  (excludes couple ${r.report.couple}, deceased ${r.report.deceased}; split friend partners count 2)`);
console.log(`v4 decisions  invited ${hc.invited.heads} (${hc.invited.adults} adults / ${hc.invited.kids} kids) · if room ${hc.ifroom.heads} · undecided ${hc.undecided.heads} · no ${hc.no.heads}`);
console.log(`issues        ${errors.length} errors, ${issues.length - errors.length} warnings · review rows ${r.review.length} → data/private/import-review.json`);
if (errors.length) { console.error("NOT written: fix the errors in import-review.json"); process.exit(1); }
writeFileSync(resolve("data/private/garden.json"), JSON.stringify(data, null, 1));
console.log("wrote data/private/garden.json");
