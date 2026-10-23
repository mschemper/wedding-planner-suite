// People tab (DESIGN-v5 §3): Decide (rings) · Family (outline) · Friends (shortlist), sticky room check, Add + Export menus, History.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildRings } from "../../people/rings";
import { tierCtx } from "../../people/tier";
import { useData } from "../data";
import { Button, Card, EmptyState, Segmented } from "../kit/kit";
import { useNav } from "../nav";
import type { PeopleView } from "../prefs";
import { usePrefs } from "../usePrefs";
import { useActions } from "./actions";
import { Decide } from "./Decide";
import { exportJson, exportXlsx } from "./exportFiles";
import { Family } from "./Family";
import { Friends } from "./Friends";
import { History } from "./History";
import { HouseholdSheet, type HouseholdTarget } from "./HouseholdSheet";
import { Menu } from "./Menu";
import { relationFinder, relationSummary } from "./model";
import { PersonSheet, type SheetRequest, type SheetTarget } from "./PersonSheet";
import { RelativeSheet, type RelativeTarget } from "./RelativeSheet";
import type { RelKind } from "../../people/relatives";
import { RoomCheck, useRoom } from "./RoomCheck";
import "./people.css";

const VIEWS: { value: PeopleView; label: string }[] = [
  { value: "decide", label: "Decide" }, { value: "family", label: "Family" }, { value: "friends", label: "Friends" },
];

export function PeopleScreen() {
  const { offline, people, invite, status } = useData();
  const { prefs, set } = usePrefs();
  const { focus, clearFocus } = useNav();
  const act = useActions();
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [hh, setHh] = useState<HouseholdTarget | null>(null);
  const [relT, setRelT] = useState<RelativeTarget | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [note, setNote] = useState("");
  const seq = useRef(0);
  const open = useCallback((t: SheetRequest) => setTarget({ ...t, key: String(++seq.current) } as SheetTarget), []);
  const openHousehold = useCallback((id: string) => setHh({ id, key: String(++seq.current) }), []);
  // the relative sheet replaces any open person / household sheet
  const openRelative = useCallback((of: string, rel: RelKind) => { setTarget(null); setHh(null); setRelT({ of, rel, key: String(++seq.current) }); }, []);
  const tc = useMemo(() => tierCtx(people), [people]);
  const rings = useMemo(() => buildRings(people, invite, tc), [people, invite, tc]);
  const rel = useMemo(() => relationFinder(people.people), [people.people]);
  const relOfRow = useCallback((r: Parameters<typeof relationSummary>[0]) => relationSummary(r, rel), [rel]);
  const relOfId = useCallback((id: string) => { const p = people.people.find((x) => x.id === id); return p ? rel(p) : ""; }, [people.people, rel]);
  const room = useRoom(rings);
  const view: PeopleView = prefs.peopleView ?? "decide";

  useEffect(() => {
    if (!focus.person) return;
    if (people.people.some((p) => p.id === focus.person)) { open({ mode: "edit", id: focus.person }); clearFocus(); }
    else if (status === "ready") clearFocus();
  }, [focus.person, people.people, status, open, clearFocus]);

  if (offline) return <Card title="People"><EmptyState>Guest decisions live in the online planner.</EmptyState></Card>;

  const editPerson = (id: string, f?: "parents") => open({ mode: "edit", id, focus: f });
  const addToHousehold = (partyId: string) => {
    const m = people.people.find((p) => p.party_id === partyId);
    open({ mode: "new", defaults: { party_id: partyId, side: m?.side, kind: m?.kind === "friend" ? "friend" : "family", branch: m?.branch, circle: m?.circle }, party: "" });
  };

  return (
    <div className="pp-screen">
      <div className="pp-top">
        <div className="pp-views"><Segmented<PeopleView> label="People view" options={VIEWS.map((v) => ({ ...v, tone: "euc" as const }))} value={view} onChange={(v) => set({ peopleView: v })} /></div>
        <div className="pp-adds">
          <Menu label="Add" trigger={<>Add <span aria-hidden="true">▾</span></>} align="right" items={[
            { key: "p", label: "Person", onSelect: () => open({ mode: "new", defaults: {}, party: "" }) },
            { key: "h", label: "Household", onSelect: () => open({ mode: "new", defaults: {}, party: "new" }) },
            { key: "f", label: "Friend", onSelect: () => open({ mode: "new", defaults: { kind: "friend" }, party: "new" }) },
          ]} />
          <Menu label="Export" trigger={<>Export <span aria-hidden="true">▾</span></>} align="right" items={[
            { key: "j", label: "JSON backup", onSelect: () => setNote(exportJson(people)) },
            { key: "x", label: "Spreadsheet (.xlsx)", onSelect: () => { setNote("Building spreadsheet…"); void exportXlsx(people, invite).then(setNote); } },
          ]} />
          <Button kind="quiet" onClick={() => setShowHistory((s) => !s)}>{showHistory ? "Hide history" : "History"}</Button>
        </div>
      </div>
      {note && <p className="small" role="status">{note}</p>}
      <RoomCheck room={room} act={act} />
      {showHistory && <History />}
      {view === "decide" && <Decide rings={rings} room={room} rel={relOfRow} act={act} onHousehold={openHousehold} onPerson={editPerson} />}
      {view === "family" && <Family rel={rel} act={act} onHousehold={openHousehold} onPerson={editPerson} onRelative={openRelative} />}
      {view === "friends" && <Friends rings={rings} act={act} onHousehold={openHousehold} />}
      <HouseholdSheet key={hh ? `h${hh.key}` : "h-none"} target={hh} tc={tc} relation={relOfId} onClose={() => setHh(null)} onPerson={editPerson} onAddPerson={addToHousehold} onRelative={openRelative} />
      <PersonSheet key={target?.key ?? "none"} target={target} onClose={() => setTarget(null)} rel={rel} onRelative={openRelative} />
      <RelativeSheet key={relT?.key ?? "r-none"} target={relT} onClose={() => setRelT(null)} />
    </div>
  );
}
