// How a household or couple is named on screen (v7). Pure. Partners keep their own surnames:
// same surname → "Fran & Len Van Noord"; different → "Erica Schemper & Erik Vorhes"; a missing surname is left out.
import type { Person } from "./types";

const firstOf = (p: Pick<Person, "first" | "nick">) => p.nick || p.first;

/** Names of up to two adults (more: first names joined). Deceased people are never named. */
export function pairName(people: Pick<Person, "first" | "nick" | "last" | "deceased">[]): string {
  const living = people.filter((p) => !p.deceased);
  if (!living.length) return "";
  const lasts = living.map((p) => p.last?.trim() || null);
  const known = lasts.filter((l): l is string => !!l);
  const shared = known.length === living.length && new Set(known.map((l) => l.toLowerCase())).size === 1;
  if (living.length === 1 || shared) return `${living.map(firstOf).join(" & ")}${known[0] ? ` ${known[0]}` : ""}`;
  return living.map((p, i) => `${firstOf(p)}${lasts[i] ? ` ${lasts[i]}` : ""}`).join(" & ");
}

/**
 * Last names that can be filled in from the household name (friends were imported with the full names only on the
 * household): "John Schoon and Sara Tripp" → John: Schoon, Sara: Tripp. Only people with no last name; only exact
 * first-name matches. Returns person id → last name.
 */
export function lastNamesFromHousehold(partyName: string, members: Pick<Person, "id" | "first" | "nick" | "last">[]): Map<string, string> {
  const out = new Map<string, string>();
  const parts = partyName.replace(/\s*\+\s*guest\b.*$/i, "").split(/\s+(?:and|&)\s+|\s*,\s*/i).map((s) => s.trim().split(/\s+/)).filter((w) => w.length > 1);
  for (const m of members) {
    if (m.last?.trim()) continue;
    const hit = parts.find((w) => [m.first, m.nick].some((n) => n && n.toLowerCase() === w[0].toLowerCase()));
    if (hit) out.set(m.id, hit.slice(1).join(" "));
  }
  return out;
}
