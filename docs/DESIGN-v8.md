# DESIGN-v8 -- Prairie & Steel theme. Agent-facing.
Mark picked option C (docs/mockups/v8-theme-options.html .C): Wright Prairie art glass + Chicago skyline, still garden florals, mid-century. Supersedes DESIGN-v7 look; token NAMES unchanged, values changed, new tokens added.

## Palette (src/ui/styles.css; tests/contrast.test.ts gates AA)
| token | day | dusk (night skyline) |
|---|---|---|
| --ground / --card | #F2EBDD / #FBF6EC | #0F1822 / #172531 |
| --ink / --muted / --line | #2A2620 / #5C5446 / #D8C9AC | #F3EBDA / #BCC8CE / #2E4558 |
| --euc (olive; selected tab/button) / --on-euc | #4F6330 / #FFFFFF | #8DB365 / #0E1A0A |
| --euc-ink | #4F6330 | #A8CC7E |
| --marigold (ochre) / --on-gold | #D49A36 / #2A1D00 | #E8B04A / #2A1D00 |
| --gold-ink | #7A5410 | #F0C766 |
| --peony (brick, Chicago red) / --on-peony | #A33A2A / #FFFFFF | #D4624F / #1E0C08 |
| --peony-ink | #A33A2A | #F29A86 |
| --blush (rose) | #B9637A | #D98AA0 |
| --lake (flag light blue, NEW) | #8FC1E3 | #6FA6CC |
| --sage | #7C8F55 | #8FA66A |
| --twinkle | #EBCB7A | #F2C66B |
| NEW art tokens: --lead (glass lead lines) | #2A2620 | #0A1118 |
| --window (lit windows) | #FBF6EC | #F2C66B |
| --skyline / --skyline-far | #4A4338 / #B9AD93 | #24394B / #1A2B3A |
Dusk set lives twice (data-theme="dusk" and prefers-color-scheme block): keep identical.

## Type
Josefin Sans 400/600/700 for headings AND body (`--serif` and `--sans` both point to it; DM Serif Display and Jost dropped). h1-h3, tabs, card titles: uppercase, letter-spaced, weight 700. Body 16px, floor 13px. Google Fonts link in index.html. theme-color #F2EBDD.

## Shape
Cards radius 5px, thin double rule (inset line) as Prairie banding, flat 2px shadow. Tabs/buttons/chips/filters 2-3px radius; selected tab = olive fill + ochre underline. Bottom tab bar < 640px has a double top rule.

## Motifs (src/ui/garden/motifs.tsx; inline SVG, tokens only, aria-hidden except Bloom; no animation)
- Garland: header panorama as two flanking svgs (centre clear for title). Left: art-glass tulip panel, Marina City corncobs, ochre sun, Willis Tower with twin antennas, Prairie low-rise. Right: Prairie low-rise, Hancock with X-bracing + antennas, Water Tower, rose sun, tulip panel. Lake band along the base. Width = clamp((100vw-500px)/2, 340px); < 780px swaps to small tulip pane + red star (garland-mini). Theme button sits inboard of the right panel.
- FlagBand (new export): Chicago flag band (two --lake stripes, four red six-pointed stars) under the divider in App.tsx.
- LeafDivider: Prairie banding (double rules, ochre/olive end blocks) with a red six-pointed star. Corner: small tulip pane. Sprig: geometric stem, two leaf triangles, diamond bloom (`hue`).
- Bloom(state) shapes: invite = tulip (red diamond, ochre side petals, stem); couple = twin diamond tulips; ifroom = narrow ochre bud + leaf; undecided = dashed diamond + square; no = angular leaf; deceased = outlined tulip (muted); placeholder = stem + square.

## Contrast adjustments
All *-ink tokens pass 4.5:1 on ground and card, day and dusk (26 tests). Changes vs the mockup: --gold-ink darkened to #7A5410 (ochre #D49A36 fails as text); --on-peony is white day (brick #A33A2A), dark #1E0C08 dusk (lighter brick #D4624F); dusk accents (euc-ink, peony-ink, gold-ink) lightened for the navy ground. --muted/--ink need no change.
