// Decide one by one (v9): a focused card per undecided household in ring order. Keys 1 Invite · 2 If room · 3 No · S Skip. One edit per choice (Undo toast).
import { useEffect, useMemo, useState } from "react";
import { namesLine, type Ring, type RingRow } from "../../people/rings";
import type { Decision } from "../../people/types";
import { householdCost } from "../../plan/venueSummary";
import { useCompare } from "../compare";
import { useData } from "../data";
import { Button, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { usePrefs } from "../usePrefs";
import type { Actions } from "./actions";
import { DecisionMark } from "./DecisionControl";
import { costText, DECISION_LABEL, decideQueue, householdLocal, seatsLeftAfter, seatsText, type SideFilter } from "./model";
import type { Room } from "./RoomCheck";

type Choice = Exclude<Decision, "undecided">;
const CHOICES: { d: Choice; key: string }[] = [{ d: "invite", key: "1" }, { d: "ifroom", key: "2" }, { d: "no", key: "3" }];

export function OneByOne({ rings, side, room, rel, act, onClose }: {
  rings: Ring[]; side: SideFilter; room: Room; rel: (r: RingRow) => string; act: Actions; onClose(): void;
}) {
  const { quotes } = useData();
  const { prefs } = usePrefs();
  const cmp = useCompare();
  // the walk is a snapshot of who was undecided when it opened, so deciding someone does not shift the list under you
  const [ids, setIds] = useState<string[]>(() => decideQueue(rings, side).map((r) => r.party.id));
  const [i, setI] = useState(0);
  const rows = useMemo(() => new Map(rings.flatMap((r) => r.rows.map((x) => [x.party.id, x] as [string, RingRow]))), [rings]);
  const row = rows.get(ids[i] ?? "");
  const skipped = ids.filter((id) => rows.get(id)?.party.invite === "undecided");

  const next = () => setI((n) => Math.min(n + 1, ids.length));
  const choose = (d: Choice) => { if (!row) return; if (row.party.invite !== d) act.decide(row.party, d); next(); };
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const hit = CHOICES.find((c) => c.key === e.key);
      if (hit) { e.preventDefault(); choose(hit.d); } else if (e.key === "s" || e.key === "S") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { sel, check } = room;
  const add = row && sel ? householdCost(sel, { quotes, date: cmp.date, contingency: prefs.contingency }, cmp.guests, row.seats.heads) : null;
  const left = row && check ? seatsLeftAfter(check, row, room.kidsRoom) : null;
  const done = !row;
  const foot = done ? undefined : (
    <>
      <Button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>Back</Button>
      <Button onClick={next}>Skip <kbd>S</kbd></Button>
    </>
  );
  return (
    <Sheet title="Decide one by one" open onClose={onClose} footer={foot}>
      <SaveError result={act.error} onDismiss={act.clearError} />
      {done ? (
        <div className="pp-obo-done" role="status">
          <h3>{ids.length === 0 ? "Everyone is decided." : skipped.length ? `Done. ${skipped.length} skipped.` : "Done. Everyone is decided."}</h3>
          {skipped.length > 0 && <Button kind="primary" onClick={() => { setIds(skipped); setI(0); }}>Review the {skipped.length} skipped</Button>}
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="pp-obo">
          <p className="pp-obo-progress" role="status">{i + 1} of {ids.length}</p>
          <h3 className="pp-obo-name">{namesLine(row)}</h3>
          {rel(row) && <p className="pp-obo-rel">{rel(row)}</p>}
          <dl className="pp-obo-facts">
            <div><dt>Seats</dt><dd>{seatsText(row)}</dd></div>
            {sel && <div><dt>Adds to the budget</dt><dd>{costText(add)}</dd></div>}
            {sel && left != null && <div><dt>Seats left at {sel.name}</dt><dd>{left >= 0 ? `${left} after them` : `over by ${-left} with them`}</dd></div>}
          </dl>
          <Segmented<"local" | "away"> label="Where they live" options={[{ value: "local", label: "Local" }, { value: "away", label: "Away" }]}
            value={householdLocal(row)} onChange={(v) => void act.bulk([row.party], { kind: "local", value: v })} />
          {row.party.invite !== "undecided" && <p className="pp-hint">Now: {DECISION_LABEL[row.party.invite]}</p>}
          <div className="pp-obo-btns" role="group" aria-label="Decision">
            {CHOICES.map(({ d, key }) => (
              <button key={d} type="button" className={`k-btn pp-obo-btn${d === "invite" ? " k-btn-primary" : ""}`} aria-pressed={row.party.invite === d} onClick={() => choose(d)}>
                <DecisionMark state={d} /> {DECISION_LABEL[d]} <kbd>{key}</kbd>
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
