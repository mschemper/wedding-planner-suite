// Conservatory Modern motifs (DESIGN-v7): flat cut-paper 1950s botanicals. Inline SVG, colours only via CSS tokens. Decorative ones are aria-hidden.
import type { CSSProperties } from "react";

const SPARK = "M0-7L1.6-1.6L7 0L1.6 1.6L0 7L-1.6 1.6L-7 0L-1.6-1.6Z";

/** Atomic bloom: five circles round a mustard centre, at (0,0). */
function Atomic({ r = 10, fill = "var(--peony)", centre = "var(--marigold)" }: { r?: number; fill?: string; centre?: string }) {
  const d = r * 1.05;
  return (<>
    <g fill={fill}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={0} cy={-d} r={r} transform={`rotate(${a})`} />)}</g>
    <circle r={r * 0.78} fill={centre} />
  </>);
}

/** Header garden: coral atomic bloom + sage monstera leaf (left), blush starburst + teal leaf (right), mustard sparkles. Sways unless prefers-reduced-motion. */
export function Garland() {
  return (<>
    <svg className="garland garland-l" viewBox="0 0 132 150" aria-hidden="true">
      <g className="garden-sway">
        <path d="M44 150C52 112 34 84 46 52" stroke="var(--euc)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M42 120C20 112 6 92 14 72C34 76 44 96 42 120Z" fill="var(--sage)" />
        <path d="M42 120C28 106 22 92 18 78" stroke="var(--euc)" strokeWidth="1.4" fill="none" />
        <path d="M46 96C64 90 78 74 74 56C58 60 46 76 46 96Z" fill="var(--euc)" opacity=".85" />
        <g transform="translate(46 40)"><Atomic r={11} /></g>
      </g>
      <path className="spark" d={SPARK} transform="translate(100 24)" fill="var(--marigold)" />
      <path className="spark" d={SPARK} transform="translate(112 86) scale(.7)" fill="var(--marigold)" />
      <circle cx="94" cy="58" r="2.6" fill="var(--marigold)" />
    </svg>
    <svg className="garland garland-r" viewBox="0 0 132 150" aria-hidden="true">
      <g className="garden-sway">
        <path d="M88 150C80 112 98 84 86 52" stroke="var(--euc)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M86 116C108 108 124 90 118 70C96 74 84 94 86 116Z" fill="var(--euc)" opacity=".85" />
        <path d="M86 100C68 96 54 80 58 62C76 66 88 82 86 100Z" fill="var(--sage)" />
        <g transform="translate(86 38)">
          <g fill="var(--blush)">{[0, 45, 90, 135].map((a) => <ellipse key={a} cx="0" cy="0" rx="5.5" ry="21" transform={`rotate(${a})`} />)}</g>
          <circle r="7" fill="var(--peony)" />
          <circle r="2.6" fill="var(--marigold)" />
        </g>
      </g>
      <path className="spark" d={SPARK} transform="translate(26 30)" fill="var(--marigold)" />
      <path className="spark" d={SPARK} transform="translate(16 92) scale(.7)" fill="var(--marigold)" />
      <circle cx="38" cy="62" r="2.6" fill="var(--marigold)" />
    </svg>
  </>);
}

/** Small coral atomic bloom on a stem, for card corners. */
export function Corner({ style }: { style?: CSSProperties }) {
  return (
    <svg className="corner" viewBox="0 0 90 90" aria-hidden="true" style={style}>
      <path d="M52 90C50 70 56 58 52 42" stroke="var(--euc)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 72C40 70 32 62 32 52C44 54 52 62 52 72Z" fill="var(--sage)" />
      <g transform="translate(52 30)"><Atomic r={9} /></g>
    </svg>
  );
}

/** Small stem with two leaves and a bud. */
export function LeafDivider() {
  return (
    <svg className="leaf-divider" viewBox="0 0 140 14" aria-hidden="true">
      <path d="M0 7H56M84 7H140" stroke="var(--sage)" strokeWidth="1.5" />
      <path d="M70 13V6" stroke="var(--euc)" strokeWidth="1.6" />
      <path d="M70 0C75 3 75 7 70 10C65 7 65 3 70 0Z" fill="var(--peony)" />
      <path d="M70 11C64 11 58 8 57 4C63 4 69 7 70 11ZM70 11C76 11 82 8 83 4C77 4 71 7 70 11Z" fill="var(--sage)" />
    </svg>
  );
}

/** Small sprig for venue cards; `hue` picks the bloom colour token. */
export function Sprig({ hue = "blush" }: { hue?: "blush" | "marigold" | "sage" | "peony" }) {
  return (
    <svg className="sprig" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 36C14 26 20 18 30 10" stroke="var(--euc)" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 26c-5 0-8-4-7-7c5 0 8 4 7 7zM22 18c0-5 3-8 7-8c0 5-3 8-7 8z" fill="var(--sage)" />
      <circle cx="31" cy="9" r="5.5" fill={`var(--${hue})`} />
      <circle cx="31" cy="9" r="2" fill="var(--marigold)" />
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
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx="12" cy="6.2" r="4.4" fill="var(--peony)" transform={`rotate(${a} 12 12)`} />)}
        <circle cx="12" cy="12" r="3.6" fill="var(--marigold)" />
      </>)}
      {state === "couple" && (<>
        {[0, 45, 90, 135].map((a) => <ellipse key={a} cx="12" cy="12" rx="2.6" ry="10.5" fill="var(--blush)" transform={`rotate(${a} 12 12)`} />)}
        <circle cx="12" cy="12" r="4.2" fill="var(--peony)" />
        <circle cx="12" cy="12" r="1.8" fill="var(--marigold)" />
      </>)}
      {state === "ifroom" && (<>
        <path d="M12 22V13" stroke="var(--euc)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 2C17 6 17 11 12 14C7 11 7 6 12 2z" fill="var(--marigold)" />
        <path d="M12 17C9 17 7 15.5 6.5 13.5C9.5 13.5 11.5 15 12 17z" fill="var(--sage)" />
      </>)}
      {state === "undecided" && (<>
        <circle cx="12" cy="12" r="7" fill="none" stroke="var(--euc)" strokeWidth="1.8" strokeDasharray="3 2.4" />
        <circle cx="12" cy="12" r="1.6" fill="var(--euc)" />
      </>)}
      {state === "no" && <path d="M4 20C4 10 10 4 20 4C20 14 14 20 4 20z M4 20L15 9" fill="var(--sage)" stroke="var(--euc)" strokeWidth="1.3" strokeLinejoin="round" />}
      {state === "deceased" && (<>
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx="12" cy="6.2" r="4.4" fill="none" stroke="var(--muted)" strokeWidth="1.1" transform={`rotate(${a} 12 12)`} />)}
        <circle cx="12" cy="12" r="2" fill="none" stroke="var(--muted)" strokeWidth="1.1" />
      </>)}
      {state === "placeholder" && (<>
        <path d="M12 22V10" stroke="var(--euc)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2.8" fill="var(--euc)" />
      </>)}
    </svg>
  );
}
