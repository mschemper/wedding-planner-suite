// Venue detail (DESIGN-v4 §2): header, editable facts, sources, budget at the compare count/date, quotes, must-haves.
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, FilterChip, VerdictPicker } from "../kit/kit";
import { Sprig } from "../garden/motifs";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { usePrefs } from "../usePrefs";
import { fmtDate } from "../compare";
import { orderedMustHaves, verdictOf } from "../../plan/fit";
import { VENUE_STATUSES, type VenueStatus } from "../../plan/types";
import type { VenueSummary } from "../../plan/venueSummary";
import { DetailView } from "./BudgetDetail";
import { NoteSheet, useFitEdit, type NoteTarget } from "./FitMatrix";
import { QuotesLog } from "./QuotesScreen";
import { StatusChip } from "./Shortlist";
import { EDIT_FIELDS, capacityText, draftOf, fitText, safeUrl, statusLabel, venuePatch, type VenueDraft } from "./model";

const LABELS: Record<(typeof EDIT_FIELDS)[number], string> = {
  hold_date: "Hold date", tour_date: "Tour date", contact_name: "Contact name", contact_email: "Contact email",
  contact_phone: "Contact phone", next_step: "Next step", notes: "Notes",
};

function DetailsForm({ v, short }: { v: VenueSummary; short: string }) {
  const { edit } = useData();
  const [d, setD] = useState<VenueDraft>(() => draftOf(v.row));
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = venuePatch(v.row, d);
  async function onSave() {
    if (!Object.keys(patch).length || busy) return;
    setBusy(true);
    const r = await edit([{ table: "venues", id: String(v.scenario.id), row: patch }], `Saved ${short} details`);
    setBusy(false);
    setFail(r.ok ? null : r);
  }
  const f = (k: keyof VenueDraft, type = "text", inputMode?: "email" | "tel") => (
    <Field label={LABELS[k]}><input type={type} inputMode={inputMode} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></Field>
  );
  return (
    <form className="vn-form" onSubmit={(e) => { e.preventDefault(); void onSave(); }}>
      {f("hold_date", "date")}{f("tour_date", "date")}
      {f("contact_name")}{f("contact_email", "email", "email")}{f("contact_phone", "tel", "tel")}
      <Field label={LABELS.next_step} wide><input value={d.next_step} onChange={(e) => setD({ ...d, next_step: e.target.value })} /></Field>
      <Field label={LABELS.notes} wide><textarea rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
      <div className="vn-form-foot">
        <Button type="submit" kind="primary" disabled={busy || !Object.keys(patch).length}>{busy ? "Saving…" : "Save details"}</Button>
        <SaveError result={fail} onDismiss={() => setFail(null)} />
      </div>
    </form>
  );
}

function ReadOnlyFacts({ v }: { v: VenueSummary }) {
  const r = v.row;
  const rows: [string, string | null | undefined][] = [
    ["Hold date", r?.hold_date && fmtDate(r.hold_date)], ["Tour date", r?.tour_date && fmtDate(r.tour_date)],
    ["Contact", [r?.contact_name, r?.contact_email, r?.contact_phone].filter(Boolean).join(" · ")], ["Next step", r?.next_step], ["Notes", r?.notes],
  ];
  return <dl className="vn-facts">{rows.map(([k, t]) => <div key={k}><dt>{k}</dt><dd>{t || <span className="vn-meta">None</span>}</dd></div>)}</dl>;
}

export function VenueDetail({ v, scenarios, guests, date, onBack }: { v: VenueSummary; scenarios: import("../../engine/types").Scenario[]; guests: number; date: string; onBack(): void }) {
  const { edit, quotes, musthaves, fit, offline } = useData();
  const { prefs } = usePrefs();
  const fe = useFitEdit();
  const [target, setTarget] = useState<NoteTarget | null>(null);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  useEffect(() => window.scrollTo(0, 0), [v.scenario.id]);
  const sc = v.scenario;
  const short = sc.name.split(" ")[0];
  const settings = useMemo(() => ({ date, contingency: prefs.contingency, quotes }), [date, prefs.contingency, quotes]);
  const id = String(sc.id);
  const status = v.row?.status ?? "researching";

  async function write(row: Record<string, unknown>, label: string) {
    const r = await edit([{ table: "venues", id, row }], label);
    setFail(r.ok ? null : r);
  }
  const rows = orderedMustHaves(musthaves);
  const links = (sc.sources ?? []).map((u) => ({ u, href: safeUrl(u) })).filter((x) => x.href);

  return (
    <>
      <Button kind="quiet" onClick={onBack}>← All venues</Button>
      <Card corner className="vn-detail-head">
        <div className="vn-title">
          <Sprig />
          <div>
            <h2 className="vn-h2">{sc.name}</h2>
            <div className="vn-meta">{sc.location}</div>
          </div>
        </div>
        <p className="vn-desc">{sc.desc}</p>
        <div className="vn-head-row">
          {offline ? <StatusChip v={v} /> : (
            <Field label="Status">
              <select value={status} onChange={(e) => void write({ status: e.target.value as VenueStatus }, `${short}: ${statusLabel(e.target.value as VenueStatus)}`)}>
                {VENUE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </Field>
          )}
          {offline ? <span className="vn-meta">{v.active ? "On shortlist" : "In archive"}</span> : (
            <FilterChip on={v.active} onClick={() => void write({ active: !v.active }, v.active ? `Moved ${short} to the archive` : `Added ${short} to the shortlist`)}>
              {v.active ? "On shortlist ✓" : "On shortlist"}
            </FilterChip>
          )}
        </div>
        <p className="vn-meta">{capacityText(v)} · {fitText(v.fit)}</p>
        <SaveError result={fail} onDismiss={() => setFail(null)} />
      </Card>

      <Card title="Details">{offline ? <ReadOnlyFacts v={v} /> : <DetailsForm key={JSON.stringify(v.row)} v={v} short={short} />}</Card>

      {links.length > 0 && (
        <Card title="Sources">
          <ul className="vn-plain">{links.map((l) => <li key={l.u}><a href={l.href!} target="_blank" rel="noopener noreferrer">{l.href!.replace(/^https?:\/\//, "")}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>
        </Card>
      )}

      <Card title="Budget">
        {v.priced ? (
          <DetailView key={`${sc.id}|${guests}|${date}|${prefs.contingency}`} sc={sc} scenarios={scenarios} initialGuests={guests} settings={settings} />
        ) : (
          <>
            <EmptyState>No published prices yet. Ask for the rate sheet; no total is shown until it arrives.</EmptyState>
            {sc.flag && <div className="flag"><strong>Planner's note · </strong>{sc.flag}</div>}
            <p className="vn-meta">Confidence {sc.confidence}% · modelled {sc.min} to {sc.max} guests</p>
          </>
        )}
      </Card>

      <Card title="Quotes"><QuotesLog sc={sc} /></Card>

      <Card title="Must-haves">
        {!rows.length && <EmptyState>No must-haves yet.</EmptyState>}
        <ul className="vn-mh">
          {rows.map((m) => {
            const f = verdictOf(fit, sc.id, m.id);
            const names = `${sc.name} · ${m.text}`;
            return (
              <li key={m.id}>
                <VerdictPicker verdict={f?.verdict ?? "unknown"} label={names} disabled={fe.readOnly} onCycle={() => void fe.cycle(sc.id, m.id, names)} />
                <div className="vn-mh-text">
                  <span>{m.text}</span>
                  {f?.note && <span className="vn-meta">{f.note}</span>}
                </div>
                {!fe.readOnly && <button type="button" className="vn-note-btn" aria-label={`${f?.note ? "Edit" : "Add"} note: ${names}`}
                  onClick={() => setTarget({ scenarioId: sc.id, musthaveId: m.id, venue: sc.name, musthave: m.text })}>{f?.note ? "note ✎" : "note"}</button>}
              </li>
            );
          })}
        </ul>
        {fe.error}
        <NoteSheet target={target} onClose={() => setTarget(null)} onSave={(t, n) => fe.setNote(t.scenarioId, t.musthaveId, n, `${t.venue} · ${t.musthave}`)} />
      </Card>
    </>
  );
}
