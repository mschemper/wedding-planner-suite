// Quick-add a friend (v9: moved from the Friends view into the Add menu). A Sheet that stays open so several friends go in a row.
import { useId, useMemo, useState } from "react";
import type { Ring } from "../../people/rings";
import { FRIEND_TIER_LABEL } from "../../people/tier";
import { KNOWN_BY, type KnownBy } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { friendTiers, quickFriendIssues, quickFriendOps, type QuickFriend } from "./model";

export function QuickAddFriend({ rings, onClose }: { rings: Ring[]; onClose(): void }) {
  const { save, people } = useData();
  const list = useId();
  const byTier = useMemo(() => friendTiers(rings, FRIEND_TIER_LABEL), [rings]);
  const circles = useMemo(() => [...new Set(people.parties.map((p) => p.circle).filter((c): c is string => !!c))].sort(), [people.parties]);
  const blank: QuickFriend = { first: "", last: "", partner: "", partnerLast: "", plusOne: false, circle: "", known_by: "Both", tier: 2 };
  const [f, setF] = useState<QuickFriend>(blank);
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState("");
  const set = <K extends keyof QuickFriend>(k: K, v: QuickFriend[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const issues = quickFriendIssues(f);
    setProblems(issues);
    if (issues.length) return;
    setBusy(true);
    const r = await save(quickFriendOps({ ...f, partnerLast: f.partnerLast?.trim() || f.last }, byTier.find((t) => t.tier === f.tier)?.rows.map((x) => x.party) ?? []));
    setBusy(false);
    if (r.ok) { setErr(null); setAdded(`Added ${f.first.trim()}.`); setF({ ...blank, circle: f.circle, known_by: f.known_by, tier: f.tier }); } else { setAdded(""); setErr(r); }
  };
  return (
    <Sheet title="Quick-add a friend" open onClose={onClose}>
      <form className="pp-quick" onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-label="Add a friend">
        <SaveError result={err} onDismiss={() => setErr(null)} />
        {problems.length > 0 && <div className="flag warn" role="alert">{problems.join(" ")}</div>}
        {added && <p className="small" role="status">{added}</p>}
        <div className="pp-quick-grid">
          <Field label="First name"><input value={f.first} onChange={(e) => set("first", e.target.value)} autoComplete="off" /></Field>
          <Field label="Last name"><input value={f.last} onChange={(e) => set("last", e.target.value)} autoComplete="off" /></Field>
          <Field label="Partner's first name"><input value={f.partner} disabled={f.plusOne} onChange={(e) => set("partner", e.target.value)} autoComplete="off" /></Field>
          <Field label="Partner's last name" hint="Leave empty if the same"><input value={f.partnerLast} disabled={f.plusOne || !f.partner.trim()} onChange={(e) => set("partnerLast", e.target.value)} placeholder={f.last} autoComplete="off" /></Field>
          <label className="pp-check"><input type="checkbox" checked={f.plusOne} disabled={!!f.partner.trim()} onChange={(e) => set("plusOne", e.target.checked)} /> +1 (unnamed guest)</label>
          <Field label="Circle">
            <input list={list} value={f.circle} onChange={(e) => set("circle", e.target.value)} placeholder="Work, College…" />
            <datalist id={list}>{circles.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Known by"><select value={f.known_by} onChange={(e) => set("known_by", e.target.value as KnownBy)}>{KNOWN_BY.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Tier"><select value={f.tier} onChange={(e) => set("tier", Number(e.target.value))}>{[1, 2, 3].map((t) => <option key={t} value={t}>{FRIEND_TIER_LABEL[t]}</option>)}</select></Field>
          <button type="submit" className="k-btn k-btn-primary pp-quick-go" disabled={busy}>{busy ? "Adding…" : "Add friend"}</button>
        </div>
      </form>
    </Sheet>
  );
}
