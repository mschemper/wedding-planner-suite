// Household card (v8): one place to edit a household AND its people. The envelope name follows the people unless written by
// hand. Every person edits in place (first, last, age); "More about…" folds out the rest. Save = one atomic save().
// Moving someone out / merging households applies at once (as before) and reopens the card fresh.
import { useId, useMemo, useState } from "react";
import { branchName } from "../../data/params";
import { ancestors, graph } from "../../people/kin";
import { mergeOps, moveOps, movesWith, REL_LABEL, relativeChoices, type RelKind } from "../../people/relatives";
import { FAMILY_TIERS, FRIEND_TIERS, derivedTier, isFriendParty, tierLabel, type TierCtx } from "../../people/tier";
import { DECISIONS, KIDS_RULES, KNOWN_BY, LOCALS, RSVPS, SIDES, displayName, type Age, type Decision, type KidsRule, type KnownBy, type Person, type Side } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { Menu, type MenuItem } from "./Menu";
import {
  blankCardPerson, cardAutoName, cardIssues, cardOps, clampKids, DECISION_LABEL, draftFrom, householdDraft, KIDS_RULE_TEXT,
  type CardDraft, type CardPerson, type PersonDraft,
} from "./model";
import { PersonPicker } from "./PersonSheet";
import { PlaceRelation } from "./PlaceRelation";

export interface CardTarget {
  /** null = a new household */
  partyId: string | null;
  /** fold this person open */
  focus?: string;
  /** start with a blank person row */
  addNew?: boolean;
  /** new household defaults */
  side?: Side;
  kind?: "family" | "friend";
  key: string;
}

type Move = { kind: "move"; personId: string; to: string; withPartner: boolean } | { kind: "merge"; into: string };

export function HouseholdCard({ target, tc, relation, onClose, onOpen, onRelative }: {
  target: CardTarget | null; tc: TierCtx; relation(personId: string): string; onClose(): void;
  /** reopen (another) household card, e.g. after a move */
  onOpen(partyId: string, focus?: string): void;
  onRelative(of: string, kind: RelKind): void;
}) {
  const { people, save, version, settings } = useData();
  const listId = useId();
  const party = target?.partyId ? people.parties.find((x) => x.id === target.partyId) : undefined;
  const isNew = !!target && target.partyId === null;
  const members = useMemo(() => (party ? (tc.members.get(party.id) ?? []).filter((m) => !m.placeholder) : []), [party, tc]);
  const friend = party ? isFriendParty(party, tc) : target?.kind === "friend";
  const [seq, setSeq] = useState(1);
  const [card, setCard] = useState<CardDraft | null>(() => {
    if (!target) return null;
    const fallback = { side: target.side ?? "Mark", kind: target.kind ?? "family" } as const;
    const ppl: CardPerson[] = members.map((m) => ({ key: m.id, original: { ...m, version: version("people", m.id) ?? 0 }, draft: draftFrom(m) }));
    if (target.addNew || isNew) ppl.push(blankCardPerson("new:0", members, fallback));
    const base = party ?? { id: "", name: "", invite: "undecided" as const, kids: "policy" as const, talk: false };
    return { household: householdDraft(base), customName: !!party?.name_custom, side: fallback.side, kind: fallback.kind, people: ppl };
  });
  const [open, setOpen] = useState<string | null>(target?.focus ?? (target?.addNew || isNew ? "new:0" : null));
  const [move, setMove] = useState<Move | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDrop, setConfirmDrop] = useState<string | null>(null);
  const byId = useMemo(() => new Map(people.people.map((p) => [p.id, p])), [people.people]);
  const circles = useMemo(() => [...new Set(people.parties.map((p) => p.circle).filter((c): c is string => !!c))].sort(), [people.parties]);
  const otherParties = useMemo(() => people.parties.filter((x) => x.id !== party?.id).sort((a, b) => a.name.localeCompare(b.name)), [people.parties, party?.id]);
  const autoTier = party ? derivedTier(party, tc) : 4;

  if (!target) return null;
  const setH = <K extends keyof CardDraft["household"]>(k: K, v: CardDraft["household"][K]) => setCard((c) => (c ? { ...c, household: { ...c.household, [k]: v } } : c));
  const setP = (key: string, patch: Partial<PersonDraft>) => setCard((c) => (c ? { ...c, people: c.people.map((x) => (x.key === key ? { ...x, draft: { ...x.draft, ...patch } } : x)) } : c));
  const auto = card ? cardAutoName(card) : "";

  const onSave = async () => {
    if (!card) return;
    const issues = cardIssues(card);
    setProblems(issues);
    if (issues.length) return;
    const pv = party ? version("parties", party.id) : undefined;
    if (party && pv === undefined) { setErr({ ok: false, kind: "not_found", message: "This household no longer exists." }); return; }
    const ops = cardOps(card, party ? { ...party, version: pv! } : null, friend, people.people);
    if (!ops.length) { onClose(); return; }
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (r.ok) onClose(); else setErr(r);
  };
  const versioned = (ps: Person[]) => ps.flatMap((p) => { const v = version("people", p.id); return v !== undefined ? [{ ...p, version: v }] : []; });
  const runMove = async () => {
    if (!party || !move) return;
    let ops;
    if (move.kind === "move") {
      const who = byId.get(move.personId);
      if (!who || !move.to) return;
      ops = moveOps(versioned(move.withPartner ? movesWith(who, byId) : [who]), move.to === "new" ? { newName: displayName(who) } : { party: move.to });
    } else {
      const pv = version("parties", party.id);
      if (!move.into || pv === undefined) return;
      ops = mergeOps({ id: party.id, version: pv }, move.into, versioned(members));
    }
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (!r.ok) { setErr(r); return; }
    if (move.kind === "merge") onOpen(move.into);
    else onOpen(party.id);
  };

  const title = isNew ? "New household" : party ? (card?.customName ? card.household.name || party.name : auto || party.name) : "Household";
  return (
    <Sheet title={title} open onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" disabled={busy || !card || (!party && !isNew)} onClick={() => void onSave()}>{busy ? "Saving…" : "Save"}</Button></>}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert"><ul className="save-issues">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {!card || (!party && !isNew) ? <p className="muted">This household no longer exists.</p> : (
        <div className="pp-form">
          {/* envelope name */}
          <div className="k-field wide hc-name">
            <span className="k-field-label">Envelope name</span>
            {card.customName ? (
              <>
                <input value={card.household.name} onChange={(e) => setH("name", e.target.value)} autoComplete="off" aria-label="Envelope name (written by hand)" />
                <span className="k-field-hint">Written by hand — stays as is. <button type="button" className="pp-link" onClick={() => setCard({ ...card, customName: false })}>Use the people's names ({auto || "…"})</button></span>
              </>
            ) : (
              <>
                <output className="hc-auto">{auto || "Add a person below"}</output>
                <span className="k-field-hint">Follows the people below, and updates when a name changes. <button type="button" className="pp-link" onClick={() => setCard({ ...card, customName: true, household: { ...card.household, name: card.household.name || auto } })}>Write my own</button></span>
              </>
            )}
          </div>

          {isNew && (
            <>
              <Field label="Side"><select value={card.side} onChange={(e) => { const side = e.target.value as Side; setCard({ ...card, side, people: card.people.map((x) => (x.original ? x : { ...x, draft: { ...x.draft, side } })) }); }}>{SIDES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <div className="k-field">
                <span className="k-field-label">Family or friends</span>
                <Segmented label="Family or friends" value={card.kind} onChange={(kind) => setCard({ ...card, kind, people: card.people.map((x) => (x.original ? x : { ...x, draft: { ...x.draft, kind } })) })}
                  options={[{ value: "family", label: "Family", tone: "euc" }, { value: "friend", label: "Friends", tone: "euc" }]} />
              </div>
            </>
          )}

          <div className="k-field wide">
            <span className="k-field-label">Invite</span>
            <Segmented<Decision> label="Invite decision" value={card.household.invite} onChange={(v) => setH("invite", v)}
              options={DECISIONS.map((x) => ({ value: x, label: DECISION_LABEL[x], tone: x === "ifroom" ? "gold" : x === "invite" ? "euc" : "plain" }))} />
          </div>
          <Field label="Ring">
            <select value={card.household.tier ?? ""} onChange={(e) => setH("tier", e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">Automatic ({tierLabel(autoTier, friend)})</option>
              {(friend ? FRIEND_TIERS : FAMILY_TIERS).map((t) => <option key={t} value={t}>{tierLabel(t, friend)}</option>)}
            </select>
          </Field>
          <Field label="Kids rule">
            <select value={card.household.kids} onChange={(e) => setH("kids", e.target.value as KidsRule)}>{KIDS_RULES.map((r) => <option key={r} value={r}>{KIDS_RULE_TEXT[r]}</option>)}</select>
          </Field>

          {/* people */}
          <h3 className="pp-sec wide">People in this household</h3>
          {card.people.map((x, i) => {
            const m = x.original;
            const name = displayName({ first: x.draft.first || "New person", last: x.draft.last || null, nick: x.draft.nick || null });
            if (x.remove) return (
              <div key={x.key} className="hc-person wide is-removed">
                <span>{name} will be removed on Save.</span>
                <button type="button" className="pp-link" onClick={() => setCard({ ...card, people: card.people.map((y) => (y.key === x.key ? { ...y, remove: false } : y)) })}>Keep</button>
              </div>
            );
            const partner = m?.partner_id ? byId.get(m.partner_id) : undefined;
            const items: MenuItem[] = m ? [
              { key: "h-add", heading: `Add a relative of ${m.nick || m.first}` },
              ...relativeChoices(m).map((k) => ({ key: k, label: <><span aria-hidden="true">＋</span> {REL_LABEL[k]}</>, onSelect: () => onRelative(m.id, k) })),
              { key: "h-move", heading: "Household" },
              { key: "mv", label: "Move to another household…", onSelect: () => setMove({ kind: "move", personId: m.id, to: "", withPartner: partner?.party_id === m.party_id }) },
              { key: "own", label: "Give them their own household", disabled: members.length < 2, onSelect: () => setMove({ kind: "move", personId: m.id, to: "new", withPartner: partner?.party_id === m.party_id }) },
              { key: "rm", label: "Remove from the guest list…", onSelect: () => setConfirmDrop(x.key) },
            ] : [{ key: "rm", label: "Remove this row", onSelect: () => setCard({ ...card, people: card.people.filter((y) => y.key !== x.key) }) }];
            return (
              <div key={x.key} className="hc-person wide">
                <div className="hc-row">
                  <Field label="First"><input value={x.draft.first} onChange={(e) => setP(x.key, { first: e.target.value })} autoComplete="off" autoFocus={!m && x.key === open} /></Field>
                  <Field label="Last"><input value={x.draft.last} onChange={(e) => setP(x.key, { last: e.target.value })} autoComplete="off" /></Field>
                  <div className="k-field hc-age">
                    <span className="k-field-label">Age</span>
                    <Segmented<Age> label={`Age of ${name}`} size="sm" value={x.draft.age} onChange={(v) => setP(x.key, { age: v })}
                      options={[{ value: "adult", label: "Adult", tone: "euc" }, { value: "child", label: "Child", tone: "euc" }]} />
                  </div>
                  <Menu label={`More for ${name}`} align="right" triggerClass="k-icon-btn" trigger={<span aria-hidden="true">⋯</span>} items={items} />
                </div>
                {m && <span className="hc-rel">{relation(m.id)}{m.branch ? ` · ${branchName(settings, m.branch)}` : ""}</span>}
                {confirmDrop === x.key && (
                  <div className="flag warn" role="alert">
                    Remove {name} from the guest list? Links to them are cleared.{" "}
                    <button type="button" className="pp-link" onClick={() => { setCard({ ...card, people: card.people.map((y) => (y.key === x.key ? { ...y, remove: true } : y)) }); setConfirmDrop(null); }}>Remove on Save</button>{" "}
                    <button type="button" className="pp-link" onClick={() => setConfirmDrop(null)}>Keep</button>
                  </div>
                )}
                <details className="pp-more" open={open === x.key} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; setOpen((cur) => (o ? x.key : cur === x.key ? null : cur)); }}>
                  <summary>More about {x.draft.first || "this person"} <span className="muted small">relatives, RSVP, local, notes</span></summary>
                  {open === x.key && <PersonMore x={x} card={card} setP={setP} listId={`${listId}-${i}`} onRelativeDone={onClose} />}
                </details>
              </div>
            );
          })}
          <div className="pp-addrel wide">
            <Button onClick={() => { const key = `new:${seq}`; setSeq(seq + 1); setCard({ ...card, people: [...card.people, blankCardPerson(key, members, { side: card.side, kind: card.kind })] }); setOpen(key); }}>
              <span aria-hidden="true">＋</span> Add someone to this household
            </Button>
            {party && otherParties.length > 0 && <Button kind="quiet" onClick={() => setMove({ kind: "merge", into: "" })}>Merge into another household…</Button>}
          </div>
          {move && party && (
            <div className="pp-movebox wide" role="group" aria-label={move.kind === "merge" ? "Merge household" : "Move person"}>
              {move.kind === "move" ? (
                <>
                  <Field label={`Move ${displayName(byId.get(move.personId) ?? { first: "", last: null, nick: null })} to`} wide>
                    <select value={move.to} onChange={(e) => setMove({ ...move, to: e.target.value })} autoFocus>
                      <option value="">Choose…</option>
                      <option value="new">Their own new household</option>
                      {otherParties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </Field>
                  {byId.get(move.personId)?.partner_id && <label className="pp-check"><input type="checkbox" checked={move.withPartner} onChange={(e) => setMove({ ...move, withPartner: e.target.checked })} /> Partner moves too</label>}
                  <span className="k-field-hint">Happens right away; other unsaved edits in this card are dropped.</span>
                </>
              ) : (
                <Field label={`Merge ${party.name} into`} hint="Everyone moves; this household is removed. Happens right away." wide>
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

          {/* household extras */}
          <details className="pp-more wide">
            <summary>More about the household <span className="muted small">unnamed kids, talk-about{friend ? ", circle" : ""}</span></summary>
            <div className="pp-form">
              <div className="k-field">
                <span className="k-field-label" id={`${listId}-uk`}>Kids not named yet</span>
                <div className="pp-stepper" role="group" aria-labelledby={`${listId}-uk`}>
                  <button type="button" className="k-icon-btn" aria-label="Fewer unnamed kids" disabled={card.household.unnamed <= 0} onClick={() => setH("unnamed", clampKids(card.household.unnamed - 1))}>−</button>
                  <output aria-live="polite">{card.household.unnamed}</output>
                  <button type="button" className="k-icon-btn" aria-label="More unnamed kids" disabled={card.household.unnamed >= 20} onClick={() => setH("unnamed", clampKids(card.household.unnamed + 1))}>+</button>
                </div>
              </div>
              <div className="pp-checks"><label className="pp-check"><input type="checkbox" checked={card.household.talk} onChange={(e) => setH("talk", e.target.checked)} /> Talk about</label></div>
              {card.household.talk && <Field label="Talk-about note" wide><input value={card.household.talk_note} onChange={(e) => setH("talk_note", e.target.value)} placeholder="e.g. travel?" /></Field>}
              {friend && (
                <>
                  <Field label="Circle"><input list={`${listId}-c`} value={card.household.circle} onChange={(e) => setH("circle", e.target.value)} placeholder="Work, College…" /><datalist id={`${listId}-c`}>{circles.map((c) => <option key={c} value={c} />)}</datalist></Field>
                  <Field label="Known by"><select value={card.household.known_by} onChange={(e) => setH("known_by", e.target.value as KnownBy | "")}><option value="">Not set</option>{KNOWN_BY.map((k) => <option key={k}>{k}</option>)}</select></Field>
                  <div className="pp-checks"><label className="pp-check"><input type="checkbox" checked={card.household.reciprocal} onChange={(e) => setH("reciprocal", e.target.checked)} /> We went to their wedding</label></div>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </Sheet>
  );
}

/** The folded-out details of one person in the card. */
function PersonMore({ x, card, setP, listId, onRelativeDone }: {
  x: CardPerson; card: CardDraft; setP(key: string, patch: Partial<PersonDraft>): void; listId: string; onRelativeDone(): void;
}) {
  const { people, settings } = useData();
  const g = useMemo(() => graph(people.people), [people.people]);
  const self = x.original?.id;
  const noSelf = useMemo(() => new Set(self ? [self] : []), [self]);
  const noParent = useMemo(() => {
    const s = new Set(noSelf);
    if (self) for (const p of people.people) if (ancestors(g, p.id).has(self)) s.add(p.id);
    return s;
  }, [g, people.people, self, noSelf]);
  const branches = useMemo(() => [...new Set(people.people.map((p) => p.branch).filter((b): b is string => !!b))].sort(), [people.people]);
  const d = x.draft;
  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setP(x.key, { [k]: v } as Partial<PersonDraft>);
  void card;
  return (
    <div className="pp-form">
      <Field label="Nickname" hint="Shown instead of the first name"><input value={d.nick} onChange={(e) => set("nick", e.target.value)} autoComplete="off" /></Field>
      <Field label="Local?" hint="Sets the expected-attendance rate"><select value={d.local} onChange={(e) => set("local", e.target.value as PersonDraft["local"])}>{LOCALS.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <PersonPicker label="Partner" people={people.people} selected={d.partner_id ? [d.partner_id] : []} max={1} exclude={noSelf} onChange={(ids) => set("partner_id", ids[0] ?? null)} />
      <PersonPicker label="Parents (up to 2)" people={people.people} selected={d.parent_ids} max={2} exclude={noParent} onChange={(ids) => set("parent_ids", ids)} />
      {x.original && x.original.kind === "family" && (
        <div className="k-field wide"><span className="k-field-label">Place by relation</span><PlaceRelation person={x.original} onDone={onRelativeDone} /></div>
      )}
      <Field label="RSVP"><select value={d.rsvp} onChange={(e) => set("rsvp", e.target.value as PersonDraft["rsvp"])}>{RSVPS.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Exception to the household">
        <select value={d.override || "none"} onChange={(e) => set("override", e.target.value === "none" ? "" : e.target.value as PersonDraft["override"])}>
          <option value="none">Follows household</option><option value="invite">Invite anyway</option><option value="no">Don't invite</option>
        </select>
      </Field>
      <Field label="Side"><select value={d.side} onChange={(e) => set("side", e.target.value as Side)}>{SIDES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      {d.kind === "friend"
        ? <Field label="Circle (friends)"><input value={d.circle} onChange={(e) => set("circle", e.target.value)} /></Field>
        : <Field label="Branch" hint={d.branch ? branchName(settings, d.branch) : "Pick or type"}><input list={listId} value={d.branch} onChange={(e) => set("branch", e.target.value)} /><datalist id={listId}>{branches.map((b) => <option key={b} value={b} />)}</datalist></Field>}
      <div className="pp-checks">
        <label className="pp-check"><input type="checkbox" checked={d.plus_one} onChange={(e) => set("plus_one", e.target.checked)} /> Plus-one</label>
        <label className="pp-check"><input type="checkbox" checked={d.deceased} onChange={(e) => set("deceased", e.target.checked)} /> Deceased</label>
      </div>
      <Field label="Relationship label" hint="Only when the tree can't work it out" wide><input value={d.label} onChange={(e) => set("label", e.target.value)} /></Field>
      <Field label="Notes" wide><textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
    </div>
  );
}
