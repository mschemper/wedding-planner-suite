# REVIEW-v15 -- visual design review, QA, UAT (10 Nov 2026)
Scope: v14 app (Today, Budget, People, Plan, Day) on local dev (synthetic data) + offline build. Viewports 360x780, desktop; day + dusk. Moves to docs/archive/ at the next release.

## Fixed in v15
| # | Finding | Fix (file) |
|---|---|---|
| a | 65 text elements below the 13px floor (budget table header 10.5px, chips 11.5px, stats, quotes labels, phone tab labels 12px) | every `font-size` < 13px -> 13px (styles.css, quotes.css, people.css); glyph-only caret kept |
| b | Day contact links 24px tall | `.ov-list a` min-height 44px (ourVenue.css) |
| c | "email ↗" source links 43x44 | `.pl-src` min-width 44px (plan.css) |
| d | Today "When" repeated the date as a chip; venue shown as "Joinery" | chip removed; full name "The Joinery" (TodayScreen.tsx) |
| e | Task form "Venue (optional)" listed passed venues | field removed (venue selection retired) (TaskSheet.tsx, Tasks.tsx); stored `scenario_id` untouched |
| f | Plan List/Calendar reset on every tab switch | `prefs.planMode` (prefs.ts, PlanScreen.tsx) |
| h | Offline Today showed "Room ≈ 0 / 160 seats" (no guest data offline) | room line hidden offline (TodayScreen.tsx) |

## QA (all PASS)
Deep links + highlight; dependency unlock + Undo; Waits-on loop exclusion; address dirty-guard / save / remove / progress; theme cycle; arrow-key tabs; Budget contingency; no horizontal overflow at 360px on any tab; no console errors; offline build: renders, read-only, zero network requests after load (2 `fetch(` strings = Vite preload polyfill + guarded API client).

## UAT (Mark / Angela scenarios, all PASS)
| Scenario | Result |
|---|---|
| See what to do this week | Today: Ready now + Next up + payments due |
| Add the checklist | Plan -> Add the wedding checklist: 51 items, deps kept |
| Complete a decision, see what unblocks | "Decide the total budget" done -> Ready now 19 -> 23; Undo restores |
| Record / edit a household address | People -> Addresses + household card; Save blocked while address draft unsaved |
| Budget at a guest count | Budget: basis + custom guests + contingency reprice |
| Find Joinery contacts + open questions | Day -> Our venue: contacts (44px links), 10 questions |
| Phone use | 360px: bottom tab bar, no overflow, targets >= 44px |

## Needs Mark's design pick (not built; BACKLOG F31)
1. Today order: Ready now above Headcount/venue; one row style for Ready now + Next up.
2. Plan on phone: owner/category filters behind one "Filter" button (now 2 rows of chips above the list).
3. Leaf motif overlaps card corners at 360px.
4. Money shown in 3 places (Today venue card, Budget, Day money) -- pick one home + links.
5. Done toast could name what it unblocked ("2 tasks now ready").
