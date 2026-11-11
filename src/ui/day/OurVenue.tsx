// Day tab "Our venue" (DESIGN-v11): header, money (bar minimum + link; Budget is the one home of the estimate), room, photos, facts, contacts, open questions, link to the wedding checklist.
import { useMemo, useState, type ReactNode } from "react";
import { VENUE_FACTS, type VenuePhoto } from "../../data/venueFacts";
import { defaultOpts, seasonOf } from "../../engine/compute";
import { barMinimum, clock, roomCheck, sunsetLocal, weddingCountdown } from "../../plan/day";
import { chicagoToday } from "../../plan/tasks";
import { useWeddingSummary } from "../compare";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, Sheet } from "../kit/kit";
import { useNav } from "../nav";
import { fmtDay } from "../plan/model";
import { TaskRow } from "../plan/TaskRow";
import { capList, contactParts, memorialWeekend } from "./ourVenueModel";
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

function Contact({ text }: { text: string }): ReactNode {
  return contactParts(text).map((p, i) => p.href ? <a key={i} href={p.href}>{p.text}</a> : <span key={i}>{p.text}</span>);
}

export function OurVenue({ venueId, date }: OurVenueProps) {
  const { tasks, scenarios, headcount: hc, venues, offline } = useData();
  const { openTask, openPlan, setTab } = useNav();
  const ws = useWeddingSummary();
  const [photo, setPhoto] = useState<VenuePhoto | null>(null);
  const today = chicagoToday();
  const facts = VENUE_FACTS[venueId];
  const sc = scenarios.find((s) => s.id === venueId);
  const row = venues.find((v) => v.scenario_id === venueId);
  const openQs = useMemo(() => tasks.filter((t) => t.status === "open" && t.scenario_id === venueId), [tasks, venueId]);

  if (!sc) return null;
  const cd = weddingCountdown(today, date);
  const holiday = memorialWeekend(date);
  const sunset = sunsetLocal(date);
  const room = roomCheck(hc, sc);
  const bar = ws ? barMinimum(sc, ws.guests, defaultOpts(sc), seasonOf(sc, date)) : null;

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
        {bar && bar.binding && <p className="ov-line">Bar minimum {money(bar.min)} ≈ {money(bar.perHead)} pp at {ws?.guests} guests</p>}
        <p className="ov-muted">The estimate, quotes and prices live in Budget.</p>
        <Button onClick={() => setTab("budget")}>Open Budget</Button>
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

      {facts?.contacts && facts.contacts.length > 0 && (
        <Card title="Contacts">
          <ul className="ov-list">{facts.contacts.map((c) => <li key={c}><Contact text={c} /></li>)}</ul>
        </Card>
      )}

      {(facts?.questions.length || openQs.length) ? (
        <Card title="Open questions">
          {facts && facts.questions.length > 0 && <ul className="ov-list">{facts.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
          {openQs.length > 0 && <ul className="pl-list">{openQs.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={(x) => openTask(x.id)} />)}</ul>}
        </Card>
      ) : null}

      <Card title="Wedding checklist">
        <p className="ov-line">Tasks and decisions counted back from the wedding, with what waits on what.</p>
        <Button kind="primary" onClick={() => openPlan({ mode: "calendar" })}>Open the wedding checklist</Button>
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
