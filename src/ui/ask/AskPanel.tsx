// Ask the planner (v8): floating button + sheet. Claude answers from the plan; proposals are previewed and applied only on tap.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AskAnswer, Proposal } from "../../../worker/ask";
import { ApiFailure, api } from "../../api/client";
import { useData, type SaveResult } from "../data";
import { Button, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { EXAMPLES, MAX_QUESTION, askErrorText, cleanQuestion, trimHistory, type Turn } from "./model";
import { prepare } from "./proposals";
import "./ask.css";

type Item =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "bot"; text: string }
  | { id: number; kind: "proposal"; proposal: Proposal; state: "open" | "applied" | "skipped" };

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 2.5 14.4 8l5.9-.4-3.4 4.8 3.4 4.8-5.9-.4L12 22l-2.4-5.2-5.9.4 3.4-4.8L3.7 7.6 9.6 8z" />
    </svg>
  );
}

function ProposalCard({ item, onApplied, onSkip }: { item: Extract<Item, { kind: "proposal" }>; onApplied(): void; onSkip(): void }) {
  const { people, version, save } = useData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const prepared = useMemo(() => prepare(item.proposal, people, version), [item.proposal, people, version]);
  const apply = async () => {
    if (!prepared.ok || busy) return;
    setBusy(true);
    const r = await save(prepared.ops);
    setBusy(false);
    if (r.ok) { setErr(null); onApplied(); } else setErr(r);
  };
  return (
    <div className="ask-card">
      <div className="ask-card-sum">{item.proposal.summary}</div>
      {item.state === "applied" ? <div className="ask-done">Applied ✓</div> : item.state === "skipped" ? <div className="ask-skipped">Skipped</div> : (
        <>
          {prepared.ok ? <ul className="ask-lines">{prepared.lines.map((l) => <li key={l}>{l}</li>)}</ul> : <p className="ask-card-msg">{prepared.msg}</p>}
          <SaveError result={err} onDismiss={() => setErr(null)} />
          <div className="ask-card-actions">
            {prepared.ok && <Button kind="primary" onClick={() => void apply()} disabled={busy}>{busy ? "Applying…" : "Apply"}</Button>}
            <Button onClick={onSkip} disabled={busy}>Skip</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Panel({ onClose }: { onClose(): void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: boolean; question: string } | null>(null);
  const seq = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [items, busy, error]);

  const history = (): Turn[] => items.flatMap((i): Turn[] => (i.kind === "user" ? [{ role: "user", text: i.text }] : i.kind === "bot" ? [{ role: "assistant", text: i.text }] : []));
  const mark = (id: number, state: "applied" | "skipped") => setItems((xs) => xs.map((x) => (x.id === id && x.kind === "proposal" ? { ...x, state } : x)));

  const send = async (raw: string, again = false) => {
    const q = cleanQuestion(raw);
    if (!q || busy) return;
    const h = trimHistory(again ? history().slice(0, -1) : history());
    if (!again) setItems((xs) => [...xs, { id: ++seq.current, kind: "user", text: q }]);
    setText(""); setError(null); setBusy(true);
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const a: AskAnswer = await api.ask({ question: q, history: h }, ctl.signal);
      setItems((xs) => [
        ...xs,
        { id: ++seq.current, kind: "bot", text: a.answer || "(No answer.)" },
        ...a.proposals.map((proposal): Item => ({ id: ++seq.current, kind: "proposal", proposal, state: "open" })),
      ]);
    } catch (e) {
      if (ctl.signal.aborted) return;
      const f = e instanceof ApiFailure ? askErrorText(e.status, e.body.message) : askErrorText(undefined, e instanceof Error ? e.message : undefined);
      setError({ ...f, question: q });
    } finally {
      if (abort.current === ctl) { abort.current = null; setBusy(false); }
    }
  };
  const stop = () => { abort.current?.abort(); abort.current = null; setBusy(false); };

  const form = (
    <form className="ask-form" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
      <textarea value={text} maxLength={MAX_QUESTION} aria-label="Your question" placeholder="Ask about your plan…" rows={2}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(text); } }} />
      <div className="ask-form-row">
        <span className="ask-count">{text.length}/{MAX_QUESTION}</span>
        {busy ? <Button onClick={stop}>Stop</Button> : <Button kind="primary" type="submit" disabled={!cleanQuestion(text)}>Ask</Button>}
      </div>
    </form>
  );

  return (
    <Sheet title="Ask the planner" open onClose={onClose} footer={form}>
      <p className="ask-intro">Ask about your guests, venues and tasks. Answers come from Claude using your plan; nothing changes until you tap Apply.</p>
      <div className="ask-log" aria-live="polite">
        {items.length === 0 && !busy && (
          <div className="ask-examples">
            {EXAMPLES.map((ex) => <button key={ex} type="button" className="ask-example" onClick={() => void send(ex)}>{ex}</button>)}
          </div>
        )}
        {items.map((i) => i.kind === "proposal"
          ? <ProposalCard key={i.id} item={i} onApplied={() => mark(i.id, "applied")} onSkip={() => mark(i.id, "skipped")} />
          : <div key={i.id} className={`ask-msg ${i.kind === "user" ? "ask-user" : "ask-bot"}`}>{i.text}</div>)}
        {busy && <div className="ask-thinking" role="status">Thinking…</div>}
        {error && (
          <div className="flag warn" role="alert">
            {error.text}
            {error.retry && <span className="row-gap"><button type="button" className="link-btn" onClick={() => void send(error.question, true)}>Try again</button></span>}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}

export function AskButton() {
  const { offline } = useData();
  const [open, setOpen] = useState(false);
  if (offline) return null;
  return (
    <>
      <button type="button" className="ask-fab" aria-label="Ask the planner" onClick={() => setOpen(true)}><Star /></button>
      {open && <Panel onClose={() => setOpen(false)} />}
    </>
  );
}
