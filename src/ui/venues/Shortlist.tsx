// Shortlist: cards (<860px) and a compare table (>=860px) built from the same row list (DESIGN-v4 §2 Venues).
import type { ReactNode } from "react";
import { Card, Chip, EmptyState } from "../kit/kit";
import { Sprig } from "../garden/motifs";
import type { VenueSummary } from "../../plan/venueSummary";
import { fmtDate } from "../compare";
import { money } from "../format";
import { capacityText, fitPct, fitText, mailHref, pricedAtText, statusLabel, statusTone, telHref, windowParts } from "./model";

const HUES = ["blush", "marigold", "sage", "peony"] as const;
const short = (d: string) => fmtDate(d, { month: "short", day: "numeric", year: "numeric" });

export function StatusChip({ v }: { v: VenueSummary }) {
  return <Chip tone={statusTone(v.row?.status)}>{statusLabel(v.row?.status)}</Chip>;
}

export function TotalBlock({ v }: { v: VenueSummary }) {
  if (!v.priced || !v.budget) return <div className="vn-total vn-await">Awaiting rate sheet</div>;
  return (
    <div>
      <div className="vn-total">{money(v.budget.total)}</div>
      <div className="vn-meta">{money(v.budget.perGuest)} per guest · {v.guests} guests</div>
      {v.snapped && <div className="vn-meta vn-priced-at">≈ {pricedAtText(v)}</div>}
    </div>
  );
}

function Windows({ v }: { v: VenueSummary }) {
  if (!v.priced) return <span className="vn-meta">No totals until the rate sheet arrives</span>;
  const parts = windowParts(v, money, (d) => fmtDate(d, { weekday: "short", month: "short", day: "numeric" }));
  return <ul className="vn-plain">{parts.map((p) => <li key={p.name}><strong>{p.name}</strong> {p.text}{p.bad && <span className="sr-only"> (cannot host)</span>}</li>)}</ul>;
}

function FitBar({ v }: { v: VenueSummary }) {
  return (
    <div>
      <div className="vn-fitbar" role="img" aria-label={fitText(v.fit)}><i style={{ width: `${fitPct(v.fit)}%` }} /></div>
      <div className="vn-meta">{fitText(v.fit)}</div>
    </div>
  );
}

function Contact({ v }: { v: VenueSummary }) {
  const r = v.row;
  if (!r?.contact_name && !r?.contact_email && !r?.contact_phone) return <span className="vn-meta">No contact yet</span>;
  return (
    <div className="vn-contact">
      {r.contact_name && <span>{r.contact_name}</span>}
      {r.contact_email && <a href={mailHref(r.contact_email)}>{r.contact_email}</a>}
      {r.contact_phone && <a href={telHref(r.contact_phone)}>{r.contact_phone}</a>}
    </div>
  );
}

function Notes({ v }: { v: VenueSummary }) {
  const text = [v.scenario.flag, v.row?.notes].filter(Boolean) as string[];
  if (!text.length) return <span className="vn-meta">None</span>;
  return <details className="vn-notes"><summary>Notes</summary>{text.map((t) => <p key={t}>{t}</p>)}</details>;
}

function Alerts({ v }: { v: VenueSummary }) {
  const b = v.budget;
  if (!b?.unavailable && !b?.warnings.length) return null;
  return (
    <>
      {b.unavailable && <div className="flag warn" role="status"><strong>Cannot host · </strong>{b.unavailable}</div>}
      {b.warnings.map((w) => <div key={w} className="flag warn" role="status"><strong>Check · </strong>{w}</div>)}
    </>
  );
}

interface Row { key: string; label: string; cell(v: VenueSummary): ReactNode }

const ROWS: Row[] = [
  { key: "total", label: "Estimated total", cell: (v) => <TotalBlock v={v} /> },
  { key: "windows", label: "By date window", cell: (v) => <Windows v={v} /> },
  { key: "cap", label: "Capacity", cell: (v) => <span className={v.capacity && !v.capacity.ok ? "vn-bad" : ""}>{capacityText(v)}</span> },
  { key: "fit", label: "Must-have fit", cell: (v) => <FitBar v={v} /> },
  { key: "dates", label: "Hold / tour", cell: (v) => {
    const r = v.row;
    const bits = [r?.hold_date && `Hold ${short(r.hold_date)}`, r?.tour_date && `Tour ${short(r.tour_date)}`].filter(Boolean);
    return bits.length ? <>{bits.join(" · ")}</> : <span className="vn-meta">No dates</span>;
  } },
  { key: "next", label: "Next step", cell: (v) => v.row?.next_step || <span className="vn-meta">None set</span> },
  { key: "contact", label: "Contact", cell: (v) => <Contact v={v} /> },
  { key: "notes", label: "Notes", cell: (v) => <Notes v={v} /> },
];

function VenueTitle({ v, onOpen }: { v: VenueSummary; onOpen(id: number): void }) {
  return (
    <div className="vn-title">
      <Sprig hue={HUES[v.scenario.id % HUES.length]} />
      <div>
        <button type="button" className="vn-open" onClick={() => onOpen(v.scenario.id)}>{v.scenario.name}</button>
        <div className="vn-meta">{v.scenario.location}</div>
      </div>
    </div>
  );
}

export function Shortlist({ active, onOpen }: { active: VenueSummary[]; onOpen(id: number): void }) {
  return (
    <Card title="Shortlist" corner>
      {!active.length && <EmptyState>No venues on the shortlist. Add one from the Archive below.</EmptyState>}
      <div className="vn-cards">
        {active.map((v) => (
          <article key={v.scenario.id} className={`vn-card${v.budget?.unavailable || (v.capacity && !v.capacity.ok) ? " vn-dim" : ""}`} aria-label={v.scenario.name}>
            <div className="vn-card-head"><VenueTitle v={v} onOpen={onOpen} /><StatusChip v={v} /></div>
            <Alerts v={v} />
            <dl className="vn-facts">
              {ROWS.map((r) => <div key={r.key}><dt>{r.label}</dt><dd>{r.cell(v)}</dd></div>)}
            </dl>
            <button type="button" className="k-btn vn-wide" onClick={() => onOpen(v.scenario.id)}>Open {v.scenario.name}</button>
          </article>
        ))}
      </div>
      {active.length > 0 && (
        <div className="vn-table-wrap">
          <table className="vn-table">
            <caption className="sr-only">Shortlisted venues compared</caption>
            <thead>
              <tr><td />{active.map((v) => <th key={v.scenario.id} scope="col"><VenueTitle v={v} onOpen={onOpen} /><StatusChip v={v} /></th>)}</tr>
            </thead>
            <tbody>
              <tr><th scope="row">Alerts</th>{active.map((v) => <td key={v.scenario.id}><Alerts v={v} />{!v.budget?.unavailable && !v.budget?.warnings.length && <span className="vn-meta">None</span>}</td>)}</tr>
              {ROWS.map((r) => <tr key={r.key}><th scope="row">{r.label}</th>{active.map((v) => <td key={v.scenario.id}>{r.cell(v)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
