// Family view (DESIGN-v5 §3, mockup B1): per side, per branch, a collapsible outline tree with CSS connector lines.
// v6: ＋ "Add relative" menu on every row; "Not placed yet" tray suggests parents, Accept per row or link several at once.
import { useMemo, useState } from "react";
import type { InviteCtx } from "../../people/invite";
import { buildOutline, type OutlineBranch, type Unit } from "../../people/outline";
import { bloodMember, parentUnits, REL_LABEL, relativeChoices, suggestParents, type ParentUnit, type RelKind } from "../../people/relatives";
import { branchName } from "../../data/params";
import { displayName, type Party, type PeopleData, type Person } from "../../people/types";
import { useData } from "../data";
import { Button, Card, EmptyState } from "../kit/kit";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { DecisionMark, KidsChip } from "./DecisionControl";
import { bloomFor } from "./model";
import { Menu, type MenuItem } from "./Menu";
import { Bloom } from "../garden/motifs";
import { pairName } from "../../people/names";
import { PlaceRelation } from "./PlaceRelation";

interface Env {
  data: PeopleData;
  ctx: InviteCtx;
  parties: Map<string, Party>;
  members: Map<string, Person[]>;
  rel: (p: Person) => string;
  act: Actions;
  onHousehold(id: string): void;
  onPerson(id: string, focus?: "parents"): void;
  onRelative(of: string, kind: RelKind): void;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Erica Schemper & Erik Vorhes", "Fran & Len Van Noord" (each partner keeps their own surname). */
function Names({ u }: { u: Unit }) {
  return <span className="pp-unames">{pairName(u.people)}</span>;
}

/** ＋ menu: add a relative of the unit's lead (partner only when they have none; child of the pair). */
function AddRelative({ u, env }: { u: Unit; env: Env }) {
  const lead = u.people.find((p) => !p.placeholder && !p.deceased) ?? u.people[0];
  const choices = relativeChoices(lead);
  if (!choices.length) return null;
  const items: MenuItem[] = [
    { key: "h", heading: `Add a relative of ${lead.nick || lead.first}${u.people.length > 1 ? ` (child: of both)` : ""}` },
    ...choices.map((k) => ({ key: k, label: <><span aria-hidden="true">＋</span> {REL_LABEL[k]}</>, onSelect: () => env.onRelative(lead.id, k) })),
  ];
  return <Menu label={`Add a relative of ${displayName(lead)}`} align="left" triggerClass="k-icon-btn pp-plus" title="Add relative" trigger={<span aria-hidden="true">＋</span>} items={items} />;
}

function UnitRow({ u, env }: { u: Unit; env: Env }) {
  // ancestors who aren't coming: only the connector is drawn
  if (u.hidden) return <div className="pp-junction" role="presentation" title="Linked through relatives who aren't shown"><span aria-hidden="true" /></div>;
  const lead = u.people.find((p) => !p.placeholder && !p.deceased) ?? u.people[0];
  const party = u.party_id ? env.parties.get(u.party_id) : undefined;
  // kids chip only on a grown-up's row (the household's kids rule), not on each child
  const kids = party && lead.age === "adult" ? (env.members.get(party.id) ?? []).some((m) => m.age === "child" && !m.deceased) || (party.unnamed_kids ?? 0) > 0 : false;
  const relation = lead.placeholder ? "" : env.rel(lead);
  const go = () => (party ? env.onHousehold(party.id) : env.onPerson(lead.id));
  return (
    <div className="pp-unit">
      <span className="pp-umark">{party && !lead.placeholder && !lead.deceased ? <DecisionMark state={party.invite} /> : <Bloom state={bloomFor(lead, env.ctx)} />}</span>
      <button type="button" className="pp-uname" onClick={go} aria-label={`Open ${u.people.map((p) => displayName(p)).join(" and ")}`}><Names u={u} /></button>
      {relation && <span className="k-chip k-chip-sage">{relation}</span>}
      {party && kids && <KidsChip party={party} ctx={env.ctx} act={env.act} />}
      <AddRelative u={u} env={env} />
    </div>
  );
}

function Tree({ units, env }: { units: Unit[]; env: Env }) {
  return (
    <ul className="pp-tree">
      {units.map((u) => (
        <li key={u.id} className={u.hidden ? "is-junction" : undefined}>
          <UnitRow u={u} env={env} />
          {u.children.length > 0 && <Tree units={u.children} env={env} />}
        </li>
      ))}
    </ul>
  );
}

/** "Not placed yet": a parent guess per person, Accept / Pick other; tick several and link them in one step. */
function Tray({ b, env }: { b: OutlineBranch; env: Env }) {
  const rows = useMemo(() => b.unplaced.map((u) => {
    const child = bloodMember(u.people);
    return { u, child, s: suggestParents(child.id, env.data) };
  }), [b.unplaced, env.data]);
  const units = useMemo(() => {
    const own = parentUnits(env.data, b.side, b.branch);
    const list = own.length ? own : parentUnits(env.data, b.side, null);
    // guessed pairs (e.g. an aunt + uncle with no partner link) are offered too
    const keys = new Set(list.map((x) => x.ids.join("+")));
    const guesses = rows.flatMap((r) => (r.s.best && !keys.has(r.s.best.ids.join("+")) ? [r.s.best] : []))
      .filter((x, i, a) => a.findIndex((y) => y.ids.join("+") === x.ids.join("+")) === i);
    return [...guesses, ...list];
  }, [env.data, b.side, b.branch, rows]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [placing, setPlacing] = useState<string | null>(null);
  const firstBest = rows.find((r) => picked.has(r.child.id))?.s.best;
  const [unitKey, setUnitKey] = useState("");
  const unitFor = (key: string): ParentUnit | undefined => units.find((x) => x.ids.join("+") === key);
  const chosen = unitFor(unitKey) ?? firstBest ?? undefined;
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const link = () => {
    if (!chosen || !picked.size) return;
    env.act.linkParents([...picked], chosen);
    setPicked(new Set());
    setUnitKey("");
  };
  return (
    <div className="pp-tray">
      <h4>Not placed yet · {rows.length} <span className="muted small">— accept a guess, tick several and link them, or place someone by relation (e.g. "Fran is Lugene's aunt").</span></h4>
      <ul className="pp-place">
        {rows.map(({ u, child, s }) => (
          <li key={u.id} className="pp-place-row">
            <label className="pp-place-pick">
              <input type="checkbox" checked={picked.has(child.id)} onChange={() => toggle(child.id)} aria-label={`Select ${displayName(child)}`} />
            </label>
            <button type="button" className="pp-uname" onClick={() => env.onPerson(child.id)}><Names u={u} /></button>
            {env.rel(child) && <span className="k-chip k-chip-sage">{env.rel(child)}</span>}
            <span className="pp-guess">
              {s.best ? (
                <>
                  <span className="muted">child of <b>{s.best.names}</b>?</span>
                  <Button kind="quiet" onClick={() => env.act.linkParents([child.id], s.best!)}>Accept</Button>
                </>
              ) : <span className="muted small">no clear guess</span>}
              <button type="button" className="pp-link" onClick={() => env.onPerson(child.id, "parents")}>{s.best ? "Other…" : "Set parents"}</button>
              <button type="button" className="pp-link" aria-expanded={placing === child.id} onClick={() => setPlacing((x) => (x === child.id ? null : child.id))}>By relation…</button>
            </span>
            {placing === child.id && <PlaceRelation person={child} compact onDone={() => setPlacing(null)} />}
          </li>
        ))}
      </ul>
      {picked.size > 0 && (
        <div className="pp-bulk" role="group" aria-label="Link selected people">
          <span><b>{picked.size}</b> selected · these are the kids of</span>
          <select value={unitKey || (chosen ? chosen.ids.join("+") : "")} onChange={(e) => setUnitKey(e.target.value)} aria-label="Parents">
            <option value="">Choose parents…</option>
            {units.map((x) => <option key={x.ids.join("+")} value={x.ids.join("+")}>{x.names}</option>)}
          </select>
          <Button kind="primary" disabled={!chosen} onClick={link}>Link</Button>
          <Button kind="quiet" onClick={() => setPicked(new Set())}>Clear</Button>
        </div>
      )}
    </div>
  );
}

function Branch({ b, env }: { b: OutlineBranch; env: Env }) {
  const { settings } = useData();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const title = branchName(settings, b.branch);
  const [draft, setDraft] = useState(title);
  const commit = () => { setEditing(false); if (draft.trim() !== title) env.act.renameBranch(b.branch, draft); };
  const empty = b.roots.length === 0 && b.elders.length === 0 && b.unplaced.length === 0;
  return (
    <section className="pp-branch" aria-label={title}>
      <div className="pp-branch-head">
        {editing ? (
          <>
            <input className="k-input pp-rename" value={draft} maxLength={60} autoFocus aria-label={`Name for ${title}`} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
            <button type="button" className="k-btn k-btn-primary" onClick={commit}>Save</button>
            <button type="button" className="k-btn" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="pp-branch-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span aria-hidden="true" className="pp-chev">{open ? "▾" : "▸"}</span><h3>{title}</h3><span className="muted small">{plural(b.count, "person", "people")}</span>
            </button>
            <button type="button" className="pp-rename-btn" aria-label={`Rename ${title}`} onClick={() => { setDraft(title); setEditing(true); }}><span aria-hidden="true">✎</span> Rename</button>
          </>
        )}
      </div>
      {open && (
        <div className="pp-branch-body">
          {b.roots.length > 0 && <Tree units={b.roots} env={env} />}
          {b.elders.length > 0 && (
            <div className="pp-elders">
              <h4>Grandparents' generation</h4>
              <Tree units={b.elders} env={env} />
            </div>
          )}
          {empty && b.elsewhere.length > 0 && (
            <p className="muted small pp-elsewhere">
              {b.elsewhere.map((p) => displayName(p)).join(", ")} {b.elsewhere.length === 1 ? "is" : "are"} shown with {b.elsewhere.length === 1 ? "their partner" : "their partners"} under {(() => {
                const q = b.elsewhere[0].partner_id ? env.data.people.find((x) => x.id === b.elsewhere[0].partner_id) : undefined;
                return q?.branch ? branchName(settings, q.branch) : "another branch";
              })()}.
            </p>
          )}
          {empty && b.elsewhere.length === 0 && <EmptyState>Nobody here yet.</EmptyState>}
          {b.unplaced.length > 0 && <Tray b={b} env={env} />}
        </div>
      )}
    </section>
  );
}

export function Family({ rel, act, onHousehold, onPerson, onRelative }: {
  rel: (p: Person) => string; act: Actions; onHousehold(id: string): void; onPerson(id: string, focus?: "parents"): void; onRelative(of: string, kind: RelKind): void;
}) {
  const { people, invite } = useData();
  const outline = useMemo(() => buildOutline(people), [people]);
  const env = useMemo<Env>(() => {
    const members = new Map<string, Person[]>();
    for (const p of people.people) if (p.party_id) { if (!members.has(p.party_id)) members.set(p.party_id, []); members.get(p.party_id)!.push(p); }
    return { data: people, ctx: invite, parties: new Map(people.parties.map((x) => [x.id, x])), members, rel, act, onHousehold, onPerson, onRelative };
  }, [people, invite, rel, act, onHousehold, onPerson, onRelative]);
  const sides = (["Mark", "Angela", "Both"] as const).map((s) => ({ side: s, branches: outline.branches.filter((b) => b.side === s) })).filter((x) => x.branches.length);
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      {outline.unplacedTotal > 0 && (
        <p className="pp-note" role="status"><b>{plural(outline.unplacedTotal, "relative")}</b> not placed in the tree yet. Each branch lists them at the bottom with a guess.</p>
      )}
      {sides.length === 0 && <Card><EmptyState>No family added yet. Use "Add".</EmptyState></Card>}
      {sides.map(({ side, branches }) => (
        <section key={side} className="pp-side" aria-label={`${side}'s family`}>
          <h2 className="pp-side-title">{side === "Both" ? "Both families" : `${side}'s family`}</h2>
          {branches.map((b) => <Branch key={b.branch} b={b} env={env} />)}
        </section>
      ))}
    </div>
  );
}
