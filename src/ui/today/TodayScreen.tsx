// Today (DESIGN-v4 §2, mockup docs/mockups/v4-garden.html): when, headcount, must-haves, next up, shortlist.
import { useMemo } from "react";
import { orderedMustHaves } from "../../plan/fit";
import { roomCheck, vendorSummary, weddingCountdown, weddingVenue } from "../../plan/day";
import { chicagoToday, nextUp } from "../../plan/tasks";
import type { VenueSummary } from "../../plan/venueSummary";
import { Sprig } from "../garden/motifs";
import { useCompare, useWeddingSummary } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState, type ChipTone } from "../kit/kit";
import { useNav } from "../nav";
import { PLAN_SECTION_KEY } from "../plan/PlanScreen";
import { TaskRow } from "../plan/TaskRow";
import { fmtDay, shortVenueName } from "../plan/model";
import { capacityShort } from "../venues/model";
import { countdown, roomLine, weddingSub } from "./model";
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
        ? <span className="td-price">{money(v.budget.total)}{v.snapped && <span className="td-venue-meta"> at {v.guests} guests (venue's {v.guests > v.asked ? "smallest" : "largest"} modelled count)</span>}</span>
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
  const { tasks, musthaves, venues, scenarios, headcount: hc, settings, offline, status, vendors } = useData();
  const { active } = useCompare();
  const { setTab, openVenue, openTask, openDay } = useNav();
  const ws = useWeddingSummary();
  const today = chicagoToday();
  const cd = countdown(today, settings.dateWindows);
  const next = useMemo(() => nextUp(tasks, today, 5), [tasks, today]);
  const mh = useMemo(() => orderedMustHaves(musthaves), [musthaves]);
  const heldRow = weddingVenue(venues, settings);
  const heldSc = heldRow ? scenarios.find((s) => s.id === heldRow.scenario_id) : undefined;
  const heldName = heldSc?.name;
  const wc = heldRow && settings.heldDate ? weddingCountdown(today, settings.heldDate) : null;
  const vs = useMemo(() => vendorSummary(vendors, today), [vendors, today]);
  const room = heldSc ? roomCheck(hc, heldSc) : null;
  const wb = ws?.summary.budget;
  const inv = hc.invited;
  const decided = inv.heads > 0 || hc.ifroom.heads > 0 || hc.undecidedParties > 0;
  const allMustHaves = () => {
    try { sessionStorage.setItem(PLAN_SECTION_KEY, "musthaves"); } catch { /* storage unavailable */ }
    setTab("plan");
  };

  return (
    <div className="g-grid">
      <Card title="When" className="span-4">
        <div className="td-big">{wc ? wc.big : cd.big}</div>
        <p className="td-muted">{wc && settings.heldDate && heldName ? weddingSub(settings.heldDate, shortVenueName(heldName)) : cd.sub}</p>
        <p className="td-chips">
          {settings.heldDate && !wc && <Chip tone="peony">Held · {fmtDay(settings.heldDate, true)}{heldName ? ` · ${shortVenueName(heldName)}` : ""}</Chip>}
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

      {heldSc && (
        <Card title="Our venue" className="span-4">
          <div className="td-venue-name">{heldSc.name}</div>
          {ws && wb && <>
            <p className="td-price">{wb.rows.some((r) => r.extrapolated) ? "≈ " : ""}{money(wb.total)}</p>
            <p className="td-venue-meta">{ws.guestsLabel} · confidence {heldSc.confidence}%</p>
          </>}
          {room && <p className="td-muted">Room {roomLine(room.expected, room.cap)}{room.over ? " · ⚠ over if everyone invited comes" : ""}</p>}
          {!offline && <p className="td-muted">Vendors booked {vs.booked} / {vs.coreTotal}</p>}
          {!offline && <Button onClick={() => openDay("venue")}>Open Day</Button>}
        </Card>
      )}

      <Card title="Next up" corner className={heldSc ? "span-8" : "span-6"}>
        {next.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "No open tasks. Add one in Plan."}</EmptyState>
        ) : (
          <ul className="pl-list">{next.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} />)}</ul>
        )}
        <Button kind="quiet" onClick={() => setTab("plan")}>All tasks</Button>
      </Card>

      <Card title="Shortlist" className={heldSc ? "span-12" : "span-6"}>
        {active.length === 0 ? <EmptyState>No venues on the shortlist.</EmptyState> : (
          <div className="td-venues">{active.map((v, i) => <VenueTile key={v.scenario.id} v={v} i={i} onOpen={() => openVenue(v.scenario.id)} />)}</div>
        )}
      </Card>
    </div>
  );
}
