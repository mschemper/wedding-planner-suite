# DESIGN-v7 -- Conservatory Modern theme. Agent-facing.
Mark picked option B (22 Oct 2026; mockup docs/mockups/v7-theme-options.html .B): Garfield Park Conservatory + 1950s mid-century botanical prints, garden florals. Supersedes DESIGN-v4 §6 look; token NAMES unchanged (components keep working), values changed.

## Palette (src/ui/styles.css; tests/contrast.test.ts gates AA)
| token | day | dusk |
|---|---|---|
| --ground / --card | #F7F1E6 / #FFFBF4 | #16302B / #1E3D37 |
| --ink / --muted / --line | #22302D / #4F5F5A / #E2D6C1 | #F6EFE3 / #C9D6CF / #345850 |
| --euc (accent fill) / --on-euc | #1F6A66 / #FFFFFF | #5FB5AC / #0E2420 |
| --euc-ink (text) | #1F6A66 | #8FD6CD |
| --sage | #7FA48E | #8DB59C |
| --marigold / --on-gold | #E9B44C / #2E2200 | same |
| --gold-ink (text) | #7A5A12 | #F2CB73 |
| --peony (coral) / --on-peony | #E07A5F / #2B1510 | #E58A70 / #2B1510 |
| --peony-ink (text) | #B5432E | #F5A794 |
| --blush / --twinkle | #F2A7A0 / #F6DE9A | same |
Dusk set lives twice (data-theme="dusk" and prefers-color-scheme block): keep identical.

## Type
--serif DM Serif Display (headings, one weight: h1-h3 and every serif use font-weight 400, never 700/800); --sans Jost 400/500/600 (body 16px, floor 13px). Google Fonts link in index.html. theme-color #F7F1E6.

## Shape
Cards radius 22px + soft shadow; tabs/filters pill, selected = --euc fill; segmented controls keep 12px radius.

## Motifs (src/ui/garden/motifs.tsx, all aria-hidden except Bloom)
- Garland (name kept): header garden, two svgs at header edges: left coral atomic bloom (5 circles, mustard centre) + sage and teal leaves; right blush starburst flower (coral + mustard centre) + teal and sage leaves; teal stems; mustard sparkles. Sway/twinkle animations off under prefers-reduced-motion. 132px wide >= 900px, 96px 640-899, 64px 460-639, hidden < 460. Theme button sits inboard of the right bloom.
- Corner: coral atomic bloom on a teal stem with a sage leaf. LeafDivider: stem, two sage leaves, coral bud. Sprig: stem, two leaves, bloom with mustard dot.
- Bloom(state): shapes differ per state (never colour alone): invite = atomic bloom (5 coral circles, mustard centre); couple = 4-ellipse starburst blush + coral + mustard centre; ifroom = marigold bud on stem + leaf; undecided = dashed ring + dot; no = sage leaf; deceased = outlined atomic petals (muted); placeholder = stem + dot.

## Contrast adjustments
Requested hexes all pass AA as text except white on coral: .k-seg-opt.tone-peony text changed #fff -> --on-peony (#2B1510, new token). Dusk accents lightened (euc #5FB5AC, euc-ink, peony-ink, gold-ink) to pass on #16302B/#1E3D37. Test also covers on-euc/euc, on-gold/marigold, on-peony/peony in both themes. Serif headings >= 24px would only need 3:1; all are held to 4.5.
