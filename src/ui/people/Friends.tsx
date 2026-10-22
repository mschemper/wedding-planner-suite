// Friends view (DESIGN-v5 §3, mockup C1): shortlist by tier (Must invite / Want to / Nice to have) + quick-add.
import { useId, useMemo, useState } from "react";
import type { Ring } from "../../people/rings";
import { namesLine } from "../../people/rings";
import { FRIEND_TIER_LABEL } from "../../people/tier";
import { KNOWN_BY, type KnownBy } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Card, Chip, EmptyState, Field } from "../kit/kit";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { DecisionControl, DecisionMark } from "./DecisionControl";
import { friendMeta, friendTiers, quickFriendIssues, quickFriendOps, type QuickFriend } from "./model";

const KNOWN_LETTER: Record<KnownBy, string> = { Mark: "M", Angela: "A", Both: "M+A" };

function QuickAdd({ circles, byTier }: { circles: string[]; byTier: ReturnType<typeof friendTiers> }) {
  const { save } = useData();
  const list = useId();
  const blank: QuickFriend = { first: "", partner: "", plusOne: false, circle: "", known_by: "Both", tier: 2 };
  const [f, setF] = useState<QuickFriend>(blank);
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof QuickFriend>(k: K, v: QuickFriend[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const issues = quickFriendIssues(f);
    setProblems(issues);
    if (issues.length) return;
    setBusy(true);
    const r = await save(quickFriendOps(f, byTier.find((t) => t.tier === f.tier)?.rows.map((x) => x.party) ?? []));
    setBusy(false);
    if (r.ok) { setErr(null); setF({ ...blank, circle: f.circle, known_by: f.known_by, tier: f.tier }); } else setErr(r);
  };
  return (
    <form className="pp-quick" onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-label="Add a friend">
      <h3>Add a friend</h3>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert">{problems.join(" ")}</div>}
      <div className="pp-quick-grid">
        <Field label="First name"><input value={f.first} onChange={(e) => set("first", e.target.value)} autoComplete="off" /></Field>
        <Field label="Partner's first name"><input value={f.partner} disabled={f.plusOne} onChange={(e) => set("partner", e.target.value)} autoComplete="off" /></Field>
        <label className="pp-check"><input type="checkbox" checked={f.plusOne} disabled={!!f.partner.trim()} onChange={(e) => set("plusOne", e.target.checked)} /> +1 (unnamed guest)</label>
        <Field label="Circle">
          <input list={list} value={f.circle} onChange={(e) => set("circle", e.target.value)} placeholder="Work, College…" />
          <datalist id={list}>{circles.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Known by"><select value={f.known_by} onChange={(e) => set("known_by", e.target.value as KnownBy)}>{KNOWN_BY.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Tier"><select value={f.tier} onChange={(e) => set("tier", Number(e.target.value))}>{[1, 2, 3].map((t) => <option key={t} value={t}>{FRIEND_TIER_LABEL[t]}</option>)}</select></Field>
        <button type="submit" className="k-btn k-btn-primary pp-quick-go" disabled={busy}>{busy ? "Adding…" : "Add friend"}</button>
      </div>
    </form>
  );
}

export function Friends({ rings, act, onHousehold }: { rings: Ring[]; act: Actions; onHousehold(id: string): void }) {
  const { people } = useData();
  const tiers = useMemo(() => friendTiers(rings, FRIEND_TIER_LABEL), [rings]);
  const circles = useMemo(() => [...new Set(people.parties.map((p) => p.circle).filter((c): c is string => !!c))].sort(), [people.parties]);
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      {tiers.map((t) => (
        <Card key={t.tier} title={`${t.label} · ${t.rows.length}`}>
          {t.rows.length === 0 ? <EmptyState>Nobody in this tier yet.</EmptyState> : (
            <ul className="pp-flist">
              {t.rows.map((row, i) => {
                const { party } = row;
                const list = t.rows.map((r) => r.party);
                const adults = row.members.filter((m) => m.age === "adult" && !m.deceased).length;
                const plusOne = row.members.some((m) => m.plus_one);
                const kb = party.known_by;
                const meta = friendMeta(party, row.members);
                const circle = meta.split(" · ")[0];
                return (
                  <li key={party.id} className={`pp-frow st-${party.invite}`} aria-label={party.name}>
                    <span className="pp-hmark"><DecisionMark state={party.invite} /></span>
                    <span className="pp-who" title={kb ? `Known by ${kb}` : "Known by: not set"} role="img" aria-label={kb ? `Known by ${kb}` : "Known by: not set"}>{kb ? KNOWN_LETTER[kb] : "–"}</span>
                    <button type="button" className="pp-hname" onClick={() => onHousehold(party.id)} aria-label={`Edit household: ${party.name}`}><b>{namesLine(row)}</b></button>
                    <span className="pp-hchips">
                      {circle && circle !== "friend" && <Chip tone="sage">{circle}</Chip>}
                      {adults >= 2 ? <Chip>partner</Chip> : plusOne ? <Chip>+1</Chip> : null}
                      {party.reciprocal && <Chip tone="gold" title="We went to their wedding">we went to theirs</Chip>}
                    </span>
                    <span className="pp-hdec"><DecisionControl party={party} act={act} /></span>
                    <span className="pp-order">
                      <button type="button" className="k-icon-btn" aria-label={`Move ${party.name} up`} disabled={i === 0} onClick={() => act.move(list, party.id, -1)}>↑</button>
                      <button type="button" className="k-icon-btn" aria-label={`Move ${party.name} down`} disabled={i === t.rows.length - 1} onClick={() => act.move(list, party.id, 1)}>↓</button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}
      <Card><QuickAdd circles={circles} byTier={tiers} /></Card>
    </div>
  );
}
