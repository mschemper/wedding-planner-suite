// Prairie & Steel motifs (DESIGN-v8): Wright leaded-glass florals + Chicago. Inline SVG, colours only via CSS tokens. Decorative ones are aria-hidden. No required animation.
import type { CSSProperties } from "react";

/** Six-pointed star path (Chicago flag), centred on 0,0. */
function starPath(R: number, r = R * 0.5): string {
  const pts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 6) * i - Math.PI / 2;
    pts.push(`${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
const STAR = (R: number) => starPath(R);

const LEAD = { stroke: "var(--lead)", strokeWidth: 1.3, strokeLinejoin: "round" } as const;

/** Wright-style leaded-glass tulip panel, 52 x 120 at (0,0). `petal` = centre petal token. */
function Pane({ petal = "var(--peony)" }: { petal?: string }) {
  return (
    <g {...LEAD}>
      <rect x="1" y="1" width="50" height="118" fill="var(--lake)" fillOpacity=".4" />
      <rect x="1" y="100" width="50" height="19" fill="var(--sage)" />
      <polygon points="26,60 10,76 8,68 26,86" fill="var(--euc)" />
      <polygon points="26,60 42,76 44,68 26,86" fill="var(--euc)" />
      <path d="M26 56V119" fill="none" />
      <polygon points="10,18 18,32 26,58 11,48" fill="var(--marigold)" />
      <polygon points="42,18 34,32 26,58 41,48" fill="var(--marigold)" />
      <polygon points="26,10 35,32 26,58 17,32" fill={petal} />
      <rect x="22" y="3" width="8" height="7" fill="var(--marigold)" />
      <path d="M1 100H51M1 32H17M35 32H51" fill="none" />
      <rect x="1" y="1" width="50" height="118" fill="none" strokeWidth="2" />
    </g>
  );
}

/** Cropped tulip pane (52 x 64) for card corners and mini headers. */
function PaneHead({ petal = "var(--peony)" }: { petal?: string }) {
  return (
    <g {...LEAD}>
      <rect x="1" y="1" width="50" height="62" fill="var(--lake)" fillOpacity=".4" />
      <polygon points="9,14 17,28 26,52 10,43" fill="var(--marigold)" />
      <polygon points="43,14 35,28 26,52 42,43" fill="var(--marigold)" />
      <polygon points="26,6 35,28 26,52 17,28" fill={petal} />
      <path d="M26 52V63M1 28H17M35 28H51" fill="none" />
      <rect x="1" y="1" width="50" height="62" fill="none" strokeWidth="2" />
    </g>
  );
}

/** Marina City: a corncob tower of rounded balcony bands with a core. */
function Cob({ x, y, h }: { x: number; y: number; h: number }) {
  const n = Math.floor((h - 8) / 8);
  return (
    <g fill="var(--skyline)">
      <rect x={x + 5} y={y} width="14" height={h} />
      <rect x={x + 4} y={y - 3} width="16" height="6" rx="3" />
      {Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + 6 + i * 8} width="24" height="5" rx="2.5" />)}
    </g>
  );
}

/** Prairie low-rise: long horizontals under a cantilevered roof. */
function Prairie({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="var(--skyline)" />
      <rect x={x - 6} y={y - 4} width={w + 12} height="4" fill="var(--skyline)" />
      <path d={`M${x + 4} ${y + 6}H${x + w - 4}`} stroke="var(--window)" strokeWidth="3" strokeDasharray="6 4" />
    </g>
  );
}

/** Far, paler skyline blocks. */
function Far({ blocks }: { blocks: [number, number, number][] }) {
  return <g fill="var(--skyline-far)">{blocks.map(([x, y, w]) => <rect key={x} x={x} y={y} width={w} height={132 - y} />)}</g>;
}

function Lake() {
  return (
    <g>
      <rect x="0" y="132" width="340" height="18" fill="var(--lake)" fillOpacity=".55" />
      <path d="M0 138H340M0 144H340" stroke="var(--card)" strokeWidth="1.4" strokeDasharray="14 10" opacity=".8" />
      <path d="M0 132H340" stroke="var(--lead)" strokeWidth="1.3" />
    </g>
  );
}

/**
 * Header panorama (two flanking svgs; the centre stays clear for the title): Wright tulip panel at each outer edge,
 * Marina City + Willis Tower (left), Hancock + Water Tower (right), Prairie low-rises, lake band. Below 780px a small
 * panel + star replaces it (CSS). Static: no animation.
 */
export function Garland() {
  return (<>
    <svg className="garland garland-pano garland-l" viewBox="0 0 340 150" preserveAspectRatio="xMinYMin meet" aria-hidden="true">
      <circle cx="170" cy="64" r="24" fill="var(--marigold)" opacity=".9" />
      <Far blocks={[[76, 92, 18], [160, 84, 16], [176, 100, 14], [264, 96, 16]]} />
      <Cob x={98} y={40} h={92} />
      <Cob x={126} y={52} h={80} />
      <g fill="var(--skyline)">
        {[[188, 88], [202, 58], [216, 30], [230, 58], [244, 88]].map(([x, y]) => <rect key={x} x={x} y={y} width="14" height={132 - y} />)}
        <path d="M219 30V6M227 30V10" stroke="var(--skyline)" strokeWidth="1.8" />
      </g>
      <g fill="var(--window)">{[[220, 42], [220, 54], [206, 70], [234, 70], [192, 100], [248, 100], [220, 66]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="3" height="4" />)}</g>
      <Prairie x={270} y={108} w={58} h={24} />
      <Lake />
      <g transform="translate(10 18)"><Pane /></g>
      <path d={STAR(7)} transform="translate(86 24)" fill="var(--peony)" />
    </svg>
    <svg className="garland garland-pano garland-r" viewBox="0 0 340 150" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">
      <circle cx="176" cy="70" r="20" fill="var(--blush)" opacity=".75" />
      <Far blocks={[[160, 88, 16], [206, 100, 16], [100, 90, 14]]} />
      <g fill="var(--skyline)">
        <polygon points="96,132 146,132 136,24 106,24" />
        <path d="M114 24V4M128 24V8" stroke="var(--skyline)" strokeWidth="1.8" />
      </g>
      <g stroke="var(--window)" strokeWidth="1.5" fill="none" opacity=".85">
        <path d="M103 118L139 90M139 118L103 90M108 82L134 56M134 82L108 56M112 48L130 32M130 48L112 32" />
      </g>
      <g fill="var(--skyline)">
        <rect x="178" y="96" width="22" height="36" />
        <path d="M176 96V89h4v3h4v-3h4v3h4v-3h4v3h4v-3h4v7Z" />
        <polygon points="183,89 189,74 195,89" />
      </g>
      <g fill="var(--window)">{[[184, 104], [192, 104], [184, 114], [192, 114]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="3" height="5" />)}</g>
      <Prairie x={10} y={106} w={60} h={26} />
      <path d={STAR(8)} transform="translate(84 40)" fill="var(--peony)" />
      <Lake />
      <g transform="translate(278 18)"><Pane petal="var(--blush)" /></g>
    </svg>
    <svg className="garland garland-mini garland-l" viewBox="0 0 44 70" aria-hidden="true">
      <g transform="translate(1 0) scale(.8)"><PaneHead /></g>
      <path d={STAR(7)} transform="translate(22 61)" fill="var(--peony)" />
    </svg>
    <svg className="garland garland-mini garland-r" viewBox="0 0 44 70" aria-hidden="true">
      <g transform="translate(1 0) scale(.8)"><PaneHead petal="var(--blush)" /></g>
      <path d={STAR(7)} transform="translate(22 61)" fill="var(--peony)" />
    </svg>
  </>);
}

/** Small art-glass tulip panel, for card corners. */
export function Corner({ style }: { style?: CSSProperties }) {
  return (
    <svg className="corner" viewBox="0 0 52 64" aria-hidden="true" style={style}>
      <PaneHead />
    </svg>
  );
}

/** Prairie banding: double rule with end blocks and a red six-pointed Chicago star in the middle. */
export function LeafDivider() {
  return (
    <svg className="leaf-divider" viewBox="0 0 200 14" aria-hidden="true">
      <g stroke="var(--muted)" strokeWidth="1.2"><path d="M0 4.5H82M0 9.5H82M118 4.5H200M118 9.5H200" /></g>
      <g fill="var(--marigold)"><rect x="0" y="3" width="6" height="8" /><rect x="194" y="3" width="6" height="8" /></g>
      <rect x="84" y="3" width="4" height="8" fill="var(--euc)" /><rect x="112" y="3" width="4" height="8" fill="var(--euc)" />
      <path d={STAR(7.5)} transform="translate(100 7)" fill="var(--peony)" />
    </svg>
  );
}

/** Chicago flag band: two light-blue stripes, red six-pointed stars between. */
export function FlagBand() {
  return (
    <svg className="flag-band" viewBox="0 0 240 16" aria-hidden="true">
      <rect x="0" y="1" width="240" height="4" fill="var(--lake)" />
      <rect x="0" y="11" width="240" height="4" fill="var(--lake)" />
      {[66, 102, 138, 174].map((x) => <path key={x} d={STAR(4.6)} transform={`translate(${x} 8)`} fill="var(--peony)" />)}
    </svg>
  );
}

/** Geometric stem with two leaf triangles and a diamond bloom; `hue` picks the bloom colour token. */
export function Sprig({ hue = "blush" }: { hue?: "blush" | "marigold" | "sage" | "peony" }) {
  return (
    <svg className="sprig" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M10 38C14 28 20 20 28 12" stroke="var(--euc)" fill="none" strokeWidth="2" strokeLinecap="square" />
      <polygon points="15,28 6,24 10,32" fill="var(--sage)" />
      <polygon points="21,21 22,11 29,19" fill="var(--sage)" />
      <polygon points="30,3 37,10 30,17 23,10" fill={`var(--${hue})`} stroke="var(--lead)" strokeWidth="1" />
      <rect x="28" y="8" width="4" height="4" fill="var(--marigold)" />
    </svg>
  );
}

export type BloomState = "invite" | "ifroom" | "undecided" | "no" | "deceased" | "placeholder" | "couple";

const BLOOM_LABEL: Record<BloomState, string> = {
  invite: "invited", ifroom: "if room", undecided: "undecided", no: "not inviting", deceased: "deceased", placeholder: "tree only", couple: "the couple",
};
export const bloomLabel = (s: BloomState) => BLOOM_LABEL[s];

/**
 * A person's art-glass flower: tulip = invited, narrow bud = if room, dashed diamond = undecided, leaf = not inviting,
 * outlined tulip = deceased, stem + square = placeholder, twin tulips = couple. Shape + colour, never colour alone.
 */
export function Bloom({ state, size = 22, title }: { state: BloomState; size?: number; title?: string }) {
  const label = title ?? BLOOM_LABEL[state];
  return (
    <svg className={`bloom bloom-${state}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      {state === "invite" && (<>
        <path d="M12 23V14" stroke="var(--euc)" strokeWidth="2" />
        <polygon points="4,5 8,10 12,16 5,13" fill="var(--marigold)" />
        <polygon points="20,5 16,10 12,16 19,13" fill="var(--marigold)" />
        <polygon points="12,1 17,10 12,17 7,10" fill="var(--peony)" />
      </>)}
      {state === "couple" && (<>
        <path d="M7 15V22M17 15V22M7 22H17" stroke="var(--euc)" strokeWidth="1.8" fill="none" />
        <polygon points="7,2 11.5,9 7,16 2.5,9" fill="var(--blush)" />
        <polygon points="17,2 21.5,9 17,16 12.5,9" fill="var(--peony)" />
        <rect x="10.5" y="17" width="3" height="3" fill="var(--marigold)" />
      </>)}
      {state === "ifroom" && (<>
        <path d="M12 23V13" stroke="var(--euc)" strokeWidth="1.8" />
        <polygon points="12,2 15.5,8 12,14 8.5,8" fill="var(--marigold)" stroke="var(--lead)" strokeWidth="1" />
        <polygon points="12,20 5,15 12,16" fill="var(--sage)" />
      </>)}
      {state === "undecided" && (<>
        <polygon points="12,3 21,12 12,21 3,12" fill="none" stroke="var(--euc)" strokeWidth="1.8" strokeDasharray="3 2.4" />
        <rect x="10.2" y="10.2" width="3.6" height="3.6" fill="var(--euc)" />
      </>)}
      {state === "no" && <path d="M4 20V11L12 4H20V12L13 20ZM4 20L16 8" fill="var(--sage)" stroke="var(--euc)" strokeWidth="1.4" strokeLinejoin="round" />}
      {state === "deceased" && (<>
        <path d="M12 23V16" stroke="var(--muted)" strokeWidth="1.2" />
        <polygon points="4,5 8,10 12,16 5,13" fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="20,5 16,10 12,16 19,13" fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="12,1 17,10 12,17 7,10" fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeLinejoin="round" />
      </>)}
      {state === "placeholder" && (<>
        <path d="M12 22V11" stroke="var(--euc)" strokeWidth="1.8" />
        <rect x="8.5" y="5" width="7" height="7" fill="var(--euc)" />
      </>)}
    </svg>
  );
}
