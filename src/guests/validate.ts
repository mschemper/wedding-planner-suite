import { ENUMS, type GuestData } from "./schema";

export interface Issue {
  level: "error" | "warn";
  where: string;
  msg: string;
}

const inEnum = (list: readonly string[], v: unknown) => typeof v === "string" && list.includes(v);

export function validateGuests(d: GuestData): Issue[] {
  const out: Issue[] = [];
  const hh = new Set<string>();
  for (const h of d.households) {
    if (hh.has(h.HouseholdID)) out.push({ level: "error", where: h.HouseholdID, msg: "duplicate HouseholdID" });
    hh.add(h.HouseholdID);
    if (!inEnum(ENUMS.Family, h.Family)) out.push({ level: "error", where: h.HouseholdID, msg: `bad Family "${h.Family}"` });
  }
  const people = new Set<string>();
  const usedHH = new Set<string>();
  for (const p of d.individuals) {
    const w = p.PersonID;
    if (people.has(w)) out.push({ level: "error", where: w, msg: "duplicate PersonID" });
    people.add(w);
    if (!hh.has(p.HouseholdID)) out.push({ level: "error", where: w, msg: `unknown HouseholdID ${p.HouseholdID}` });
    usedHH.add(p.HouseholdID);
    if (!inEnum(ENUMS.AdultOrChild, p.AdultOrChild)) out.push({ level: "error", where: w, msg: `bad AdultOrChild "${p.AdultOrChild}"` });
    if (!inEnum(ENUMS.Locality, p.Locality)) out.push({ level: "error", where: w, msg: `bad Locality "${p.Locality}"` });
    if (!inEnum(ENUMS.InviteStatus, p.InviteStatus)) out.push({ level: "error", where: w, msg: `bad InviteStatus "${p.InviteStatus}"` });
    if (p.InviteException === "Yes" && !p.ExceptionReason && !p.Notes) out.push({ level: "warn", where: w, msg: "exception without reason" });
    const hhFamily = d.households.find((h) => h.HouseholdID === p.HouseholdID)?.Family;
    if (hhFamily && hhFamily !== p.Family) out.push({ level: "warn", where: w, msg: `Family ${p.Family} ≠ household ${hhFamily}` });
  }
  for (const p of d.individuals) {
    if (p.PartnerPersonID && !people.has(p.PartnerPersonID)) out.push({ level: "error", where: p.PersonID, msg: `unknown PartnerPersonID ${p.PartnerPersonID}` });
    for (const par of String(p.ParentPersonIDs ?? "").split(",").map((s) => s.trim()).filter(Boolean))
      if (!people.has(par)) out.push({ level: "error", where: p.PersonID, msg: `unknown parent ${par}` });
  }
  const names = new Map<string, string>();
  for (const p of d.individuals) {
    const key = `${p.HouseholdID}|${String(p.DisplayName ?? "").toLowerCase()}`;
    if (names.has(key)) out.push({ level: "warn", where: p.PersonID, msg: `same DisplayName as ${names.get(key)} in this household` });
    else names.set(key, p.PersonID);
  }
  const friendIds = new Set<string>();
  for (const f of d.friends) {
    const w = f.FriendGroupID;
    if (friendIds.has(w)) out.push({ level: "error", where: w, msg: "duplicate FriendGroupID" });
    friendIds.add(w);
    if (!inEnum(ENUMS.Locality, f.Locality)) out.push({ level: "error", where: w, msg: `bad Locality "${f.Locality}"` });
    if (!inEnum(ENUMS.InviteStatus, f.InviteStatus)) out.push({ level: "error", where: w, msg: `bad InviteStatus "${f.InviteStatus}"` });
    if (!inEnum(ENUMS.YesNo, f.PlusOneDefault)) out.push({ level: "error", where: w, msg: `bad PlusOneDefault "${f.PlusOneDefault}"` });
    if (!inEnum(ENUMS.AdultOrChild, f.AdultOrChild)) out.push({ level: "error", where: w, msg: `bad AdultOrChild "${f.AdultOrChild}"` });
  }
  for (const id of hh) if (!usedHH.has(id)) out.push({ level: "warn", where: id, msg: "household has no individuals" });
  const unknownLoc = d.individuals.filter((p) => p.Locality === "Unknown").length;
  if (unknownLoc) out.push({ level: "warn", where: "Individuals", msg: `${unknownLoc} people with Locality=Unknown (attendance uses blended rate)` });
  const noEdges = d.individuals.every((p) => !p.PartnerPersonID && !p.ParentPersonIDs);
  if (d.individuals.length && noEdges) out.push({ level: "warn", where: "Individuals", msg: "no PartnerPersonID/ParentPersonIDs set — family graph has no edges" });
  return out;
}
