// Ask the planner panel: pure helpers (history, examples, error wording). No React.
import type { AskInput } from "../../../worker/ask";

export const MAX_QUESTION = 1000;
export const HISTORY_TURNS = 6;
export const EXAMPLES = [
  "Who's still undecided on Angela's side?",
  "How many adults and kids if everyone undecided comes?",
  "Add a task to book the DJ tasting next week",
  "Which households have kids but kids out?",
] as const;
export const NO_KEY_MESSAGE = "An Anthropic API key needs to be added as a Cloudflare secret (ANTHROPIC_API_KEY).";

export interface Turn { role: "user" | "assistant"; text: string }

/** Last 6 turns as the API wants them; empty turns dropped. */
export const trimHistory = (turns: Turn[]): NonNullable<AskInput["history"]> =>
  turns.filter((t) => t.text.trim()).slice(-HISTORY_TURNS).map((t) => ({ role: t.role, text: t.text }));

/** A sendable question: trimmed, 1..1000 chars, else null. */
export const cleanQuestion = (raw: string): string | null => {
  const q = raw.trim();
  return q && q.length <= MAX_QUESTION ? q : null;
};

/** What to show when /api/ask fails. */
export function askErrorText(status: number | undefined, message: string | undefined): { text: string; retry: boolean } {
  if (status === 503) return { text: NO_KEY_MESSAGE, retry: false };
  return { text: message?.trim() || "Something went wrong.", retry: true };
}
