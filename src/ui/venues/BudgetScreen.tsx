// Budget tab (DESIGN-v14 §3): the booked venue priced on the held date. Guest basis + contingency, budget, quotes, prices.
import { snapGuests } from "../../engine/compute";
import { weddingVenue } from "../../plan/day";
import { fmtDay } from "../plan/model";
import { Card, EmptyState, Segmented } from "../kit/kit";
import { useCompare } from "../compare";
import { useData } from "../data";
import type { GuestBasis } from "../prefs";
import { usePrefs } from "../usePrefs";
import { CONTINGENCIES, DetailView, GuestPicker, HOME_STOPS } from "./BudgetDetail";
import { pricedAtText } from "./model";
import { PricesForm } from "./PricesForm";
import { QuotesLog } from "./QuotesScreen";
import "./venues.css";

export function BudgetScreen() {
  const { prefs, set } = usePrefs();
  const { status, scenarios, venues, settings, quotes, headcount: hc, offline } = useData();
  const cmp = useCompare();

  if (status === "loading") return <Card title="Budget"><EmptyState>Loading budget…</EmptyState></Card>;

  const row = weddingVenue(venues, settings);
  const sc = row ? scenarios.find((s) => s.id === row.scenario_id) : undefined;
  const date = settings.heldDate;
  if (!sc || !date) {
    return <Card title="Budget"><EmptyState>No booked venue on a held date yet. Set the venue and date to see the budget.</EmptyState></Card>;
  }

  const expected = Math.round(hc.invited.expected);
  const snapped = snapGuests(sc, cmp.guests);
  const note = pricedAtText({ snapped: snapped !== cmp.guests, guests: snapped, asked: cmp.guests });
  const settingsOpts = { date, contingency: prefs.contingency, quotes };

  return (
    <>
      <div className="vn-top">
        <h2 className="vn-h2">{sc.name} · {fmtDay(date, true)}</h2>
      </div>

      <Card title="Pricing at" className="vn-bar">
        <div className="vn-bar-grid">
          <Segmented<GuestBasis> label="Guest count basis" value={prefs.guestBasis} onChange={(v) => set({ guestBasis: v })} options={[
            { value: "considered", label: `Incl. undecided (≈${Math.round(hc.invited.expected + hc.ifroom.expected + hc.undecided.expected)})` },
            { value: "expected", label: expected > 0 ? `Expected (≈${expected})` : "Expected" },
            { value: "ceiling", label: hc.invited.heads > 0 ? `Everyone invited (${hc.invited.heads})` : "Everyone invited" },
            { value: "custom", label: "Custom" },
          ]} />
          <label className="vn-inline">Contingency
            <select className="k-input" value={prefs.contingency} onChange={(e) => set({ contingency: Number(e.target.value) })}>
              {CONTINGENCIES.map((c) => <option key={c} value={c}>{c === 0 ? "None" : `${Math.round(c * 1000) / 10}%`}</option>)}
            </select>
          </label>
          {prefs.guestBasis === "custom" && (
            <div className="vn-gap"><GuestPicker stops={HOME_STOPS} value={prefs.guests} onChange={(g) => set({ guests: g })} min={20} max={300} /></div>
          )}
        </div>
        <p className="vn-meta">Pricing {cmp.guestsLabel} on {fmtDay(date, true)}. Kids are priced as adults.{note ? ` ${note}.` : ""}</p>
      </Card>

      <Card title="Budget">
        <DetailView key={`${sc.id}|${cmp.guests}|${date}|${prefs.contingency}`} sc={sc} scenarios={scenarios} initialGuests={cmp.guests} settings={settingsOpts} />
      </Card>

      <Card title="Quotes"><QuotesLog sc={sc} /></Card>

      <Card title="Prices">
        {offline ? <EmptyState>Prices are edited in the online planner.</EmptyState> : <PricesForm />}
      </Card>

      <p className="vn-foot">
        Source: Reconciled Master v2.0 (June 2026); The Joinery 2027 pricing sheet. Estimates run ±10–15% against real contracts. A ≈ marks a price extrapolated past the source's data points.
      </p>
    </>
  );
}
