// Shared household decision widgets: ? / bloom mark, v9 decision pill, kids chip menu.
import type { InviteCtx } from "../../people/invite";
import type { Decision, KidsRule, Party } from "../../people/types";
import { Bloom } from "../garden/motifs";
import type { Actions } from "./actions";
import { DECISION_LABEL, KIDS_RULE_TEXT, kidsResolved } from "./model";
import { Menu } from "./Menu";

const PILL_ORDER: Decision[] = ["invite", "ifroom", "no", "undecided"];

/** v9: the current decision as one pill (Bloom + text) that opens a menu. Choosing the lit item is a no-op (never toggles back). */
export function DecisionPill({ party, act }: { party: Party; act: Actions }) {
  return (
    <Menu label={`Decision for ${party.name}: ${DECISION_LABEL[party.invite]}. Change.`} align="right" triggerClass="pp-pill"
      trigger={<><DecisionMark state={party.invite} /><span className="pp-pill-text">{DECISION_LABEL[party.invite]}</span><span aria-hidden="true" className="pp-pill-caret">▾</span></>}
      items={PILL_ORDER.map((d) => ({ key: d, label: DECISION_LABEL[d], checked: party.invite === d, onSelect: () => { if (party.invite !== d) act.decide(party, d); } }))} />
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
