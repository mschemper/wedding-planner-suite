import type { ScenarioKind } from "../engine/types";
import type { GuestData, Locality } from "./schema";

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

const isInvited = (status: string) => status !== "Declined" && status !== "Not inviting";

export function forecastAttendance(d: GuestData, kind: ScenarioKind = "local"): AttendanceForecast {
  let invited = 0, adults = 0, children = 0, expected = 0;
  const add = (loc: Locality, aoc: string, heads: number, status: string) => {
    if (!isInvited(status)) return;
    invited += heads;
    if (aoc === "Child") children += heads; else adults += heads;
    const p = status === "Accepted" ? 1 : kind === "destination" ? ACCEPTANCE.destination : ACCEPTANCE.local[loc];
    expected += heads * p;
  };
  for (const p of d.individuals) add(p.Locality, p.AdultOrChild, 1, p.InviteStatus);
  for (const f of d.friends) add(f.Locality, f.AdultOrChild, f.PlusOneDefault === "Yes" ? 2 : 1, f.InviteStatus);
  return { invited, adults, children, expected: Math.round(expected), ceiling: invited };
}
