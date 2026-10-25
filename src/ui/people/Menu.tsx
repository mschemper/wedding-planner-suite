// Small popup menu (Add, Export, Kids, row ⋯). Closes on outside tap, Escape, or choosing an item. Items are 44px targets.
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { key: string; label: ReactNode; onSelect(): void; checked?: boolean; disabled?: boolean }
  | { key: string; heading: string };

export function Menu({ label, trigger, items, align = "left", triggerClass = "k-btn", title }: {
  label: string; trigger: ReactNode; items: MenuItem[]; align?: "left" | "right"; triggerClass?: string; title?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    // Escape closes only the menu (not the sheet around it) and returns focus to the trigger.
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>("button[aria-haspopup]")?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="pp-menu" ref={root}>
      <button type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={title} onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`pp-menu-list ${align}`} role="menu" aria-label={label}>
          {items.map((it) => "heading" in it
            ? <div key={it.key} className="pp-menu-head" role="presentation">{it.heading}</div>
            : (
              <button key={it.key} type="button" role="menuitem" className="pp-menu-item" disabled={it.disabled} aria-current={it.checked ? "true" : undefined}
                onClick={() => { setOpen(false); it.onSelect(); }}>
                <span className="pp-menu-mark" aria-hidden="true">{it.checked ? "✓" : ""}</span>{it.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
