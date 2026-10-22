// Envelopes: invited households, then "If room" in rank order, totals, JSON + xlsx backups (no addresses).
import { useMemo, useState } from "react";
import { useData } from "../data";
import { Button, Card, EmptyState } from "../kit/kit";
import { envelopes, exportName, exportSheets, jsonExport } from "./model";

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Envelopes() {
  const { people, invite } = useData();
  const e = useMemo(() => envelopes(people, invite), [people, invite]);
  const [msg, setMsg] = useState("");
  const sum = (l: typeof e.invited) => l.reduce((n, x) => n + x.heads, 0);
  const exportJson = () => {
    download(exportName("json"), new Blob([JSON.stringify(jsonExport(people), null, 2)], { type: "application/json" }));
    setMsg("JSON saved.");
  };
  const exportXlsx = async () => {
    try {
      setMsg("Building spreadsheet…");
      const XLSX = await import("xlsx");
      const s = exportSheets(people, invite);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.envelopeRows), "Envelopes");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.peopleRows), "People");
      XLSX.writeFile(wb, exportName("xlsx"));
      setMsg("Spreadsheet saved.");
    } catch (err) {
      setMsg(`Spreadsheet failed: ${String(err)}`);
    }
  };
  const list = (l: typeof e.invited, ranked: boolean) => (
    <ul className="pp-env">
      {l.map((x, i) => (
        <li key={x.party.id}>
          <div><b>{ranked ? `${i + 1}. ` : ""}{x.party.name}</b><div className="muted small">{x.names.join(", ")}</div></div>
          <span className="pp-env-n">{x.heads}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="pp-stack">
      <Card title="Envelopes" actions={<><Button onClick={exportJson}>Export JSON</Button><Button onClick={() => void exportXlsx()}>Export .xlsx</Button></>}>
        <p className="muted small">{e.invited.length} invited households · {sum(e.invited)} guests. If room: {e.ifroom.length} households · {sum(e.ifroom)} guests. Exports are backups on your device; no addresses.</p>
        {msg && <p className="small" role="status">{msg}</p>}
      </Card>
      <Card title={`Invited · ${sum(e.invited)} guests`}>{e.invited.length ? list(e.invited, false) : <EmptyState>No invited households yet.</EmptyState>}</Card>
      <Card title={`If room · ${sum(e.ifroom)} guests`}>{e.ifroom.length ? list(e.ifroom, true) : <EmptyState>Nobody is marked "If room".</EmptyState>}</Card>
    </div>
  );
}
