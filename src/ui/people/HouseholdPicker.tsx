// "Add someone to an existing household" (v8): pick the household first, then its card opens with a blank person row.
import { useMemo, useState } from "react";
import { displayName } from "../../people/types";
import { useData } from "../data";
import { Button, Sheet } from "../kit/kit";

export function HouseholdPicker({ onClose, onPick, onNew }: { onClose(): void; onPick(partyId: string): void; onNew(): void }) {
  const { people } = useData();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return people.parties
      .map((x) => ({ x, names: people.people.filter((p) => p.party_id === x.id && !p.placeholder && !p.deceased).map(displayName) }))
      .filter(({ x, names }) => !s || [x.name, ...names].some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => a.x.name.localeCompare(b.x.name))
      .slice(0, 40);
  }, [people, q]);
  return (
    <Sheet title="Add someone to a household" open onClose={onClose} footer={<><Button onClick={onNew}>Start a new household instead</Button><Button onClick={onClose}>Cancel</Button></>}>
      <p className="small muted">Pick who they live with. Their household card opens with a new row to fill in.</p>
      <input className="k-input hp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a household or a name" aria-label="Search households" autoFocus />
      <ul className="pp-hits hp-list">
        {rows.map(({ x, names }) => (
          <li key={x.id}><button type="button" onClick={() => onPick(x.id)}>{x.name}<small>{names.join(", ") || "nobody yet"}</small></button></li>
        ))}
        {rows.length === 0 && <li className="muted small" style={{ padding: 12 }}>No household matches.</li>}
      </ul>
    </Sheet>
  );
}
