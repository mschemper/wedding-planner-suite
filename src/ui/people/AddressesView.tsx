// People -> Addresses section (DESIGN-v14 §5): progress, Missing first (tap opens the household), Have, then the rest. Private data.
import { useMemo } from "react";
import { useData } from "../data";
import { Card, Chip, EmptyState } from "../kit/kit";
import { addressRows, progressPct, progressText } from "./addressModel";

type Lines = { id: string; name: string; lines: string[]; verified: boolean };

function Body({ h }: { h: Lines }) {
  return (
    <span>
      <strong>{h.name}</strong>{h.verified && <> <Chip tone="sage">Confirmed</Chip></>}<br />
      {h.lines.map((l, i) => <span key={i} className="pp-addr-line">{l}</span>)}
    </span>
  );
}

export function AddressesView({ onHousehold }: { onHousehold(partyId: string): void }) {
  const { people, addresses, invite } = useData();
  const r = useMemo(() => addressRows(people, addresses, invite), [people, addresses, invite]);
  const pct = progressPct(r.progress);
  const exists = (id: string) => people.parties.some((p) => p.id === id);
  return (
    <div className="pp-addrs">
      <Card title="Addresses">
        <p className="pp-addr-count"><strong>{progressText(r.progress)}</strong> ({pct}%)</p>
        <div className="pp-bar" role="progressbar" aria-label="Households with an address" aria-valuemin={0} aria-valuemax={r.progress.invited.length} aria-valuenow={r.progress.have.length}>
          <span className="pp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </Card>
      <Card title={`Missing · ${r.missing.length}`}>
        {r.missing.length === 0 ? <EmptyState>Every invited household has an address.</EmptyState> : (
          <ul className="pp-addr-list">
            {r.missing.map((h) => <li key={h.id}><button type="button" className="pp-addr-row" onClick={() => onHousehold(h.id)}><span>{h.name}</span><span className="muted small">Add address ›</span></button></li>)}
          </ul>
        )}
      </Card>
      <Card title={`Have · ${r.have.length}`}>
        {r.have.length === 0 ? <EmptyState>No addresses yet.</EmptyState> : (
          <ul className="pp-addr-list">
            {r.have.map((h) => <li key={h.id}><button type="button" className="pp-addr-row" onClick={() => onHousehold(h.id)}><Body h={h} /></button></li>)}
          </ul>
        )}
      </Card>
      {r.other.length > 0 && (
        <details className="pp-more pp-addr-other">
          <summary>Not invited / no longer a household · {r.other.length}</summary>
          <ul className="pp-addr-list">
            {r.other.map((h) => (
              <li key={h.id}>
                {exists(h.id)
                  ? <button type="button" className="pp-addr-row" onClick={() => onHousehold(h.id)}><Body h={h} /></button>
                  : <div className="pp-addr-row"><Body h={h} /></div>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
