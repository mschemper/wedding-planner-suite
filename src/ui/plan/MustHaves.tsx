// Plan → Must-haves: compact ordered list (number, text, read-only venue marks, ⋯ menu), inline edit, add, archive/restore.
import { useEffect, useMemo, useRef, useState } from "react";
import { orderedMustHaves, verdictOf } from "../../plan/fit";
import type { MustHave, Verdict } from "../../plan/types";
import { useCompare } from "../compare";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState, Field } from "../kit/kit";
import { SaveError } from "../SaveError";
import { addMustHaveOp, archivePatch, musthaveEditPatch, reorderPatches, shortVenueName } from "./model";

const ICON: Record<Verdict, string> = { yes: "✓", partly: "◐", no: "✕", unknown: "?" };
const WORD: Record<Verdict, string> = { yes: "yes", partly: "partly", no: "no", unknown: "unknown" };

interface MenuItem { label: string; disabled?: boolean; onSelect(): void }

/** Small ⋯ menu: 44px trigger, closes on outside tap / Escape / selection. */
function RowMenu({ label, items, disabled }: { label: string; items: MenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="pl-menu" ref={box}>
      <button ref={trigger} type="button" className="k-icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)}>⋯</button>
      {open && (
        <div className="pl-menu-pop" role="menu" aria-label={label}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className="pl-menu-item" disabled={it.disabled} onClick={() => { setOpen(false); it.onSelect(); }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ m, idx, list, chips, fail }: {
  m: MustHave; idx: number; list: MustHave[]; chips: { id: number; name: string; fullName: string; verdict: Verdict }[]; fail(r: SaveResult): void;
}) {
  const { edit, offline } = useData();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.text);
  const [detail, setDetail] = useState(m.detail ?? "");
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<SaveResult>) => { setBusy(true); const r = await f(); setBusy(false); if (!r.ok) fail(r); return r; };
  const move = (dir: -1 | 1) => {
    const p = reorderPatches(list, idx, dir);
    if (p) void run(() => edit(p, `Moved: ${m.text}`));
  };
  const patch = musthaveEditPatch(m, text, detail);
  return (
    <li className={`pl-mh${m.archived ? " is-archived" : ""}`}>
      {!editing && <span className="pl-mh-n" aria-hidden="true">{m.archived ? "" : idx + 1}</span>}
      <div className="pl-mh-main">
        {editing ? (
          <div className="pl-mh-edit">
            <Field label="Must-have"><input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} /></Field>
            <Field label="Detail"><textarea value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
            <div className="pl-row">
              <Button kind="primary" disabled={busy || !patch} onClick={() => void run(() => edit([patch!], `Edited: ${text.trim()}`)).then((r) => r.ok && setEditing(false))}>Save</Button>
              <Button onClick={() => { setEditing(false); setText(m.text); setDetail(m.detail ?? ""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="pl-mh-text">{m.text}{m.archived && <span className="pl-hint"> (archived)</span>}</div>
            {m.detail && <div className="pl-hint">{m.detail}</div>}
          </>
        )}
      </div>
      {!editing && !m.archived && chips.length > 0 && (
        <div className="pl-marks" role="list" aria-label={`How venues fit: ${m.text}`}>
          {chips.map((c) => (
            <span key={c.id} role="listitem" className={`pl-mark v-${c.verdict}`} title={`${c.fullName}: ${WORD[c.verdict]}`} aria-label={`${c.fullName}: ${WORD[c.verdict]}`}>
              <span aria-hidden="true">{ICON[c.verdict]}</span><span aria-hidden="true">{c.name}</span>
            </span>
          ))}
        </div>
      )}
      {!offline && !editing && (
        <RowMenu label={`More actions: ${m.text}`} disabled={busy} items={m.archived
          ? [{ label: "Restore", onSelect: () => void run(() => edit([archivePatch(m, false)], `Restored: ${m.text}`)) }]
          : [
            { label: "Move up", disabled: idx === 0, onSelect: () => move(-1) },
            { label: "Move down", disabled: idx === list.length - 1, onSelect: () => move(1) },
            { label: "Edit", onSelect: () => setEditing(true) },
            { label: "Archive", onSelect: () => void run(() => edit([archivePatch(m, true)], `Archived: ${m.text}`)) },
          ]} />
      )}
    </li>
  );
}

export function MustHaves() {
  const { musthaves, fit, save, offline } = useData();
  const { active } = useCompare();
  const [showArchived, setShowArchived] = useState(false);
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const list = useMemo(() => orderedMustHaves(musthaves.map((m) => m)), [musthaves]);
  const archived = useMemo(() => musthaves.filter((m) => m.archived).sort((a, b) => a.sort - b.sort), [musthaves]);
  const chipsFor = (m: MustHave) => active.map((v) => ({ id: v.scenario.id, name: shortVenueName(v.scenario.name), fullName: v.scenario.name, verdict: verdictOf(fit, v.scenario.id, m.id)?.verdict ?? ("unknown" as Verdict) }));
  const onFail = (r: SaveResult) => { if (!r.ok) setFail(r); };
  const add = async () => {
    setBusy(true);
    const r = await save([addMustHaveOp(text, detail, musthaves)]);
    setBusy(false);
    if (r.ok) { setText(""); setDetail(""); setFail(null); } else setFail(r);
  };
  return (
    <Card title="Must-haves" actions={archived.length > 0 && <Button kind="quiet" onClick={() => setShowArchived((s) => !s)}>{showArchived ? "Hide archived" : `Show archived (${archived.length})`}</Button>}>
      {list.length === 0 && <EmptyState>{offline ? "Must-haves load in the online planner." : "No must-haves yet. Add the first one below."}</EmptyState>}
      <ol className="pl-mh-list">
        {list.map((m, i) => <Row key={m.id} m={m} idx={i} list={list} chips={chipsFor(m)} fail={onFail} />)}
      </ol>
      {showArchived && archived.length > 0 && (
        <ul className="pl-mh-list pl-mh-arch" aria-label="Archived must-haves">
          {archived.map((m) => <Row key={m.id} m={m} idx={0} list={[m]} chips={[]} fail={onFail} />)}
        </ul>
      )}
      {!offline && (
        <form className="pl-quick" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void add(); }}>
          <Field label="Add a must-have"><input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} /></Field>
          <Field label="Detail (optional)"><input value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
          <div className="pl-quick-actions"><Button type="submit" kind="primary" disabled={busy || !text.trim()}>Add must-have</Button></div>
        </form>
      )}
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </Card>
  );
}
