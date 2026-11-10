// Small popup menu (Add, Export, Kids, row ⋯), shared with Plan. Opens on the first item; Arrow Up/Down (wrap), Home/End move; Escape, Tab, outside tap or choosing closes (focus returns to the trigger). Items are 44px targets.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyEvent, type ReactNode } from "react";
import "./people.css";

export type MenuItem =
  | { key: string; label: ReactNode; onSelect(): void; checked?: boolean; disabled?: boolean }
  | { key: string; heading: string };

/** Focus index after a navigation key among `count` enabled items (-1 = none focused); null = not a navigation key. */
export function menuNextIndex(key: string, i: number, count: number): number | null {
  if (!count) return null;
  if (key === "ArrowDown") return (i + 1) % count;
  if (key === "ArrowUp") return i <= 0 ? count - 1 : i - 1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export function Menu({ label, trigger, items, align = "left", triggerClass = "k-btn", title }: {
  label: string; trigger: ReactNode; items: MenuItem[]; align?: "left" | "right"; triggerClass?: string; title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState(align);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Flip to the other side when the list would run off a narrow screen.
  useLayoutEffect(() => {
    if (!open) { setSide(align); return; }
    const r = list.current?.getBoundingClientRect();
    if (!r) return;
    if (r.left < 4) setSide("left");
    else if (r.right > window.innerWidth - 4) setSide("right");
  }, [open, align]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const enabled = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  useEffect(() => { if (open) enabled()[0]?.focus(); }, [open]);
  const onListKey = (e: ReactKeyEvent) => {
    const els = enabled();
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Tab") { triggerRef.current?.focus(); setOpen(false); return; }
    const next = menuNextIndex(e.key, i, els.length);
    if (next === null) return;
    e.preventDefault();
    els[next]?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    // Escape closes only the menu (not the sheet around it) and returns focus to the trigger.
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="pp-menu" ref={root}>
      <button ref={triggerRef} type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={title} onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div ref={list} className={`pp-menu-list ${side}`} role="menu" aria-label={label} onKeyDown={onListKey}>
          {items.map((it) => "heading" in it
            ? <div key={it.key} className="pp-menu-head" role="presentation">{it.heading}</div>
            : (
              <button key={it.key} type="button" role="menuitem" className="pp-menu-item" disabled={it.disabled} aria-current={it.checked ? "true" : undefined}
                onClick={() => { setOpen(false); triggerRef.current?.focus(); it.onSelect(); }}>
                <span className="pp-menu-mark" aria-hidden="true">{it.checked ? "✓" : ""}</span>{it.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
