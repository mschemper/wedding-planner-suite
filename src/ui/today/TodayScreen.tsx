// Today (DESIGN-v4 §2, mockup docs/mockups/v4-garden.html): when, headcount, must-haves, next up, shortlist.
import { useMemo } from "react";
import { orderedMustHaves } from "../../plan/fit";
import { chicagoToday, nextUp } from "../../plan/tasks";
import type { VenueSummary } from "../../plan/venueSummary";
import { Sprig } from "../garden/motifs";
import { useCompare } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState, type ChipTone } from "../kit/kit";
import { useNav } from "../nav";
import { PLAN_SECTION_KEY } from "../plan/PlanScreen";
import { TaskRow } from "../plan/TaskRow";
import { fmtDay, shortVenueName } from "../plan/model";
import { capacityShort } from "../venues/model";
import { countdown } from "./model";
import "./today.css";

const STATUS_TONE: Record<string, ChipTone> = { held: "peony", booked: "euc", quoted: "gold", "tour booked": "sage", toured: "sage" };
const HUES = ["blush", "marigold", "sage", "peony"] as const;

function VenueTile({ v, i, onOpen }: { v: VenueSummary; i: number; onOpen(): void }) {
  const status = v.row?.status ?? "researching";
  const f = v.fit;
  const total = f.yes + f.partly + f.no + f.unknown;
  return (
    <button type="button" className="td-venue" onClick={onOpen} aria-label={`Open ${v.scenario.name}`}>
      <span className="td-venue-top"><Sprig hue={HUES[i % HUES.length]} /><Chip tone={STATUS_TONE[status] ?? "plain"}>{status}</Chip></span>
      <span className="td-venue-name">{v.scenario.name}</span>
      {v.priced && v.budget
        ? <span className="td-price">{money(v.budget.total)}</span>
        : <span className="td-price td-price-none">Awaiting rates</span>}
      <span className="td-venue-meta">
        {capacityShort(v)}
      </span>
      <span className="td-venue-meta">
        Fit {f.yes} of {total}{f.partly ? ` · ${f.partly} partly` : ""}{f.unknown ? ` · ${f.unknown} unknown` : ""}
      </span>
    </button>
  );
}

export function TodayScreen() {
  const { tasks, musthaves, venues, scenarios, headcount: hc, settings, offline, status } = useData();
  const { active } = useCompare();
  const { setTab, openVenue, openTask } = useNav();
  const today = chicagoToday();
  const cd = countdown(today, settings.dateWindows);
  const next = useMemo(() => nextUp(tasks, today, 5), [tasks, today]);
  const mh = useMemo(() => orderedMustHaves(musthaves), [musthaves]);
  const heldRow = settings.heldDate ? venues.find((v) => v.hold_date === settings.heldDate) : undefined;
  const heldName = heldRow ? scenarios.find((s) => s.id === heldRow.scenario_id)?.name : undefined;
  const inv = hc.invited;
  const decided = inv.heads > 0 || hc.ifroom.heads > 0 || hc.undecidedParties > 0;
  const allMustHaves = () => {
    try { sessionStorage.setItem(PLAN_SECTION_KEY, "musthaves"); } catch { /* storage unavailable */ }
    setTab("plan");
  };

  return (
    <div className="g-grid">
      <Card title="When" className="span-4">
        <div className="td-big">{cd.big}</div>
        <p className="td-muted">{cd.sub}</p>
        <p className="td-chips">
          {settings.heldDate && <Chip tone="peony">Held · {fmtDay(settings.heldDate, true)}{heldName ? ` · ${shortVenueName(heldName)}` : ""}</Chip>}
          {settings.dateWindows.map((w) => <Chip key={w.name} tone="plain" title={`${fmtDay(w.from)} to ${fmtDay(w.to)}`}>{w.name}</Chip>)}
        </p>
      </Card>

      <Card title="Headcount" className="span-4">
        {offline || !decided ? (
          <EmptyState>{offline ? "Guest counts live in the online planner." : "No guests decided yet."}</EmptyState>
        ) : (
          <>
            <div className="td-big">≈ {Math.round(inv.expected)}</div>
            <p className="td-muted">expected of {inv.heads} invited · {hc.undecidedParties} undecided household{hc.undecidedParties === 1 ? "" : "s"}</p>
            <p className="td-chips">
              <Chip>{inv.adults} adults · main room</Chip>
              <Chip tone="gold">{inv.kids} kid{inv.kids === 1 ? "" : "s"} · kids' room</Chip>
            </p>
          </>
        )}
        {!offline && <Button onClick={() => setTab("people")}>Decide guests</Button>}
      </Card>

      <Card title="Must-haves" className="span-4">
        {mh.length === 0 ? <EmptyState>{offline ? "Must-haves load in the online planner." : "No must-haves yet."}</EmptyState> : (
          <>
            <p className="td-muted">{mh.length} on the list</p>
            <ul className="td-list">{mh.slice(0, 5).map((m) => <li key={m.id}>{m.text}</li>)}</ul>
          </>
        )}
        <Button kind="quiet" onClick={allMustHaves}>All must-haves</Button>
      </Card>

      <Card title="Next up" corner className="span-6">
        {next.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "No open tasks. Add one in Plan."}</EmptyState>
        ) : (
          <ul className="pl-list">{next.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} />)}</ul>
        )}
        <Button kind="quiet" onClick={() => setTab("plan")}>All tasks</Button>
      </Card>

      <Card title="Shortlist" className="span-6">
        {active.length === 0 ? <EmptyState>No venues on the shortlist.</EmptyState> : (
          <div className="td-venues">{active.map((v, i) => <VenueTile key={v.scenario.id} v={v} i={i} onOpen={() => openVenue(v.scenario.id)} />)}</div>
        )}
      </Card>
    </div>
  );
}
