// One-tap decision actions (edit() + Undo) shared by Decide, Garden and Friends.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useData, type Patch, type SaveResult } from "../data";
import type { Decision, KidsPolicy, KidsRule, Party } from "../../people/types";
import { decisionEdit, kidsEdit, moveRank, noteEdit, policyEdit, talkEdit } from "./model";

export type SaveFail = Extract<SaveResult, { ok: false }>;

export interface Actions {
  decide(p: Party, d: Decision): void;
  kids(p: Party, r: KidsRule): void;
  talk(p: Party, on: boolean): void;
  note(p: Party, text: string): void;
  policy(v: KidsPolicy): void;
  move(ranked: Party[], id: string, dir: -1 | 1): void;
  error: SaveFail | null;
  clearError(): void;
}

export function useActions(): Actions {
  const { edit, people } = useData();
  const [error, setError] = useState<SaveFail | null>(null);
  const run = useCallback(async (patches: Patch[], label: string) => {
    if (!patches.length) return;
    const r = await edit(patches, label);
    setError(r.ok ? null : r);
  }, [edit]);
  const parties = people.parties;
  return useMemo<Actions>(() => ({
    decide: (p, d) => { const e = decisionEdit(p, parties, d); void run([e.patch], e.label); },
    kids: (p, r) => { const e = kidsEdit(p, r); void run([e.patch], e.label); },
    talk: (p, on) => { const e = talkEdit(p, on); void run([e.patch], e.label); },
    note: (p, t) => { const e = noteEdit(p, t); void run([e.patch], e.label); },
    policy: (v) => { const e = policyEdit(v); void run([e.patch], e.label); },
    move: (ranked, id, dir) => {
      const name = ranked.find((x) => x.id === id)?.name ?? "Household";
      void run(moveRank(ranked, id, dir), `${name} ${dir < 0 ? "up" : "down"} in If room`);
    },
    error, clearError: () => setError(null),
  }), [parties, run, error]);
}

/** true at >= 860px (garden shows both sides; Decide is two columns). */
export function useWide(min = 860): boolean {
  const q = `(min-width: ${min}px)`;
  const [wide, setWide] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : true));
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return wide;
}
