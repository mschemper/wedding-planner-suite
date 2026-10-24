// "Ada is Pat's aunt" (v7): link a relative to someone already in the tree by relation. Ancestors who aren't coming
// (deceased / tree-only) are added as hidden links by placeOps (src/people/relatives.ts). One save.
import { useMemo, useState } from "react";
import { branchName } from "../../data/params";
import { PLACE_LABEL, PLACE_RELATIONS, placeOps, type PlaceRelation as Rel } from "../../people/relatives";
import { displayName, type Person } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button } from "../kit/kit";
import { SaveError } from "../SaveError";

export function PlaceRelation({ person, onDone, compact }: { person: Person; onDone?(): void; compact?: boolean }) {
  const { people, save, version, settings } = useData();
  const [anchor, setAnchor] = useState("");
  const [rel, setRel] = useState<Rel>("aunt/uncle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [msg, setMsg] = useState("");
  // living relatives (and the couple) on the same side, grouped by branch
  const groups = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of people.people) {
      if (p.id === person.id || p.placeholder || p.deceased || p.kind === "friend") continue;
      if (p.kind !== "couple" && p.side !== person.side) continue;
      const k = p.kind === "couple" ? "The couple" : branchName(settings, p.branch);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()].map(([k, ps]) => [k, ps.sort((a, b) => displayName(a).localeCompare(displayName(b)))] as const).sort((a, b) => a[0].localeCompare(b[0]));
  }, [people.people, person.id, person.side, settings]);
  const go = async () => {
    const a = people.people.find((p) => p.id === anchor);
    const va = version("people", anchor);
    const vw = version("people", person.id);
    if (!a || va === undefined || vw === undefined) return;
    const ops = placeOps({ ...person, version: vw }, { ...a, version: va }, rel, people, version);
    if (!ops.length) { setMsg(`${displayName(a)} already has two parents.`); return; }
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (r.ok) { setErr(null); setMsg(""); onDone?.(); } else setErr(r);
  };
  const who = person.nick || person.first;
  return (
    <div className={`pp-place-rel${compact ? " compact" : ""}`} role="group" aria-label={`Place ${who} by relation`}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      <span className="pp-place-who">{who} is</span>
      <select value={anchor} onChange={(e) => setAnchor(e.target.value)} aria-label="Relative">
        <option value="">whose…</option>
        {groups.map(([g, ps]) => <optgroup key={g} label={g}>{ps.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}</optgroup>)}
      </select>
      <select value={rel} onChange={(e) => setRel(e.target.value as Rel)} aria-label="Relation">
        {PLACE_RELATIONS.map((r) => <option key={r} value={r}>{PLACE_LABEL[r]}</option>)}
      </select>
      <Button kind="primary" disabled={!anchor || busy} onClick={() => void go()}>{busy ? "Placing…" : "Place"}</Button>
      {msg && <span className="small muted" role="status">{msg}</span>}
      {!compact && <span className="pp-hint">Parents or grandparents who aren't coming are linked behind the scenes and never shown.</span>}
    </div>
  );
}
