// Plan tab (DESIGN-v14 §4): List | Calendar (remembered in prefs), filters All | Ready now | Decisions.
import { useEffect, useState } from "react";
import { useNav } from "../nav";
import { usePrefs } from "../usePrefs";
import { Tasks } from "./Tasks";
import type { PlanFilter, PlanMode } from "./model";
import "./plan.css";

export function PlanScreen() {
  const { focus, clearFocus } = useNav();
  const { prefs, set } = usePrefs();
  const mode = prefs.planMode;
  const setMode = (m: PlanMode) => set({ planMode: m });
  const [view, setView] = useState<PlanFilter>("all");
  const [highlight, setHighlight] = useState<string | null>(null);
  const focusTask = focus.task;
  const focusPlan = focus.plan;

  useEffect(() => {
    if (!focusPlan) return;
    if (focusPlan.mode) setMode(focusPlan.mode);
    setView(focusPlan.filter ?? "all");
    clearFocus();
  }, [focusPlan, clearFocus]);
  useEffect(() => {
    if (!focusTask) return;
    setView("all");
    setMode("list");
    setHighlight(focusTask);
    clearFocus();
  }, [focusTask, clearFocus]);
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, [highlight]);

  return (
    <div className="pl-screen">
      <Tasks mode={mode} setMode={setMode} view={view} setView={setView} highlight={highlight} />
    </div>
  );
}
