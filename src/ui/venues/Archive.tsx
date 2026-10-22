// Archive: venues off the shortlist, computable and never deleted (DESIGN-v4 §1.1).
import { useState } from "react";
import { Button } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useData, type SaveResult } from "../data";
import { money } from "../format";
import type { VenueSummary } from "../../plan/venueSummary";
import { StatusChip } from "./Shortlist";

export function Archive({ archive, onOpen }: { archive: VenueSummary[]; onOpen(id: number): void }) {
  const { edit, offline } = useData();
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  async function add(v: VenueSummary) {
    const r = await edit([{ table: "venues", id: String(v.scenario.id), row: { active: true } }], `Added ${v.scenario.name} to the shortlist`);
    setFail(r.ok ? null : r);
  }
  return (
    <details className="k-card vn-archive">
      <summary className="vn-archive-sum">Archive · {archive.length} venue{archive.length === 1 ? "" : "s"}</summary>
      <div className="vn-archive-grid">
        {archive.map((v) => (
          <div key={v.scenario.id} className="vn-mini">
            <button type="button" className="vn-open" onClick={() => onOpen(v.scenario.id)}>{v.scenario.name}</button>
            <div className="vn-meta">{v.scenario.location}</div>
            <div className="vn-mini-row">
              <span>{v.priced && v.budget ? <>{money(v.budget.total)}<span className="vn-meta"> at {v.guests}</span></> : <span className="vn-meta">Awaiting rate sheet</span>}</span>
              <StatusChip v={v} />
            </div>
            {v.budget?.unavailable && <div className="vn-meta vn-bad">Cannot host: {v.budget.unavailable}</div>}
            {!offline && <Button onClick={() => void add(v)}>Add to shortlist</Button>}
          </div>
        ))}
      </div>
      <SaveError result={fail} onDismiss={() => setFail(null)} />
    </details>
  );
}
