// Today (DESIGN-v14 §3): countdown, headcount, venue card, Ready now, Next up, payments due.
import { useMemo } from "react";
import { roomCheck, vendorSummary, weddingCountdown, weddingVenue } from "../../plan/day";
import { chicagoToday, nextUp } from "../../plan/tasks";
import { useWeddingSummary } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState, OwnerChip } from "../kit/kit";
import { useNav } from "../nav";
import { TaskRow } from "../plan/TaskRow";
import { dueLabel } from "../plan/model";
import { NO_DATE, decisionLabel, paymentText, readyTop, roomLine, venueStatusChip, weddingSub } from "./model";
import "./today.css";

export function TodayScreen() {
  const { tasks, venues, scenarios, headcount: hc, settings, offline, status, vendors } = useData();
  const { setTab, openTask, openDay, openPlan } = useNav();
  const ws = useWeddingSummary();
  const today = chicagoToday();
  const next = useMemo(() => nextUp(tasks, today, 5), [tasks, today]);
  const ready = useMemo(() => readyTop(tasks, today, 5), [tasks, today]);
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
          <div className="td-venue-name">{heldSc.name}</div>
          <p className="td-chips"><Chip tone={chip.tone}>{chip.text}</Chip></p>
          {ws && wb && <>
            <p className="td-price">{wb.rows.some((r) => r.extrapolated) ? "≈ " : ""}{money(wb.total)}</p>
            <p className="td-venue-meta">{ws.guestsLabel} · confidence {heldSc.confidence}% · estimate, ±10–15%</p>
          </>}
          {room && !offline && <p className="td-muted">Room {roomLine(room.expected, room.cap)}{room.over ? " · ⚠ over if everyone invited comes" : ""}</p>}
          {!offline && <p className="td-muted">Vendors booked {vs.booked} / {vs.coreTotal}</p>}
          <p className="td-actions">
            <Button onClick={() => setTab("budget")}>Budget</Button>
            {!offline && <Button kind="quiet" onClick={() => openDay("venue")}>Open Day</Button>}
          </p>
        </Card>
      )}

      <Card title="Ready now" corner className="span-6">
        {ready.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "Nothing is ready to start. Add the wedding checklist in Plan."}</EmptyState>
        ) : (
          <ul className="td-ready">
            {ready.map((t) => {
              const due = dueLabel(t.due, today);
              const dec = decisionLabel(t);
              return (
                <li key={t.id} className="td-ready-row">
                  <button type="button" className="td-ready-title" onClick={() => openTask(t.id)}>{t.title}</button>
                  <span className="td-ready-meta">
                    {dec && <strong className="td-decision">{dec}</strong>}
                    <OwnerChip owner={t.owner} />
                    <span className={due.overdue ? "td-overdue" : ""}>{due.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Button kind="quiet" onClick={() => openPlan({ filter: "ready" })}>See all</Button>
      </Card>

      <Card title="Next up" corner className="span-6">
        {next.length === 0 ? (
          <EmptyState>{status === "loading" ? "Loading…" : offline ? "Tasks live in the online planner." : "No open tasks. Add one in Plan."}</EmptyState>
        ) : (
          <ul className="pl-list">{next.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} />)}</ul>
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
