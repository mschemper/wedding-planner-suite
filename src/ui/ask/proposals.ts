// Ask the planner (v8): turn one proposal from /api/ask into save ops plus the lines shown before applying. Pure.
// Every id and value is checked again here; anything that doesn't fit is refused with a reason, never guessed.
import type { Op } from "../../api/types";
import type { AskAnswer, Proposal } from "../../../worker/ask";
import { DECISIONS, KIDS_RULES, LOCALS, RSVPS, displayName, type Party, type PeopleData, type Person } from "../../people/types";

export type { AskAnswer, Proposal };
export type VersionOf = (table: "people" | "parties", id: string) => number | undefined;
export type Prepared = { ok: true; ops: Op[]; label: string; lines: string[] } | { ok: false; msg: string };

const DECISION_WORD: Record<string, string> = { undecided: "Undecided", invite: "Invite", ifroom: "If room", no: "No" };
const KIDS_WORD: Record<string, string> = { policy: "Follow policy", in: "Kids in", out: "Kids out" };
const RING_WORD = (v: unknown) => (v == null ? "Automatic" : `Ring ${v}`);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function prepare(p: Proposal, d: PeopleData, version: VersionOf): Prepared {
  const parties = new Map(d.parties.map((x) => [x.id, x]));
  const people = new Map(d.people.map((x) => [x.id, x]));
  const fail = (msg: string): Prepared => ({ ok: false, msg });
  const pick = <T>(ids: string[] | null, m: Map<string, T>): T[] | null => {
    if (!ids?.length) return null;
    const out = ids.map((id) => m.get(id));
    return out.every(Boolean) ? (out as T[]) : null;
  };
  const partyUpdates = (list: Party[], field: keyof Party, value: unknown, word: (v: unknown) => string): Prepared => {
    const ops: Op[] = [];
    const lines: string[] = [];
    for (const x of list) {
      if ((x[field] ?? null) === value) continue;
      const v = version("parties", x.id);
      if (v === undefined) return fail(`${x.name} no longer exists.`);
      ops.push({ table: "parties", op: "update", id: x.id, version: v, row: { [field]: value } });
      lines.push(`${x.name}: ${word(x[field] ?? null)} → ${word(value)}`);
    }
    return ops.length ? { ok: true, ops, label: p.summary, lines } : fail("Nothing to change — already set.");
  };

  switch (p.kind) {
    case "set_decision": case "set_kids": case "set_ring": {
      const list = pick(p.party_ids, parties);
      if (!list) return fail("Some of those households no longer exist.");
      if (p.kind === "set_decision") {
        if (!DECISIONS.includes(p.value as never)) return fail(`"${p.value}" isn't a decision.`);
        return partyUpdates(list, "invite", p.value, (v) => DECISION_WORD[String(v)] ?? String(v));
      }
      if (p.kind === "set_kids") {
        if (!KIDS_RULES.includes(p.value as never)) return fail(`"${p.value}" isn't a kids rule.`);
        return partyUpdates(list, "kids", p.value, (v) => KIDS_WORD[String(v)] ?? String(v));
      }
      const ring = p.value == null || p.value === "auto" || p.value === "null" ? null : Number(p.value);
      if (ring !== null && !(Number.isInteger(ring) && ring >= 1 && ring <= 4)) return fail(`"${p.value}" isn't a ring (1–4).`);
      return partyUpdates(list, "tier", ring, RING_WORD);
    }
    case "set_local": {
      const list = pick(p.party_ids, parties);
      if (!list) return fail("Some of those households no longer exist.");
      if (!LOCALS.includes(p.value as never)) return fail(`"${p.value}" isn't local / away / unknown.`);
      const ids = new Set(list.map((x) => x.id));
      const ops: Op[] = [];
      const lines: string[] = [];
      for (const m of d.people) {
        if (!m.party_id || !ids.has(m.party_id) || m.placeholder || m.deceased || m.local === p.value) continue;
        const v = version("people", m.id);
        if (v === undefined) return fail(`${displayName(m)} no longer exists.`);
        ops.push({ table: "people", op: "update", id: m.id, version: v, row: { local: p.value } });
        lines.push(`${displayName(m)}: ${m.local} → ${p.value}`);
      }
      return ops.length ? { ok: true, ops, label: p.summary, lines } : fail("Nothing to change — already set.");
    }
    case "set_rsvp": {
      const list = pick(p.person_ids, people);
      if (!list) return fail("Some of those people no longer exist.");
      if (!RSVPS.includes(p.value as never)) return fail(`"${p.value}" isn't an RSVP (none / accepted / declined).`);
      const ops: Op[] = [];
      const lines: string[] = [];
      for (const m of list) {
        if (m.rsvp === p.value) continue;
        const v = version("people", m.id);
        if (v === undefined) return fail(`${displayName(m)} no longer exists.`);
        ops.push({ table: "people", op: "update", id: m.id, version: v, row: { rsvp: p.value } });
        lines.push(`${displayName(m)}: RSVP ${m.rsvp} → ${p.value}`);
      }
      return ops.length ? { ok: true, ops, label: p.summary, lines } : fail("Nothing to change — already set.");
    }
    case "rename_person": {
      const m = p.person_ids?.length === 1 ? people.get(p.person_ids[0]) : undefined;
      if (!m) return fail("That person no longer exists.");
      const row: Record<string, unknown> = {};
      if (p.first?.trim() && p.first.trim() !== m.first) row.first = p.first.trim();
      if (p.last != null && (p.last.trim() || null) !== (m.last ?? null)) row.last = p.last.trim() || null;
      if (!Object.keys(row).length) return fail("The name is already like that.");
      const v = version("people", m.id);
      if (v === undefined) return fail("That person no longer exists.");
      const after = displayName({ first: String(row.first ?? m.first), last: (row.last as string | null | undefined) === undefined ? m.last : (row.last as string | null), nick: m.nick });
      return { ok: true, ops: [{ table: "people", op: "update", id: m.id, version: v, row }], label: p.summary, lines: [`${displayName(m)} → ${after} (household name follows)`] };
    }
    case "add_person": {
      const first = p.first?.trim();
      if (!first) return fail("A first name is needed.");
      const partner: Person | undefined = p.partner_of ? people.get(p.partner_of) : undefined;
      if (p.partner_of && !partner) return fail("The partner they belong with no longer exists.");
      const party = p.party_id ? parties.get(p.party_id) : partner?.party_id ? parties.get(partner.party_id) : undefined;
      if (p.party_id && !party) return fail("That household no longer exists.");
      const peer = partner ?? d.people.find((x) => x.party_id === party?.id && !x.placeholder);
      const age = p.age === "child" ? "child" : "adult";
      const ops: Op[] = [];
      if (!party) ops.push({ table: "parties", op: "create", row: { id: "tmp:hh", name: first, invite: "undecided", kids: "policy", talk: false } });
      ops.push({ table: "people", op: "create", row: {
        id: "tmp:p", first, last: p.last?.trim() || null, side: peer?.side ?? "Both", kind: peer?.kind === "friend" ? "friend" : peer ? "family" : "friend",
        branch: peer?.branch ?? null, gen: peer?.gen ?? null, party_id: party?.id ?? "tmp:hh", partner_id: partner?.id ?? null, parent_ids: [], age,
        kids_room: age === "child", placeholder: false, deceased: false, rsvp: "none", local: peer?.local ?? "unknown", plus_one: false,
      } });
      const who = `${first}${p.last?.trim() ? ` ${p.last.trim()}` : ""}`;
      return { ok: true, ops, label: p.summary, lines: [`Add ${who} (${age})${partner ? `, partner of ${displayName(partner)}` : ""} → ${party ? party.name : "a new household"}`] };
    }
    case "add_task": {
      const title = p.title?.trim();
      if (!title) return fail("A task needs a title.");
      if (p.due && !DATE.test(p.due)) return fail(`"${p.due}" isn't a date.`);
      const owner = p.owner ?? "Both";
      return { ok: true, ops: [{ table: "tasks", op: "create", row: { title: title.slice(0, 120), due: p.due ?? null, owner, category: "admin", source: "manual" } }],
        label: p.summary, lines: [`Task: ${title}${p.due ? ` (due ${p.due})` : ""} · ${owner}`] };
    }
  }
  return fail("The app can't do that kind of change yet.");
}
