import type { ScenarioKind } from "../engine/types";
import type { GuestData, Locality } from "./schema";

// Couple and vendors are not counted. A friend group with PlusOneDefault=Yes is 2 heads at the group's rate.

/** Reconciled Master v2.0 §2.3 acceptance benchmarks. */
export const ACCEPTANCE = {
  local: { "Local Chicago Area": 0.85, "Out of Town": 0.55, Unknown: 0.78 } as Record<Locality, number>,
  destination: 0.45,
};

export interface AttendanceForecast {
  invited: number;
  adults: number;
  children: number;
  expected: number;
  /** headcount if everyone says yes — planner's caution: budget to this */
  ceiling: number;
}

/** Unknown or misspelt statuses count as invited (safer to over-budget); validate.ts reports them. */
const isInvited = (status: unknown) => {
  const v = String(status ?? "").trim().toLowerCase();
  return v !== "declined" && v !== "not inviting";
};
const isAccepted = (status: unknown) => String(status ?? "").trim().toLowerCase() === "accepted";
/** Unknown locality values fall back to the blended rate instead of NaN. */
const localRate = (loc: unknown) => ACCEPTANCE.local[loc as Locality] ?? ACCEPTANCE.local.Unknown;

export function forecastAttendance(d: GuestData, kind: ScenarioKind = "local"): AttendanceForecast {
  let invited = 0, adults = 0, children = 0, expected = 0;
  const add = (loc: unknown, aoc: unknown, heads: number, status: unknown) => {
    if (!isInvited(status)) return;
    invited += heads;
    if (aoc === "Child") children += heads; else adults += heads;
    const p = isAccepted(status) ? 1 : kind === "destination" ? ACCEPTANCE.destination : localRate(loc);
    expected += heads * p;
  };
  for (const p of d.individuals) add(p.Locality, p.AdultOrChild, 1, p.InviteStatus);
  for (const f of d.friends) add(f.Locality, f.AdultOrChild, f.PlusOneDefault === "Yes" ? 2 : 1, f.InviteStatus);
  return { invited, adults, children, expected: Math.round(expected), ceiling: invited };
}
