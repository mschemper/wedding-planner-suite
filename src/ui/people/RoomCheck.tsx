// Room check (DESIGN-v5 §3 D): sticky strip. Venue, stacked bar (in / if room / undecided) with the cap line, counts, ≈ cost, kids setting.
import { useMemo } from "react";
import type { Scenario } from "../../engine/types";
import { fillPoint, type Ring } from "../../people/rings";
import { KIDS_POLICIES, type KidsPolicy } from "../../people/types";
import { useCompare } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { usePrefs } from "../usePrefs";
import type { Actions } from "./actions";
import { Menu } from "./Menu";
import { capacityScenarios, pickVenue, POLICY_LABEL, roomCheck, type RoomCheck as Check } from "./model";

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

export function RoomCheck({ room, act }: { room: Room; act: Actions }) {
  const { settings } = useData();
  const { sel, check: c, list } = room;
  if (!sel || !c) return null;
  const pct = (n: number) => `${(n / c.scale) * 100}%`;
  const total = c.invited + c.ifroom + c.undecided;
  const summary = `${c.invited} invited, ${c.ifroom} if room, ${c.undecided} undecided, of ${c.cap} seats`;
  return (
    <section className="pp-room" aria-label="Room check">
      <label className="pp-venue"><span className="sr-only">Venue for the room check</span>
        <select value={sel.id} onChange={(e) => room.setVenue(Number(e.target.value))}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </label>
      <div className="pp-bar" role="img" aria-label={summary}>
        <i className="pp-seg in" style={{ width: pct(c.invited) }} />
        <i className="pp-seg ifroom" style={{ width: pct(c.ifroom) }} />
        <i className="pp-seg und" style={{ width: pct(c.undecided) }} />
        <span className="pp-capline" style={{ left: `calc(${pct(c.cap)} - 2px)` }} title={`${sel.name} seats ${c.cap}`} />
      </div>
      <p className="pp-legend">
        <b>{c.invited} in</b>
        <span className="pp-opt"> · {c.ifroom} if room</span> · {c.undecided} undecided
        {c.kidsUp > 0 && <span className="pp-opt"> · {c.kidsUp} kids upstairs</span>}
        <span className="pp-cap-text"> · seats {c.cap}{c.over > 0 ? ` · over by ${c.over}` : total > c.cap ? ` · ${total - c.cap} over if all come` : ""}</span>
      </p>
      <b className="pp-cost" title="Budget at the venue for the guest basis chosen on Venues">{room.cost === undefined ? "" : room.cost === null ? "awaiting rates" : `≈ ${money(room.cost)}`}</b>
      <Menu label="Kids setting" align="right" triggerClass="pp-kidsbtn"
        trigger={<>Kids: {POLICY_LABEL[settings.kidsPolicy]} <span aria-hidden="true">▾</span></>}
        items={[
          { key: "h", heading: "Which kids come (each household can override)" },
          ...KIDS_POLICIES.map((v: KidsPolicy) => ({ key: v, label: POLICY_LABEL[v], checked: settings.kidsPolicy === v, onSelect: () => act.policy(v) })),
        ]} />
    </section>
  );
}
