// People tab (DESIGN-v4 §2): Decide · Family garden · Friends · Envelopes, one Edit details sheet per person.
import { useCallback, useEffect, useRef, useState } from "react";
import { relativeDefaults } from "../../people/garden";
import type { Person } from "../../people/types";
import { useData } from "../data";
import { Button, Card, EmptyState, Segmented } from "../kit/kit";
import { useNav } from "../nav";
import type { PeopleView } from "../prefs";
import { usePrefs } from "../usePrefs";
import { useActions, useWide } from "./actions";
import { Decide } from "./Decide";
import { Envelopes } from "./Envelopes";
import { Friends } from "./Friends";
import { Garden } from "./Garden";
import { PersonSheet, type SheetRequest, type SheetTarget } from "./PersonSheet";
import "./people.css";

const VIEWS: { value: PeopleView; label: string }[] = [
  { value: "decide", label: "Decide" }, { value: "garden", label: "Family garden" }, { value: "friends", label: "Friends" }, { value: "envelopes", label: "Envelopes" },
];

export function PeopleScreen() {
  const { offline, people, status } = useData();
  const { prefs, set } = usePrefs();
  const { focus, clearFocus } = useNav();
  const wide = useWide();
  const act = useActions();
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const seq = useRef(0);
  const open = useCallback((t: SheetRequest) => setTarget({ ...t, key: String(++seq.current) } as SheetTarget), []);
  const view: PeopleView = prefs.peopleView ?? (wide ? "garden" : "decide");

  useEffect(() => {
    if (!focus.person) return;
    if (people.people.some((p) => p.id === focus.person)) { open({ mode: "edit", id: focus.person }); clearFocus(); }
    else if (status === "ready" && people.people.length > 0) clearFocus();
  }, [focus.person, people.people, status, open, clearFocus]);

  if (offline) return <Card title="People"><EmptyState>Guest decisions live in the online planner.</EmptyState></Card>;

  const editPerson = (id: string, f?: "parents") => open({ mode: "edit", id, focus: f });
  const addRelative = (of: Person, rel: "parent" | "partner" | "child" | "sibling") =>
    open({ mode: "new", defaults: relativeDefaults(of, rel), party: "new", parentOf: rel === "parent" ? of.id : undefined });

  return (
    <div className="pp-screen">
      <div className="pp-top">
        <div className="pp-views"><Segmented<PeopleView> label="People view" options={VIEWS.map((v) => ({ ...v, tone: "euc" as const }))} value={view} onChange={(v) => set({ peopleView: v })} /></div>
        <div className="pp-adds">
          <Button onClick={() => open({ mode: "new", defaults: {}, party: "" })}>Add person</Button>
          <Button onClick={() => open({ mode: "new", defaults: {}, party: "new" })}>Add household</Button>
          <Button onClick={() => open({ mode: "new", defaults: { kind: "friend" }, party: "new" })}>Add friend</Button>
        </div>
      </div>
      {view === "decide" && <Decide act={act} onPerson={editPerson} />}
      {view === "garden" && <Garden act={act} onPerson={editPerson} onAddRelative={addRelative} />}
      {view === "friends" && <Friends act={act} onPerson={editPerson} />}
      {view === "envelopes" && <Envelopes />}
      <PersonSheet key={target?.key ?? "none"} target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
