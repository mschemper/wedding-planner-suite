// Venues tab (DESIGN-v4 §2): compare bar, shortlist, must-have matrix, venue detail, archive, assumptions.
import { useEffect, useState } from "react";
import { Card, EmptyState } from "../kit/kit";
import { useCompare } from "../compare";
import { useData } from "../data";
import { useNav } from "../nav";
import { usePrefs } from "../usePrefs";
import { AddVenueButton } from "./AddVenue";
import { Archive } from "./Archive";
import { AssumptionsButton } from "./Assumptions";
import { CompareBar } from "./CompareBar";
import { FitMatrix } from "./FitMatrix";
import { Shortlist } from "./Shortlist";
import { VenueDetail } from "./VenueDetail";
import "./venues.css";

export function VenuesScreen() {
  const { prefs, set } = usePrefs();
  const { focus, clearFocus } = useNav();
  const { status, scenarios } = useData();
  const { openVenue } = useNav();
  const cmp = useCompare();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (focus.venue != null) { set({ selected: focus.venue }); clearFocus(); }
  }, [focus.venue, set, clearFocus]);

  const open = (id: number) => { set({ selected: id }); };
  const all = [...cmp.active, ...cmp.archive];
  const sel = prefs.selected != null ? all.find((v) => v.scenario.id === prefs.selected) : undefined;

  if (status === "loading") return <Card title="Venues"><EmptyState>Loading venues…</EmptyState></Card>;

  const note = notice && <p className="vn-notice" role="status">{notice} <button type="button" className="vn-note-btn" onClick={() => setNotice("")}>Dismiss</button></p>;
  if (sel) {
    return <>{note}<VenueDetail v={sel} scenarios={scenarios} guests={cmp.guests} date={cmp.date} onBack={() => set({ selected: null })} /></>;
  }

  return (
    <>
      <div className="vn-top">
        <h2 className="vn-h2">Venues</h2>
        <span className="vn-top-actions"><AddVenueButton onAdded={(id, n) => { setNotice(`Added ${n} as a potential venue. A task to contact them is due in a week (see Plan).`); openVenue(id); }} /><AssumptionsButton /></span>
      </div>
      {note}
      <CompareBar />
      <Shortlist active={cmp.active} onOpen={open} />
      <FitMatrix active={cmp.active} />
      <Archive archive={cmp.archive} onOpen={open} />
      <p className="vn-foot">
        Source: Reconciled Master v2.0 (June 2026); venue pages (Oct 2026); Firehouse official rates fetched 21 Oct 2026. Estimates run ±10–15% against real contracts. A ≈ marks a price extrapolated past the source's data points.
      </p>
    </>
  );
}
