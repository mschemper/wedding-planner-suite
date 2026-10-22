// One-time D1 seed (DESIGN-v3 §2, §7). Usage: npm run seed:sql -- [guests.json]   (default data/private/guests.json)
// Writes data/private/seed.sql (gitignored; real names inside) for: npx wrangler d1 execute DB --remote --file data/private/seed.sql
// Run it only AFTER Access protects the Worker. Delete seed.sql afterwards.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GuestData } from "../src/guests/schema";
import { validateGuests } from "../src/guests/validate";
import { seedRows, seedSql } from "../worker/seed";

const src = resolve(process.argv[2] ?? "data/private/guests.json");
const out = resolve("data/private/seed.sql");
const data = JSON.parse(readFileSync(src, "utf8")) as GuestData;
const errors = validateGuests(data).filter((i) => i.level === "error");
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e.where}: ${e.msg}`);
  process.exit(1);
}
mkdirSync(resolve("data/private"), { recursive: true });
writeFileSync(out, seedSql(seedRows(data, "seed")));
console.log(`${data.households.length} households · ${data.individuals.length} individuals · ${data.friends.length} friend groups → ${out}`);
