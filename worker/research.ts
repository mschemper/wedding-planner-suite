// POST /api/research (v7): research a venue on the web with Claude (web search) and return a draft the app shows before
// anything is saved. Nothing here writes D1; the client saves the approved draft through /api/write.
import Anthropic from "@anthropic-ai/sdk";
import { BUDGET_CATEGORIES, itemIssues, type CustomItem } from "../src/data/custom";

export interface ResearchInput { name: string; city?: string | null; guests?: number | null }
export interface ResearchDraft {
  name: string;
  location: string | null;
  website: string | null;
  kind: "local" | "destination";
  description: string | null;
  capacity_seated: number | null;
  capacity_kids: number | null;
  capacity_cocktail: number | null;
  items: CustomItem[];
  confidence: number;
  summary: string;
  sources: string[];
  researched_at: string;
}

type CreateParams = Anthropic.Beta.MessageCreateParamsNonStreaming;
/** Injected in tests; production calls the Claude API. */
export type CreateFn = (p: CreateParams) => Promise<Anthropic.Beta.BetaMessage>;

export class ResearchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const MODEL = "claude-opus-5-5";
const MAX_CONTINUATIONS = 4;

const num = { type: ["number", "null"] } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "location", "website", "kind", "description", "capacity_seated", "capacity_kids", "capacity_cocktail", "items", "confidence", "summary", "sources"],
  properties: {
    name: { type: "string" },
    location: { type: ["string", "null"] },
    website: { type: ["string", "null"] },
    kind: { type: "string", enum: ["local", "destination"] },
    description: { type: ["string", "null"] },
    capacity_seated: num, capacity_kids: num, capacity_cocktail: num,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cat", "desc", "type", "amount", "rate", "taxable", "source_url", "note"],
        properties: {
          cat: { type: "string", enum: BUDGET_CATEGORIES },
          desc: { type: "string" },
          type: { type: "string", enum: ["fixed", "perGuest", "percent"] },
          amount: num, rate: num,
          taxable: { type: "boolean" },
          source_url: { type: ["string", "null"] },
          note: { type: ["string", "null"] },
        },
      },
    },
    confidence: { type: "number" },
    summary: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM = `You research wedding venues for a couple planning a 2027 wedding in the Chicago area (late spring or early fall, Saturday evening, about 60–100 adults; kids may have a separate room).
Use web search: find the venue's official site and pricing pages, rate sheets, wedding listings (The Knot, WeddingWire, Zola, Here Comes the Guide), and recent reviews that mention prices.
Return a budget the app can price by guest count:
- Line items only for costs at this venue: rental / site fee (fixed), per-person catering (perGuest), bar packages (perGuest), a food and drink minimum as a fixed line (its total in "amount"), service charge and tax (one percent line, as a fraction like 0.22, applied to taxable food and drink lines), required fees (security, cleaning, coordinator, insurance; fixed).
- perGuest lines: "rate" = dollars per guest (e.g. 165), "amount" null. fixed lines: "amount" = dollars, "rate" null. percent: "rate" as a fraction, "amount" null.
- Prefer published 2026–2027 Saturday prices. When a number is not published, estimate it from comparable Chicago venues of the same style and say "estimate" in the note. Never invent a source URL: only cite pages you actually opened.
- capacity_seated = seated dinner maximum; capacity_kids = seats in a separate kids' room if one exists, else null; capacity_cocktail = standing maximum.
- confidence 0–100: how much of the budget comes from the venue's own published prices.
- summary: 2–4 plain sentences: what the venue is, what is included, what is unknown and should be asked.`;

/** Server-side checks: shape, ranges, and nothing that is not a web link in sources. */
export function cleanDraft(raw: unknown, input: ResearchInput, today: string): ResearchDraft {
  const r = raw as Record<string, unknown>;
  if (!r || typeof r !== "object" || typeof r.name !== "string") throw new ResearchError(502, "Research returned no venue.");
  // Repair the usual slips instead of rejecting the whole result: a per-guest line that is really a total or minimum
  // (rate > 2,000 or only an amount) becomes a fixed line; a percent given as 22 becomes 0.22; a fixed line with only a rate
  // uses it as the amount. Lines still unusable are dropped and listed in the summary so Mark can add them by hand.
  const dropped: string[] = [];
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 30).flatMap((x) => {
    const it = x as CustomItem;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
    let type = it.type;
    let amount = n(it.amount);
    let rate = n(it.rate);
    let note = it.note ? String(it.note).slice(0, 200) : null;
    if (type === "perGuest" && (rate == null || rate > 2_000) && (amount ?? rate) != null) {
      amount = amount ?? rate; rate = null; type = "fixed";
      note = [note, "given as a total, not per guest"].filter(Boolean).join("; ");
    }
    if (type === "percent" && rate != null && rate > 1 && rate <= 60) rate = rate / 100;
    if (type === "fixed" && amount == null && rate != null) amount = rate;
    const line = { cat: it.cat, desc: String(it.desc ?? "").slice(0, 120), type, amount: type === "fixed" ? amount : null,
      rate: type === "fixed" ? null : rate, taxable: !!it.taxable,
      source_url: typeof it.source_url === "string" && /^https?:\/\//i.test(it.source_url) ? it.source_url : null, note };
    if (itemIssues([line]).length) { dropped.push(line.desc || "a line"); return []; }
    return [line];
  });
  const int = (v: unknown, max: number) => (typeof v === "number" && v > 0 && v <= max ? Math.round(v) : null);
  const link = (v: unknown) => (typeof v === "string" && /^https?:\/\//i.test(v) ? v : null);
  return {
    name: r.name.slice(0, 80) || input.name, location: typeof r.location === "string" ? r.location.slice(0, 120) : input.city ?? null,
    website: link(r.website), kind: r.kind === "destination" ? "destination" : "local",
    description: typeof r.description === "string" ? r.description.slice(0, 300) : null,
    capacity_seated: int(r.capacity_seated, 2000), capacity_kids: int(r.capacity_kids, 500), capacity_cocktail: int(r.capacity_cocktail, 3000),
    items, confidence: Math.max(0, Math.min(100, Math.round(Number(r.confidence) || 0))),
    summary: (typeof r.summary === "string" ? r.summary.slice(0, 800) : "") + (dropped.length ? ` (Left out, add by hand if needed: ${dropped.slice(0, 5).join(", ")}.)` : ""),
    sources: [...new Set((Array.isArray(r.sources) ? r.sources : []).map(link).filter((s): s is string => !!s))].slice(0, 12),
    researched_at: today,
  };
}

export async function researchVenue(input: ResearchInput, create: CreateFn, today = new Date().toISOString().slice(0, 10)): Promise<ResearchDraft> {
  const name = input.name?.trim();
  if (!name || name.length > 80) throw new ResearchError(400, "Venue name is required (up to 80 characters).");
  const ask = `Venue: ${name}${input.city?.trim() ? `, ${input.city.trim().slice(0, 60)}` : " (Chicago area)"}.${input.guests ? ` Price it for about ${Math.round(input.guests)} guests.` : ""}`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: ask }];
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const res = await create({
      model: MODEL, max_tokens: 16000, system: SYSTEM, messages,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as CreateParams);
    if (res.stop_reason === "refusal") throw new ResearchError(502, "Claude declined this research request. Try a different name, or enter the venue by hand.");
    if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
    if (res.stop_reason === "max_tokens") throw new ResearchError(502, "Research ran out of room. Try again, or enter the venue by hand.");
    const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("").trim();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new ResearchError(502, "Research returned something that isn't a venue budget. Try again."); }
    return cleanDraft(parsed, input, today);
  }
  throw new ResearchError(504, "Research took too long. Try again.");
}

/** Production client (Worker): one retry, 2-minute timeout per call. */
export const claudeCreate = (apiKey: string): CreateFn => {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 });
  return (p) => client.beta.messages.create(p);
};

/** Dev only (vite WPS_FAKE_RESEARCH=1): a canned answer so the Add venue flow can be tried without a key or network. */
export const fakeResearch: CreateFn = async (p) => {
  await new Promise((r) => setTimeout(r, 2000));
  const name = String((p.messages[0]?.content as string).replace(/^Venue: /, "").split(/[,.(]/)[0]);
  const draft = {
    name, location: "Chicago, IL", website: "https://example.com/venue", kind: "local", description: "Sample result (dev): a garden venue with a glass conservatory.",
    capacity_seated: 120, capacity_kids: 25, capacity_cocktail: 180,
    items: [
      { cat: "Venue & site", desc: "Saturday rental (sample)", type: "fixed", amount: 8500, rate: null, taxable: false, source_url: "https://example.com/venue/pricing", note: null },
      { cat: "Food & beverage", desc: "Catering, plated dinner (sample)", type: "perGuest", amount: null, rate: 125, taxable: true, source_url: null, note: "estimate" },
      { cat: "Food & beverage", desc: "Open bar, 5 hours (sample)", type: "perGuest", amount: null, rate: 45, taxable: true, source_url: null, note: "estimate" },
      { cat: "Food & beverage", desc: "Service charge + tax (sample)", type: "percent", amount: null, rate: 0.23, taxable: false, source_url: null, note: null },
    ],
    confidence: 45, summary: "Sample dev result. Rental is published; catering and bar are estimates from similar Chicago venues. Ask about the F&B minimum and 2027 Saturdays.",
    sources: ["https://example.com/venue/pricing"],
  };
  return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(draft) }] } as unknown as Anthropic.Beta.BetaMessage;
};
