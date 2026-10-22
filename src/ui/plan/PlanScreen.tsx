// Plan tab (DESIGN-v4 §2): Tasks + Must-haves. Wide screens show both; phones switch with the Segmented control.
import { useEffect, useState } from "react";
import { Segmented } from "../kit/kit";
import { useNav } from "../nav";
import { MustHaves } from "./MustHaves";
import { Tasks } from "./Tasks";
import "./plan.css";

type Section = "tasks" | "musthaves";
export const PLAN_SECTION_KEY = "wps.planSection";

function initialSection(): Section {
  try {
    const s = sessionStorage.getItem(PLAN_SECTION_KEY);
    sessionStorage.removeItem(PLAN_SECTION_KEY);
    if (s === "musthaves") return "musthaves";
  } catch { /* storage unavailable */ }
  return "tasks";
}

export function PlanScreen() {
  const { focus, clearFocus } = useNav();
  const [section, setSection] = useState<Section>(initialSection);
  const [highlight, setHighlight] = useState<string | null>(null);
  const focusTask = focus.task;

  useEffect(() => {
    if (!focusTask) return;
    setSection("tasks");
    setHighlight(focusTask);
    clearFocus();
  }, [focusTask, clearFocus]);
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, [highlight]);

  return (
    <div className="pl-screen" data-section={section}>
      <div className="pl-switch">
        <Segmented<Section> label="Plan section" value={section} onChange={setSection}
          options={[{ value: "tasks", label: "Tasks" }, { value: "musthaves", label: "Must-haves" }]} />
      </div>
      <div className="pl-cols">
        <div className="pl-col pl-col-tasks"><Tasks highlight={highlight} /></div>
        <div className="pl-col pl-col-mh"><MustHaves /></div>
      </div>
    </div>
  );
}
