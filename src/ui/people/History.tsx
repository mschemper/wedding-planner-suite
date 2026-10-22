// Recent decisions (audit feed). Mounted only while open, so the audit is fetched on demand.
import { useMemo } from "react";
import { displayName } from "../../people/types";
import { useAudit, useData } from "../data";
import { Card, EmptyState } from "../kit/kit";
import { authorName, describeAudit, timeAgo } from "./model";

export function History() {
  const entries = useAudit(20);
  const { people } = useData();
  const lines = useMemo(() => {
    const names = { parties: new Map(people.parties.map((x) => [x.id, x.name])), people: new Map(people.people.map((p) => [p.id, displayName(p)])) };
    return entries.flatMap((e) => { const t = describeAudit(e, names); return t ? [{ id: e.id, who: authorName(e.who), text: t, when: timeAgo(e.ts) }] : []; });
  }, [entries, people]);
  return (
    <Card title="Recent decisions">
      {lines.length === 0 ? <EmptyState>No decisions yet.</EmptyState> : (
        <ul className="pp-log">{lines.map((l) => <li key={l.id}><b>{l.who}</b> · {l.text} · <span className="muted">{l.when}</span></li>)}</ul>
      )}
    </Card>
  );
}
