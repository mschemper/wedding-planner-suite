# DESIGN-v9 -- Jungalow Lounge theme. Agent-facing.
Mark picked option B (docs/mockups/v9-review.html, "B · Jungalow Lounge"): mid-century modern jungle, hunter green, brass, monstera + hydrangea. Supersedes DESIGN-v8 look. Token NAMES kept (v8 art tokens --lead/--window/--skyline/--skyline-far dropped), values changed, new tokens below.

## Palette (src/ui/styles.css; tests/contrast.test.ts gates AA)
| token | day | dusk |
|---|---|---|
| --ground / --card | #EDE6D6 / #F8F3E8 | #0F1D16 / #16291F |
| --ink / --muted / --line | #1C2A21 / #52594E / #D3C7AE | #F2E8D0 / #C2BCA6 / #2C4A3A |
| --euc (primary: selected tab, primary button) / --on-euc | #1E3D2B hunter / #F4E9CF | #D9B45A brass / #1E1500 |
| --euc-ink | #24503A | #E9C877 |
| --marigold (brass) / --on-gold / --gold-ink | #B88A2E / #1E1500 / #74560F | #D9B45A / #1E1500 / #F0D58C |
| --peony (terracotta) / --on-peony / --peony-ink | #A84A2C / #FFFFFF / #9A3F23 | #E0805F / #1E0C08 / #F2A285 |
| --blush (hydrangea pink) / --lake (hydrangea lilac) | #E3A1B4 / #B9A3D6 | #EDB3C3 / #C7B3E3 |
| --sage / --twinkle | #6E8B5E / #E2C27A | #5E9A6E / #E9C877 |
| NEW --leaf / --leaf-2 (motif greens) | #2F5A3A / #4C7A52 | #5E9A6E / #3E7A52 |
| NEW --band / --on-band (header band + its text) | #1E3D2B / #F4E9CF | #0B1712 / #F2E8D0 |
Dusk set lives twice (data-theme="dusk" and prefers-color-scheme block): keep identical. theme-color #1E3D2B.

## Type
Young Serif (single weight 400) for h1-h3, card titles and the old serif slots, normal case, never bold. Figtree 400/600/700 for body, tabs (uppercase, letter-spaced), numbers. Body 16px, floor 13px. Google Fonts link in index.html; offline build falls back to Georgia / system sans.

## Shape
Cards radius 10px, 1px line border, soft shadow, no double rule. Buttons, chips, filters, segmented controls and tabs are pills (999px / 22px). Tabs sit in a pill tray straddling the bottom edge of the header band; < 640px they become the bottom bar (square top edge, 12px tab radius) and the band is a full block.

## Motifs (src/ui/garden/motifs.tsx; inline SVG, tokens only, aria-hidden except Bloom; no animation)
- Garland: header jungle as two flanking svgs on the band: layered palm fronds, two monstera leaves (slits cut in --band), a hydrangea head (blush + lake), brass starbursts. < 780px: one small leaf / hydrangea per side (garland-mini).
- LeafDivider: brass rules, two sage leaves and a starburst under the title. FlagBand removed.
- Corner: monstera leaf, slits cut in --card, tucked into a card's top-right corner (rotated, partly off-card).
- Sprig: hydrangea head on a stem with two leaves (`hue` = head's main token).
- Bloom(state) shapes: invite = monstera leaf; couple = two hydrangea heads on stems; ifroom = brass hydrangea bud + leaf; undecided = dashed circle + dot; no = fallen leaf with a stroke; deceased = outlined leaf (muted); placeholder = stem + square.

## Contrast
All *-ink tokens pass 4.5:1 on ground and card, day and dusk; --on-band on --band added to the test. Dusk primary is brass (per the mock), so --on-euc is dark in dusk.
