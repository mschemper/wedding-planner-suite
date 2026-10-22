// Decide view (DESIGN-v5 §3, mockup A1): one section per closeness ring, rows with a 3-way decision, room line at the fill point.
import { useMemo, useState, type ReactNode } from "react";
import type { Ring } from "../../people/rings";
import { FilterChip, Segmented, Card, EmptyState } from "../kit/kit";
import { useData } from "../data";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { HouseholdRow } from "./HouseholdRow";
import { matchesRow, NO_FILTER, type RowFilter, type SideFilter } from "./model";
import type { Room } from "./RoomCheck";

const SIDES: { value: SideFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "Mark", label: "Mark" }, { value: "Angela", label: "Angela" }, { value: "friends", label: "Friends" },
];

export function Decide({ rings, room, rel, act, onHousehold, onPerson }: {
  rings: Ring[]; room: Room; rel: (r: Ring["rows"][number]) => string; act: Actions; onHousehold(id: string): void; onPerson(id: string): void;
}) {
  const { invite } = useData();
  const [f, setF] = useState<RowFilter>(NO_FILTER);
  const parties = useMemo(() => new Map(rings.map((r) => [r.key, r.rows.map((x) => x.party)])), [rings]);
  const undecidedAll = useMemo(() => rings.reduce((n, r) => n + r.undecidedRows, 0), [rings]);
  const shown = useMemo(() => rings.map((r) => ({ ring: r, rows: r.rows.filter((x) => matchesRow(x, f)) })).filter((x) => x.rows.length), [rings, f]);
  const cap = room.check?.cap;
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      <div className="pp-filters" role="group" aria-label="Filters">
        <FilterChip on={f.undecidedOnly} onClick={() => setF((x) => ({ ...x, undecidedOnly: !x.undecidedOnly }))} count={undecidedAll}>Undecided only</FilterChip>
        <Segmented<SideFilter> label="Side" size="sm" options={SIDES.map((s) => ({ ...s, tone: "euc" as const }))} value={f.side} onChange={(v) => setF((x) => ({ ...x, side: v }))} />
        <input className="k-input pp-search" type="search" value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} placeholder="Search a name or household" aria-label="Search households" />
      </div>
      {shown.length === 0 && <Card><EmptyState>{f.undecidedOnly && !f.q && f.side === "all" ? "Everyone is decided." : "No households match."}</EmptyState></Card>}
      {shown.map(({ ring, rows }) => (
        <section key={ring.key} className="pp-ring" aria-label={ring.label}>
          <header className="pp-ring-head">
            <h2>{ring.label}</h2>
            <span className="pp-ring-meta">
              {ring.rows.length} household{ring.rows.length === 1 ? "" : "s"} · {ring.invited + ring.ifroom + ring.undecided} seats
              {ring.undecidedRows > 0 && <> · <b>{ring.undecidedRows} undecided</b></>}
            </span>
            {ring.undecidedRows > 0 && <button type="button" className="k-btn pp-invite-all" onClick={() => act.inviteAll(ring)}>Invite all undecided</button>}
          </header>
          <ul className="pp-hlist">
            {rows.map((row) => (
              <FragmentRow key={row.party.id} line={room.fill?.party === row.party.id && cap ? `— ${room.sel?.name} fills here (${cap} seated) —` : null}>
                <HouseholdRow row={row} relation={rel(row)} ctx={invite} act={act} ringParties={parties.get(ring.key) ?? []} onHousehold={onHousehold} onPerson={onPerson} />
              </FragmentRow>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FragmentRow({ line, children }: { line: string | null; children: ReactNode }) {
  return <>{line && <li className="pp-roomline" role="separator" aria-label={line}><span>{line}</span></li>}{children}</>;
}
