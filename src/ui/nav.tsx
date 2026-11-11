// Tab navigation shared by the screens (DESIGN-v4 §2). src/ui/App.tsx provides it.
import { createContext, useContext } from "react";
import type { PreferredCategory as PreferredType } from "../data/preferredVendors";
export type { PreferredType };

export type Tab = "today" | "budget" | "people" | "plan" | "day";
export type DaySection = "venue" | "vendors" | "timeline";
/** v14 Plan tab view (deep link from Today) */
export interface PlanView { mode?: "list" | "calendar"; filter?: "all" | "ready" | "decisions" }

export interface Nav {
  tab: Tab;
  setTab(t: Tab): void;
  /** People tab, open this person's Edit details sheet */
  openPerson(personId: string): void;
  /** Plan tab, scroll to / highlight this task */
  openTask(taskId: string): void;
  /** Plan tab (v14), open in a view: Today's "Ready now" / "Decisions" links. PlanScreen reads `focus.plan` and clears it. */
  openPlan(view?: PlanView): void;
  /** Day tab (v11), open a section */
  openDay(section?: DaySection): void;
  /** v18: Day → Vendors, Joinery preferred list on this vendor type */
  openPreferred(type: PreferredType): void;
  /** Venues tab, compare every venue at this guest count */
  priceAt(guests: number): void;
  /** target set by openPerson/openTask/openPlan; the screen clears it once handled */
  focus: { person?: string; task?: string; plan?: PlanView; preferred?: PreferredType };
  clearFocus(): void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavContext);
  if (!n) throw new Error("useNav outside NavContext");
  return n;
}
