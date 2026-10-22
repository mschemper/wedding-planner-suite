// Shared household decision widgets: ? / bloom mark, 3-way control, kids chip menu.
import type { InviteCtx } from "../../people/invite";
import type { Decision, KidsRule, Party } from "../../people/types";
import { Bloom } from "../garden/motifs";
import { Segmented } from "../kit/kit";
import type { Actions } from "./actions";
import { KIDS_RULE_TEXT, kidsResolved } from "./model";
import { Menu } from "./Menu";

type DecideOpt = Exclude<Decision, "undecided">;
const OPTS: { value: DecideOpt; label: string; tone: "euc" | "gold" | "plain" }[] = [
  { value: "invite", label: "Invite", tone: "euc" }, { value: "ifroom", label: "If room", tone: "gold" }, { value: "no", label: "No", tone: "plain" },
];

/** Tap the lit option again to return to undecided. */
export function DecisionControl({ party, act }: { party: Party; act: Actions }) {
  return (
    <Segmented label={`Invite decision for ${party.name}`} options={OPTS} value={party.invite === "undecided" ? null : party.invite} onChange={(v) => act.decide(party, v)} />
  );
}

/** Bloom for a decision; undecided = a "?" chip (text, not colour). */
export function DecisionMark({ state }: { state: Decision }) {
  if (state === "undecided") return <span className="pp-q" role="img" aria-label="undecided">?</span>;
  return <Bloom state={state} />;
}

export function KidsChip({ party, ctx, act }: { party: Party; ctx: InviteCtx; act: Actions }) {
  const now = kidsResolved(party, ctx);
  return (
    <Menu label={`Kids of ${party.name}: ${now === "in" ? "in" : "out"}. Change.`} triggerClass="pp-chipbtn"
      trigger={<span className={`k-chip ${now === "in" ? "k-chip-euc" : "k-chip-plain"}`}><span aria-hidden="true">{now === "in" ? "✓" : "✕"}</span> kids {now}</span>}
      items={(["policy", "in", "out"] as KidsRule[]).map((r) => ({
        key: r, label: r === "policy" ? `${KIDS_RULE_TEXT.policy} (${now})` : KIDS_RULE_TEXT[r], checked: party.kids === r, onSelect: () => act.kids(party, r),
      }))} />
  );
}
