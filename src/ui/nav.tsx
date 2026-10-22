// Tab navigation shared by the screens (DESIGN-v4 §2). src/ui/App.tsx provides it.
import { createContext, useContext } from "react";

export type Tab = "today" | "venues" | "people" | "plan";

export interface Nav {
  tab: Tab;
  setTab(t: Tab): void;
  /** Venues tab, open this venue's detail */
  openVenue(scenarioId: number): void;
  /** People tab, open this person's Edit details sheet */
  openPerson(personId: string): void;
  /** Plan tab, scroll to / highlight this task */
  openTask(taskId: string): void;
  /** Venues tab, compare every venue at this guest count */
  priceAt(guests: number): void;
  /** target set by openVenue/openPerson/openTask; the screen clears it once handled */
  focus: { venue?: number; person?: string; task?: string };
  clearFocus(): void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavContext);
  if (!n) throw new Error("useNav outside NavContext");
  return n;
}
