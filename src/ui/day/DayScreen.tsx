// Day tab (DESIGN-v11): the wedding venue, vendor bookings and the day-of timeline. Lead-owned shell; sections are their own files.
import { weddingVenue } from "../../plan/day";
import { useData } from "../data";
import { EmptyState, Segmented, Card, Button } from "../kit/kit";
import { useNav, type DaySection } from "../nav";
import { usePrefs } from "../usePrefs";
import { OurVenue } from "./OurVenue";
import { Timeline } from "./Timeline";
import { Vendors } from "./Vendors";
import "./day.css";

const SECTIONS: { value: DaySection; label: string }[] = [
  { value: "venue", label: "Our venue" },
  { value: "vendors", label: "Vendors" },
  { value: "timeline", label: "Timeline" },
];

export function DayScreen() {
  const { venues, settings, offline } = useData();
  const { prefs, set } = usePrefs();
  const { setTab } = useNav();
  const row = weddingVenue(venues, settings);
  const section = prefs.daySection;

  if (offline) return <Card title="Day"><EmptyState>The Day tab lives in the online planner.</EmptyState></Card>;
  if (!row || !settings.heldDate) {
    return (
      <Card title="Day">
        <EmptyState>No venue holds the wedding date yet. On Venues, set a venue's status to held on the held date.</EmptyState>
        <Button onClick={() => setTab("venues")}>Open Venues</Button>
      </Card>
    );
  }
  return (
    <div className="dy-screen" data-section={section}>
      <div className="dy-switch">
        <Segmented<DaySection> label="Day section" value={section} onChange={(daySection) => set({ daySection })} options={SECTIONS} />
      </div>
      {section === "venue" && <OurVenue venueId={row.scenario_id} date={settings.heldDate} />}
      {section === "vendors" && <Vendors venueId={row.scenario_id} date={settings.heldDate} />}
      {section === "timeline" && <Timeline venueId={row.scenario_id} date={settings.heldDate} />}
    </div>
  );
}
