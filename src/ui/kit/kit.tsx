// Shared primitives (DESIGN-v4 §6, lead-owned). Styles in src/ui/styles.css (.k-*). Builders compose these; they do not restyle them.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Owner, Verdict } from "../../plan/types";
import { Corner } from "../garden/motifs";
import { useData } from "../data";

export function Card({ title, corner, className = "", children, actions, id }: {
  title?: ReactNode; corner?: boolean; className?: string; children: ReactNode; actions?: ReactNode; id?: string;
}) {
  return (
    <section className={`k-card ${className}`} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {corner && <Corner />}
      {(title || actions) && <div className="k-card-head">{title && <h2 className="k-card-title">{title}</h2>}{actions && <div className="k-card-actions">{actions}</div>}</div>}
      {children}
    </section>
  );
}

export type ChipTone = "plain" | "peony" | "gold" | "sage" | "euc";
export function Chip({ tone = "plain", children, title }: { tone?: ChipTone; children: ReactNode; title?: string }) {
  return <span className={`k-chip k-chip-${tone}`} title={title}>{children}</span>;
}

/** Toggle chip for filters. */
export function FilterChip({ on, onClick, children, count }: { on: boolean; onClick(): void; children: ReactNode; count?: number }) {
  return (
    <button type="button" className="k-filter" aria-pressed={on} onClick={onClick}>
      {children}{count !== undefined && <span className="k-count">{count}</span>}
    </button>
  );
}

/**
 * Segmented single choice (radio group). `value` may be null (nothing lit, e.g. undecided).
 * Arrow keys move between options; every option is a 44px target.
 */
export function Segmented<T extends string>({ label, options, value, onChange, size = "md", disabled }: {
  label: string; options: { value: T; label: ReactNode; tone?: "euc" | "gold" | "plain" | "peony" }[]; value: T | null;
  onChange(v: T): void; size?: "sm" | "md"; disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o.value === value);
  return (
    <div className={`k-seg k-seg-${size}`} role="radiogroup" aria-label={label}
      onKeyDown={(e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = ((idx < 0 ? 0 : idx) + d + options.length) % options.length;
        refs.current[n]?.focus();
      }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} disabled={disabled}
            tabIndex={on || (idx < 0 && i === 0) ? 0 : -1} className={`k-seg-opt${on ? ` on tone-${o.tone ?? "euc"}` : ""}`} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return <div className="k-stat"><div className="k-stat-value">{value}</div><div className="k-stat-label">{label}</div>{sub && <div className="k-stat-sub">{sub}</div>}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="k-empty">{children}</p>;
}

const OWNER_TONE: Record<Owner, ChipTone> = { Mark: "euc", Angela: "peony", Both: "gold" };
export const OwnerChip = ({ owner }: { owner: Owner }) => <Chip tone={OWNER_TONE[owner]}>{owner}</Chip>;

const VERDICT_TEXT: Record<Verdict, string> = { yes: "Yes", partly: "Partly", no: "No", unknown: "?" };
const VERDICT_ICON: Record<Verdict, string> = { yes: "✓", partly: "◐", no: "✕", unknown: "?" };
/** One must-have × venue cell; tap cycles (the caller passes the next verdict). Icon + text, not colour alone. */
export function VerdictPicker({ verdict, onCycle, label, disabled }: { verdict: Verdict; onCycle(): void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className={`k-verdict v-${verdict}`} onClick={onCycle} disabled={disabled} aria-label={`${label}: ${VERDICT_TEXT[verdict]}. Tap to change.`}>
      <span aria-hidden="true">{VERDICT_ICON[verdict]}</span>{verdict !== "unknown" && <span className="k-verdict-text">{VERDICT_TEXT[verdict]}</span>}
    </button>
  );
}
export const verdictText = (v: Verdict) => VERDICT_TEXT[v];

/** Side sheet (desktop) / bottom sheet (phone). Escape and the backdrop close it; focus moves into it. */
export function Sheet({ title, open, onClose, children, footer }: { title: string; open: boolean; onClose(): void; children: ReactNode; footer?: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus(); // keep an autoFocus field's focus
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="k-sheet-wrap">
      <div className="k-sheet-backdrop" onClick={onClose} />
      <div className="k-sheet" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}>
        <div className="k-sheet-head"><h2 id={id}>{title}</h2><button type="button" className="k-icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="k-sheet-body">{children}</div>
        {footer && <div className="k-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** "Saved · Undo" toast for the last edit() (src/ui/data.tsx). Mounted once in App. Auto-hides after 6 s. */
export function UndoToast() {
  const { undoState, undo, dismissUndo } = useData();
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!undoState) return;
    setFailed(null);
    const t = setTimeout(dismissUndo, 6000);
    return () => clearTimeout(t);
  }, [undoState, dismissUndo]);
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(null), 8000);
    return () => clearTimeout(t);
  }, [failed]);
  if (failed) return <div className="k-toast" role="alert"><span>Undo failed · {failed}</span><button type="button" className="k-toast-btn" onClick={() => setFailed(null)}>OK</button></div>;
  if (!undoState) return null;
  return (
    <div className="k-toast" role="status">
      <span>{undoState.label}</span>
      <button type="button" className="k-toast-btn" onClick={() => void undo().then((r) => { if (!r.ok) { setFailed(r.message); dismissUndo(); } })}>Undo</button>
    </div>
  );
}

export function Button({ children, onClick, kind = "plain", disabled, type = "button", title }: {
  children: ReactNode; onClick?(): void; kind?: "plain" | "primary" | "quiet" | "danger"; disabled?: boolean; type?: "button" | "submit"; title?: string;
}) {
  return <button type={type} className={`k-btn k-btn-${kind}`} onClick={onClick} disabled={disabled} title={title}>{children}</button>;
}

/** Labelled form field wrapper. */
export function Field({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return <label className={`k-field${wide ? " wide" : ""}`}><span className="k-field-label">{label}</span>{children}{hint && <span className="k-field-hint">{hint}</span>}</label>;
}
