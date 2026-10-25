// Room check (DESIGN-v5 §3 D): sticky strip. Venue, stacked bar (in / if room / undecided) with the cap line, counts, ≈ cost, kids setting.
// v9: under 640px it collapses to one line ("11 in · 4 undecided · 82 seats") that expands to the full strip.
import { useId, useMemo, useState } from "react";
import type { Scenario } from "../../engine/types";
import { fillPoint, type Ring } from "../../people/rings";
import { KIDS_POLICIES, type KidsPolicy } from "../../people/types";
import { useCompare } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { usePrefs } from "../usePrefs";
import type { Actions } from "./actions";
import { Menu } from "./Menu";
import { capacityScenarios, pickVenue, POLICY_LABEL, roomCheck, roomLine, type RoomCheck as Check } from "./model";

export interface Room {
  list: Scenario[];
  sel: Scenario | undefined;
  check: Check | null;
  fill: ReturnType<typeof fillPoint> | null;
  kidsRoom: boolean;
  /** undefined = no venue; null = unpriced */
  cost: number | null | undefined;
  setVenue(id: number): void;
}

export function useRoom(rings: Ring[]): Room {
  const { scenarios, venues } = useData();
  const { prefs, set } = usePrefs();
  const cmp = useCompare();
  const list = useMemo(() => capacityScenarios(scenarios, venues), [scenarios, venues]);
  const sel = pickVenue(list, prefs.capacityVenue);
  const cap = sel?.capacity?.hardMax ?? 0;
  const kidsRoom = !!sel?.kidsRoom;
  const check = useMemo(() => (sel && cap ? roomCheck(rings, cap, kidsRoom) : null), [rings, sel, cap, kidsRoom]);
  const fill = useMemo(() => (sel && cap ? fillPoint(rings, cap, kidsRoom) : null), [rings, sel, cap, kidsRoom]);
  const summary = sel ? [...cmp.active, ...cmp.archive].find((s) => s.scenario.id === sel.id) : undefined;
  const cost = !sel ? undefined : summary?.priced && summary.budget && !summary.budget.unavailable ? summary.budget.total : null;
  return { list, sel, check, fill, kidsRoom, cost, setVenue: (id) => set({ capacityVenue: id }) };
}

const KIDS_SHORT: Record<KidsPolicy, string> = { ours: "ours only", family: "family", all: "all" };

export function RoomCheck({ room, act }: { room: Room; act: Actions }) {
  const { settings } = useData();
  const { sel, check: c, list } = room;
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  if (!sel || !c) return null;
  const pct = (n: number) => `${(n / c.scale) * 100}%`;
  const total = c.invited + c.ifroom + c.undecided;
  const kidsCap = room.kidsRoom ? sel.capacity?.kids ?? null : null;
  const who = room.kidsRoom ? "adults" : "guests";
  const summary = `${c.invited} ${who} invited, ${c.ifroom} if room, ${c.undecided} undecided, of ${c.cap} seats`;
  return (
    <section className="pp-room" aria-label="Room check">
      <button type="button" className={`pp-room-slim${c.over > 0 ? " is-over" : ""}`} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <span>{roomLine(c)}</span><span aria-hidden="true" className="pp-room-caret">{open ? "▴" : "▾"}</span>
      </button>
      <div className={`pp-room-body${open ? " is-open" : ""}`} id={bodyId}>
      <label className="pp-venue"><span className="sr-only">Venue for the room check</span>
        <select value={sel.id} onChange={(e) => room.setVenue(Number(e.target.value))}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </label>
      <div className="pp-bar" role="img" aria-label={summary}>
        <i className="pp-seg in" style={{ width: pct(c.invited) }} />
        <i className="pp-seg ifroom" style={{ width: pct(c.ifroom) }} />
        <i className="pp-seg und" style={{ width: pct(c.undecided) }} />
        <span className="pp-capline" style={{ left: `calc(${pct(c.cap)} - 2px)` }} title={`${sel.name} seats ${c.cap}`} />
      </div>
      {/* v10 (R5): a key under the meter instead of one long sentence; swatches repeat the bar's fills (shape, not colour alone) */}
      <ul className="pp-legend pp-key" aria-label="Room check key">
        <li><i className="pp-sw in" aria-hidden="true" /><b>{c.invited}</b> in</li>
        <li><i className="pp-sw ifroom" aria-hidden="true" />{c.ifroom} if room</li>
        <li><i className="pp-sw und" aria-hidden="true" />{c.undecided} undecided</li>
        <li className={c.over > 0 || total > c.cap ? "pp-key-over" : "pp-cap-text"}>
          <i className="pp-sw cap" aria-hidden="true" />{c.cap} {who} seated{c.over > 0 ? ` · over by ${c.over}` : total > c.cap ? ` · ${total - c.cap} over if all come` : ""}
        </li>
        {room.kidsRoom && (
          <li className={`pp-kidsline${kidsCap != null && c.kidsUp > kidsCap ? " is-over" : ""}`}>
            kids {c.kidsUp}{kidsCap != null ? ` of ${kidsCap}` : ""} upstairs{kidsCap != null && c.kidsUp > kidsCap ? ` (over by ${c.kidsUp - kidsCap})` : ""}
          </li>
        )}
      </ul>
      <span className="pp-cost" title="Budget at the venue for the guest basis chosen on Venues">
        {room.cost === undefined ? "" : room.cost === null ? "awaiting rates" : <><b>≈ {money(room.cost)}</b><small>at {sel.name}</small></>}
      </span>
      <Menu label="Kids setting" align="right" triggerClass="pp-kidsbtn"
        title={`Kids: ${POLICY_LABEL[settings.kidsPolicy]}`} trigger={<>Kids: {KIDS_SHORT[settings.kidsPolicy]} <span aria-hidden="true">▾</span></>}
        items={[
          { key: "h", heading: "Which kids come (each household can override)" },
          ...KIDS_POLICIES.map((v: KidsPolicy) => ({ key: v, label: POLICY_LABEL[v], checked: settings.kidsPolicy === v, onSelect: () => act.policy(v) })),
        ]} />
      </div>
    </section>
  );
}
