// "Pricing at" bar: guest basis, compare date, contingency (DESIGN-v4 §2 Venues). Prefs only; numbers come from useCompare().
import { Card, FilterChip, Segmented } from "../kit/kit";
import { fmtDate, useCompare } from "../compare";
import { useData } from "../data";
import { usePrefs } from "../usePrefs";
import type { GuestBasis } from "../prefs";
import { CONTINGENCIES, GuestPicker, HOME_STOPS } from "./BudgetDetail";
import { dateChoice, windowLabel } from "./model";

const day = (d: string) => fmtDate(d, { weekday: "short", month: "short", day: "numeric" });

export function CompareBar() {
  const { prefs, set } = usePrefs();
  const { settings, headcount: hc } = useData();
  const cmp = useCompare();
  const expected = Math.round(hc.invited.expected);
  const choice = dateChoice(cmp.date, settings.heldDate, settings.dateWindows);
  return (
    <Card title="Pricing at" className="vn-bar">
      <div className="vn-bar-grid">
        <div>
          <Segmented<GuestBasis> label="Guest count basis" value={prefs.guestBasis} onChange={(v) => set({ guestBasis: v })} options={[
            { value: "considered", label: `Incl. undecided (≈${Math.round(hc.invited.expected + hc.ifroom.expected + hc.undecided.expected)})` },
            { value: "expected", label: expected > 0 ? `Invited only (≈${expected})` : "Invited only" },
            { value: "ceiling", label: hc.invited.heads > 0 ? `Everyone invited (${hc.invited.heads})` : "Everyone invited" },
            { value: "custom", label: "Custom" },
          ]} />
          {prefs.guestBasis === "custom" && (
            <div className="vn-gap"><GuestPicker stops={HOME_STOPS} value={prefs.guests} onChange={(g) => set({ guests: g })} min={20} max={300} /></div>
          )}
        </div>
        <div>
          <div className="vn-label" id="vn-date-label">Date</div>
          <div className="vn-chips" role="group" aria-labelledby="vn-date-label">
            {settings.heldDate && <FilterChip on={choice === "held"} onClick={() => set({ date: null })}>Held date · {day(settings.heldDate)}</FilterChip>}
            {settings.dateWindows.map((w) => (
              <FilterChip key={w.name + w.ref} on={choice === w.ref} onClick={() => set({ date: w.ref })}>{windowLabel(w, day)}</FilterChip>
            ))}
          </div>
          <label className="vn-inline">Other date
            <input className="k-input" type="date" value={cmp.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
          </label>
        </div>
        <label className="vn-inline">Contingency
          <select className="k-input" value={prefs.contingency} onChange={(e) => set({ contingency: Number(e.target.value) })}>
            {CONTINGENCIES.map((c) => <option key={c} value={c}>{c === 0 ? "None" : `${Math.round(c * 1000) / 10}%`}</option>)}
          </select>
        </label>
      </div>
      <p className="vn-meta">Pricing {cmp.guestsLabel} on {fmtDate(cmp.date)}.</p>
    </Card>
  );
}
