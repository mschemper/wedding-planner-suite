// Usage: npx tsx scripts/addresses-sql.ts [data/private/addresses-found.json]   (DESIGN-v14 §5)
// Writes data/private/addresses.sql (gitignored; private): one INSERT per address, only when the household exists and has none.
// Run: npx wrangler d1 execute DB --remote --file data/private/addresses.sql, then check
//   SELECT COUNT(*) FROM addresses WHERE id NOT IN (SELECT id FROM parties)   -> 0. Delete the .sql afterwards. Prints counts only.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { addressIssue, cleanAddress, type AddressDraft } from "../src/people/address";

interface Found extends AddressDraft { party_id: string; source_date?: string | null; note?: string | null; confidence?: string }
const src = resolve(process.argv[2] ?? "data/private/addresses-found.json");
const found = (JSON.parse(readFileSync(src, "utf8")) as { addresses: Found[] }).addresses;
const q = (v: unknown) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const now = new Date().toISOString();
let ok = 0, bad = 0;
const lines: string[] = [];
for (const f of found) {
  const a = cleanAddress({ ...f, gathered: f.gathered ?? f.source_date ?? null, notes: f.notes ?? f.note ?? null });
  if (addressIssue(a) || !f.party_id) { bad++; continue; }
  ok++;
  lines.push(`INSERT INTO addresses (id, line1, line2, city, region, postal, country, source, gathered, verified, notes, version, updated_at, updated_by)
  SELECT ${[f.party_id, a.line1, a.line2, a.city, a.region, a.postal, a.country, a.source, a.gathered].map(q).join(", ")}, 0, ${q(a.notes)}, 1, ${q(now)}, 'import:v14'
  WHERE EXISTS (SELECT 1 FROM parties WHERE id = ${q(f.party_id)}) AND NOT EXISTS (SELECT 1 FROM addresses WHERE id = ${q(f.party_id)});`);
}
const out = resolve("data/private/addresses.sql");
writeFileSync(out, lines.join("\n") + "\n");
console.log(`${ok} addresses written, ${bad} skipped (incomplete) → ${out}`);
