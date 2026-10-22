// One household: decision, kids control, talk flag + note, members. Used by Decide, Friends, Garden sheet.
import { useEffect, useState } from "react";
import type { InviteCtx } from "../../people/invite";
import { displayName, type Decision, type KidsRule, type Party, type Person } from "../../people/types";
import { Bloom } from "../garden/motifs";
import { Chip, Segmented } from "../kit/kit";
import type { Actions } from "./actions";
import { bloomFor, DECISION_LABEL, kidsResolved, sideText, type PartyRow } from "./model";

type DecideOpt = Exclude<Decision, "undecided">;
const DECIDE_OPTS: { value: DecideOpt; label: string; tone: "euc" | "gold" | "plain" }[] = [
  { value: "invite", label: "Invite", tone: "euc" }, { value: "ifroom", label: "If room", tone: "gold" }, { value: "no", label: "No", tone: "plain" },
];

export function DecisionControl({ party, act }: { party: Party; act: Actions }) {
  return (
    <Segmented label={`Invite decision for ${party.name}`} options={DECIDE_OPTS} value={party.invite === "undecided" ? null : party.invite}
      onChange={(v) => act.decide(party, v)} />
  );
}

export function KidsControl({ party, ctx, act }: { party: Party; ctx: InviteCtx; act: Actions }) {
  const opts: { value: KidsRule; label: string; tone: "euc" | "gold" | "plain" }[] = [
    { value: "policy", label: `Policy (${kidsResolved(party, ctx)})`, tone: "plain" }, { value: "in", label: "In", tone: "euc" }, { value: "out", label: "Out", tone: "plain" },
  ];
  return <Segmented label={`Kids of ${party.name}`} options={opts} value={party.kids} onChange={(v) => act.kids(party, v)} />;
}

function Note({ party, act }: { party: Party; act: Actions }) {
  const [text, setText] = useState(party.talk_note ?? "");
  useEffect(() => setText(party.talk_note ?? ""), [party.talk_note]);
  const commit = () => { if (text.trim() !== (party.talk_note ?? "")) act.note(party, text); };
  return (
    <input className="k-input pp-note" value={text} placeholder="Note, e.g. travel?" aria-label={`Talk-about note for ${party.name}`}
      onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}

export function MemberLine({ p, ctx, rel, onPerson }: { p: Person; ctx: InviteCtx; rel: (p: Person) => string; onPerson(id: string): void }) {
  const bits = [rel(p), p.age === "child" ? "child" : null, p.local === "away" ? "out of town" : p.local === "local" ? "local" : null, p.deceased ? "deceased" : null].filter(Boolean);
  return (
    <div className="pp-member">
      <Bloom state={bloomFor(p, ctx)} />
      <button type="button" className="pp-name" onClick={() => onPerson(p.id)} aria-label={`Edit details: ${displayName(p)}`}>
        <b>{displayName(p)}</b><small>{bits.join(" · ")}</small>
      </button>
      <span className="pp-chips">
        {p.kids_room && <Chip tone="gold">kids' room</Chip>}
        {p.plus_one && <Chip>+1</Chip>}
        {p.override && <Chip tone="peony" title="Exception to the household decision">Exception: {p.override === "invite" ? "invite" : "not inviting"}</Chip>}
      </span>
    </div>
  );
}

export function PartyCard({ row, ctx, act, rel, onPerson }: { row: PartyRow; ctx: InviteCtx; act: Actions; rel: (p: Person) => string; onPerson(id: string): void }) {
  const { party } = row;
  const meta = sideText(row);
  return (
    <article className="pp-party" aria-label={party.name}>
      <div className="pp-phead">
        <div className="pp-ptitle">
          <h3>{party.name}</h3>
          <div className="pp-sub">{meta}{meta ? " · " : ""}<span className={`pp-state st-${party.invite}`}>{party.invite === "undecided" ? "Undecided" : DECISION_LABEL[party.invite]}</span></div>
        </div>
        <DecisionControl party={party} act={act} />
      </div>
      {row.members.map((p) => <MemberLine key={p.id} p={p} ctx={ctx} rel={rel} onPerson={onPerson} />)}
      {row.hasKids && (
        <div className="pp-row">
          <span className="pp-label">Kids:</span>
          <KidsControl party={party} ctx={ctx} act={act} />
        </div>
      )}
      <div className="pp-row">
        <button type="button" className="pp-toggle" aria-pressed={party.talk} onClick={() => act.talk(party, !party.talk)}>
          <span aria-hidden="true">{party.talk ? "◉" : "○"}</span> Talk about
        </button>
        {party.talk && <Note party={party} act={act} />}
      </div>
    </article>
  );
}
