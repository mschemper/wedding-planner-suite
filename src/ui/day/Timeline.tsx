// Day tab > Timeline: run of show for the wedding venue, issues vs venue hours, sunset marker, template start, print.
import { Fragment, useState } from "react";
import { clock, endOf, sortTimeline, sunsetIndex, sunsetLocal, timelineIssues } from "../../plan/day";
import { VENUE_FACTS } from "../../data/venueFacts";
import { useData, type SaveResult } from "../data";
import { Button, Card, EmptyState } from "../kit/kit";
import { SaveError } from "../SaveError";
import { TimelineSheet } from "./TimelineSheet";
import { templateOps } from "./timelineModel";
import "./timeline.css";

export interface TimelineProps { venueId: number; date: string }

export function Timeline({ venueId, date }: TimelineProps) {
  const { timeline, save, offline, version } = useData();
  const [sheet, setSheet] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const hours = VENUE_FACTS[venueId]?.hours;
  const sunset = sunsetLocal(date);
  const sorted = sortTimeline(timeline);
  const issueOf = new Map((hours ? timelineIssues(timeline, hours) : []).map((i) => [i.id, i.msg]));
  const markAt = sunset ? sunsetIndex(sorted, sunset) : -1;
  const liveRow = sheet && sheet !== "new" ? timeline.find((r) => r.id === sheet) ?? null : null;

  const start = async () => {
    setBusy(true);
    const r = await save(templateOps());
    setBusy(false);
    if (!r.ok) setFail(r);
  };

  const marker = sunset && (
    <li className="tl-sunset" key="sunset"><span aria-hidden="true">☀</span> Sunset ≈ {clock(sunset)}</li>
  );

  return (
    <div className="tl">
      <Card title="Timeline" className="tl-head">
        <div className="tl-facts">
          {hours && <span>Venue {clock(hours.open)}–{hours.close === "24:00" ? "12:00 AM" : clock(hours.close)}, breakdown {hours.cleanupMin} min after</span>}
          <span>Bar 5 h max</span>
          {sunset && <span>Sunset ≈ {clock(sunset)}</span>}
        </div>
        <div className="tl-actions">
          {sorted.length > 0 && <Button onClick={() => window.print()}>Print</Button>}
          {!offline && <Button kind="primary" onClick={() => setSheet("new")}>Add step</Button>}
        </div>
      </Card>
      <SaveError result={fail} onDismiss={() => setFail(null)} />
      {sorted.length === 0 ? (
        <>
          <EmptyState>No steps yet.</EmptyState>
          {!offline && (
            <div className="tl-actions">
              <Button kind="primary" disabled={busy} onClick={() => void start()}>Start from the Joinery template</Button>
            </div>
          )}
        </>
      ) : (
        <ol className="tl-list">
          {sorted.map((r, i) => {
            const msg = issueOf.get(r.id);
            return (
              <Fragment key={r.id}>
                {i === markAt && marker}
                <li className="tl-row">
                  <button type="button" className="tl-step" onClick={() => setSheet(r.id)} disabled={offline}>
                    <span className="tl-time">{r.minutes > 0 ? `${clock(r.start)}–${clock(endOf(r))}` : clock(r.start)}</span>
                    <span className="tl-main">
                      <span className="tl-title">{r.title}</span>
                      {(r.place || r.who) && <span className="tl-meta">{[r.place, r.who].filter(Boolean).join(" · ")}</span>}
                      {r.notes && <span className="tl-meta">{r.notes}</span>}
                      {msg && <span className="tl-issue"><span aria-hidden="true">⚠</span> Heads up: {msg}</span>}
                    </span>
                  </button>
                </li>
              </Fragment>
            );
          })}
          {markAt === sorted.length && marker}
        </ol>
      )}
      {(sheet === "new" || liveRow) && <TimelineSheet key={liveRow ? `${liveRow.id}-${version("timeline", liveRow.id) ?? 0}` : "new"} row={liveRow} onClose={() => setSheet(null)} />}
    </div>
  );
}
