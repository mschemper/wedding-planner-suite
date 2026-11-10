// Plan → Must-haves: compact ordered list (number, text, ⋯ menu), inline edit, add, archive/restore.
// v10 (R4): how each venue fits lives only in the Venues grid; this list links there.
import { useEffect, useMemo, useState } from "react";
import { orderedMustHaves } from "../../plan/fit";
import type { MustHave } from "../../plan/types";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState, Field } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useNav } from "../nav";
import { Menu } from "../people/Menu";
import { addMustHaveOp, archivePatch, musthaveEditPatch, reorderPatches } from "./model";

function Row({ m, idx, list, fail }: { m: MustHave; idx: number; list: MustHave[]; fail(r: SaveResult): void }) {
  const { edit, offline, version } = useData();
  const mv = version("musthaves", m.id);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.text);
  const [detail, setDetail] = useState(m.detail ?? "");
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<SaveResult>) => { setBusy(true); const r = await f(); setBusy(false); if (!r.ok) fail(r); return r; };
  const move = (dir: -1 | 1) => {
    const p = reorderPatches(list, idx, dir);
    if (p) void run(() => edit(p, `Moved: ${m.text}`));
  };
  // a reload / other-device change / Undo replaces the row: drop stale drafts
  useEffect(() => { setText(m.text); setDetail(m.detail ?? ""); }, [mv, m.text, m.detail]);
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
      {!offline && !editing && (
        <Menu label={`More actions: ${m.text}`} align="right" triggerClass="k-icon-btn" trigger={<span aria-hidden="true">⋯</span>} items={m.archived
          ? [{ key: "restore", label: "Restore", disabled: busy, onSelect: () => void run(() => edit([archivePatch(m, false)], `Restored: ${m.text}`)) }]
          : [
            { key: "up", label: "Move up", disabled: busy || idx === 0, onSelect: () => move(-1) },
            { key: "down", label: "Move down", disabled: busy || idx === list.length - 1, onSelect: () => move(1) },
            { key: "edit", label: "Edit", disabled: busy, onSelect: () => setEditing(true) },
            { key: "archive", label: "Archive", disabled: busy, onSelect: () => void run(() => edit([archivePatch(m, true)], `Archived: ${m.text}`)) },
          ]} />
      )}
    </li>
  );
}

export function MustHaves() {
  const { musthaves, save, offline } = useData();
  const nav = useNav();
  const [showArchived, setShowArchived] = useState(false);
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const list = useMemo(() => orderedMustHaves(musthaves.map((m) => m)), [musthaves]);
  const archived = useMemo(() => musthaves.filter((m) => m.archived).sort((a, b) => a.sort - b.sort), [musthaves]);
  const onFail = (r: SaveResult) => { if (!r.ok) setFail(r); };
  const add = async () => {
    setBusy(true);
    const r = await save([addMustHaveOp(text, detail, musthaves)]);
    setBusy(false);
    if (r.ok) { setText(""); setDetail(""); setFail(null); } else setFail(r);
  };
  return (
    <Card title="Must-haves" actions={archived.length > 0 && <Button kind="quiet" onClick={() => setShowArchived((s) => !s)}>{showArchived ? "Hide archived" : `Show archived (${archived.length})`}</Button>}>
      {list.length > 0 && <p className="pl-hint">How each venue fits: <button type="button" className="pp-link" onClick={() => nav.setTab("venues")}>Venues → Must-haves × venues</button></p>}
      {list.length === 0 && <EmptyState>{offline ? "Must-haves load in the online planner." : "No must-haves yet. Add the first one below."}</EmptyState>}
      <ol className="pl-mh-list">
        {list.map((m, i) => <Row key={m.id} m={m} idx={i} list={list} fail={onFail} />)}
      </ol>
      {showArchived && archived.length > 0 && (
        <ul className="pl-mh-list pl-mh-arch" aria-label="Archived must-haves">
          {archived.map((m) => <Row key={m.id} m={m} idx={0} list={[m]} fail={onFail} />)}
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
