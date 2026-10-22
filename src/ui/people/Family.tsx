// Family view (DESIGN-v5 §3, mockup B1): per side, per branch, a collapsible outline tree with CSS connector lines.
import { useMemo, useState } from "react";
import type { InviteCtx } from "../../people/invite";
import { buildOutline, type OutlineBranch, type Unit } from "../../people/outline";
import { branchName } from "../../data/params";
import { displayName, type Party, type Person } from "../../people/types";
import { useData } from "../data";
import { Card, EmptyState } from "../kit/kit";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { DecisionMark, KidsChip } from "./DecisionControl";
import { bloomFor } from "./model";
import { Bloom } from "../garden/motifs";

interface Env {
  ctx: InviteCtx;
  parties: Map<string, Party>;
  members: Map<string, Person[]>;
  rel: (p: Person) => string;
  act: Actions;
  onHousehold(id: string): void;
  onPerson(id: string, focus?: "parents"): void;
}

function Names({ u }: { u: Unit }) {
  return (
    <span className="pp-unames">
      {u.people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && " & "}
          <span className={p.placeholder || p.deceased ? "pp-ghost" : ""}>{p.kind === "couple" ? displayName(p) : p.nick || p.first}{p.placeholder ? " · not guests" : p.deceased ? " (deceased)" : ""}</span>
        </span>
      ))}
      {u.people[0].last && !u.people[0].placeholder && <span className="pp-ulast"> {u.people[0].last}</span>}
    </span>
  );
}

function UnitRow({ u, env, tray }: { u: Unit; env: Env; tray?: boolean }) {
  const lead = u.people.find((p) => !p.placeholder && !p.deceased) ?? u.people[0];
  const party = u.party_id ? env.parties.get(u.party_id) : undefined;
  const kids = party ? (env.members.get(party.id) ?? []).some((m) => m.age === "child" && !m.deceased) || (party.unnamed_kids ?? 0) > 0 : false;
  const relation = lead.placeholder ? "" : env.rel(lead);
  const go = () => (party ? env.onHousehold(party.id) : env.onPerson(lead.id));
  return (
    <div className="pp-unit">
      <span className="pp-umark">{party && !lead.placeholder && !lead.deceased ? <DecisionMark state={party.invite} /> : <Bloom state={bloomFor(lead, env.ctx)} />}</span>
      <button type="button" className="pp-uname" onClick={go} aria-label={`Open ${u.people.map((p) => displayName(p)).join(" and ")}`}><Names u={u} /></button>
      {relation && <span className="k-chip k-chip-sage">{relation}</span>}
      {party && kids && <KidsChip party={party} ctx={env.ctx} act={env.act} />}
      {tray && <button type="button" className="pp-link" onClick={() => env.onPerson(lead.id, "parents")}>Set parents</button>}
    </div>
  );
}

function Tree({ units, env, tray }: { units: Unit[]; env: Env; tray?: boolean }) {
  return (
    <ul className="pp-tree">
      {units.map((u) => (
        <li key={u.id}>
          <UnitRow u={u} env={env} tray={tray} />
          {u.children.length > 0 && <Tree units={u.children} env={env} />}
        </li>
      ))}
    </ul>
  );
}

function Branch({ b, env }: { b: OutlineBranch; env: Env }) {
  const { settings } = useData();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const title = branchName(settings, b.branch);
  const [draft, setDraft] = useState(title);
  const commit = () => { setEditing(false); if (draft.trim() !== title) env.act.renameBranch(b.branch, draft); };
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
              <span aria-hidden="true" className="pp-chev">{open ? "▾" : "▸"}</span><h3>{title}</h3><span className="muted small">{b.count} people</span>
            </button>
            <button type="button" className="k-icon-btn" aria-label={`Rename ${title}`} title="Rename" onClick={() => { setDraft(title); setEditing(true); }}><span aria-hidden="true">✎</span></button>
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
          {b.roots.length === 0 && b.elders.length === 0 && b.unplaced.length === 0 && <EmptyState>Nobody here yet.</EmptyState>}
          {b.unplaced.length > 0 && (
            <div className="pp-tray">
              <h4>Not placed yet · {b.unplaced.length}</h4>
              <Tree units={b.unplaced} env={env} tray />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function Family({ rel, act, onHousehold, onPerson }: {
  rel: (p: Person) => string; act: Actions; onHousehold(id: string): void; onPerson(id: string, focus?: "parents"): void;
}) {
  const { people, invite } = useData();
  const outline = useMemo(() => buildOutline(people), [people]);
  const env = useMemo<Env>(() => {
    const members = new Map<string, Person[]>();
    for (const p of people.people) if (p.party_id) { if (!members.has(p.party_id)) members.set(p.party_id, []); members.get(p.party_id)!.push(p); }
    return { ctx: invite, parties: new Map(people.parties.map((x) => [x.id, x])), members, rel, act, onHousehold, onPerson };
  }, [people, invite, rel, act, onHousehold, onPerson]);
  const sides = (["Mark", "Angela", "Both"] as const).map((s) => ({ side: s, branches: outline.branches.filter((b) => b.side === s) })).filter((x) => x.branches.length);
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
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
