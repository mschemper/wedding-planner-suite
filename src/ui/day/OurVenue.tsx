// Day tab "Our venue" (DESIGN-v11): header, money, room, photos, facts, open questions, planning milestones.
import { useMemo, useState } from "react";
import { VENUE_FACTS, type VenuePhoto } from "../../data/venueFacts";
import { defaultOpts, seasonOf } from "../../engine/compute";
import { barMinimum, clock, milestoneDrafts, roomCheck, sunsetLocal, weddingCountdown } from "../../plan/day";
import { chicagoToday } from "../../plan/tasks";
import { useWeddingSummary } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState, Sheet } from "../kit/kit";
import { useNav } from "../nav";
import { fmtDay } from "../plan/model";
import { TaskRow } from "../plan/TaskRow";
import { capList, memorialWeekend, milestoneButton, milestoneOps } from "./ourVenueModel";
import "./ourVenue.css";

export interface OurVenueProps { venueId: number; date: string }

function FactList({ title, items }: { title: string; items: string[] }) {
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const { shown } = capList(items, 5, all);
  return (
    <div className="ov-facts">
      <h3 className="ov-h3">{title}</h3>
      <ul className="ov-list">{shown.map((x) => <li key={x}>{x}</li>)}</ul>
      {items.length > 5 && <Button kind="quiet" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${items.length}`}</Button>}
    </div>
  );
}

export function OurVenue({ venueId, date }: OurVenueProps) {
  const { tasks, scenarios, headcount: hc, venues, save, offline } = useData();
  const { openTask } = useNav();
  const ws = useWeddingSummary();
  const [photo, setPhoto] = useState<VenuePhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [allMs, setAllMs] = useState(false);
  const today = chicagoToday();
  const facts = VENUE_FACTS[venueId];
  const sc = scenarios.find((s) => s.id === venueId);
  const row = venues.find((v) => v.scenario_id === venueId);
  const drafts = useMemo(() => milestoneDrafts(date, today, tasks), [date, today, tasks]);
  const openQs = useMemo(() => tasks.filter((t) => t.status === "open" && t.scenario_id === venueId), [tasks, venueId]);

  if (!sc) return null;
  const cd = weddingCountdown(today, date);
  const holiday = memorialWeekend(date);
  const sunset = sunsetLocal(date);
  const b = ws?.summary.budget;
  const room = roomCheck(hc, sc);
  const bar = ws ? barMinimum(sc, ws.guests, defaultOpts(sc), seasonOf(sc, date)) : null;
  const approx = !!b?.rows.some((r) => r.extrapolated);
  const msShown = capList(drafts, 5, allMs);

  const addAll = async () => {
    setBusy(true);
    setErr("");
    const r = await save(milestoneOps(drafts, venueId, today));
    setBusy(false);
    if (!r.ok) setErr(r.message);
  };

  return (
    <div className="ov-screen">
      <Card title={sc.name} corner>
        <p className="ov-date">{fmtDay(date, true)}</p>
        <p className="ov-chips">
          <Chip tone="peony">{row?.status ?? "held"}</Chip>
          <Chip tone="gold">{cd.past || cd.days === 0 ? cd.big : `${cd.big} to go · ${cd.weeks} weeks`}</Chip>
          {holiday && <Chip tone="sage" title={`Memorial Day is ${fmtDay(holiday, true)}`}>Memorial Day weekend</Chip>}
        </p>
        {holiday && <p className="ov-muted">Holiday weekend: out-of-town guests and vendors book early.</p>}
        {sunset && <p className="ov-muted">Sunset ≈ {clock(sunset)}</p>}
      </Card>

      <Card title="Money">
        {!ws || !b ? <EmptyState>We do not have a price for this venue yet.</EmptyState> : (
          <>
            <div className="ov-big">{approx ? "≈ " : ""}{money(b.total)}</div>
            <p className="ov-muted">{ws.guestsLabel} · {fmtDay(ws.date, true)} · confidence {sc.confidence}%</p>
            {ws.rentalQuote && <p className="ov-line">Rental quoted {money(ws.rentalQuote.amount)}</p>}
            {bar && bar.binding && <p className="ov-line">Bar minimum {money(bar.min)} ≈ {money(bar.perHead)} pp at {ws.guests} guests</p>}
            {ws.unmatched.length > 0 && (
              <p className="ov-warn" role="alert">
                <span aria-hidden="true">⚠</span> {ws.unmatched.length} quote{ws.unmatched.length === 1 ? "" : "s"} did not match a line on this date ({ws.unmatched.map((q) => (q.item_desc === "*" ? "all-in" : q.item_desc)).join(", ")}); not in the total.
              </p>
            )}
          </>
        )}
      </Card>

      <Card title="Room">
        <p className="ov-line">≈ {room.expected} expected{room.cap != null ? ` of ${room.cap} seats` : ""}{room.kidsInMain ? " (kids included)" : ""}</p>
        <p className="ov-muted">{room.invited} if everyone invited comes{room.spare != null ? ` · spare ≈ ${room.spare}` : ""}</p>
        {room.over && <p className="ov-warn" role="alert"><span aria-hidden="true">⚠</span> Over capacity if everyone invited comes ({room.invited} vs {room.cap} seats).</p>}
      </Card>

      {facts && !offline && facts.photos.length > 0 && (
        <Card title="Photos">
          <ul className="ov-photos">
            {facts.photos.map((p) => (
              <li key={p.src}>
                <button type="button" className="ov-photo" onClick={() => setPhoto(p)} aria-label={`Enlarge: ${p.caption}`}>
                  <img src={`${import.meta.env.BASE_URL}${p.src}`} alt={p.caption} loading="lazy" />
                </button>
                <span className="ov-cap">{p.caption}</span>
                <span className="ov-credit">{p.credit}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {facts && (
        <Card title="Venue facts">
          <FactList title="Rules" items={facts.rules} />
          <FactList title="Included" items={facts.included} />
          <FactList title="Lodging" items={facts.lodging} />
        </Card>
      )}

      {(facts?.questions.length || openQs.length) ? (
        <Card title="Open questions">
          {facts && facts.questions.length > 0 && <ul className="ov-list">{facts.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
          {openQs.length > 0 && <ul className="pl-list">{openQs.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} />)}</ul>}
        </Card>
      ) : null}

      <Card title="Planning milestones">
        {drafts.length === 0 ? <p className="ov-line"><span aria-hidden="true">✓</span> {milestoneButton(0)}</p> : (
          <>
            <ul className="ov-ms">
              {msShown.shown.map((m) => (
                <li key={m.key}>
                  <span>{m.title}</span>
                  <span className="ov-ms-due">{fmtDay(m.due, true)}{m.late && <> <Chip tone="peony" title="Ideal date passed; due today">late</Chip></>}</span>
                </li>
              ))}
            </ul>
            {drafts.length > 5 && <Button kind="quiet" onClick={() => setAllMs(!allMs)}>{allMs ? "Show fewer" : `Show all ${drafts.length}`}</Button>}
            <Button kind="primary" disabled={busy || offline} onClick={() => void addAll()}>{busy ? "Adding…" : milestoneButton(drafts.length)}</Button>
            {err && <p className="ov-warn" role="alert">Not saved: {err}</p>}
          </>
        )}
      </Card>

      <Sheet title={photo?.caption ?? "Photo"} open={!!photo} onClose={() => setPhoto(null)}>
        {photo && (
          <figure className="ov-fig">
            <img src={`${import.meta.env.BASE_URL}${photo.src}`} alt={photo.caption} />
            <figcaption className="ov-credit">{photo.credit}</figcaption>
          </figure>
        )}
      </Sheet>
    </div>
  );
}
