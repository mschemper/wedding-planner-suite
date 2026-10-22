// Household sheet (DESIGN-v5 §3): decision, ring, kids, unnamed kids, talk, friend fields, members. Save = one edit() patch.
import { useId, useMemo, useState } from "react";
import { FAMILY_TIERS, FRIEND_TIERS, derivedTier, isFriendParty, tierLabel, type TierCtx } from "../../people/tier";
import { DECISIONS, KIDS_RULES, KNOWN_BY, displayName, type Decision, type KnownBy, type KidsRule } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { clampKids, DECISION_LABEL, householdDraft, householdIssues, householdPatch, KIDS_RULE_TEXT, type HouseholdDraft } from "./model";

export interface HouseholdTarget { id: string; key: string }

export function HouseholdSheet({ target, tc, relation, onClose, onPerson, onAddPerson }: {
  target: HouseholdTarget | null; tc: TierCtx; relation(personId: string): string; onClose(): void;
  onPerson(id: string): void; onAddPerson(partyId: string): void;
}) {
  const { people, edit } = useData();
  const party = target ? people.parties.find((x) => x.id === target.id) : undefined;
  const [d, setD] = useState<HouseholdDraft | null>(() => (party ? householdDraft(party) : null));
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const listId = useId();
  const circles = useMemo(() => [...new Set(people.parties.map((p) => p.circle).filter((c): c is string => !!c))].sort(), [people.parties]);
  const friend = party ? isFriendParty(party, tc) : false;
  const members = party ? (tc.members.get(party.id) ?? []).filter((m) => !m.placeholder) : [];
  const autoTier = party ? derivedTier(party, tc) : 4;
  const set = <K extends keyof HouseholdDraft>(k: K, v: HouseholdDraft[K]) => setD((x) => (x ? { ...x, [k]: v } : x));

  const save = async () => {
    if (!party || !d) return;
    const issues = householdIssues(d);
    setProblems(issues);
    if (issues.length) return;
    const e = householdPatch(d, party, friend);
    if (!e) { onClose(); return; }
    setBusy(true);
    const r = await edit([e.patch], e.label);
    setBusy(false);
    if (r.ok) onClose(); else setErr(r);
  };

  const body = party && d && (
    <div className="pp-form">
      <Field label="Household name (envelope)" wide><input value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" /></Field>
      <Field label="Decision">
        <select value={d.invite} onChange={(e) => set("invite", e.target.value as Decision)}>{DECISIONS.map((x) => <option key={x} value={x}>{DECISION_LABEL[x]}</option>)}</select>
      </Field>
      <Field label="Ring">
        <select value={d.tier ?? ""} onChange={(e) => set("tier", e.target.value === "" ? null : Number(e.target.value))}>
          <option value="">Automatic ({tierLabel(autoTier, friend)})</option>
          {(friend ? FRIEND_TIERS : FAMILY_TIERS).map((t) => <option key={t} value={t}>{tierLabel(t, friend)}</option>)}
        </select>
      </Field>
      <Field label="Kids rule">
        <select value={d.kids} onChange={(e) => set("kids", e.target.value as KidsRule)}>{KIDS_RULES.map((r) => <option key={r} value={r}>{KIDS_RULE_TEXT[r]}</option>)}</select>
      </Field>
      <div className="k-field">
        <span className="k-field-label" id={`${listId}-uk`}>Kids not named yet</span>
        <div className="pp-stepper" role="group" aria-labelledby={`${listId}-uk`}>
          <button type="button" className="k-icon-btn" aria-label="Fewer unnamed kids" disabled={d.unnamed <= 0} onClick={() => set("unnamed", clampKids(d.unnamed - 1))}>−</button>
          <output aria-live="polite">{d.unnamed}</output>
          <button type="button" className="k-icon-btn" aria-label="More unnamed kids" disabled={d.unnamed >= 20} onClick={() => set("unnamed", clampKids(d.unnamed + 1))}>+</button>
        </div>
      </div>
      <div className="pp-checks">
        <label className="pp-check"><input type="checkbox" checked={d.talk} onChange={(e) => set("talk", e.target.checked)} /> Talk about</label>
      </div>
      {d.talk && <Field label="Talk-about note" wide><input value={d.talk_note} onChange={(e) => set("talk_note", e.target.value)} placeholder="e.g. travel?" /></Field>}
      {friend && (
        <>
          <Field label="Circle"><input list={listId} value={d.circle} onChange={(e) => set("circle", e.target.value)} placeholder="Work, College…" /><datalist id={listId}>{circles.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Known by">
            <select value={d.known_by} onChange={(e) => set("known_by", e.target.value as KnownBy | "")}><option value="">Not set</option>{KNOWN_BY.map((k) => <option key={k}>{k}</option>)}</select>
          </Field>
          <div className="pp-checks"><label className="pp-check"><input type="checkbox" checked={d.reciprocal} onChange={(e) => set("reciprocal", e.target.checked)} /> We went to their wedding</label></div>
        </>
      )}
      <div className="k-field wide">
        <span className="k-field-label">People in this household</span>
        <ul className="pp-members">
          {members.map((m) => (
            <li key={m.id}>
              <button type="button" className="pp-member-btn" onClick={() => onPerson(m.id)} aria-label={`Edit details: ${displayName(m)}`}>
                <b>{displayName(m)}</b><small>{[relation(m.id), m.age === "child" ? "child" : null, m.deceased ? "deceased" : null].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))}
          {members.length === 0 && <li className="muted small">No people yet.</li>}
        </ul>
        <Button onClick={() => onAddPerson(party.id)}>Add person to this household</Button>
      </div>
    </div>
  );

  return (
    <Sheet title={party ? `Household · ${party.name}` : "Household"} open={!!target} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" disabled={busy || !party} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button></>}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert"><ul className="save-issues">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {body || <p className="muted">This household no longer exists.</p>}
    </Sheet>
  );
}
