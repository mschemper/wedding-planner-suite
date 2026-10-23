// Add venue (v7): name -> Claude research (or by hand) -> editable preview -> one atomic save (venue, shortlist row, follow-up task).
import { useMemo, useRef, useState } from "react";
import { api, ApiFailure } from "../../api/client";
import { BUDGET_CATEGORIES, customScenario, nextCustomId } from "../../data/custom";
import { computeBudget } from "../../engine/compute";
import type { Category } from "../../engine/types";
import { chicagoToday } from "../../plan/tasks";
import { useCompare } from "../compare";
import { useData, type SaveResult } from "../data";
import { money } from "../format";
import { Button, Field, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import {
  addVenueOps, blankDraft, blankItem, confidenceWords, draftFromResearch, draftIssues, parseNum, safeUrl, venueFromDraft,
  type ItemDraft, type VenueFormDraft,
} from "./model";

const TYPE_LABEL: Record<ItemDraft["type"], string> = { fixed: "Fixed $", perGuest: "$ per guest", percent: "% of taxable lines" };

function Items({ items, onChange }: { items: ItemDraft[]; onChange(next: ItemDraft[]): void }) {
  const upd = (i: number, patch: Partial<ItemDraft>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="av-items">
      {items.length === 0 && <p className="vn-meta">No price lines yet. Without lines the venue shows "awaiting rate sheet".</p>}
      {items.map((it, i) => (
        <fieldset key={i} className="av-item">
          <legend>Line {i + 1}</legend>
          <Field label="Category">
            <select value={it.cat} onChange={(e) => upd(i, { cat: e.target.value as Category })}>
              {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description"><input value={it.desc} onChange={(e) => upd(i, { desc: e.target.value })} /></Field>
          <Field label="Type">
            <select value={it.type} onChange={(e) => upd(i, { type: e.target.value as ItemDraft["type"], value: "" })}>
              {(Object.keys(TYPE_LABEL) as ItemDraft["type"][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label={it.type === "percent" ? "Percent (e.g. 22)" : it.type === "perGuest" ? "Dollars per guest" : "Amount in dollars"}>
            <input inputMode="decimal" value={it.value} onChange={(e) => upd(i, { value: e.target.value })} />
          </Field>
          <Field label="Source link"><input type="url" inputMode="url" value={it.source_url} onChange={(e) => upd(i, { source_url: e.target.value })} /></Field>
          <Field label="Note"><input value={it.note} onChange={(e) => upd(i, { note: e.target.value })} /></Field>
          <label className="av-check"><input type="checkbox" checked={it.taxable} onChange={(e) => upd(i, { taxable: e.target.checked })} /> Taxable (service and tax apply)</label>
          <Button kind="quiet" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove line {i + 1}</Button>
        </fieldset>
      ))}
      <Button onClick={() => onChange([...items, blankItem()])}>Add line</Button>
    </div>
  );
}

function Preview({ d, setD, guestsLabel, guests }: { d: VenueFormDraft; setD(d: VenueFormDraft): void; guestsLabel: string; guests: number }) {
  const set = (patch: Partial<VenueFormDraft>) => setD({ ...d, ...patch });
  const total = useMemo(() => {
    const v = venueFromDraft(d, 9999);
    if (!v.items.length) return null;
    try { return computeBudget(customScenario(v), guests).total; } catch { return null; }
  }, [d, guests]);
  const conf = parseNum(d.confidence) ?? 0;
  const web = safeUrl(d.website);
  const links = d.sources.map((u) => safeUrl(u)).filter((u): u is string => !!u);
  return (
    <div className="av-form">
      {d.researched_at && <p className="flag"><strong>Researched on the web {d.researched_at}. </strong>Check every number with the venue before relying on it.</p>}
      {d.summary && <p className="av-summary">{d.summary}</p>}
      <div className="av-grid">
        <Field label="Venue name"><input value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Location"><input value={d.location} onChange={(e) => set({ location: e.target.value })} /></Field>
        <Field label="Website" hint={web ? undefined : "Starts with https://"}><input type="url" inputMode="url" value={d.website} onChange={(e) => set({ website: e.target.value })} /></Field>
        <Field label="Kind">
          <select value={d.kind} onChange={(e) => set({ kind: e.target.value as VenueFormDraft["kind"] })}>
            <option value="local">Local (no travel)</option><option value="destination">Destination (travel and lodging)</option>
          </select>
        </Field>
        <Field label="Description" wide><textarea rows={3} value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      </div>
      {web && <p className="vn-meta"><a href={web} target="_blank" rel="noopener noreferrer">Open website<span className="sr-only"> (opens in a new tab)</span></a></p>}

      <h3 className="vn-h3">Capacity</h3>
      <div className="av-grid">
        <Field label="Adults seated"><input inputMode="numeric" value={d.seated} onChange={(e) => set({ seated: e.target.value })} /></Field>
        <Field label="Kids' room seats" hint="Blank = no kids' room"><input inputMode="numeric" value={d.kids} onChange={(e) => set({ kids: e.target.value })} /></Field>
        <Field label="Cocktail"><input inputMode="numeric" value={d.cocktail} onChange={(e) => set({ cocktail: e.target.value })} /></Field>
      </div>

      <h3 className="vn-h3">Price lines</h3>
      <Items items={d.items} onChange={(items) => set({ items })} />
      <p className="av-total" role="status">
        {total == null ? "No total until there are price lines." : `≈ ${money(total)} total at ${guestsLabel}. Kids are priced as adults (${guests} guests).`}
      </p>

      <h3 className="vn-h3">How sure is this?</h3>
      <div className="av-grid">
        <Field label="Confidence (0 to 100)" hint={`${Math.max(0, Math.min(100, conf))}%: ${confidenceWords(conf)}`}>
          <input inputMode="numeric" value={d.confidence} onChange={(e) => set({ confidence: e.target.value })} />
        </Field>
      </div>
      {links.length > 0 && (
        <>
          <h3 className="vn-h3">Sources</h3>
          <ul className="vn-plain">{links.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer">{u.replace(/^https?:\/\//, "")}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>
        </>
      )}
    </div>
  );
}

export function AddVenueButton({ onAdded }: { onAdded(id: number, name: string): void }) {
  const { scenarios, save, offline } = useData();
  const { guests, guestsLabel } = useCompare();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"find" | "preview">("find");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [d, setD] = useState<VenueFormDraft>(() => blankDraft());
  const [busy, setBusy] = useState<"research" | "save" | null>(null);
  const [msg, setMsg] = useState("");
  const [fail, setFail] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const abort = useRef<AbortController | null>(null);

  function reset() { abort.current?.abort(); setStep("find"); setName(""); setCity(""); setD(blankDraft()); setBusy(null); setMsg(""); setFail(null); }
  function close() { setOpen(false); reset(); }
  const byHand = (note = "") => { setD(blankDraft(name.trim(), city.trim())); setMsg(note); setStep("preview"); };

  async function research() {
    if (!name.trim() || busy) return;
    const ac = new AbortController();
    abort.current = ac;
    setBusy("research"); setMsg("");
    try {
      const r = await api.research({ name: name.trim(), ...(city.trim() ? { city: city.trim() } : {}), guests }, ac.signal);
      if (ac.signal.aborted) return;
      setD(draftFromResearch(r)); setBusy(null); setStep("preview");
    } catch (e) {
      if (ac.signal.aborted) { setBusy(null); return; }
      setBusy(null);
      byHand(`${e instanceof ApiFailure ? e.body.message : "Research failed."} Fill it in by hand below.`);
    }
  }
  function cancelResearch() { abort.current?.abort(); setBusy(null); setMsg("Research cancelled."); }

  const issues = draftIssues(d);
  async function add() {
    if (issues.length || busy) return;
    setBusy("save"); setFail(null);
    const ids = scenarios.map((s) => s.id);
    const ops = addVenueOps(d, ids, chicagoToday());
    const id = nextCustomId(ids);
    const r = await save(ops);
    setBusy(null);
    if (!r.ok) return setFail(r);
    const added = d.name.trim();
    close();
    onAdded(id, added);
  }

  if (offline) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add venue</Button>
      <Sheet title="Add a venue" open={open} onClose={close}
        footer={step === "preview" ? (
          <div className="av-foot">
            <Button kind="primary" disabled={busy === "save" || issues.length > 0} onClick={() => void add()}>{busy === "save" ? "Adding…" : "Add as potential venue"}</Button>
            <Button kind="quiet" onClick={() => { setStep("find"); setFail(null); }}>Back</Button>
            <Button kind="quiet" onClick={close}>Cancel</Button>
          </div>
        ) : undefined}>
        {step === "find" ? (
          <form className="av-form" onSubmit={(e) => { e.preventDefault(); void research(); }}>
            <p className="vn-meta">Claude searches the web for prices, capacity and sources. You review everything before it is saved.</p>
            <Field label="Venue name"><input value={name} disabled={busy === "research"} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
            <Field label="City (optional)" hint="Blank = Chicago area"><input value={city} disabled={busy === "research"} onChange={(e) => setCity(e.target.value)} autoComplete="off" /></Field>
            {busy === "research" ? (
              <>
                <p className="av-progress" role="status">Searching the web… this takes up to a minute or two.</p>
                <div className="av-actions"><Button onClick={cancelResearch}>Cancel</Button></div>
              </>
            ) : (
              <div className="av-actions">
                <Button type="submit" kind="primary" disabled={!name.trim()}>Research it</Button>
                <Button kind="quiet" onClick={() => byHand()}>Enter by hand</Button>
              </div>
            )}
            {msg && <p className="vn-meta" role="status">{msg}</p>}
          </form>
        ) : (
          <>
            {msg && <p className="flag warn" role="status">{msg}</p>}
            <Preview d={d} setD={setD} guestsLabel={guestsLabel} guests={guests} />
            {issues.length > 0 && <ul className="flag warn av-issues" role="alert">{issues.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>}
            <SaveError result={fail} onDismiss={() => setFail(null)} />
          </>
        )}
      </Sheet>
    </>
  );
}
