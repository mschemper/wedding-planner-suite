// Plan → Must-haves: ordered list with up/down, inline edit, add, archive/restore, read-only verdict chips per active venue.
import { useMemo, useState } from "react";
import { orderedMustHaves, verdictOf } from "../../plan/fit";
import type { MustHave, Verdict } from "../../plan/types";
import { useCompare } from "../compare";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState, Field } from "../kit/kit";
import { SaveError } from "../SaveError";
import { addMustHaveOp, archivePatch, musthaveEditPatch, reorderPatches, shortVenueName } from "./model";
import { useNav } from "../nav";

const ICON: Record<Verdict, string> = { yes: "✓", partly: "◐", no: "✕", unknown: "?" };
const WORD: Record<Verdict, string> = { yes: "yes", partly: "partly", no: "no", unknown: "unknown" };

function Row({ m, idx, list, chips, fail }: {
  m: MustHave; idx: number; list: MustHave[]; chips: { id: number; name: string; verdict: Verdict }[]; fail(r: SaveResult): void;
}) {
  const { edit, offline } = useData();
  const { openVenue } = useNav();
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
            {!m.archived && chips.length > 0 && (
              <div className="pl-vchips" aria-label={`How venues fit: ${m.text}`}>
                {chips.map((c) => (
                  <button key={c.id} type="button" className={`pl-vchip v-${c.verdict}`} onClick={() => openVenue(c.id)} aria-label={`${c.name}: ${WORD[c.verdict]}. Open venue.`}>
                    <span aria-hidden="true">{ICON[c.verdict]}</span> {c.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {!offline && !editing && (
        <div className="pl-mh-actions">
          {!m.archived && (
            <>
              <button type="button" className="k-icon-btn" aria-label={`Move up: ${m.text}`} disabled={busy || idx === 0} onClick={() => move(-1)}>↑</button>
              <button type="button" className="k-icon-btn" aria-label={`Move down: ${m.text}`} disabled={busy || idx === list.length - 1} onClick={() => move(1)}>↓</button>
              <Button kind="quiet" onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
          <Button kind="quiet" disabled={busy} onClick={() => void run(() => edit([archivePatch(m, !m.archived)], `${m.archived ? "Restored" : "Archived"}: ${m.text}`))}>{m.archived ? "Restore" : "Archive"}</Button>
        </div>
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
  const chipsFor = (m: MustHave) => active.map((v) => ({ id: v.scenario.id, name: shortVenueName(v.scenario.name), verdict: verdictOf(fit, v.scenario.id, m.id)?.verdict ?? ("unknown" as Verdict) }));
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
