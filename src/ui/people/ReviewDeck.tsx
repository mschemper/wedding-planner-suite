// "To review" deck (v17): one card per outstanding item, swipe or tap a button. Replaces the one-by-one walk.
// Swipe right / left / up = the card's three choices (reviewModel CHOICES). Buttons and keys are the accessible route: arrows, 1/2/3, S skip, Esc close.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { namesLine, type Ring, type RingRow } from "../../people/rings";
import { householdCost } from "../../plan/venueSummary";
import { useCompare } from "../compare";
import { useData, type SaveResult } from "../data";
import { Button } from "../kit/kit";
import { SaveError } from "../SaveError";
import { usePrefs } from "../usePrefs";
import type { Actions } from "./actions";
import { DecisionMark } from "./DecisionControl";
import { costText, householdLocal, seatsLeftAfter, seatsText } from "./model";
import type { Room } from "./RoomCheck";
import {
  CHOICES, choiceByKey, choiceFor, decidePatches, deckCounts, isResolved, QUESTION, swipeDir, TYPE_LABEL, TYPE_ORDER,
  type Choice, type DeckItem, type Dir,
} from "./reviewModel";

const ZERO = { dx: 0, dy: 0 };
const SHOW_AT = 40;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const exitStyle = (d: Dir) => (d === "up" ? "translate(0, -120%)" : `translate(${d === "right" ? 130 : -130}%, 0) rotate(${d === "right" ? 14 : -14}deg)`);

export function ReviewDeck({ initial, rings, room, rel, act, paused, onHousehold, onPerson, onClose }: {
  initial: DeckItem[]; rings: Ring[]; room: Room; rel: (r: RingRow) => string; act: Actions;
  /** a household / person card is open on top: ignore keys */
  paused: boolean;
  onHousehold(id: string, section?: "address"): void; onPerson(id: string): void; onClose(): void;
}) {
  const { people, addresses, quotes, edit, notifyFailure } = useData();
  const { prefs } = usePrefs();
  const cmp = useCompare();
  const [items, setItems] = useState(initial);
  const [i, setI] = useState(0);
  const [log, setLog] = useState<Record<string, "done" | "skipped">>({});
  const [saving, setSaving] = useState(false);
  const [exit, setExit] = useState<Dir | null>(null);
  const [drag, setDrag] = useState(ZERO);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const dragRef = useRef(ZERO);
  const gesture = useRef<{ id: number; x: number; y: number; axis: "" | "x" | "y" } | null>(null);
  const noClick = useRef(false);
  const face = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const unpausedAt = useRef(0);
  useEffect(() => { if (!paused) unpausedAt.current = Date.now(); }, [paused]);
  useEffect(() => { rootRef.current?.focus(); }, []);

  const rows = useMemo(() => new Map(rings.flatMap((r) => r.rows.map((x) => [x.party.id, x] as [string, RingRow]))), [rings]);
  const item: DeckItem | undefined = items[i];
  const party = item?.partyId ? people.parties.find((p) => p.id === item.partyId) : undefined;
  const row = item?.partyId ? rows.get(item.partyId) : undefined;
  const person = item?.personId ? people.people.find((p) => p.id === item.personId) : undefined;
  const resolved = item ? isResolved(item, people, addresses) : false;

  const openFor = (it: DeckItem, addr = false) => {
    if (it.type === "lastname" && it.personId) onPerson(it.personId);
    else if (it.partyId) onHousehold(it.partyId, addr ? "address" : undefined);
  };

  // advance only after the save resolved ok; on failure the card springs back and the toast says why
  const perform = async (c: Choice) => {
    if (!item || saving) return;
    const a = c.action;
    if (a.kind === "open") { openFor(item, item.type === "address"); setDrag(ZERO); return; }
    setSaving(true);
    let ok = true;
    if (a.kind === "decide" && party) {
      const e = decidePatches(party, a.value, a.clearTalk);
      if (e.patches.length) {
        const r = await edit(e.patches, e.label);
        ok = r.ok;
        if (!r.ok) notifyFailure(r.message);
        setErr(r.ok ? null : r);
      }
    } else if (a.kind === "local" && party) ok = await act.bulk([party], { kind: "local", value: a.value });
    if (ok) {
      if (!reduced()) { setExit(c.dir); await sleep(180); }
      setLog((l) => ({ ...l, [item.key]: a.kind === "skip" && !resolved ? "skipped" : "done" }));
      setExit(null); setDrag(ZERO); setI((n) => n + 1);
    } else setDrag(ZERO);
    setSaving(false);
  };
  const dirChoice = (d: Dir) => choiceFor(item!.type, d, resolved);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (paused || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "Escape") { if (Date.now() - unpausedAt.current > 300) onClose(); return; }
      if (!item) return;
      const arrow: Record<string, Dir> = { ArrowRight: "right", ArrowLeft: "left", ArrowUp: "up" };
      const c = arrow[e.key] ? dirChoice(arrow[e.key]) : choiceByKey(item.type, e.key, resolved) ?? (e.key === "s" || e.key === "S" ? choiceFor(item.type, "up", true) : undefined);
      if (c) { e.preventDefault(); void perform(c); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- swipe (pointer events; the card sets touch-action none so an upward drag reaches us) ----
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (saving || paused || e.button > 0 || (e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: "" };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      g.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      face.current?.setPointerCapture?.(e.pointerId);
      setDragging(true);
    }
    const d = g.axis === "x" ? { dx, dy: 0 } : { dx: 0, dy: Math.min(0, dy) };
    dragRef.current = d; setDrag(d);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (!g.axis) return;
    noClick.current = true; setTimeout(() => { noClick.current = false; }, 0);
    setDragging(false);
    const r = face.current?.getBoundingClientRect();
    const dir = !cancelled && r ? swipeDir(dragRef.current.dx, dragRef.current.dy, r.width, r.height) : null;
    if (dir && item) void perform(dirChoice(dir)); else setDrag(ZERO);
  };

  // ---- render ----
  const total = items.length;
  const counts = useMemo(() => deckCounts(items), [items]);
  const { sel, check } = room;
  const add = row && sel && item?.type === "undecided" ? householdCost(sel, { quotes, date: cmp.date, contingency: prefs.contingency }, cmp.guests, row.seats.heads) : null;
  const left = row && check && item?.type === "undecided" ? seatsLeftAfter(check, row, room.kidsRoom) : null;
  const typePos = item ? items.slice(0, i + 1).filter((x) => x.type === item.type).length : 0;
  const mag = Math.max(Math.abs(drag.dx), Math.abs(drag.dy));
  const swipeDirNow: Dir | null = mag < SHOW_AT ? null : drag.dy < 0 && drag.dx === 0 ? "up" : drag.dx > 0 ? "right" : drag.dx < 0 ? "left" : null;
  const overlay = item && swipeDirNow ? dirChoice(swipeDirNow) : null;
  const style = exit ? { transform: exitStyle(exit), transition: "transform .18s ease-in" } : {
    transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)`, transition: dragging ? "none" : "transform .18s ease-out",
  };
  const choices = item && !resolved ? CHOICES[item.type] : [];
  const who = item?.type === "lastname" && person ? `${person.nick || person.first}${party ? ` (${party.name})` : ""}` : row ? namesLine(row) : party?.name ?? "";
  const loc = row ? householdLocal(row) : null;
  const side = row?.friend ? "Friends" : row?.members.find((m) => !m.placeholder)?.side;

  const skipped = items.filter((x) => log[x.key] === "skipped");
  const summary = TYPE_ORDER.filter((t) => counts[t] > 0).map((t) => {
    const mine = items.filter((x) => x.type === t);
    return { t, done: mine.filter((x) => log[x.key] === "done").length, skipped: mine.filter((x) => log[x.key] === "skipped").length };
  });

  return (
    <div className="pp-deck" role="dialog" aria-modal="true" aria-labelledby="pp-deck-h" tabIndex={-1} ref={rootRef}>
      <div className="pp-deck-in">
        <div className="pp-deck-head">
          <h2 id="pp-deck-h">To review</h2>
          <button type="button" className="k-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <SaveError result={err ?? act.error} onDismiss={() => { setErr(null); act.clearError(); }} />
        {item ? (
          <>
            <p className="pp-deck-progress" role="status">{i + 1} of {total} · {TYPE_LABEL[item.type]} {typePos} of {counts[item.type]}</p>
            <div className="pp-bar" role="progressbar" aria-label="Review progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i}><span className="pp-bar-fill" style={{ width: `${Math.round((i / total) * 100)}%` }} /></div>
            <div className="pp-deck-stage">
              <div key={item.key} ref={face} className="pp-deck-card" style={style}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={(e) => onUp(e, false)} onPointerCancel={(e) => onUp(e, true)}
                onClick={(e) => { if (noClick.current || (e.target as HTMLElement).closest("button")) return; openFor(item); }}>
                {overlay && <span className={`pp-deck-stamp pp-deck-stamp-${swipeDirNow}`} aria-hidden="true" style={{ opacity: Math.min(1, mag / 120) }}>{overlay.overlay}</span>}
                <span className="pp-deck-type">{TYPE_LABEL[item.type]}</span>
                <h3 className="pp-deck-ask">{resolved ? (item.type === "undecided" ? "Decided." : "Done.") : QUESTION[item.type]}</h3>
                <p className="pp-deck-name">{who}</p>
                {row && rel(row) && <p className="pp-obo-rel">{rel(row)}</p>}
                {party?.talk && party.talk_note && <p className="pp-obo-rel">Note: {party.talk_note}</p>}
                <dl className="pp-obo-facts">
                  {row && <div><dt>Side</dt><dd>{side}</dd></div>}
                  {row && <div><dt>Where they live</dt><dd>{loc === "local" ? "Local" : loc === "away" ? "Out of town" : "Not set"}</dd></div>}
                  {row && <div><dt>Seats</dt><dd>{seatsText(row)}</dd></div>}
                  {sel && add !== null && <div><dt>Adds to the budget</dt><dd>{costText(add)}</dd></div>}
                  {sel && left != null && <div><dt>Seats left at {sel.name}</dt><dd>{left >= 0 ? `${left} after them` : `over by ${-left} with them`}</dd></div>}
                  {party && item.type !== "undecided" && <div><dt>Decision</dt><dd>{party.invite === "undecided" ? "Undecided" : party.invite === "invite" ? "Invite" : party.invite === "ifroom" ? "If room" : "No"}</dd></div>}
                </dl>
                <p className="pp-deck-hint">Swipe, or use the buttons. Tap the card for details.</p>
                <button type="button" className="k-btn pp-deck-details" onClick={() => openFor(item)}>Details</button>
              </div>
            </div>
            <div className="pp-deck-btns" role="group" aria-label={QUESTION[item.type]}>
              {resolved ? (
                <button type="button" className="k-btn k-btn-primary pp-obo-btn" disabled={saving} onClick={() => void perform(choiceFor(item.type, "up", true))}><span aria-hidden="true">→</span> Next <kbd>S</kbd></button>
              ) : choices.map((c, n) => (
                <button key={c.key} type="button" className={`k-btn pp-obo-btn${n === 0 ? " k-btn-primary" : ""}`} disabled={saving} onClick={() => void perform(c)}>
                  {c.decision ? <DecisionMark state={c.decision} /> : <span aria-hidden="true">{c.icon}</span>} {c.label} <kbd>{c.key}</kbd>
                </button>
              ))}
            </div>
            <div className="pp-deck-foot">
              <Button onClick={() => { setExit(null); setDrag(ZERO); setI((n) => Math.max(0, n - 1)); }} disabled={i === 0 || saving}>Back</Button>
              {!resolved && <Button onClick={() => void perform(choiceFor(item.type, "up", true))} disabled={saving}>Skip <kbd>S</kbd></Button>}
            </div>
          </>
        ) : (
          <div className="pp-obo-done" role="status">
            <h3>{total === 0 ? "Nothing to review." : skipped.length ? `Done. ${skipped.length} skipped.` : "Done. All reviewed."}</h3>
            <ul className="pp-deck-sum">
              {summary.map((s) => <li key={s.t}>{TYPE_LABEL[s.t]}: {s.done} done{s.skipped ? `, ${s.skipped} skipped` : ""}</li>)}
            </ul>
            <Button kind="primary" onClick={onClose}>Done</Button>
            {skipped.length > 0 && <Button onClick={() => { setItems(skipped); setLog({}); setI(0); }}>Review the {skipped.length} skipped</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
