// v14 mailing addresses, one per household (DESIGN-v14 §5). Pure. Private data: never log, never put in the feed.
import { effectiveInvite, type InviteCtx } from "./invite";
import type { Address, Party, PeopleData } from "./types";

export type AddressDraft = Omit<Address, "id" | "verified"> & { verified?: boolean };

/** Envelope lines: line1, line2?, "City, ST 12345", country when not US. */
export function formatAddress(a: Pick<Address, "line1" | "line2" | "city" | "region" | "postal" | "country">): string[] {
  const cityLine = [a.city, [a.region, a.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.line1, a.line2 ?? "", cityLine, a.country && a.country.toUpperCase() !== "US" ? a.country.toUpperCase() : ""].filter((s) => s && s.trim());
}

const US_STATES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR VI GU AS MP AA AE AP".split(" "));

/** First problem with a draft, or null. US: 2-letter state + 5 or 9 digit ZIP. */
export function addressIssue(a: Partial<AddressDraft>): string | null {
  if (!a.line1?.trim()) return "Add the street address.";
  if (!a.city?.trim()) return "Add the city.";
  const country = (a.country ?? "US").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return "Country is a 2-letter code (US, CA, GB…).";
  if (country === "US") {
    if (!a.region || !US_STATES.has(a.region.trim().toUpperCase())) return "State is a 2-letter code (IL, WI…).";
    if (!a.postal || !/^\d{5}(-?\d{4})?$/.test(a.postal.trim())) return "ZIP is 5 digits (or ZIP+4).";
  } else if (!a.postal?.trim()) return "Add the postal code.";
  return null;
}

/** Trims, upper-cases state/country, "" → null. */
export function cleanAddress(a: AddressDraft): AddressDraft {
  const s = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
  return {
    ...a,
    line1: a.line1.trim(), line2: s(a.line2), city: a.city.trim(),
    region: s(a.region)?.toUpperCase() ?? null, postal: s(a.postal), country: (s(a.country) ?? "US").toUpperCase(),
    source: s(a.source), gathered: s(a.gathered), notes: s(a.notes),
  };
}

export interface AddressProgress {
  /** households with at least one effectively invited person */
  invited: Party[];
  have: Party[];
  missing: Party[];
  /** addresses whose household no longer exists or is not invited (kept, shown separately) */
  other: Address[];
}

/** Invited households with / without an address. "Invited" = any person effectively invited (decision invite or if room). */
export function addressProgress(data: PeopleData, addresses: Address[], ctx: InviteCtx): AddressProgress {
  const byParty = new Map(addresses.map((a) => [a.id, a]));
  const invitedIds = new Set<string>();
  for (const p of data.people) {
    if (!p.party_id || p.placeholder || p.deceased || p.kind === "couple") continue;
    const inv = effectiveInvite(p, ctx);
    if (inv === "invite" || inv === "ifroom") invitedIds.add(p.party_id);
  }
  const invited = data.parties.filter((h) => invitedIds.has(h.id)).sort((a, b) => a.name.localeCompare(b.name));
  return {
    invited,
    have: invited.filter((h) => byParty.has(h.id)),
    missing: invited.filter((h) => !byParty.has(h.id)),
    other: addresses.filter((a) => !invitedIds.has(a.id)),
  };
}
