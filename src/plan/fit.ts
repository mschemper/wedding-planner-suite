// Must-have fit per venue (DESIGN-v4 §1.8). Pure.
import { fitId, type Fit, type MustHave, type Verdict } from "./types";

export interface FitScore {
  yes: number;
  partly: number;
  no: number;
  unknown: number;
  /** (yes + 0.5 partly) / answered; null when nothing is answered */
  score: number | null;
}

export function fitScore(scenarioId: number, musthaves: MustHave[], fit: Fit[]): FitScore {
  const byId = new Map(fit.filter((f) => f.scenario_id === scenarioId).map((f) => [f.musthave_id, f.verdict]));
  const s: FitScore = { yes: 0, partly: 0, no: 0, unknown: 0, score: null };
  for (const m of musthaves) if (!m.archived) s[byId.get(m.id) ?? "unknown"]++;
  const answered = s.yes + s.partly + s.no;
  s.score = answered ? (s.yes + 0.5 * s.partly) / answered : null;
  return s;
}

export const verdictOf = (fit: Fit[], scenarioId: number, musthaveId: string): Fit | undefined =>
  fit.find((f) => f.id === fitId(scenarioId, musthaveId));

/** Tap order in the matrix. */
export const NEXT_VERDICT: Record<Verdict, Verdict> = { unknown: "yes", yes: "partly", partly: "no", no: "unknown" };

/** Active must-haves in display order. */
export const orderedMustHaves = (m: MustHave[]) => m.filter((x) => !x.archived).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
