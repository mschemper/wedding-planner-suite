// Today (DESIGN-v14 §3, v16 order): countdown + Ready now first, then headcount, venue, Next up (not already in Ready now), payments due. One row style (TaskRow).
import { useMemo } from "react";
import { roomCheck, vendorSummary, weddingCountdown, weddingVenue } from "../../plan/day";
import { chicagoToday, nextUp } from "../../plan/tasks";
import { useWeddingSummary } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState } from "../kit/kit";
import { useNav } from "../nav";
import { TaskRow } from "../plan/TaskRow";
import { rowInfo } from "../plan/model";
import { byIdMap } from "../../plan/deps";
import { NO_DATE, paymentText, readyTop, roomLine, venueStatusChip, weddingSub } from "./model";
import "./today.css";

export function TodayScreen() {
  const { tasks, venues, scenarios, headcount: hc, settings, offline, status, vendors } = useData();
  const { setTab, openTask, openDay, openPlan } = useNav();
  const ws = useWeddingSummary();
  const today = chicagoToday();
  const next = useMemo(() => nextUp(tasks, today, 5), [tasks, today]);
  const ready = useMemo(() => readyTop(tasks, today, 5), [tasks, today]);
  const byId = useMemo(() => byIdMap(tasks), [tasks]);
  const readyIds = new Set(ready.map((t) => t.id));
  const later = next.filter((t) => !readyIds.has(t.id));
  const heldRow = weddingVenue(venues, settings);
  const heldSc = heldRow ? scenarios.find((s) => s.id === heldRow.scenario_id) : undefined;
  const heldName = heldSc?.name;
  const wc = settings.heldDate ? weddingCountdown(today, settings.heldDate) : null;
  const vs = useMemo(() => vendorSummary(vendors, today), [vendors, today]);
  const room = heldSc ? roomCheck(hc, heldSc) : null;
  const wb = ws?.summary.budget;
  const chip = venueStatusChip(heldRow?.status);
  const inv = hc.invited;
  const decided = inv.heads > 0 || hc.ifroom.heads > 0 || hc.undecidedParties > 0;

  return (
    <div className="g-grid">
      <Card title="When" className="span-4">
        <div className="td-big">{wc ? wc.big : NO_DATE.big}</div>
        <p className="td-muted">{wc && settings.heldDate ? weddingSub(settings.heldDate, heldName ?? "venue not set") : NO_DATE.sub}</p>
      </Card>

      <Card title="Ready now" corner className="span-8">
        {ready.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "Nothing is ready to start. Add the wedding checklist in Plan."}</EmptyState>
        ) : (
          <ul className="pl-list">{ready.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} info={rowInfo(t, byId, today)} />)}</ul>
        )}
        <Button kind="quiet" onClick={() => openPlan({ filter: "ready" })}>See all ready</Button>
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

      {heldSc && (
        <Card title="The venue" className="span-4">
          <p className="td-venue-line"><strong>{heldSc.name}</strong> <Chip tone={chip.tone}>{chip.text}</Chip></p>
          <p className="td-muted">
            {ws && wb ? <>{wb.rows.some((r) => r.extrapolated) ? "≈ " : ""}{money(wb.total)} estimate (±10–15%)</> : "Not priced yet"}
            {room && !offline ? ` · room ${roomLine(room.expected, room.cap)}${room.over ? " ⚠ over if all invited come" : ""}` : ""}
            {!offline ? ` · ${vs.booked} of ${vs.coreTotal} vendors booked` : ""}
          </p>
          <p className="td-actions">
            {!offline && <Button onClick={() => openDay("venue")}>Venue details</Button>}
            <Button kind="quiet" onClick={() => setTab("budget")}>Budget</Button>
          </p>
        </Card>
      )}

      <Card title="Next up" corner className="span-4">
        {later.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "Nothing else open. Add one in Plan."}</EmptyState>
        ) : (
          <ul className="pl-list">{later.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} info={rowInfo(t, byId, today)} />)}</ul>
        )}
        <Button kind="quiet" onClick={() => setTab("plan")}>All tasks</Button>
      </Card>

      {!offline && (
        <Card title="Payments due" className="span-12">
          {vs.payments.length === 0 ? <EmptyState>No payments with a due date.</EmptyState> : (
            <ul className="td-list">
              {vs.payments.slice(0, 3).map((p) => (
                <li key={`${p.vendor.id}:${p.kind}`} className={p.overdue ? "td-overdue" : ""}>{p.overdue ? "Overdue · " : ""}{paymentText(p, today)}</li>
              ))}
            </ul>
          )}
          <Button kind="quiet" onClick={() => openDay("vendors")}>All vendors</Button>
        </Card>
      )}
    </div>
  );
}
