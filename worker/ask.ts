// POST /api/ask (v8 "Ask the planner"): answer a plain-English question about the plan and propose edits. Nothing is
// written here: proposals go back to the app, which shows each one and applies it only when Mark or Angela taps Apply.
import type Anthropic from "@anthropic-ai/sdk";
import { mergeSettings } from "../src/data/params";
import { SCENARIOS } from "../src/data/scenarios";
import { customScenario, type CustomVenue } from "../src/data/custom";
import { headcount } from "../src/people/headcount";
import { inviteCtx } from "../src/people/invite";
import { anchorFor, graph, relationText } from "../src/people/kin";
import { tierCtx, tierOf, isFriendParty, tierLabel } from "../src/people/tier";
import { displayName, type Party, type PeopleData, type Person } from "../src/people/types";
import type { State } from "./db";
import { ResearchError, type CreateFn } from "./research";

export interface AskInput { question: string; history?: { role: "user" | "assistant"; text: string }[] }
export const PROPOSAL_KINDS = ["set_decision", "set_kids", "set_ring", "set_local", "set_rsvp", "rename_person", "add_person", "add_task"] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];
/** One suggested change; the app turns it into save ops (src/ui/ask/proposals.ts) and checks every id again. */
export interface Proposal {
  kind: ProposalKind;
  /** one line Mark can read: "Invite 3 of Angela's cousins' households" */
  summary: string;
  party_ids: string[] | null;
  person_ids: string[] | null;
  value: string | null;
  first: string | null;
  last: string | null;
  age: "adult" | "child" | null;
  /** add_person: household to join (null = a new household) */
  party_id: string | null;
  /** add_person: person they are the partner of */
  partner_of: string | null;
  title: string | null;
  due: string | null;
  owner: "Mark" | "Angela" | "Both" | null;
}
export interface AskAnswer { answer: string; proposals: Proposal[] }

const MODEL = "claude-opus-5-5";
const s = (t: string) => ({ type: ["string", "null"], description: t }) as const;
const SCHEMA = {
  type: "object", additionalProperties: false, required: ["answer", "proposals"],
  properties: {
    answer: { type: "string" },
    proposals: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["kind", "summary", "party_ids", "person_ids", "value", "first", "last", "age", "party_id", "partner_of", "title", "due", "owner"],
        properties: {
          kind: { type: "string", enum: PROPOSAL_KINDS },
          summary: { type: "string" },
          party_ids: { type: ["array", "null"], items: { type: "string" } },
          person_ids: { type: ["array", "null"], items: { type: "string" } },
          value: s("set_decision: invite|ifroom|no|undecided; set_kids: policy|in|out; set_ring: 1-4 or null for automatic; set_local: local|away|unknown; set_rsvp: none|accepted|declined"),
          first: s("rename_person / add_person"), last: s("rename_person / add_person"),
          age: { type: ["string", "null"], enum: ["adult", "child", null] },
          party_id: s("add_person: household id to join, null = new household"),
          partner_of: s("add_person: person id they are the partner of"),
          title: s("add_task"), due: s("add_task: YYYY-MM-DD"),
          owner: { type: ["string", "null"], enum: ["Mark", "Angela", "Both", null] },
        },
      },
    },
  },
} as const;

/** Compact, id-carrying snapshot of the plan for the model (no meta columns, deceased and tree-only people left out). */
export function planContext(st: State, today: string): string {
  const d = { people: [...st.people.values()], parties: [...st.parties.values()] } as unknown as PeopleData;
  const settings = mergeSettings([...st.params.values()] as { key: string; value: unknown }[]);
  const g = graph(d.people);
  const tc = tierCtx(d);
  const anchor = (side: string) => anchorFor(d.people, side === "Angela" ? "Angela" : "Mark");
  const hc = headcount(d, settings.kidsPolicy, inviteCtx(d, settings.kidsPolicy));
  const person = (p: Person) => ({ id: p.id, name: displayName(p), relation: relationText(g, anchor(p.side), p), side: p.side, age: p.age, local: p.local, rsvp: p.rsvp, ...(p.partner_id ? { partner: p.partner_id } : {}) });
  const households = d.parties.map((x: Party) => ({
    id: x.id, name: x.name, decision: x.invite, kids_rule: x.kids, ring: tierLabel(tierOf(x, tc), isFriendParty(x, tc)), unnamed_kids: x.unnamed_kids ?? 0,
    ...(x.talk ? { talk: x.talk_note ?? true } : {}),
    people: d.people.filter((p) => p.party_id === x.id && !p.deceased && !p.placeholder).map(person),
  }));
  const custom = [...st.custom_venues.values()].map((v) => customScenario(v as unknown as CustomVenue));
  const venues = [...st.venues.values()].filter((v) => v.active).map((v) => {
    const sc = [...SCENARIOS, ...custom].find((x) => x.id === v.scenario_id);
    return { name: sc?.name, status: v.status, adults_seated: sc?.capacity?.hardMax ?? null, kids_room: sc?.capacity?.kids ?? null, next_step: v.next_step ?? null };
  });
  const tasks = [...st.tasks.values()].filter((t) => t.status === "open").map((t) => ({ id: t.id, title: t.title, due: t.due ?? null, owner: t.owner }));
  const n = (t: { adults: number; kids: number; expected: number }) => ({ adults: t.adults, kids: t.kids, expected: Math.round(t.expected) });
  return JSON.stringify({
    today, couple: "Mark & Angela", kids_policy: settings.kidsPolicy, held_date: settings.heldDate,
    headcount: { invited: n(hc.invited), if_room: n(hc.ifroom), undecided: n(hc.undecided), no: n(hc.no) },
    households, venues, open_tasks: tasks,
  });
}

const SYSTEM = `You are the planning assistant inside Mark & Angela's wedding planner (2027, Chicago). You get a JSON snapshot of their plan: households (envelopes) with an invite decision, kids rule and closeness ring, and the living people in each; headcount split into adults and kids; shortlisted venues; open tasks.
Answer the question from the snapshot only: short, plain sentences, counts exact, adults and kids kept separate. Use names, never ids, in the answer. If the snapshot can't answer it, say what is missing.
When the question asks for a change (or a change would clearly help and they asked what to do), add proposals: each one small, reversible and using ids from the snapshot exactly. Never invent ids. Allowed kinds: set_decision, set_kids, set_ring, set_local, set_rsvp (person_ids), rename_person (person_ids[0] + first/last), add_person (first, last, age, party_id or null for a new household, partner_of), add_task (title, due, owner). Leave unused fields null. No proposals when none were asked for.`;

/** The last 6 turns of the conversation, trimmed. */
const historyMessages = (h: AskInput["history"]): Anthropic.Beta.BetaMessageParam[] =>
  (h ?? []).slice(-6).map((t) => ({ role: t.role, content: String(t.text ?? "").slice(0, 2000) }));

export async function askPlanner(input: AskInput, st: State, create: CreateFn, today = new Date().toISOString().slice(0, 10)): Promise<AskAnswer> {
  const q = input.question?.trim();
  if (!q || q.length > 1000) throw new ResearchError(400, "Ask a question (up to 1,000 characters).");
  const res = await create({
    model: MODEL, max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM }, { type: "text", text: `Plan snapshot:\n${planContext(st, today)}`, cache_control: { type: "ephemeral" } }],
    messages: [...historyMessages(input.history), { role: "user", content: q }],
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === "refusal") throw new ResearchError(502, "Claude declined to answer that. Try rewording the question.");
  if (res.stop_reason === "max_tokens") throw new ResearchError(502, "The answer ran too long. Try a narrower question.");
  const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("").trim();
  let raw: AskAnswer;
  try { raw = JSON.parse(text) as AskAnswer; } catch { throw new ResearchError(502, "Got an answer the app couldn't read. Try again."); }
  // drop proposals that point at rows that don't exist; the client checks again before applying
  const ok = (ids: string[] | null | undefined, m: Map<string, unknown>) => !ids || ids.every((id) => m.has(id));
  const proposals = (Array.isArray(raw.proposals) ? raw.proposals : []).slice(0, 12).filter((p) =>
    PROPOSAL_KINDS.includes(p.kind) && ok(p.party_ids, st.parties) && ok(p.person_ids, st.people)
    && (!p.party_id || st.parties.has(p.party_id)) && (!p.partner_of || st.people.has(p.partner_of)));
  return { answer: String(raw.answer ?? "").slice(0, 4000), proposals };
}

/** Dev only (vite WPS_FAKE_RESEARCH=1): a canned answer with one proposal for the first undecided household. */
export const fakeAsk = (st: State): CreateFn => async () => {
  await new Promise((r) => setTimeout(r, 1200));
  const und = [...st.parties.values()].find((x) => x.invite === "undecided");
  const answer = { answer: `Sample answer (dev). ${und ? `${und.name} is still undecided.` : "Everyone is decided."}`,
    proposals: und ? [{ kind: "set_decision", summary: `Invite ${und.name}`, party_ids: [und.id], person_ids: null, value: "invite", first: null, last: null, age: null, party_id: null, partner_of: null, title: null, due: null, owner: null }] : [] };
  return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(answer) }] } as unknown as Anthropic.Beta.BetaMessage;
};
