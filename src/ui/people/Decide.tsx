// Decide view (DESIGN-v4 §2, mockup docs/mockups/v4-people.html): impact bar, filters, household cards, ranked if-room list, recent decisions.
import { useMemo, useState } from "react";
import { Card, EmptyState, FilterChip, Segmented } from "../kit/kit";
import { useAudit, useData } from "../data";
import { KIDS_POLICIES, type KidsPolicy } from "../../people/types";
import { useNav } from "../nav";
import { usePrefs } from "../usePrefs";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import {
  authorName, capacityFor, capacityScenarios, describeAudit, filterCounts, FILTERS, matchesFilters, matchesSearch, partyRows, pickVenue,
  POLICY_LABEL, relationFinder, timeAgo, type FilterKey,
} from "./model";
import { PartyCard } from "./PartyCard";

function ImpactBar() {
  const { headcount: hc, scenarios, venues } = useData();
  const { prefs, set } = usePrefs();
  const { priceAt } = useNav();
  const list = useMemo(() => capacityScenarios(scenarios, venues), [scenarios, venues]);
  const sel = pickVenue(list, prefs.capacityVenue);
  const cap = sel ? capacityFor(hc, sel) : null;
  const others = useMemo(() => {
    const active = new Set(venues.filter((v) => v.active).map((v) => v.scenario_id));
    return list.filter((s) => active.has(s.id) && s.id !== sel?.id).map((s) => ({ s, c: capacityFor(hc, s)! }));
  }, [list, venues, hc, sel]);
  const t = hc.invited;
  return (
    <section className="pp-impact" aria-label="Live impact">
      <div className="pp-stats">
        <div className="pp-stat"><b>{t.heads}</b><span>invited</span></div>
        <div className="pp-stat"><b>≈ {Math.round(t.expected)}</b><span>expected</span></div>
        <div className="pp-stat"><b>{t.adults} · {t.kids}</b><span>adults · kids' room</span></div>
        <div className="pp-stat"><b>{hc.undecidedParties}</b><span>undecided households</span></div>
      </div>
      {sel && cap && (
        <div className="pp-cap">
          <div className="pp-cap-head">
            <label className="pp-venue"><span className="sr-only">Venue for the capacity bar</span>
              <select value={sel.id} onChange={(e) => set({ capacityVenue: Number(e.target.value) })}>
                {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <b className={cap.over ? "pp-over" : ""}>{cap.text}</b>
          </div>
          <div className="pp-bar" role="meter" aria-label={`${sel.name} seats used`} aria-valuemin={0} aria-valuemax={cap.cap} aria-valuenow={Math.min(cap.used, cap.cap)} aria-valuetext={cap.text}>
            <i className={cap.over ? "over" : ""} style={{ width: `${cap.pct}%` }} />
          </div>
          {others.length > 0 && (
            <div className="pp-others">
              {others.map(({ s, c }, i) => (
                <span key={s.id}>{i > 0 && " · "}{s.name} {c.over ? `over by ${-c.spare}` : `${c.cap} seats, ${c.spare} spare ✓`}</span>
              ))}
              {" "}<button type="button" className="pp-link" onClick={() => priceAt(Math.max(1, Math.round(t.expected)))}>Compare prices</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RankPanel({ act }: { act: Actions }) {
  const { headcount: hc, scenarios, venues } = useData();
  const { prefs } = usePrefs();
  const sel = pickVenue(capacityScenarios(scenarios, venues), prefs.capacityVenue);
  const cap = sel ? capacityFor(hc, sel) : null;
  const ranked = hc.ranked;
  const parties = ranked.map((r) => r.party);
  const line = cap && sel ? (
    <li className="pp-cut" aria-label={`${sel.name} seats ${cap.cap}: households above this line fit`}>
      — fits {sel.name} ({cap.cap} seated) above this line —
    </li>
  ) : null;
  return (
    <Card title="If room · ranked">
      <p className="muted small">Use ↑ ↓ to rank. The line shows who fits at the venue in the capacity bar.</p>
      {ranked.length === 0 ? <EmptyState>No households are marked "If room".</EmptyState> : (
        <ol className="pp-rank">
          {ranked.map((r, i) => (
            <li key={r.party.id}>
              {cap && i === cap.fits && line}
              <div className="pp-rank-row">
                <span className="pp-rank-n">{i + 1}.</span>
                <span className="pp-rank-name">{r.party.name} <span className="muted">({r.tally.heads})</span></span>
                <button type="button" className="k-icon-btn" aria-label={`Move ${r.party.name} up`} disabled={i === 0} onClick={() => act.move(parties, r.party.id, -1)}>↑</button>
                <button type="button" className="k-icon-btn" aria-label={`Move ${r.party.name} down`} disabled={i === ranked.length - 1} onClick={() => act.move(parties, r.party.id, 1)}>↓</button>
              </div>
            </li>
          ))}
          {cap && cap.fits >= ranked.length && <li className="pp-cut">— everyone here fits {sel?.name} ({cap.cap} seated) —</li>}
        </ol>
      )}
    </Card>
  );
}

function Recent() {
  const entries = useAudit(20);
  const { people } = useData();
  const lines = useMemo(() => {
    const names = { parties: new Map(people.parties.map((x) => [x.id, x.name])), people: new Map(people.people.map((p) => [p.id, `${p.nick || p.first}${p.last ? ` ${p.last}` : ""}`])) };
    return entries.flatMap((e) => { const t = describeAudit(e, names); return t ? [{ id: e.id, who: authorName(e.who), text: t, when: timeAgo(e.ts) }] : []; });
  }, [entries, people]);
  return (
    <Card title="Recent decisions">
      {lines.length === 0 ? <EmptyState>No decisions yet.</EmptyState> : (
        <ul className="pp-log">{lines.map((l) => <li key={l.id}><b>{l.who}</b> · {l.text} · <span className="muted">{l.when}</span></li>)}</ul>
      )}
    </Card>
  );
}

export function Decide({ act, onPerson }: { act: Actions; onPerson(id: string): void }) {
  const { people, invite, settings } = useData();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ReadonlySet<FilterKey>>(new Set());
  const rows = useMemo(() => partyRows(people), [people]);
  const rel = useMemo(() => relationFinder(people.people), [people]);
  const counts = useMemo(() => filterCounts(rows), [rows]);
  const shown = useMemo(() => rows.filter((r) => matchesFilters(r, active) && matchesSearch(r, q)), [rows, active, q]);
  const toggle = (k: FilterKey) => setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="pp-decide">
      <ImpactBar />
      <div className="pp-main">
        <Card>
          <SaveError result={act.error} onDismiss={act.clearError} />
          <input className="k-input pp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, household or branch" aria-label="Search households" />
          <div className="pp-chips-row" role="group" aria-label="Filters">
            {FILTERS.map((f) => <FilterChip key={f.key} on={active.has(f.key)} onClick={() => toggle(f.key)} count={counts[f.key]}>{f.label}</FilterChip>)}
          </div>
          <div className="pp-policy">
            <span className="pp-label">Kids policy:</span>
            <Segmented<KidsPolicy> label="Kids policy" options={KIDS_POLICIES.map((v) => ({ value: v, label: POLICY_LABEL[v], tone: "euc" as const }))} value={settings.kidsPolicy} onChange={act.policy} />
            <span className="muted small">each household can override</span>
          </div>
          {shown.length === 0 ? <EmptyState>No households match.</EmptyState> : shown.map((r) => <PartyCard key={r.party.id} row={r} ctx={invite} act={act} rel={rel} onPerson={onPerson} />)}
          <p className="muted small">One tap decides the household and saves instantly, with Undo. Tap a name for Edit details.</p>
        </Card>
      </div>
      <aside className="pp-side"><RankPanel act={act} /><Recent /></aside>
    </div>
  );
}
