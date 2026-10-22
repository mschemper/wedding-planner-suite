// Prefs shared by every screen (src/ui/prefs.ts). App.tsx provides them.
import { createContext, useContext } from "react";
import type { Prefs } from "./prefs";

export interface PrefsCtx {
  prefs: Prefs;
  set(patch: Partial<Prefs>): void;
}

export const PrefsContext = createContext<PrefsCtx | null>(null);

export function usePrefs(): PrefsCtx {
  const p = useContext(PrefsContext);
  if (!p) throw new Error("usePrefs outside PrefsContext");
  return p;
}
