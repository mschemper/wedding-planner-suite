// One-tap actions (edit() + Undo) shared by Decide, Family and Friends.
import { useCallback, useMemo, useState } from "react";
import { useData, type Patch, type SaveResult } from "../data";
import type { Decision, KidsPolicy, KidsRule, Party } from "../../people/types";
import { linkParentsPatches, type ParentUnit } from "../../people/relatives";
import type { Ring } from "../../people/rings";
import { branchEdit, decisionEdit, inviteAllEdit, kidsEdit, moveRank, policyEdit, talkEdit, tierEdit } from "./model";

export type SaveFail = Extract<SaveResult, { ok: false }>;

export interface Actions {
  decide(p: Party, d: Decision): void;
  kids(p: Party, r: KidsRule): void;
  talk(p: Party, on: boolean): void;
  policy(v: KidsPolicy): void;
  /** move one place inside a ring / friend tier; `list` = that ring's parties in display order */
  move(list: Party[], id: string, dir: -1 | 1): void;
  tier(p: Party, tier: number | null, friend: boolean): void;
  inviteAll(ring: Pick<Ring, "label" | "rows">): void;
  renameBranch(raw: string, name: string): void;
  /** set these people's parents to a unit (placement tray) */
  linkParents(childIds: string[], unit: ParentUnit): void;
  error: SaveFail | null;
  clearError(): void;
}

export function useActions(): Actions {
  const { edit, people, settings } = useData();
  const [error, setError] = useState<SaveFail | null>(null);
  const run = useCallback(async (patches: Patch[], label: string) => {
    if (!patches.length) return;
    const r = await edit(patches, label);
    setError(r.ok ? null : r);
  }, [edit]);
  const parties = people.parties;
  const names = settings.branchNames;
  return useMemo<Actions>(() => ({
    decide: (p, d) => { const e = decisionEdit(p, parties, d); void run([e.patch], e.label); },
    kids: (p, r) => { const e = kidsEdit(p, r); void run([e.patch], e.label); },
    talk: (p, on) => { const e = talkEdit(p, on); void run([e.patch], e.label); },
    policy: (v) => { const e = policyEdit(v); void run([e.patch], e.label); },
    move: (list, id, dir) => {
      const name = list.find((x) => x.id === id)?.name ?? "Household";
      void run(moveRank(list, id, dir), `${name} ${dir < 0 ? "up" : "down"}`);
    },
    tier: (p, t, friend) => { const e = tierEdit(p, t, friend); void run([e.patch], e.label); },
    inviteAll: (ring) => { const e = inviteAllEdit(ring); void run(e.patches, e.label); },
    renameBranch: (raw, name) => { const e = branchEdit(names, raw, name); void run([e.patch], e.label); },
    linkParents: (childIds, unit) => {
      const n = childIds.length;
      void run(linkParentsPatches(childIds, unit, people), `${n === 1 ? "1 person" : `${n} people`} placed under ${unit.names}`);
    },
    error, clearError: () => setError(null),
  }), [parties, names, run, error, people]);
}
