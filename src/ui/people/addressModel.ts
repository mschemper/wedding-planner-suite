// v14 mailing-address UI model (DESIGN-v14 §5). Pure. Private data: never log, never put in messages/titles/URLs.
import type { Op } from "../../api/types";
import { addressIssue, addressProgress, cleanAddress, formatAddress, type AddressDraft, type AddressProgress } from "../../people/address";
import type { InviteCtx } from "../../people/invite";
import type { Address, PeopleData } from "../../people/types";

/** Form state: every field a string so inputs never reject keystrokes. */
export interface AddrForm {
  line1: string; line2: string; city: string; region: string; postal: string; country: string;
  source: string; gathered: string; verified: boolean; notes: string;
}

export const todayIso = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const blankForm = (today: string): AddrForm => ({ line1: "", line2: "", city: "", region: "", postal: "", country: "US", source: "", gathered: today, verified: false, notes: "" });

export const formFrom = (a: Address): AddrForm => ({
  line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postal: a.postal ?? "", country: a.country || "US",
  source: a.source ?? "", gathered: a.gathered ?? "", verified: a.verified, notes: a.notes ?? "",
});

const toDraft = (f: AddrForm): AddressDraft & { verified: boolean } => ({
  line1: f.line1, line2: f.line2, city: f.city, region: f.region, postal: f.postal, country: f.country,
  source: f.source, gathered: f.gathered, verified: f.verified, notes: f.notes,
});

/** First problem with the form, or null. Dates must be YYYY-MM-DD when given. */
export function formIssue(f: AddrForm): string | null {
  const d = toDraft(f);
  const base = addressIssue(d);
  if (base) return base;
  if (f.gathered.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(f.gathered.trim())) return "Date gathered is YYYY-MM-DD.";
  return null;
}

/** Cleaned row fields for create / update. */
export function formRow(f: AddrForm): Omit<Address, "id"> {
  const c = cleanAddress(toDraft(f));
  return {
    line1: c.line1, line2: c.line2 ?? null, city: c.city, region: c.region ?? null, postal: c.postal ?? null, country: c.country,
    source: c.source ?? null, gathered: c.gathered ?? null, verified: !!f.verified, notes: c.notes ?? null,
  };
}

export const formDirty = (a: AddrForm, b: AddrForm) => JSON.stringify(formRow(a)) !== JSON.stringify(formRow(b));

/** Save op for a household: create when it has none, else the patch for edit(). */
export function createOp(partyId: string, f: AddrForm): Op {
  return { table: "addresses", op: "create", row: { id: partyId, ...formRow(f) } } as Op;
}

/** Text for a failed save. Never includes address content. */
export function failText(r: { kind: string; message: string }): string {
  if (r.kind === "unauthorized") return "Sign-in expired — reload, your draft is kept below.";
  if (r.kind === "conflict" || r.kind === "not_found") return "Changed elsewhere — reload to see the latest, then re-apply your draft.";
  return `Not saved: ${r.message}`;
}

export const progressText = (p: AddressProgress) => `${p.have.length} of ${p.invited.length} invited households have an address`;
export const progressPct = (p: AddressProgress) => (p.invited.length ? Math.round((p.have.length / p.invited.length) * 100) : 0);

export interface AddressRows {
  progress: AddressProgress;
  missing: { id: string; name: string }[];
  have: { id: string; name: string; lines: string[]; verified: boolean }[];
  other: { id: string; name: string; lines: string[]; verified: boolean }[];
}

/** Everything the Addresses section shows. "Other" = address kept but household not invited / gone. */
export function addressRows(data: PeopleData, addresses: Address[], ctx: InviteCtx): AddressRows {
  const progress = addressProgress(data, addresses, ctx);
  const byId = new Map(addresses.map((a) => [a.id, a]));
  const names = new Map(data.parties.map((p) => [p.id, p.name]));
  const row = (a: Address) => ({ id: a.id, name: names.get(a.id) ?? "Household no longer exists", lines: formatAddress(a), verified: a.verified });
  return {
    progress,
    missing: progress.missing.map((p) => ({ id: p.id, name: p.name })),
    have: progress.have.map((p) => row(byId.get(p.id)!)),
    other: progress.other.map(row).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
