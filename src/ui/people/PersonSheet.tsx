// Edit details / add person sheet. Draft + Save via save() (one atomic batch; tmp ids for a new household).
import { useId, useMemo, useRef, useState } from "react";
import { graph, ancestors } from "../../people/kin";
import { AGES, LOCALS, RSVPS, SIDES, displayName, type Person } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { draftFrom, draftIssues, defaultHouseholdName, personOps, type PersonDraft, type Versioned } from "./model";

export type SheetTarget =
  | { mode: "edit"; id: string; focus?: "parents"; key: string }
  | { mode: "new"; defaults: Partial<Person>; party?: "new" | ""; parentOf?: string; focus?: "parents"; key: string };

export type SheetRequest = SheetTarget extends infer T ? (T extends unknown ? Omit<T, "key"> : never) : never;

function PersonPicker({ label, people, selected, max, onChange, exclude, autoFocus }: {
  label: string; people: Person[]; selected: string[]; max: number; onChange(ids: string[]): void; exclude: Set<string>; autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return people.filter((p) => !exclude.has(p.id) && !selected.includes(p.id) && `${displayName(p)} ${p.first} ${p.last ?? ""}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, people, exclude, selected]);
  return (
    <div className="k-field wide">
      <span className="k-field-label">{label}</span>
      <div className="pp-picked">
        {selected.map((id) => (
          <span key={id} className="pp-pick">{byId.get(id) ? displayName(byId.get(id)!) : id}
            <button type="button" className="pp-x" aria-label={`Remove ${byId.get(id) ? displayName(byId.get(id)!) : id}`} onClick={() => onChange(selected.filter((x) => x !== id))}>✕</button>
          </span>
        ))}
        {selected.length === 0 && <span className="muted small">none</span>}
      </div>
      {selected.length < max && (
        <>
          <input className="k-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label={`Search people for ${label}`} autoFocus={autoFocus} />
          {hits.length > 0 && (
            <ul className="pp-hits">
              {hits.map((p) => <li key={p.id}><button type="button" onClick={() => { onChange([...selected, p.id]); setQ(""); }}>{displayName(p)}<small>{[p.branch, p.kind === "couple" ? "the couple" : null].filter(Boolean).join(" · ")}</small></button></li>)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

const Check = ({ label, on, set }: { label: string; on: boolean; set(v: boolean): void }) => (
  <label className="pp-check"><input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /> {label}</label>
);

export function PersonSheet({ target, onClose }: { target: SheetTarget | null; onClose(): void }) {
  const { people, save, version } = useData();
  const listId = useId();
  const original = target?.mode === "edit" ? people.people.find((p) => p.id === target.id) : undefined;
  const [draft, setDraft] = useState<PersonDraft>(() =>
    target?.mode === "edit" ? draftFrom(original) : target?.mode === "new" ? draftFrom(target.defaults, target.party ?? "new") : draftFrom());
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const nameTouched = useRef(false);
  const g = useMemo(() => graph(people.people), [people.people]);
  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const branches = useMemo(() => [...new Set(people.people.map((p) => p.branch).filter((b): b is string => !!b))].sort(), [people.people]);
  const parties = useMemo(() => [...people.parties].sort((a, b) => a.name.localeCompare(b.name)), [people.parties]);
  const selfId = original?.id;
  const noSelf = useMemo(() => new Set(selfId ? [selfId] : []), [selfId]);
  // a parent cannot be one of the person's own descendants
  const noParent = useMemo(() => {
    const s = new Set(noSelf);
    if (selfId) for (const p of people.people) if (ancestors(g, p.id).has(selfId)) s.add(p.id);
    return s;
  }, [g, people.people, selfId, noSelf]);
  const isCouple = original?.kind === "couple";
  const isPlaceholder = !!original?.placeholder;
  const needsParty = !isCouple && !isPlaceholder;
  const open = !!target;

  const onSave = async () => {
    const issues = draftIssues(draft, { needsParty });
    setProblems(issues);
    if (issues.length) return;
    let parentOf: Versioned<Pick<Person, "id" | "parent_ids">> | undefined;
    if (target?.mode === "new" && target.parentOf) {
      const c = people.people.find((p) => p.id === target.parentOf);
      const v = c ? version("people", c.id) : undefined;
      if (c && v !== undefined) parentOf = { id: c.id, parent_ids: c.parent_ids, version: v };
    }
    const ov = original ? version("people", original.id) : undefined;
    if (original && ov === undefined) { setErr({ ok: false, kind: "not_found", message: `${displayName(original)} no longer exists.` }); return; }
    const ops = personOps({ draft, original: original && ov !== undefined ? { ...original, version: ov } : undefined, needsParty, parentOf });
    if (!ops.length) { onClose(); return; }
    setBusy(true);
    const r = await save(ops);
    setBusy(false);
    if (r.ok) onClose(); else setErr(r);
  };
  const onDelete = async () => {
    if (!original) return;
    const v = version("people", original.id);
    if (v === undefined) return;
    setBusy(true);
    const r = await save([{ table: "people", op: "delete", id: original.id, version: v }]);
    setBusy(false);
    if (r.ok) onClose(); else { setErr(r); setConfirmDel(false); }
  };

  const title = target?.mode === "edit" ? `Edit details · ${original ? displayName(original) : ""}` : "Add person";
  return (
    <Sheet title={title} open={open} onClose={onClose}
      footer={confirmDel ? (
        <>
          <span className="small">Delete {original ? displayName(original) : "this person"}? Links to them are cleared.</span>
          <Button kind="danger" disabled={busy} onClick={() => void onDelete()}>Yes, delete</Button>
          <Button onClick={() => setConfirmDel(false)}>Keep</Button>
        </>
      ) : (
        <>
          {original && !isCouple && <Button kind="danger" onClick={() => setConfirmDel(true)}>Delete person</Button>}
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy} onClick={() => void onSave()}>{busy ? "Saving…" : "Save"}</Button>
        </>
      )}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert"><ul className="save-issues">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      <div className="pp-form">
        <Field label="First name"><input value={draft.first} onChange={(e) => set("first", e.target.value)} autoComplete="off" /></Field>
        <Field label="Last name"><input value={draft.last} onChange={(e) => set("last", e.target.value)} autoComplete="off" /></Field>
        <Field label="Nickname" hint="Shown instead of the first name"><input value={draft.nick} onChange={(e) => set("nick", e.target.value)} autoComplete="off" /></Field>
        <Field label="Age">
          <select value={draft.age} onChange={(e) => set("age", e.target.value as PersonDraft["age"])}>{AGES.map((a) => <option key={a} value={a}>{a}</option>)}</select>
        </Field>
        <Field label="Side"><select value={draft.side} onChange={(e) => set("side", e.target.value as PersonDraft["side"])}>{SIDES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Local?"><select value={draft.local} onChange={(e) => set("local", e.target.value as PersonDraft["local"])}>{LOCALS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        {!isCouple && (
          <div className="k-field wide">
            <span className="k-field-label">Kind</span>
            <Segmented label="Kind" value={draft.kind === "couple" ? "family" : draft.kind} onChange={(v) => set("kind", v)}
              options={[{ value: "family", label: "Family", tone: "euc" }, { value: "friend", label: "Friend", tone: "euc" }]} />
          </div>
        )}
        {draft.kind === "friend"
          ? <Field label="Circle (friends)" wide><input value={draft.circle} onChange={(e) => set("circle", e.target.value)} placeholder="Work, College…" /></Field>
          : <>
            <Field label="Branch" hint="Pick or type a new one"><input list={listId} value={draft.branch} onChange={(e) => set("branch", e.target.value)} /><datalist id={listId}>{branches.map((b) => <option key={b} value={b} />)}</datalist></Field>
            <Field label="Generation" hint="0 couple/cousins, -1 parents, -2 grandparents, 1 kids">
              <input inputMode="numeric" value={draft.gen} onChange={(e) => set("gen", e.target.value)} />
            </Field>
          </>}
        {needsParty && (
          <>
            <Field label="Household" wide>
              <select value={draft.party} onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, party: v, partyName: v === "new" && !nameTouched.current ? defaultHouseholdName(d) : d.partyName }));
              }}>
                <option value="">Choose…</option>
                {parties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                <option value="new">New household…</option>
              </select>
            </Field>
            {draft.party === "new" && (
              <Field label="New household name (envelope)" wide>
                <input value={draft.partyName || defaultHouseholdName(draft)} onChange={(e) => { nameTouched.current = true; set("partyName", e.target.value); }} />
              </Field>
            )}
          </>
        )}
        <PersonPicker label="Partner" people={people.people} selected={draft.partner_id ? [draft.partner_id] : []} max={1} exclude={noSelf} onChange={(ids) => set("partner_id", ids[0] ?? null)} />
        <PersonPicker label="Parents (up to 2)" people={people.people} selected={draft.parent_ids} max={2} exclude={noParent} onChange={(ids) => set("parent_ids", ids)} autoFocus={target?.focus === "parents"} />
        {needsParty && (
          <div className="k-field wide">
            <span className="k-field-label">Exception to the household</span>
            <Segmented label="Exception to the household" value={draft.override || "none"} onChange={(v) => set("override", v === "none" ? "" : v)}
              options={[{ value: "none", label: "Follows household", tone: "plain" }, { value: "invite", label: "Invite anyway", tone: "euc" }, { value: "no", label: "Don't invite", tone: "plain" }]} />
            <span className="k-field-hint">Only for one person who differs from their household's decision.</span>
          </div>
        )}
        <Field label="RSVP"><select value={draft.rsvp} onChange={(e) => set("rsvp", e.target.value as PersonDraft["rsvp"])}>{RSVPS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div className="pp-checks">
          <Check label="Kids' room" on={draft.kids_room} set={(v) => set("kids_room", v)} />
          <Check label="Plus-one" on={draft.plus_one} set={(v) => set("plus_one", v)} />
          <Check label="Deceased" on={draft.deceased} set={(v) => set("deceased", v)} />
        </div>
        <Field label="Relationship label" hint="Used when the tree can't work it out" wide><input value={draft.label} onChange={(e) => set("label", e.target.value)} /></Field>
        <Field label="Notes" wide><textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      </div>
    </Sheet>
  );
}
