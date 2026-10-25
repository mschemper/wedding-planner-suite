// Decide view (DESIGN-v5 §3, mockup A1): one section per closeness ring, rows with a decision pill, room line at the fill point.
// v7: ring headers split adults and kids; "Select several" bulk mode. v9: Friends ring has tier sub-headings, progress bars, "Decide one by one".
import { useMemo, useState, type ReactNode } from "react";
import type { Ring, RingRow } from "../../people/rings";
import { Button, FilterChip, Segmented, Card, EmptyState } from "../kit/kit";
import { useData } from "../data";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { HouseholdRow } from "./HouseholdRow";
import { decideQueue, DECISION_LABEL, KIDS_RULE_TEXT, matchesRow, NO_FILTER, ringProgress, type RowFilter, type SideFilter } from "./model";
import { OneByOne } from "./OneByOne";
import { DECISIONS, KIDS_RULES, LOCALS, type Decision, type KidsRule, type Local, type Party } from "../../people/types";
import { FAMILY_TIER_LABEL, FRIEND_TIER_LABEL } from "../../people/tier";
import type { Room } from "./RoomCheck";

const SIDES: { value: SideFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "Mark", label: "Mark" }, { value: "Angela", label: "Angela" }, { value: "friends", label: "Friends" },
];

export function Decide({ rings, room, rel, act, onHousehold, onPerson }: {
  rings: Ring[]; room: Room; rel: (r: Ring["rows"][number]) => string; act: Actions; onHousehold(id: string): void; onPerson(id: string): void;
}) {
  const { invite } = useData();
  const [f, setF] = useState<RowFilter>(NO_FILTER);
  // order lists for move up / down: a family ring, or one friend tier
  const parties = useMemo(() => new Map(rings.flatMap((r) => r.friend
    ? [1, 2, 3].map((t) => [`${r.key}:${t}`, r.rows.filter((x) => x.tier === t).map((x) => x.party)] as [string, Party[]])
    : [[r.key, r.rows.map((x) => x.party)] as [string, Party[]]])), [rings]);
  const [walk, setWalk] = useState(false);
  const queued = useMemo(() => decideQueue(rings, f.side).length, [rings, f.side]);
  const undecidedAll = useMemo(() => rings.reduce((n, r) => n + r.undecidedRows, 0), [rings]);
  const shown = useMemo(() => rings.map((r) => ({ ring: r, rows: r.rows.filter((x) => matchesRow(x, f)) })).filter((x) => x.rows.length), [rings, f]);
  const cap = room.check?.cap;
  const [bulk, setBulk] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const all = useMemo(() => new Map(rings.flatMap((r) => r.rows.map((x) => [x.party.id, x.party] as [string, Party]))), [rings]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const shownIds = shown.flatMap((x) => x.rows.map((r) => r.party.id));
  // Bulk edits only touch households still shown: a filter change hides rows but keeps their ticks.
  const pickedShown = shownIds.filter((id) => picked.has(id));
  const apply = async (change: Parameters<Actions["bulk"]>[1]) => {
    setBusy(true);
    const ok = await act.bulk(pickedShown.map((id) => all.get(id)!).filter(Boolean), change);
    setBusy(false);
    if (ok) setPicked(new Set());
  };
  const pickSel = (label: string, opts: [string, string][], on: (v: string) => void) => (
    <label className="pp-bulk-field"><span>{label}</span>
      <select value="" disabled={busy || !pickedShown.length} onChange={(e) => { if (e.target.value) on(e.target.value); }}>
        <option value="">Set…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      {queued > 0 && <div className="pp-walk"><Button kind="primary" onClick={() => setWalk(true)}>Decide one by one ({queued} undecided)</Button></div>}
      {walk && <OneByOne rings={rings} side={f.side} room={room} rel={rel} act={act} onClose={() => setWalk(false)} />}
      <div className="pp-filters" role="group" aria-label="Filters">
        <FilterChip on={f.undecidedOnly} onClick={() => setF((x) => ({ ...x, undecidedOnly: !x.undecidedOnly }))} count={undecidedAll}>Undecided only</FilterChip>
        <Segmented<SideFilter> label="Side" size="sm" options={SIDES.map((s) => ({ ...s, tone: "euc" as const }))} value={f.side} onChange={(v) => setF((x) => ({ ...x, side: v }))} />
        <input className="k-input pp-search" type="search" value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} placeholder="Search a name or household" aria-label="Search households" />
        <button type="button" className={`k-btn${bulk ? " k-btn-primary" : ""}`} aria-pressed={bulk} onClick={() => { setBulk((b) => !b); setPicked(new Set()); }}>{bulk ? "Done selecting" : "Select several"}</button>
      </div>
      {bulk && (
        <div className="pp-bulk" role="group" aria-label="Change selected households">
          <span><b>{pickedShown.length}</b> selected</span>
          <button type="button" className="pp-link" onClick={() => setPicked(new Set(shownIds))}>All shown ({shownIds.length})</button>
          {picked.size > 0 && <button type="button" className="pp-link" onClick={() => setPicked(new Set())}>Clear</button>}
          {pickSel("Decision", DECISIONS.map((d) => [d, DECISION_LABEL[d]]), (v) => void apply({ kind: "invite", value: v as Decision }))}
          {pickSel("Ring", [["auto", "Automatic"], ...[1, 2, 3, 4].map((t) => [String(t), FAMILY_TIER_LABEL[t]] as [string, string])], (v) => void apply({ kind: "tier", value: v === "auto" ? null : Number(v) }))}
          {pickSel("Kids", KIDS_RULES.map((k) => [k, KIDS_RULE_TEXT[k]]), (v) => void apply({ kind: "kids", value: v as KidsRule }))}
          {pickSel("Local?", LOCALS.map((l) => [l, l === "away" ? "away (travelling)" : l]), (v) => void apply({ kind: "local", value: v as Local }))}
        </div>
      )}
      {shown.length === 0 && <Card><EmptyState>{f.undecidedOnly && !f.q && f.side === "all" ? "Everyone is decided." : "No households match."}</EmptyState></Card>}
      {shown.map(({ ring, rows }) => {
        const prog = ringProgress(ring.rows);
        const undecidedShown = rows.filter((x) => x.party.invite === "undecided").length;
        const rowEl = (row: RingRow, key: string) => (
          <FragmentRow key={row.party.id} line={room.fill?.party === row.party.id && cap ? `— ${room.sel?.name} fills here (${cap} ${room.kidsRoom ? "adults " : ""}seated) —` : null}>
            <HouseholdRow row={row} relation={rel(row)} ctx={invite} act={act} ringParties={parties.get(key) ?? []} onHousehold={onHousehold} onPerson={onPerson}
              pick={bulk ? { on: picked.has(row.party.id), toggle: () => toggle(row.party.id) } : undefined} />
          </FragmentRow>
        );
        return (
          <section key={ring.key} className="pp-ring" aria-label={ring.label}>
            <header className="pp-ring-head">
              <h2>{ring.label}</h2>
              <span className="pp-prog" title={prog.text}>
                <span className="pp-prog-bar" role="img" aria-label={prog.text}><i style={{ width: `${prog.pct}%` }} /></span>
                <span className="pp-prog-text">{prog.text}</span>
              </span>
              <span className="pp-ring-meta">
                {ring.rows.length} household{ring.rows.length === 1 ? "" : "s"} · {seatSplit(ring)}
                {ring.undecidedRows > 0 && <> · <b>{ring.undecidedRows} undecided</b></>}
              </span>
              {undecidedShown > 0 && (
                <button type="button" className="k-btn pp-invite-all" onClick={() => act.inviteAll({ ...ring, rows })}>
                  {undecidedShown === ring.undecidedRows ? "Invite all undecided" : `Invite ${undecidedShown} shown undecided`}
                </button>
              )}
            </header>
            {ring.friend ? [1, 2, 3].map((t) => {
              const tr = rows.filter((x) => x.tier === t);
              if (!tr.length) return null;
              const tp = ringProgress(ring.rows.filter((x) => x.tier === t));
              return (
                <div key={t} className="pp-tier" role="group" aria-label={FRIEND_TIER_LABEL[t]}>
                  <h3 className="pp-tier-head">{FRIEND_TIER_LABEL[t]} <span className="pp-tier-count">{tp.text}</span></h3>
                  <ul className="pp-hlist">{tr.map((row) => rowEl(row, `${ring.key}:${t}`))}</ul>
                </div>
              );
            }) : <ul className="pp-hlist">{rows.map((row) => rowEl(row, ring.key))}</ul>}
          </section>
        );
      })}
    </div>
  );
}

/** "14 adults · 3 kids" seats a ring takes if everyone not decided "no" comes. */
function seatSplit(r: Ring): string {
  const a = r.rows.reduce((n, x) => n + x.seats.adults, 0);
  const k = r.rows.reduce((n, x) => n + x.seats.kids, 0);
  return `${a} adult${a === 1 ? "" : "s"}${k ? ` · ${k} kid${k === 1 ? "" : "s"}` : ""}`;
}

function FragmentRow({ line, children }: { line: string | null; children: ReactNode }) {
  return <>{line && <li className="pp-roomline" role="separator" aria-label={line}><span>{line}</span></li>}{children}</>;
}
