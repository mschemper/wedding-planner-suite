// Day → Vendors → Joinery preferred list (v17): browse the venue's list by category with researched descriptions; one tap adds a vendor to the shortlist (vendor row, status "idea").
import { useState } from "react";
import { PREFERRED_NOTES, PREFERRED_SOURCE, type PreferredCategory, type PreferredVendor } from "../../data/preferredVendors";
import { useData } from "../data";
import { Button, Card, Chip, EmptyState, FilterChip, Segmented } from "../kit/kit";
import { PREFERRED_TABS, preferredIn, shortlistCount, shortlistOp, trackedAs } from "./preferredModel";
import { STATUS_LABEL, STATUS_MARK } from "./vendorsModel";

const CONF: Record<PreferredVendor["confidence"], string> = { high: "Checked", medium: "Partly checked", low: "Unconfirmed" };

function Row({ p, venueId, onOpen }: { p: PreferredVendor; venueId: number; onOpen(id: string): void }) {
  const { vendors, save, offline } = useData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tracked = trackedAs(p, vendors);
  const add = async () => {
    setBusy(true); setErr("");
    const r = await save([shortlistOp(p, venueId)]);
    setBusy(false);
    if (!r.ok) setErr(r.message);
  };
  return (
    <li className="pv-row">
      <div className="pv-head">
        <span className="pv-name">{p.name}</span>
        {p.marked && <Chip tone="peony"><span aria-hidden="true">✎ </span>Marked on your list</Chip>}
        {tracked && <Chip tone="sage"><span aria-hidden="true">{STATUS_MARK[tracked.status]} </span>{STATUS_LABEL[tracked.status]}</Chip>}
      </div>
      {p.blurb && <p className="pv-blurb">{p.blurb}</p>}
      {p.style.length > 0 && <p className="pv-tags">{p.style.map((s) => <Chip key={s}>{s}</Chip>)}</p>}
      <dl className="pv-facts">
        {p.price && <><dt>Price</dt><dd>{p.price} <span className="pv-muted">(published; confirm)</span></dd></>}
        {p.service && <><dt>Service</dt><dd>{p.service}</dd></>}
        {p.reviews && <><dt>Reviews</dt><dd>{p.reviews}</dd></>}
        {p.notes && <><dt>Note</dt><dd>{p.notes}</dd></>}
      </dl>
      <div className="pv-actions">
        {p.website && <a className="pv-link" href={p.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
        {!p.website && p.source && <a className="pv-link" href={p.source} target="_blank" rel="noopener noreferrer">Listing ↗</a>}
        <span className="pv-muted">{CONF[p.confidence]}</span>
        {!offline && (tracked
          ? <Button kind="quiet" onClick={() => onOpen(tracked.id)}>Open</Button>
          : <Button onClick={() => void add()} disabled={busy}>Add to shortlist</Button>)}
      </div>
      {err && <p className="pv-err" role="alert">Not saved: {err}</p>}
    </li>
  );
}

export function PreferredVendors({ venueId, onOpen }: { venueId: number; onOpen(vendorId: string): void }) {
  const { vendors } = useData();
  const [cat, setCat] = useState<PreferredCategory>("catering");
  const [marked, setMarked] = useState(false);
  const [query, setQuery] = useState("");
  const list = preferredIn(cat, { markedOnly: marked, query });
  const c = shortlistCount(cat, vendors);
  const hasMarks = preferredIn(cat, { markedOnly: true }).length > 0;
  return (
    <Card title="Joinery preferred list" id="preferred">
      <p className="pv-muted">{PREFERRED_SOURCE}</p>
      <Segmented<PreferredCategory> label="Vendor type" value={cat} onChange={(v) => { setCat(v); setMarked(false); }} options={PREFERRED_TABS} />
      {PREFERRED_NOTES[cat] && <p className="pv-note"><span aria-hidden="true">✎ </span>{PREFERRED_NOTES[cat]}</p>}
      <div className="pv-tools">
        <input className="k-input pv-search" type="search" aria-label="Search this list" placeholder="Search name or style…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {hasMarks && <FilterChip on={marked} onClick={() => setMarked((m) => !m)}>Marked only</FilterChip>}
        <span className="pv-muted">{c.tracked} of {c.total} on your shortlist</span>
      </div>
      {list.length === 0 ? <EmptyState>No vendors match.</EmptyState> : <ul className="pv-list">{list.map((p) => <Row key={p.name} p={p} venueId={venueId} onOpen={onOpen} />)}</ul>}
    </Card>
  );
}
