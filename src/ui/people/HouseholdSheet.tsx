// Household sheet (DESIGN-v5 §3): decision, ring, kids, unnamed kids, talk, friend fields, members. Save = one edit() patch.
// Members: add relative, move to another / a new household, merge this household into another (REVIEW-v6 R4) — one save() each.
import { useId, useMemo, useState } from "react";
import { mergeOps, moveOps, movesWith, REL_LABEL, relativeChoices, type RelKind } from "../../people/relatives";
import { FAMILY_TIERS, FRIEND_TIERS, derivedTier, isFriendParty, tierLabel, type TierCtx } from "../../people/tier";
import { DECISIONS, KIDS_RULES, KNOWN_BY, displayName, type Decision, type KnownBy, type KidsRule } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { Menu, type MenuItem } from "./Menu";
import { clampKids, DECISION_LABEL, householdDraft, householdIssues, householdPatch, KIDS_RULE_TEXT, type HouseholdDraft } from "./model";

export interface HouseholdTarget { id: string; key: string }

type Move = { kind: "move"; personId: string; to: string; withPartner: boolean; name: string } | { kind: "merge"; into: string };

export function HouseholdSheet({ target, tc, relation, onClose, onPerson, onAddPerson, onRelative }: {
  target: HouseholdTarget | null; tc: TierCtx; relation(personId: string): string; onClose(): void;
  onPerson(id: string): void; onAddPerson(partyId: string): void; onRelative(of: string, kind: RelKind): void;
}) {
  const { people, edit, save, version } = useData();
  const [move, setMove] = useState<Move | null>(null);
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

  const byId = useMemo(() => new Map(people.people.map((p) => [p.id, p])), [people.people]);
  const otherParties = useMemo(() => people.parties.filter((x) => x.id !== party?.id).sort((a, b) => a.name.localeCompare(b.name)), [people.parties, party?.id]);
  const versioned = (ps: { id: string }[]) => ps.flatMap((p) => { const v = version("people", p.id); const q = byId.get(p.id); return v !== undefined && q ? [{ ...q, version: v }] : []; });
  const runMove = async () => {
    if (!party || !move) return;
    let ops;
    if (move.kind === "move") {
      const who = byId.get(move.personId);
      if (!who || !move.to) return;
      const list = versioned(move.withPartner ? movesWith(who, byId) : [who]);
      ops = moveOps(list, move.to === "new" ? { newName: move.name || `${who.last ?? who.first} household` } : { party: move.to });
    } else {
      const pv = version("parties", party.id);
      if (!move.into || pv === undefined) return;
      ops = mergeOps({ id: party.id, version: pv }, move.into, versioned(tc.members.get(party.id) ?? []));
    }
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (!r.ok) { setErr(r); return; }
    setMove(null);
    if (move.kind === "merge") onClose();
  };

  const saveHousehold = async () => {
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
          {members.map((m) => {
            const partner = m.partner_id ? byId.get(m.partner_id) : undefined;
            const items: MenuItem[] = [
              { key: "h-add", heading: `Add a relative of ${m.nick || m.first}` },
              ...relativeChoices(m).map((k) => ({ key: k, label: <><span aria-hidden="true">＋</span> {REL_LABEL[k]}</>, onSelect: () => onRelative(m.id, k) })),
              { key: "h-move", heading: "Household" },
              { key: "mv", label: "Move to another household…", onSelect: () => setMove({ kind: "move", personId: m.id, to: "", withPartner: partner?.party_id === m.party_id, name: "" }) },
              { key: "own", label: "Give them their own household", disabled: members.length < 2, onSelect: () => setMove({ kind: "move", personId: m.id, to: "new", withPartner: partner?.party_id === m.party_id, name: `${[m.nick || m.first, partner && partner.party_id === m.party_id ? partner.nick || partner.first : null].filter(Boolean).join(" & ")}${m.last ? ` ${m.last}` : ""}` }) },
            ];
            return (
              <li key={m.id} className="pp-member">
                <button type="button" className="pp-member-btn" onClick={() => onPerson(m.id)} aria-label={`Edit details: ${displayName(m)}`}>
                  <b>{displayName(m)}</b><small>{[relation(m.id), m.age === "child" ? "child" : null, m.deceased ? "deceased" : null].filter(Boolean).join(" · ")}</small>
                </button>
                <Menu label={`More for ${displayName(m)}`} align="right" triggerClass="k-icon-btn" trigger={<span aria-hidden="true">⋯</span>} items={items} />
              </li>
            );
          })}
          {members.length === 0 && <li className="muted small">No people yet.</li>}
        </ul>
        <div className="pp-addrel">
          <Button onClick={() => onAddPerson(party.id)}>Add person to this household</Button>
          {otherParties.length > 0 && <Button kind="quiet" onClick={() => setMove({ kind: "merge", into: "" })}>Merge into another…</Button>}
        </div>
        {move && (
          <div className="pp-movebox" role="group" aria-label={move.kind === "merge" ? "Merge household" : "Move person"}>
            {move.kind === "move" ? (
              <>
                <Field label={`Move ${displayName(byId.get(move.personId) ?? { first: "", last: null, nick: null })} to`} wide>
                  <select value={move.to} onChange={(e) => setMove({ ...move, to: e.target.value })} autoFocus>
                    <option value="">Choose…</option>
                    <option value="new">A new household…</option>
                    {otherParties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </Field>
                {move.to === "new" && <Field label="New household name" wide><input value={move.name} onChange={(e) => setMove({ ...move, name: e.target.value })} /></Field>}
                {byId.get(move.personId)?.partner_id && (
                  <label className="pp-check"><input type="checkbox" checked={move.withPartner} onChange={(e) => setMove({ ...move, withPartner: e.target.checked })} /> Partner moves too</label>
                )}
              </>
            ) : (
              <Field label={`Merge ${party.name} into`} hint="Everyone moves; this household is removed." wide>
                <select value={move.into} onChange={(e) => setMove({ ...move, into: e.target.value })} autoFocus>
                  <option value="">Choose…</option>
                  {otherParties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
            )}
            <div className="pp-addrel">
              <Button kind="primary" disabled={busy || (move.kind === "move" ? !move.to : !move.into)} onClick={() => void runMove()}>{move.kind === "move" ? "Move" : "Merge"}</Button>
              <Button onClick={() => setMove(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Sheet title={party ? `Household · ${party.name}` : "Household"} open={!!target} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" disabled={busy || !party} onClick={() => void saveHousehold()}>{busy ? "Saving…" : "Save"}</Button></>}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert"><ul className="save-issues">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {body || <p className="muted">This household no longer exists.</p>}
    </Sheet>
  );
}
