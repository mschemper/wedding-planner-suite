// How a household or couple is named on screen (v7). Pure. Partners keep their own surnames:
// same surname → "Ada & Ben Sample"; different → "Cleo Example & Dev Other"; a missing surname is left out.
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

/**
 * Envelope name a household gets automatically (v8): living adults with "&" and each one's own surname ("Ada & Ben
 * Sample", "Cleo Example & Dev Other"); a single adult with a plus-one gets "& Guest"; kids only when there are no
 * adults. "" when nobody living is in the household.
 */
export function envelopeName(members: Pick<Person, "first" | "nick" | "last" | "deceased" | "placeholder" | "age" | "plus_one">[]): string {
  const live = members.filter((m) => !m.deceased && !m.placeholder);
  const adults = live.filter((m) => m.age === "adult");
  const base = pairName(adults.length ? adults : live);
  return base && adults.length === 1 && adults[0].plus_one ? `${base} & Guest` : base;
}

/** The automatic name for a household's members, in envelope order: blood relative (linked to parents) first, then record order. */
export function householdEnvelope(members: Person[]): string {
  const sorted = [...members].sort((a, b) => Number((b.parent_ids ?? []).length > 0) - Number((a.parent_ids ?? []).length > 0)
    || (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));
  return envelopeName(sorted);
}

export interface NameFix { partyId: string; from: string; to: string }
/** Automatic households whose stored name differs from what their people say (the one-time tidy, v8). */
export function nameFixes(d: { people: Person[]; parties: { id: string; name: string; name_custom?: boolean }[] }): NameFix[] {
  return d.parties.flatMap((x) => {
    if (x.name_custom) return [];
    const to = householdEnvelope(d.people.filter((p) => p.party_id === x.id));
    return to && to !== x.name ? [{ partyId: x.id, from: x.name, to }] : [];
  });
}
