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
import { HouseholdCard, type CardTarget } from "./HouseholdCard";
import { HouseholdPicker } from "./HouseholdPicker";
import { NameTidy } from "./NameTidy";
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
  const [hh, setHh] = useState<CardTarget | null>(null);
  const [picking, setPicking] = useState(false);
  const [relT, setRelT] = useState<RelativeTarget | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [note, setNote] = useState("");
  const seq = useRef(0);
  const open = useCallback((t: SheetRequest) => setTarget({ ...t, key: String(++seq.current) } as SheetTarget), []);
  // v8: one household card for households and their people
  const openCard = useCallback((t: Omit<CardTarget, "key">) => { setTarget(null); setHh({ ...t, key: String(++seq.current) }); }, []);
  const openHousehold = useCallback((id: string) => openCard({ partyId: id }), [openCard]);
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
    const p = people.people.find((x) => x.id === focus.person);
    if (p) { if (p.party_id) openCard({ partyId: p.party_id, focus: p.id }); else open({ mode: "edit", id: p.id }); clearFocus(); }
    else if (status === "ready") clearFocus();
  }, [focus.person, people.people, status, open, openCard, clearFocus]);

  if (offline) return <Card title="People"><EmptyState>Guest decisions live in the online planner.</EmptyState></Card>;

  // a person opens their household card (the couple and tree-only rows keep the small person sheet)
  const editPerson = (id: string, f?: "parents") => {
    const p = people.people.find((x) => x.id === id);
    if (p?.party_id) openCard({ partyId: p.party_id, focus: id });
    else open({ mode: "edit", id, focus: f });
  };

  return (
    <div className="pp-screen">
      <div className="pp-top">
        <div className="pp-views"><Segmented<PeopleView> label="People view" options={VIEWS.map((v) => ({ ...v, tone: "euc" as const }))} value={view} onChange={(v) => set({ peopleView: v })} /></div>
        <div className="pp-adds">
          <Menu label="Add" trigger={<>Add <span aria-hidden="true">▾</span></>} align="right" items={[
            { key: "h", label: "New household (family)…", onSelect: () => openCard({ partyId: null, kind: "family", side: "Mark" }) },
            { key: "f", label: "New household (friends)…", onSelect: () => openCard({ partyId: null, kind: "friend", side: "Both" }) },
            { key: "p", label: "Someone to an existing household…", onSelect: () => setPicking(true) },
          ]} />
          <Menu label="Export" trigger={<>Export <span aria-hidden="true">▾</span></>} align="right" items={[
            { key: "j", label: "JSON backup", onSelect: () => setNote(exportJson(people)) },
            { key: "x", label: "Spreadsheet (.xlsx)", onSelect: () => { setNote("Building spreadsheet…"); void exportXlsx(people, invite).then(setNote); } },
          ]} />
          <Button kind="quiet" onClick={() => setShowHistory((s) => !s)}>{showHistory ? "Hide history" : "History"}</Button>
        </div>
      </div>
      {note && <p className="small" role="status">{note}</p>}
      <NameTidy />
      <RoomCheck room={room} act={act} />
      {showHistory && <History />}
      {view === "decide" && <Decide rings={rings} room={room} rel={relOfRow} act={act} onHousehold={openHousehold} onPerson={editPerson} />}
      {view === "family" && <Family rel={rel} act={act} onHousehold={openHousehold} onPerson={editPerson} onRelative={openRelative} />}
      {view === "friends" && <Friends rings={rings} act={act} onHousehold={openHousehold} />}
      {hh && <HouseholdCard key={`h${hh.key}`} target={hh} tc={tc} relation={relOfId} onClose={() => setHh(null)} onOpen={(id, f) => openCard({ partyId: id, focus: f })} onRelative={openRelative} />}
      {picking && <HouseholdPicker onClose={() => setPicking(false)} onPick={(id) => { setPicking(false); openCard({ partyId: id, addNew: true }); }} onNew={() => { setPicking(false); openCard({ partyId: null }); }} />}
      <PersonSheet key={target?.key ?? "none"} target={target} onClose={() => setTarget(null)} rel={rel} onRelative={openRelative} />
      <RelativeSheet key={relT?.key ?? "r-none"} target={relT} onClose={() => setRelT(null)} />
    </div>
  );
}
