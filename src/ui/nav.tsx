// Tab navigation shared by the screens. src/ui/App.tsx provides it.
import { createContext, useContext } from "react";

export type Tab = "budget" | "guests" | "quotes";

export interface Nav {
  tab: Tab;
  setTab(t: Tab): void;
  /** switch to Budget and compare all venues at this guest count */
  priceAt(guests: number): void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavContext);
  if (!n) throw new Error("useNav outside NavContext");
  return n;
}
