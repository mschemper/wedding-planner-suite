// WCAG contrast gate for the Prairie & Steel tokens (DESIGN-v8): text tokens on ground + card, day and dusk (night skyline).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ui/styles.css", "utf8");

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
  return out;
}
const day = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const dusk = { ...day, ...tokens(css.slice(css.indexOf(':root[data-theme="dusk"]'), css.indexOf("/* v3 aliases"))) };

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT = ["ink", "muted", "peony-ink", "euc-ink", "gold-ink"];
const GROUNDS = ["ground", "card"];

describe("contrast (WCAG AA 4.5:1 for text)", () => {
  for (const [name, t] of [["day", day], ["dusk", dusk]] as const) {
    for (const fg of TEXT) for (const bg of GROUNDS) {
      it(`${name}: --${fg} on --${bg}`, () => {
        expect(t[fg], `missing --${fg}`).toBeDefined();
        expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of [["on-euc", "euc"], ["on-gold", "marigold"], ["on-peony", "peony"]] as const) {
      it(`${name}: --${fg} on --${bg} (buttons, selected tab, segmented controls)`, () => {
        expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
