// People tab (DESIGN-v5 §3): Decide (rings, friends inside) · Family (outline) · Addresses, sticky room check. v17 top row: views · To review (deck) · Add · More (name fixes, export, history).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildRings } from "../../people/rings";
import { tierCtx } from "../../people/tier";
import { useData } from "../data";
import { Card, EmptyState, Segmented } from "../kit/kit";
import { useNav } from "../nav";
import type { PeopleView } from "../prefs";
import { usePrefs } from "../usePrefs";
import { useActions } from "./actions";
import { AddressesView } from "./AddressesView";
import { Decide } from "./Decide";
import { exportJson, exportXlsx } from "./exportFiles";
import { Family } from "./Family";
import { History } from "./History";
import { HouseholdCard, type CardTarget } from "./HouseholdCard";
import { HouseholdPicker } from "./HouseholdPicker";
import { QuickAddFriend } from "./QuickAddFriend";
import { ReviewDeck } from "./ReviewDeck";
import { buildDeck, type DeckItem } from "./reviewModel";
import { TidySheet } from "./TidyUp";
import { Menu } from "./Menu";
import { relationFinder, relationSummary, tidyItems } from "./model";
import { PersonSheet, type SheetRequest, type SheetTarget } from "./PersonSheet";
import { RelativeSheet, type RelativeTarget } from "./RelativeSheet";
import type { RelKind } from "../../people/relatives";
import { RoomCheck, useRoom } from "./RoomCheck";
import "./people.css";

const VIEWS: { value: PeopleView; label: string }[] = [
  { value: "decide", label: "Decide" }, { value: "family", label: "Family" }, { value: "addresses", label: "Addresses" },
];

export function PeopleScreen() {
  const { offline, people, invite, status, version, addresses } = useData();
  const { prefs, set } = usePrefs();
  const { focus, clearFocus } = useNav();
  const act = useActions();
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [hh, setHh] = useState<CardTarget | null>(null);
  const [picking, setPicking] = useState(false);
  const [relT, setRelT] = useState<RelativeTarget | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [quick, setQuick] = useState(false);
  const [tidyOpen, setTidyOpen] = useState(false);
  const [deck, setDeck] = useState<DeckItem[] | null>(null);
  const [note, setNote] = useState("");
  const seq = useRef(0);
  const open = useCallback((t: SheetRequest) => setTarget({ ...t, key: String(++seq.current) } as SheetTarget), []);
  // v8: one household card for households and their people
  const openCard = useCallback((t: Omit<CardTarget, "key">) => { setTarget(null); setHh({ ...t, key: String(++seq.current) }); }, []);
  const openHousehold = useCallback((id: string) => openCard({ partyId: id }), [openCard]);
  // the deck opens a household card; "address" scrolls it to the mailing address section
  const openFromDeck = useCallback((id: string, section?: "address") => {
    openCard({ partyId: id });
    if (section) setTimeout(() => document.querySelector(".k-sheet .pp-addr")?.scrollIntoView({ block: "start" }), 80);
  }, [openCard]);
  // the relative sheet replaces any open person / household sheet
  const openRelative = useCallback((of: string, rel: RelKind) => { setTarget(null); setHh(null); setRelT({ of, rel, key: String(++seq.current) }); }, []);
  const tc = useMemo(() => tierCtx(people), [people]);
  const rings = useMemo(() => buildRings(people, invite, tc), [people, invite, tc]);
  const rel = useMemo(() => relationFinder(people.people), [people.people]);
  const relOfRow = useCallback((r: Parameters<typeof relationSummary>[0]) => relationSummary(r, rel), [rel]);
  const relOfId = useCallback((id: string) => { const p = people.people.find((x) => x.id === id); return p ? rel(p) : ""; }, [people.people, rel]);
  const tidy = useMemo(() => tidyItems(people, rings), [people, rings]);
  const room = useRoom(rings);
  const deckItems = useMemo(() => buildDeck({ data: people, rings, addresses, ctx: invite }), [people, rings, addresses, invite]);
  const nameFixes = tidy.names.length + tidy.unplaced + tidy.lastNames;
  const view: PeopleView = prefs.peopleView ?? "decide";
  const section = view;
  // row versions in the sheet keys: a reload / other-device change / Undo resets the drafts
  const vsum = (ids: (string | undefined)[], table: "people" | "parties") => ids.map((i) => (i ? version(table, i) ?? 0 : 0)).join(".");
  const hhVer = hh?.partyId ? `${vsum([hh.partyId], "parties")}:${vsum(people.people.filter((p) => p.party_id === hh.partyId).map((p) => p.id), "people")}` : "";
  const personVer = target?.mode === "edit" ? vsum([target.id], "people") : "";
  const relVer = relT ? vsum([relT.of], "people") : "";

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
        <div className="pp-views"><Segmented<PeopleView> label="People view" options={VIEWS.map((v) => ({ ...v, tone: "euc" as const }))} value={section} onChange={(v) => set({ peopleView: v })} /></div>
        <div className="pp-adds">
          {deckItems.length > 0 && <button type="button" className="k-btn k-btn-primary pp-review" onClick={() => setDeck(deckItems)}>To review ({deckItems.length})</button>}
          <Menu label="Add" trigger={<>Add <span aria-hidden="true">▾</span></>} align="right" items={[
            { key: "h", label: "New household (family)…", onSelect: () => openCard({ partyId: null, kind: "family", side: "Mark" }) },
            { key: "f", label: "New household (friends)…", onSelect: () => openCard({ partyId: null, kind: "friend", side: "Both" }) },
            { key: "q", label: "Quick-add a friend…", onSelect: () => setQuick(true) },
            { key: "p", label: "Someone to an existing household…", onSelect: () => setPicking(true) },
          ]} />
          <Menu label="More" trigger={<>⋯ More</>} align="right" items={[
            ...(nameFixes > 0 ? [{ key: "h-t", heading: "Tidy" }, { key: "tidy", label: `Name fixes and tree · ${nameFixes}`, onSelect: () => setTidyOpen(true) }] : []),
            { key: "h-x", heading: "Export" },
            { key: "j", label: "JSON backup", onSelect: () => setNote(exportJson(people)) },
            { key: "x", label: "Spreadsheet (.xlsx)", onSelect: () => { setNote("Building spreadsheet…"); void exportXlsx(people, invite).then(setNote); } },
            { key: "h-h", heading: "Changes" },
            { key: "hist", label: showHistory ? "Hide history" : "History", onSelect: () => setShowHistory((x) => !x) },
          ]} />
        </div>
      </div>
      {note && <p className="small" role="status">{note}</p>}
      <RoomCheck room={room} act={act} />
      {showHistory && <History />}
      {section === "decide" && <Decide rings={rings} room={room} rel={relOfRow} act={act} onHousehold={openHousehold} onPerson={editPerson} />}
      {section === "addresses" && <AddressesView onHousehold={openHousehold} />}
      {section === "family" && <Family rel={rel} act={act} onHousehold={openHousehold} onPerson={editPerson} onRelative={openRelative} />}
      {quick && <QuickAddFriend rings={rings} onClose={() => setQuick(false)} />}
      {tidyOpen && <TidySheet tidy={tidy} people={people} act={act} onClose={() => setTidyOpen(false)} onFamily={() => set({ peopleView: "family" })} />}
      {deck && <ReviewDeck initial={deck} rings={rings} room={room} rel={relOfRow} act={act} paused={!!hh || !!target || !!relT || picking || quick} onHousehold={openFromDeck} onPerson={editPerson} onClose={() => setDeck(null)} />}
      {hh && <HouseholdCard key={`h${hh.key}:${hhVer}`} target={hh} tc={tc} relation={relOfId} onClose={() => setHh(null)} onOpen={(id, f) => openCard({ partyId: id, focus: f })} onRelative={openRelative} />}
      {picking && <HouseholdPicker onClose={() => setPicking(false)} onPick={(id) => { setPicking(false); openCard({ partyId: id, addNew: true }); }} onNew={() => { setPicking(false); openCard({ partyId: null }); }} />}
      <PersonSheet key={`${target?.key ?? "none"}:${personVer}`} target={target} onClose={() => setTarget(null)} rel={rel} onRelative={openRelative} />
      <RelativeSheet key={`${relT?.key ?? "r-none"}:${relVer}`} target={relT} onClose={() => setRelT(null)} />
    </div>
  );
}
