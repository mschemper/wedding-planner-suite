// Jungalow Lounge motifs (DESIGN-v9): split-leaf monstera, palm fronds, hydrangea heads, brass starbursts. Inline SVG,
// colours only via CSS tokens. Decorative ones are aria-hidden. No required animation.
import type { CSSProperties } from "react";

type At = { x: number; y: number; s?: number; r?: number; flip?: boolean };
const tf = ({ x, y, s = 1, r = 0, flip }: At) => `translate(${x} ${y}) rotate(${r}) scale(${flip ? -s : s} ${s})`;

/** Split-leaf monstera, 100 x 100 around its own box; slits are cut in `cut` (the colour behind it). */
function Monstera({ fill = "var(--leaf)", cut = "var(--band)", ...at }: At & { fill?: string; cut?: string }) {
  return (
    <g transform={tf(at)}>
      <path d="M50 96C22 84 3 60 7 34C11 12 36 3 50 17C64 3 89 12 93 34C97 60 78 84 50 96Z" fill={fill} />
      <g stroke={cut} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M50 90V24M50 74L13 62M50 60L8 44M50 46L18 22M50 74L87 62M50 60L92 44M50 46L82 22" />
      </g>
      <ellipse cx="34" cy="52" rx="4" ry="2.4" fill={cut} />
      <ellipse cx="66" cy="52" rx="4" ry="2.4" fill={cut} />
    </g>
  );
}

/** Palm frond, 120 x 60: a curved rib with alternating leaflets. */
function Frond({ fill = "var(--leaf-2)", ...at }: At & { fill?: string }) {
  return (
    <g transform={tf(at)} fill={fill}>
      <path d="M4 56C40 40 80 22 116 6" stroke={fill} strokeWidth="3" fill="none" />
      <path d="M20 49L14 30L28 44ZM36 42L32 20L44 37ZM52 35L50 12L60 30ZM68 28L68 6L76 24ZM84 21L86 2L92 18Z" />
      <path d="M22 50L38 58L30 46ZM38 43L56 50L46 39ZM54 36L72 42L62 32ZM70 29L88 34L78 25Z" />
    </g>
  );
}

const FLORETS: [number, number, number, 0 | 1][] = [
  [30, 40, 9, 0], [52, 28, 9, 0], [72, 42, 9, 0], [44, 60, 9, 0], [66, 66, 9, 0], [26, 64, 8, 0],
  [40, 22, 7, 1], [62, 50, 8, 1], [48, 78, 7, 1], [78, 60, 6, 1], [20, 50, 6, 1],
];
/** Hydrangea head, 100 x 100: a dome of florets in two tones with pale centres. */
function Hydrangea({ a = "var(--blush)", b = "var(--lake)", ...at }: At & { a?: string; b?: string }) {
  return (
    <g transform={tf(at)}>
      <circle cx="50" cy="50" r="40" fill={b} opacity=".45" />
      {FLORETS.map(([cx, cy, r, t]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={t ? b : a} />)}
      {FLORETS.slice(0, 6).map(([cx, cy]) => <circle key={`c${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="var(--card)" />)}
    </g>
  );
}

/** Atomic-age starburst (brass), radius 18 around (x, y). */
function Starburst({ x, y, s = 1 }: At) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="var(--marigold)" strokeWidth="2" strokeLinecap="round">
      <path d="M0 -18V18M-18 0H18M-12.7 -12.7L12.7 12.7M12.7 -12.7L-12.7 12.7" />
      <circle r="4" fill="var(--marigold)" stroke="none" />
    </g>
  );
}

/**
 * Header jungle (two flanking svgs on the dark green band; the centre stays clear for the title): layered palm fronds,
 * monstera leaves, a hydrangea head and brass starbursts. Below 780px a single small leaf replaces each side (CSS).
 */
export function Garland() {
  return (<>
    <svg className="garland garland-pano garland-l" viewBox="0 0 340 150" preserveAspectRatio="xMinYMin meet" aria-hidden="true">
      <Frond x={-20} y={-6} s={1.5} r={16} />
      <Frond x={60} y={96} s={1.1} r={-28} fill="var(--leaf)" />
      <Monstera x={-14} y={44} s={1.15} r={-22} />
      <Monstera x={96} y={14} s={0.62} r={18} fill="var(--leaf-2)" />
      <Hydrangea x={170} y={70} s={0.62} />
      <Starburst x={250} y={34} s={0.9} />
      <Starburst x={214} y={124} s={0.55} />
    </svg>
    <svg className="garland garland-pano garland-r" viewBox="0 0 340 150" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">
      <Frond x={360} y={-6} s={1.5} r={-16} flip />
      <Frond x={280} y={96} s={1.1} r={28} flip fill="var(--leaf)" />
      <Monstera x={354} y={44} s={1.15} r={22} flip />
      <Monstera x={244} y={14} s={0.62} r={-18} flip fill="var(--leaf-2)" />
      <Hydrangea x={110} y={66} s={0.7} a="var(--lake)" b="var(--blush)" />
      <Starburst x={88} y={30} s={0.9} />
      <Starburst x={136} y={130} s={0.55} />
    </svg>
    <svg className="garland garland-mini garland-l" viewBox="0 0 44 70" aria-hidden="true">
      <Monstera x={2} y={14} s={0.4} r={-16} />
      <Starburst x={34} y={58} s={0.4} />
    </svg>
    <svg className="garland garland-mini garland-r" viewBox="0 0 44 70" aria-hidden="true">
      <Hydrangea x={2} y={10} s={0.42} />
      <Starburst x={10} y={60} s={0.4} />
    </svg>
  </>);
}

/** Small monstera leaf for card corners (slits cut in the card colour). */
export function Corner({ style }: { style?: CSSProperties }) {
  return (
    <svg className="corner" viewBox="0 0 100 100" aria-hidden="true" style={style}>
      <Monstera x={0} y={0} cut="var(--card)" />
    </svg>
  );
}

/** Divider under the title: brass rules either side of a starburst and two small leaves. */
export function LeafDivider() {
  return (
    <svg className="leaf-divider" viewBox="0 0 200 14" aria-hidden="true">
      <path d="M0 7H80M120 7H200" stroke="var(--marigold)" strokeWidth="1.4" />
      <path d="M84 7C88 2 94 2 96 7C94 12 88 12 84 7Z" fill="var(--sage)" />
      <path d="M116 7C112 2 106 2 104 7C106 12 112 12 116 7Z" fill="var(--sage)" />
      <Starburst x={100} y={7} s={0.34} />
    </svg>
  );
}

/** Hydrangea sprig: stem, two leaves and a floret head; `hue` picks the head's main token. */
export function Sprig({ hue = "blush" }: { hue?: "blush" | "marigold" | "sage" | "peony" }) {
  return (
    <svg className="sprig" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M12 38C14 30 18 24 24 18" stroke="var(--leaf)" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 30C8 30 5 26 5 22C11 22 14 25 15 30Z" fill="var(--sage)" />
      <path d="M19 25C20 18 24 16 28 16C27 22 24 24 19 25Z" fill="var(--sage)" />
      <Hydrangea x={16} y={0} s={0.24} a={`var(--${hue})`} b="var(--lake)" />
    </svg>
  );
}

export type BloomState = "invite" | "ifroom" | "undecided" | "no" | "deceased" | "placeholder" | "couple";

const BLOOM_LABEL: Record<BloomState, string> = {
  invite: "invited", ifroom: "if room", undecided: "undecided", no: "not inviting", deceased: "deceased", placeholder: "tree only", couple: "the couple",
};
export const bloomLabel = (s: BloomState) => BLOOM_LABEL[s];

/**
 * A person's plant: open monstera leaf = invited, hydrangea bud = if room, dashed circle = undecided, fallen leaf with a
 * stroke = not inviting, outlined leaf = deceased, stem + square = placeholder, two hydrangea heads = couple.
 * Shape + colour, never colour alone.
 */
export function Bloom({ state, size = 22, title }: { state: BloomState; size?: number; title?: string }) {
  const label = title ?? BLOOM_LABEL[state];
  return (
    <svg className={`bloom bloom-${state}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      {state === "invite" && (<>
        <path d="M12 23C5.5 20 1.5 14.5 2.5 8.5C3.5 3.5 9 2 12 5C15 2 20.5 3.5 21.5 8.5C22.5 14.5 18.5 20 12 23Z" fill="var(--leaf)" />
        <path d="M12 21V7M12 17L4 14M12 13.5L3.5 10M12 10L6 5.5M12 17L20 14M12 13.5L20.5 10M12 10L18 5.5" stroke="var(--card)" strokeWidth="1.2" strokeLinecap="round" />
      </>)}
      {state === "couple" && (<>
        <path d="M7 14V22M17 14V22M7 22H17" stroke="var(--leaf)" strokeWidth="1.8" fill="none" />
        {[[5, 6], [9, 6], [7, 9.5], [7, 2.5]].map(([x, y]) => <circle key={`a${x}${y}`} cx={x} cy={y} r="2.6" fill="var(--blush)" />)}
        {[[15, 6], [19, 6], [17, 9.5], [17, 2.5]].map(([x, y]) => <circle key={`b${x}${y}`} cx={x} cy={y} r="2.6" fill="var(--lake)" />)}
        <rect x="10.5" y="17" width="3" height="3" fill="var(--marigold)" />
      </>)}
      {state === "ifroom" && (<>
        <path d="M12 23V12" stroke="var(--leaf)" strokeWidth="1.8" />
        <path d="M12 18C7 18 5 15.5 5 13C9 13 11.5 15 12 18Z" fill="var(--sage)" />
        {[[12, 4.5], [9, 8], [15, 8], [12, 10.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="var(--marigold)" stroke="var(--ink)" strokeWidth=".6" />)}
      </>)}
      {state === "undecided" && (<>
        <circle cx="12" cy="12" r="9" fill="none" stroke="var(--leaf)" strokeWidth="1.8" strokeDasharray="3 2.4" />
        <circle cx="12" cy="12" r="2.4" fill="var(--leaf)" />
      </>)}
      {state === "no" && (<>
        <path d="M4 20C4 12 9 5 20 4C20 14 13 20 4 20Z" fill="var(--sage)" stroke="var(--leaf)" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M4 20L16 8" stroke="var(--leaf)" strokeWidth="1.3" />
      </>)}
      {state === "deceased" && (
        <path d="M12 23C5.5 20 1.5 14.5 2.5 8.5C3.5 3.5 9 2 12 5C15 2 20.5 3.5 21.5 8.5C22.5 14.5 18.5 20 12 23ZM12 21V7" fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeLinejoin="round" />
      )}
      {state === "placeholder" && (<>
        <path d="M12 22V11" stroke="var(--leaf)" strokeWidth="1.8" />
        <rect x="8.5" y="5" width="7" height="7" fill="var(--leaf)" />
      </>)}
    </svg>
  );
}
