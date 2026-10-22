// Cross-row checks on the people data (DESIGN-v4 §3 "Validation"). Pure. The Worker rejects only errors a save introduces.
import type { Issue } from "../api/types";
import { effectiveInvite, inviteCtx } from "./invite";
import { ancestors, graph } from "./kin";
import type { KidsPolicy, PeopleData } from "./types";

export function validatePeople(d: PeopleData, policy: KidsPolicy = "ours"): Issue[] {
  const out: Issue[] = [];
  const err = (where: string, msg: string) => out.push({ level: "error", where, msg });
  const warn = (where: string, msg: string) => out.push({ level: "warning", where, msg });
  const people = new Map(d.people.map((p) => [p.id, p]));
  const parties = new Set(d.parties.map((x) => x.id));
  const g = graph(d.people);
  const ctx = inviteCtx(d, policy);

  if (d.people.filter((p) => p.kind === "couple").length !== 2) err("people", "exactly two couple rows (Mark, Angela) are required");
  for (const p of d.people) {
    if (p.party_id && !parties.has(p.party_id)) err(p.id, `household ${p.party_id} does not exist`);
    if (p.placeholder && p.party_id) err(p.id, "a tree-only placeholder cannot be in a household");
    if (!p.placeholder && p.kind !== "couple" && !p.party_id) err(p.id, "needs a household");
    if (p.partner_id) {
      const q = people.get(p.partner_id);
      if (p.partner_id === p.id) err(p.id, "cannot be their own partner");
      else if (!q) err(p.id, `partner ${p.partner_id} does not exist`);
      else if (q.partner_id !== p.id) err(p.id, `partner link to ${q.id} is one-sided`);
    }
    if (p.parent_ids.length > 2) err(p.id, "at most two parents");
    for (const par of p.parent_ids) {
      if (par === p.id) err(p.id, "cannot be their own parent");
      else if (!people.has(par)) err(p.id, `parent ${par} does not exist`);
    }
    if (ancestors(g, p.id).has(p.id)) err(p.id, "parent links form a loop");
    const e = effectiveInvite(p, ctx);
    if (p.rsvp !== "none" && e !== "invite") warn(p.id, "has an RSVP but is not invited");
    if (p.plus_one && p.partner_id && effectiveInvite(people.get(p.partner_id) ?? p, ctx) === "invite" && e === "invite")
      warn(p.id, "plus-one and an invited partner: counted twice");
  }
  for (const x of d.parties) if (x.rank != null && x.invite !== "ifroom") warn(x.id, "rank is ignored unless the household is 'if room'");
  return out;
}
