// Twinkle-garden motifs (DESIGN-v4 §6). Inline SVG, colours only via CSS tokens. Decorative ones are aria-hidden.
import type { CSSProperties } from "react";

/** String-light garland across the header. Bulbs twinkle unless prefers-reduced-motion (styles.css). */
export function Garland() {
  const bulbs = [60, 150, 240, 360, 450, 540, 660, 750, 840, 960, 1050, 1140];
  return (
    <svg className="garland" viewBox="0 0 1200 44" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q150 40 300 8 T600 8 T900 8 T1200 6" fill="none" stroke="var(--euc)" strokeWidth="1.5" />
      <g fill="var(--twinkle)" stroke="var(--marigold)" strokeWidth=".8">
        {bulbs.map((x, i) => <circle key={x} className="bulb" cx={x} cy={i % 3 === 1 ? 25 : 18} r="4" />)}
      </g>
    </svg>
  );
}

/** Peony + vine for a card corner. */
export function Corner({ style }: { style?: CSSProperties }) {
  return (
    <svg className="corner" viewBox="0 0 90 90" aria-hidden="true" style={style}>
      <circle cx="62" cy="28" r="16" fill="var(--blush)" />
      <circle cx="62" cy="28" r="7" fill="var(--peony)" />
      <path d="M20 80C30 50 45 40 70 50" stroke="var(--euc)" fill="none" strokeWidth="2" />
      <path d="M38 58c-8-2-12-9-10-14c8 1 12 8 10 14z" fill="var(--sage)" />
    </svg>
  );
}

/** Leaf-and-bud section divider. */
export function LeafDivider() {
  return (
    <svg className="leaf-divider" viewBox="0 0 140 14" aria-hidden="true">
      <path d="M0 7H55M85 7H140" stroke="var(--sage)" />
      <path d="M70 1c6 3 6 9 0 12c-6-3-6-9 0-12z" fill="var(--sage)" />
      <path d="M58 7c3-4 8-4 10 0c-2 4-7 4-10 0zM82 7c-3-4-8-4-10 0c2 4 7 4 10 0z" fill="var(--blush)" />
    </svg>
  );
}

/** Small sprig for venue cards; `hue` picks the bloom colour token. */
export function Sprig({ hue = "blush" }: { hue?: "blush" | "marigold" | "sage" | "peony" }) {
  return (
    <svg className="sprig" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 36C14 26 20 18 30 10" stroke="var(--euc)" fill="none" strokeWidth="1.6" />
      <path d="M16 26c-5 0-8-4-7-7c5 0 8 4 7 7zM22 18c0-5 3-8 7-8c0 5-3 8-7 8z" fill="var(--sage)" />
      <circle cx="31" cy="9" r="5" fill={`var(--${hue})`} />
    </svg>
  );
}

export type BloomState = "invite" | "ifroom" | "undecided" | "no" | "deceased" | "placeholder" | "couple";

const BLOOM_LABEL: Record<BloomState, string> = {
  invite: "invited", ifroom: "if room", undecided: "undecided", no: "not inviting", deceased: "deceased", placeholder: "tree only", couple: "the couple",
};
export const bloomLabel = (s: BloomState) => BLOOM_LABEL[s];

/**
 * A person's flower: open bloom = invited, bud = if room, seed (outline) = undecided, leaf = not inviting,
 * pressed outline = deceased, stem dot = placeholder, double bloom = couple. Shape + colour, never colour alone.
 */
export function Bloom({ state, size = 22, title }: { state: BloomState; size?: number; title?: string }) {
  const label = title ?? BLOOM_LABEL[state];
  return (
    <svg className={`bloom bloom-${state}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      {state === "invite" && (<>
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="12" cy="6.5" rx="3.6" ry="5" fill="var(--blush)" transform={`rotate(${a} 12 12)`} />)}
        <circle cx="12" cy="12" r="3.2" fill="var(--peony)" />
      </>)}
      {state === "couple" && (<>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <ellipse key={a} cx="12" cy="5.5" rx="3" ry="5.2" fill="var(--blush)" transform={`rotate(${a} 12 12)`} />)}
        <circle cx="12" cy="12" r="3.6" fill="var(--marigold)" />
      </>)}
      {state === "ifroom" && (<>
        <path d="M12 21V13" stroke="var(--euc)" strokeWidth="1.6" />
        <path d="M12 3c4 3 4 8 0 11c-4-3-4-8 0-11z" fill="var(--marigold)" />
      </>)}
      {state === "undecided" && <circle cx="12" cy="12" r="6" fill="none" stroke="var(--euc)" strokeWidth="1.8" strokeDasharray="3 2.4" />}
      {state === "no" && <path d="M5 19C5 10 11 5 19 5C19 13 14 19 5 19z M5 19L15 9" fill="var(--sage)" stroke="var(--euc)" strokeWidth="1.2" />}
      {state === "deceased" && (<>
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="12" cy="6.5" rx="3.6" ry="5" fill="none" stroke="var(--muted)" strokeWidth="1" transform={`rotate(${a} 12 12)`} />)}
      </>)}
      {state === "placeholder" && (<>
        <path d="M12 22V10" stroke="var(--euc)" strokeWidth="1.4" />
        <circle cx="12" cy="8" r="2.4" fill="var(--euc)" />
      </>)}
    </svg>
  );
}
