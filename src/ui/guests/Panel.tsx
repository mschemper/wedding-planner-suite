// Side panel: edit one household (and its people) or one friend group on a local draft; one Save builds the Op[].
import { useId, useMemo, useState, type ReactNode } from "react";
import { ENUMS, type GuestData } from "../../guests/schema";
import { validateGuests, type Issue } from "../../guests/validate";
import { useData, type SaveResult } from "../data";
import { SaveError } from "../SaveError";
import {
  FRIEND_FIELDS, HH_FIELDS, applyDraft, blankPerson, buildOps, issuesFor, joinIds, livePeople, setHouseholdField, splitIds, type Draft, type PersonDraft,
} from "./model";

type Fail = Extract<SaveResult, { ok: false }>;

const SPECIAL: Record<string, readonly string[]> = {
  Family: ENUMS.Family, AdultOrChild: ENUMS.AdultOrChild, Locality: ENUMS.Locality, InviteStatus: ENUMS.InviteStatus,
  InviteException: ENUMS.YesNo, PlusOneDefault: ENUMS.YesNo, InvitePriority: ["Core", "Review"],
};
const LONG = new Set(["Notes"]);
const LISTED = ["FamilySide", "HouseholdType", "GenerationGroup", "HouseholdRole", "FriendCategory", "InviteTier", "RelationshipToMark", "RelationshipToAngela"];

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`gs-field${wide ? " wide" : ""}`}><span>{label}</span>{children}</label>;
}

function Input({ name, value, onChange, listId, placeholder }: { name: string; value: string; onChange(v: string): void; listId?: string; placeholder?: string }) {
  const opts = SPECIAL[name];
  if (opts) {
    const all = value && !opts.includes(value) ? [value, ...opts] : opts;
    return <select value={value} onChange={(e) => onChange(e.target.value)}>{!value && <option value="" />}{all.map((o) => <option key={o}>{o}</option>)}</select>;
  }
  if (LONG.has(name)) return <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />;
  return <input type="text" value={value} placeholder={placeholder} list={listId} onChange={(e) => onChange(e.target.value)} />;
}

function Issues({ list }: { list: Issue[] }) {
  if (!list.length) return null;
  return <ul className="gs-issues">{list.map((i) => <li key={i.msg} className={i.level}>{i.level === "error" ? "Error" : "Check"}: {i.msg}</li>)}</ul>;
}

function distinct(d: GuestData) {
  const sets: Record<string, Set<string>> = {};
  const add = (k: string, rows: object[]) => {
    const s = (sets[k] ??= new Set<string>());
    for (const r of rows) { const v = (r as Record<string, unknown>)[k]; if (typeof v === "string" && v) s.add(v); }
  };
  add("FamilySide", d.households); add("HouseholdType", d.households);
  for (const k of ["GenerationGroup", "HouseholdRole", "RelationshipToMark", "RelationshipToAngela"]) add(k, d.individuals);
  add("FriendCategory", d.friends); add("InviteTier", d.friends);
  const out: Record<string, string[]> = {};
  for (const k of Object.keys(sets)) out[k] = [...sets[k]].sort();
  return out;
}

export function Panel({ draft, setDraft, onClose, onSaved }: { draft: Draft; setDraft(d: Draft): void; onClose(): void; onSaved(): void }) {
  const { guests, raw, offline, save } = useData();
  const uid = useId();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<Fail | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(draft.kind === "household" ? draft.people.filter((p) => p.isNew).map((p) => p.id) : []));
  const [confirm, setConfirm] = useState<string | null>(null);

  const merged = useMemo(() => applyDraft(guests, draft), [guests, draft]);
  const issues = useMemo(() => validateGuests(merged), [merged]);
  const mine = useMemo(() => issuesFor(draft, issues), [draft, issues]);
  const lists = useMemo(() => distinct(guests), [guests]);
  const opCount = useMemo(() => { try { return buildOps(draft, guests, raw).length; } catch { return 1; } }, [draft, guests, raw]);

  const listFor = (k: string) => (LISTED.includes(k) ? `${uid}-${k}` : undefined);
  const hh = draft.kind === "household" ? draft : null;
  const people = hh ? livePeople(hh) : [];
  const personName = (p: PersonDraft) => p.row.DisplayName.trim() || `${p.row.FirstName} ${p.row.LastName}`.trim() || "(new person)";

  const run = async (d: Draft) => {
    setSaving(true);
    setErr(null);
    let ops;
    try { ops = buildOps(d, guests, raw); } catch (e) { setErr({ ok: false, kind: "server", message: String(e instanceof Error ? e.message : e) }); setSaving(false); return; }
    if (!ops.length) { setSaving(false); onClose(); return; }
    const r = await save(ops);
    setSaving(false);
    if (r.ok) onSaved(); else setErr(r);
  };

  const setRow = (k: string, v: string) => setDraft(hh ? setHouseholdField(hh, k, v) : ({ ...draft, row: { ...draft.row, [k]: v } } as Draft));
  const setPerson = (id: string, k: string, v: string) => {
    if (hh) setDraft({ ...hh, people: hh.people.map((p) => (p.id === id ? { ...p, row: { ...p.row, [k]: v } } : p)) });
  };
  const removePerson = (id: string) => {
    if (!hh) return;
    const p = hh.people.find((x) => x.id === id);
    const scrub = (x: PersonDraft): PersonDraft => ({
      ...x, row: { ...x.row, PartnerPersonID: x.row.PartnerPersonID === id ? "" : x.row.PartnerPersonID, ParentPersonIDs: joinIds(splitIds(x.row.ParentPersonIDs).filter((i) => i !== id)) },
    });
    setDraft({
      ...hh,
      people: (p?.isNew ? hh.people.filter((x) => x.id !== id) : hh.people).map(scrub),
      removed: p?.isNew ? hh.removed : [...hh.removed, id],
    });
    setConfirm(null);
  };
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const title = hh ? (hh.row.PrimaryHouseholdName || "New household") : (draft.row.GroupName || "New friend group");
  const isNew = draft.id === null;
  const dismiss = () => { const stale = err?.kind === "conflict" || err?.kind === "not_found"; setErr(null); if (stale) onClose(); };
  const ro = offline;

  const renderField = (k: string, v: string, set: (v: string) => void, placeholder?: string) => (
    <Field key={k} label={k} wide={LONG.has(k)}><Input name={k} value={v} onChange={set} listId={listFor(k)} placeholder={placeholder} /></Field>
  );

  return (
    <aside className="gs-panel" aria-label={`Edit ${title}`}>
      <div className="gs-panel-head">
        <h2 tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>{title}</h2>
        <button className="gs-btn" onClick={onClose} aria-label="Close panel">Close</button>
      </div>
      {ro && <p className="flag">Read-only offline copy</p>}
      {LISTED.map((k) => lists[k] && <datalist key={k} id={`${uid}-${k}`}>{lists[k].map((o) => <option key={o} value={o} />)}</datalist>)}

      <fieldset className="gs-fs" disabled={ro || saving}>
        <legend className="gs-legend">{hh ? "Household" : "Friend group"}</legend>
        <div className="gs-fields">
          {(hh ? HH_FIELDS : FRIEND_FIELDS).map((k) => renderField(k, draft.row[k] ?? "", (v) => setRow(k, v)))}
          {hh && isNew && (
            <Field label="ID branch (2–4 letters)">
              <input type="text" maxLength={4} value={hh.branch} placeholder="e.g. COU" onChange={(e) => setDraft({ ...hh, branch: e.target.value.replace(/[^A-Za-z]/g, "") })} />
            </Field>
          )}
        </div>
        <Issues list={mine.hh} />

        {hh && (
          <div className="gs-people">
            <h3 className="gs-sub">People ({people.length})</h3>
            {people.map((p) => {
              const isOpen = open.has(p.id);
              const pi = mine.byPerson.get(p.id) ?? [];
              const others = merged.individuals.filter((x) => x.PersonID !== p.id).sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));
              const parents = splitIds(p.row.ParentPersonIDs);
              const label = (id: string) => { const x = merged.individuals.find((q) => q.PersonID === id); return x ? `${x.DisplayName}${id.startsWith("tmp:") ? " (new)" : ` (${id})`}` : id; };
              return (
                <div key={p.id} className="gs-person">
                  <button type="button" className="gs-person-head" aria-expanded={isOpen} onClick={() => toggle(p.id)}>
                    <span>{isOpen ? "▾" : "▸"} {personName(p)}</span>
                    <span className="gs-person-meta">{p.row.InviteStatus}{pi.length > 0 && <b aria-label="has issues"> ⚠</b>}</span>
                  </button>
                  {!isOpen && <Issues list={pi} />}
                  {isOpen && (
                    <div className="gs-person-body">
                      <div className="gs-fields">
                        {["FirstName", "LastName"].map((k) => renderField(k, p.row[k], (v) => setPerson(p.id, k, v)))}
                        {renderField("DisplayName", p.row.DisplayName, (v) => setPerson(p.id, "DisplayName", v), `${p.row.FirstName} ${p.row.LastName}`.trim() || "First Last")}
                        {["AdultOrChild", "Locality", "CityState", "InviteStatus", "InvitePriority", "InviteException", "ExceptionReason", "RelationshipToMark", "RelationshipToAngela", "GenerationGroup", "HouseholdRole"]
                          .map((k) => renderField(k, p.row[k], (v) => setPerson(p.id, k, v)))}
                        <Field label="PartnerPersonID">
                          <select value={p.row.PartnerPersonID} onChange={(e) => setPerson(p.id, "PartnerPersonID", e.target.value)}>
                            <option value="">— none —</option>
                            {p.row.PartnerPersonID && !others.some((o) => o.PersonID === p.row.PartnerPersonID) && <option value={p.row.PartnerPersonID}>{p.row.PartnerPersonID} (unknown)</option>}
                            {others.map((o) => <option key={o.PersonID} value={o.PersonID}>{label(o.PersonID)}</option>)}
                          </select>
                        </Field>
                        <div className="gs-field wide">
                          <details>
                            <summary>ParentPersonIDs{parents.length ? `: ${parents.map((id) => label(id)).join(", ")}` : " (none)"}</summary>
                            <div className="gs-checks" role="group" aria-label={`Parents of ${personName(p)}`}>
                              {others.map((o) => (
                                <label key={o.PersonID} className="gs-check">
                                  <input type="checkbox" checked={parents.includes(o.PersonID)}
                                    onChange={(e) => setPerson(p.id, "ParentPersonIDs", joinIds(e.target.checked ? [...parents, o.PersonID] : parents.filter((i) => i !== o.PersonID)))} />
                                  {label(o.PersonID)}
                                </label>
                              ))}
                            </div>
                          </details>
                        </div>
                        {renderField("Notes", p.row.Notes, (v) => setPerson(p.id, "Notes", v))}
                      </div>
                      <Issues list={pi} />
                      {confirm === p.id ? (
                        <p className="gs-confirm" role="alert">Remove {personName(p)}?{" "}
                          <button type="button" className="gs-btn danger" onClick={() => removePerson(p.id)}>Remove</button>{" "}
                          <button type="button" className="gs-btn" onClick={() => setConfirm(null)}>Keep</button></p>
                      ) : (
                        <button type="button" className="link-btn" onClick={() => setConfirm(p.id)}>Remove person</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="gs-btn" onClick={() => { const p = blankPerson(hh.row); setDraft({ ...hh, people: [...hh.people, p] }); setOpen((s) => new Set(s).add(p.id)); }}>+ person</button>
          </div>
        )}
      </fieldset>

      {err && <SaveError result={err} onDismiss={dismiss} />}

      {!ro && (
        <div className="gs-actions">
          <button type="button" className="gs-btn primary" disabled={saving || opCount === 0} onClick={() => void run(draft)}>{saving ? "Saving…" : opCount === 0 ? "No changes" : "Save"}</button>
          <button type="button" className="gs-btn" onClick={onClose} disabled={saving}>Cancel</button>
          {!isNew && (confirm === "del" ? (
            <span className="gs-confirm" role="alert">
              Delete {hh ? `household and ${hh.people.filter((p) => !p.isNew).length} saved people` : "friend group"}?{" "}
              <button type="button" className="gs-btn danger" disabled={saving} onClick={() => void run({ ...draft, del: true })}>Delete</button>{" "}
              <button type="button" className="gs-btn" onClick={() => setConfirm(null)}>Keep</button>
            </span>
          ) : (
            <button type="button" className="link-btn" disabled={saving} onClick={() => setConfirm("del")}>{hh ? "Delete household" : "Delete friend group"}</button>
          ))}
        </div>
      )}
    </aside>
  );
}
