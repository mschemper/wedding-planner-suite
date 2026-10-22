// Guests: forecast strip, filters, grouped household list, side panel editor (DESIGN-v3 §5, layout A).
import { useEffect, useMemo, useState } from "react";
import { forecastAttendance } from "../../guests/attendance";
import { validateGuests } from "../../guests/validate";
import { useData } from "../data";
import { useNav } from "../nav";
import { exportXlsx } from "./exportXlsx";
import "./guests.css";
import {
  NO_FILTERS, friendDraft, friendMatches, groupHouseholds, householdDraft, householdHasIssue, issueIds, type Draft, type Filters,
} from "./model";
import { Panel } from "./Panel";

function Chip<T extends string>({ label, value, cur, set, off }: { label: string; value: T; cur: T; set(v: T): void; off: T }) {
  const on = cur === value;
  return <button type="button" className="gs-chip" aria-pressed={on} onClick={() => set(on ? off : value)}>{label}</button>;
}

export function GuestsScreen() {
  const { guests, status, offline, sample } = useData();
  const { priceAt } = useNav();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const fc = useMemo(() => forecastAttendance(guests), [guests]);
  const ids = useMemo(() => issueIds(validateGuests(guests)), [guests]);
  const groups = useMemo(() => groupHouseholds(guests, f), [guests, f]);
  const friends = useMemo(() => guests.friends.filter((g) => friendMatches(g, f)), [guests.friends, f]);
  const shown = groups.reduce((n, g) => n + g.rows.length, 0);

  const close = () => setDraft(null);
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDraft(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  const set = <K extends keyof Filters>(k: K) => (v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const filtered = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
  const exceptionsOn = f.exceptionsOnly;
  const openHH = (id: string | null) => { setNote(""); setDraft(householdDraft(guests, id)); };
  const openFriend = (id: string | null) => { setNote(""); setDraft(friendDraft(guests, id)); };
  const selId = draft && draft.id;

  if (status === "loading") return <section className="panel gs-skel" aria-busy="true">Loading guests…</section>;

  return (
    <div className="gs">
      <section className="panel gs-forecast" aria-label="Attendance forecast">
        <div className="stat-strip">
          <div className="stat"><div className="stat-label">Invited</div><div className="stat-value">{fc.invited}</div></div>
          <div className="stat"><div className="stat-label">Adults / kids</div><div className="stat-value">{fc.adults} / {fc.children}</div></div>
          <div className="stat"><div className="stat-label">Expected (local)</div><div className="stat-value">≈ {fc.expected}</div><div className="stat-sub">at benchmark acceptance</div></div>
        </div>
        <div className="gs-row">
          <button type="button" className="gs-btn primary" onClick={() => priceAt(fc.expected)}>Price at expected ({fc.expected})</button>
          <button type="button" className="gs-btn" onClick={() => priceAt(fc.ceiling)}>Price at full acceptance ({fc.ceiling})</button>
        </div>
        {sample && <p className="hint">Sample data (synthetic names).</p>}
      </section>

      <section className="panel gs-filters" aria-label="Filters">
        <div className="gs-chips" role="group" aria-label="Family side">
          {(["All", "Mark", "Angela"] as const).map((v) => <Chip key={v} label={v === "All" ? "All sides" : v} value={v} cur={f.side} set={set("side")} off="All" />)}
        </div>
        <div className="gs-chips" role="group" aria-label="Adult or child">
          {(["Adult", "Child"] as const).map((v) => <Chip key={v} label={v} value={v} cur={f.aoc} set={set("aoc")} off="" />)}
        </div>
        <div className="gs-chips" role="group" aria-label="Locality">
          {(["Local Chicago Area", "Out of Town", "Unknown"] as const).map((v) => <Chip key={v} label={v} value={v} cur={f.locality} set={set("locality")} off="" />)}
        </div>
        <div className="gs-chips" role="group" aria-label="Invite status">
          {(["TBD", "Invited", "Accepted", "Declined", "Not inviting"] as const).map((v) => <Chip key={v} label={v} value={v} cur={f.status} set={set("status")} off="" />)}
        </div>
        <div className="gs-chips" role="group" aria-label="Priority and exceptions">
          {(["Core", "Review"] as const).map((v) => <Chip key={v} label={v} value={v} cur={f.priority} set={set("priority")} off="" />)}
          <button type="button" className="gs-chip" aria-pressed={exceptionsOn} onClick={() => set("exceptionsOnly")(!exceptionsOn)}>Exceptions only</button>
        </div>
        <div className="gs-row">
          <input type="search" className="gs-search" aria-label="Search by person or household name" placeholder="Search name or household" value={f.q} onChange={(e) => set("q")(e.target.value)} />
          {filtered && <button type="button" className="link-btn" onClick={() => setF(NO_FILTERS)}>Clear filters</button>}
        </div>
      </section>

      <div className="gs-actions-top">
        {!offline && <button type="button" className="gs-btn" onClick={() => openHH(null)}>+ household</button>}
        {!offline && <button type="button" className="gs-btn" onClick={() => openFriend(null)}>+ friend group</button>}
        <button type="button" className="gs-btn" disabled={busy} onClick={() => { setBusy(true); exportXlsx(guests).then((n) => setNote(`Exported ${n}`)).catch((e) => setNote(`Export failed: ${String(e)}`)).finally(() => setBusy(false)); }}>
          {busy ? "Exporting…" : "Export xlsx"}
        </button>
        {offline && <span className="hint">Read-only offline copy</span>}
        {note && <span className="hint" role="status">{note}</span>}
      </div>

      <div className={`gs-wrap${draft ? " has-panel" : ""}`}>
        <div className="gs-list">
          <p className="hint">{shown} of {guests.households.length} households · {friends.length} of {guests.friends.length} friend groups</p>
          {groups.map((g) => (
            <section key={g.key} className="gs-group" aria-label={`${g.family}: ${g.side}`}>
              <h3 className="gs-group-head">{g.family} · {g.side}</h3>
              {g.rows.map(({ h, people }) => (
                <button key={h.HouseholdID} type="button" className={`gs-row-btn${selId === h.HouseholdID ? " sel" : ""}`} aria-current={selId === h.HouseholdID} onClick={() => openHH(h.HouseholdID)}>
                  <span className="gs-name">{h.PrimaryHouseholdName}</span>
                  <span className="gs-meta">{people.length} {people.length === 1 ? "person" : "people"}
                    {householdHasIssue(h, people, ids) && <b className="gs-warn" role="img" aria-label="has validation issues"> ⚠</b>}
                  </span>
                </button>
              ))}
            </section>
          ))}
          {friends.length > 0 && (
            <section className="gs-group" aria-label="Friends">
              <h3 className="gs-group-head">Friends</h3>
              {friends.map((g) => (
                <button key={g.FriendGroupID} type="button" className={`gs-row-btn${selId === g.FriendGroupID ? " sel" : ""}`} aria-current={selId === g.FriendGroupID} onClick={() => openFriend(g.FriendGroupID)}>
                  <span className="gs-name">{g.GroupName}</span>
                  <span className="gs-meta">{g.PlusOneDefault === "Yes" ? "2 people" : "1 person"}
                    {ids.has(g.FriendGroupID) && <b className="gs-warn" role="img" aria-label="has validation issues"> ⚠</b>}
                  </span>
                </button>
              ))}
            </section>
          )}
          {shown === 0 && friends.length === 0 && <p className="hint">{guests.households.length + guests.friends.length === 0 ? "No guests yet." : "Nothing matches these filters."}</p>}
        </div>

        {draft ? (
          <Panel key={`${draft.kind}:${draft.id ?? draft.tmp}`} draft={draft} setDraft={setDraft} onClose={close} onSaved={() => { close(); setNote("Saved"); }} />
        ) : (
          <aside className="gs-panel-empty hint">Select a household or friend group to edit it.</aside>
        )}
      </div>
    </div>
  );
}
