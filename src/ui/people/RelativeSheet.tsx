// "Add relative" mini-sheet (REVIEW-v6 R1): first, last, age, household. Links, side, branch, generation and kids' room
// come from the person it is added to (src/people/relatives.ts). One save.
import { useMemo, useState } from "react";
import { defaultHousehold, REL_LABEL, relativeIssues, relativeOps, type RelativeInput, type RelKind } from "../../people/relatives";
import { displayName, type Age } from "../../people/types";
import { branchName } from "../../data/params";
import { useData, type SaveResult } from "../data";
import { Button, Field, Segmented, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";

export interface RelativeTarget { of: string; rel: RelKind; key: string }

const ART: Record<RelKind, string> = { partner: "a partner", child: "a child", sibling: "a sibling", parent: "a parent" };

export function RelativeSheet({ target, onClose }: { target: RelativeTarget | null; onClose(): void }) {
  const { people, save, version, settings } = useData();
  const of = target ? people.people.find((p) => p.id === target.of) : undefined;
  const rel = target?.rel ?? "child";
  const byId = useMemo(() => new Map(people.people.map((p) => [p.id, p])), [people.people]);
  const startAge: Age = rel === "child" && of?.kind !== "couple" && of?.age !== "child" ? "child" : of?.age ?? "adult";
  const [d, setD] = useState<RelativeInput>(() => ({
    first: "", last: rel === "partner" ? "" : of?.last ?? "", age: rel === "parent" ? "adult" : startAge,
    household: of ? defaultHousehold(of, rel, rel === "parent" ? "adult" : startAge) : "new", householdName: "",
  }));
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof RelativeInput>(k: K, v: RelativeInput[K]) => setD((x) => ({ ...x, [k]: v }));
  const ofParty = of?.party_id ? people.parties.find((x) => x.id === of.party_id) : undefined;
  const others = useMemo(() => [...people.parties].filter((x) => x.id !== of?.party_id).sort((a, b) => a.name.localeCompare(b.name)), [people.parties, of?.party_id]);
  const name = of ? displayName(of) : "";

  const onSave = async () => {
    if (!of || !target) return;
    const issues = relativeIssues(d);
    setProblems(issues);
    if (issues.length) return;
    const v = version("people", of.id);
    if (v === undefined) { setErr({ ok: false, kind: "not_found", message: `${name} no longer exists.` }); return; }
    setBusy(true);
    const r = await save(relativeOps({ ...of, version: v }, rel, d, byId));
    setBusy(false);
    if (r.ok) onClose(); else setErr(r);
  };

  return (
    <Sheet title={of ? `Add ${ART[rel]} of ${name}` : "Add relative"} open={!!target} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" disabled={busy || !of} onClick={() => void onSave()}>{busy ? "Saving…" : `Add ${REL_LABEL[rel].toLowerCase()}`}</Button></>}>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {problems.length > 0 && <div className="flag warn" role="alert"><ul className="save-issues">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {!of ? <p className="muted">This person no longer exists.</p> : (
        <div className="pp-form">
          <Field label="First name"><input value={d.first} onChange={(e) => set("first", e.target.value)} autoComplete="off" autoFocus /></Field>
          <Field label="Last name"><input value={d.last} onChange={(e) => set("last", e.target.value)} autoComplete="off" /></Field>
          <div className="k-field wide">
            <span className="k-field-label">Age</span>
            <Segmented<Age> label="Age" value={d.age} onChange={(v) => setD((x) => ({ ...x, age: v, household: x.household === "same" || x.household === "new" ? defaultHousehold(of, rel, v) : x.household }))}
              options={[{ value: "adult", label: "Adult", tone: "euc" }, { value: "child", label: "Child (kids' room)", tone: "euc" }]} />
          </div>
          <Field label="Household (envelope)" wide>
            <select value={d.household} onChange={(e) => set("household", e.target.value)}>
              {ofParty && <option value="same">Same as {name}: {ofParty.name}</option>}
              <option value="new">New household…</option>
              {others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          {d.household === "new" && (
            <Field label="New household name" wide>
              <input value={d.householdName} placeholder={`${d.last.trim() || d.first.trim() || "New"} household`} onChange={(e) => set("householdName", e.target.value)} />
            </Field>
          )}
          <p className="pp-auto wide">Filled in for you: {rel === "partner" ? `partner of ${name}` : rel === "child" ? `child of ${name}${of.partner_id ? ` and ${displayName(byId.get(of.partner_id) ?? of)}` : ""}` : rel === "sibling" ? (of.parent_ids.length ? `same parents as ${name}` : `sibling of ${name} (linked through a "parents" placeholder)`) : `parent of ${name}`} · {of.side}'s side{of.branch ? ` · ${branchName(settings, of.branch)}` : ""} · generation from the tree.</p>
        </div>
      )}
    </Sheet>
  );
}
