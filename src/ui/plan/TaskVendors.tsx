// v18: Joinery preferred vendors where a task needs them. Row link (Plan list, Calendar, Today) + task-sheet section (top picks, shortlist, see all).
import type { Task } from "../../plan/types";
import { useData } from "../data";
import { Button, Chip } from "../kit/kit";
import { useNav } from "../nav";
import { offersDayOf, preferredIn, preferredLine, preferredNoun, taskVendorType, trackedAs } from "../day/preferredModel";
import { STATUS_LABEL } from "../day/vendorsModel";

/** One-line link under a task row: "★ 21 Joinery caterers · 2 shortlisted ›". Nothing for done or non-vendor tasks. */
export function TaskVendorLink({ task }: { task: Task }) {
  const { vendors } = useData();
  const { openPreferred } = useNav();
  const type = task.status === "done" ? null : taskVendorType(task);
  if (!type) return null;
  return (
    <button type="button" className="pl-pref" onClick={() => openPreferred(type)}>
      <span aria-hidden="true">★ </span>{preferredLine(type, vendors)} <span aria-hidden="true">›</span>
    </button>
  );
}

/** Task sheet: shortlisted first, then marked / day-of picks; max 4 + See all. */
export function TaskVendorSection({ task, onLeave }: { task: Task; onLeave(): void }) {
  const { vendors } = useData();
  const { openPreferred } = useNav();
  const type = taskVendorType(task);
  if (!type) return null;
  const all = preferredIn(type);
  const ranked = [...all.filter((p) => trackedAs(p, vendors)), ...all.filter((p) => !trackedAs(p, vendors))].slice(0, 4);
  return (
    <section className="pl-vendors k-field wide" aria-label={`Joinery preferred ${preferredNoun(type)}`}>
      <span className="k-field-label">Joinery preferred {preferredNoun(type)}</span>
      <ul className="pl-vendor-list">
        {ranked.map((p) => {
          const tr = trackedAs(p, vendors);
          return (
            <li key={p.name}>
              <strong>{p.name}</strong>
              {tr && <> <Chip tone="sage">{STATUS_LABEL[tr.status]}</Chip></>}
              {p.marked && <> <Chip tone="peony">✎ Marked</Chip></>}
              {p.category === "planner" && offersDayOf(p) && <> <Chip tone="gold">✓ Day-of</Chip></>}
              {p.blurb && <span className="pl-vendor-blurb">{p.blurb}</span>}
            </li>
          );
        })}
      </ul>
      <Button onClick={() => { onLeave(); openPreferred(type); }}>See all {all.length} and shortlist</Button>
    </section>
  );
}
