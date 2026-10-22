// Usage: npm run seed:v4 -- [garden.json] [--replace]   (default data/private/garden.json)
// Writes data/private/seed-v4.sql (gitignored; real names inside) for:
//   npx wrangler d1 execute DB --remote --file data/private/seed-v4.sql
// Without --replace the inserts fail on a non-empty table (no silent overwrite). Run only after Access protects the Worker.
// Delete the .sql afterwards.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEED_FIT, SEED_MUSTHAVES, SEED_TASKS, SEED_VENUES } from "../src/data/seed-v4";
import type { PeopleData } from "../src/people/types";
import { validatePeople } from "../src/people/validate";
import { seedRows, seedSql } from "../worker/seed";

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const src = resolve(args.find((a) => !a.startsWith("--")) ?? "data/private/garden.json");
const data = JSON.parse(readFileSync(src, "utf8")) as PeopleData;
const errors = validatePeople(data).filter((i) => i.level === "error");
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e.where}: ${e.msg}`);
  process.exit(1);
}
const rows = seedRows({ parties: data.parties, people: data.people, venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, tasks: SEED_TASKS }, "seed");
const wipe = replace ? ["fit", "musthaves", "tasks", "venues", "people", "parties"].map((t) => `DELETE FROM ${t};`).join("\n") + "\n" : "";
mkdirSync(resolve("data/private"), { recursive: true });
const out = resolve("data/private/seed-v4.sql");
writeFileSync(out, wipe + seedSql(rows));
console.log(`${data.parties.length} parties · ${data.people.length} people · ${SEED_VENUES.length} venues · ${SEED_MUSTHAVES.length} must-haves · ${SEED_FIT.length} fit · ${SEED_TASKS.length} tasks${replace ? " (replace)" : ""} → ${out}`);
