// Totals transcribed from Reconciled Master v2.0, Part III tables. Do not edit without a HISTORY.md entry.
// [scenarioId, options, { guests: total }]
import type { Options } from "../engine/types";

/** optional 4th element: wedding date; omitted → the scenario's docSeason */
export type Golden = [number, Options, Record<number, number>, string?];

export const GOLDEN: Golden[] = [
  [1, { bar: "Beer & Wine" }, { 50: 43020, 75: 49695, 100: 56370, 125: 63295 }],
  [1, { bar: "Full Bar" }, { 50: 43980, 75: 51135, 100: 58290, 125: 65695 }],
  [2, { bar: "Beer & Wine" }, { 50: 29520, 75: 35545, 100: 41570, 125: 47645 }],
  [2, { bar: "Full Bar" }, { 50: 30480, 75: 36985, 100: 43490, 125: 50045 }],
  [3, { bar: "BYO Beer & Wine" }, { 50: 34960, 75: 41305, 100: 47650, 125: 54045 }],
  [3, { bar: "BYO Full Bar" }, { 50: 35560, 75: 42105, 100: 48650, 125: 55245 }],
  // S4: doc priced 50/75 as off-peak Saturdays and 100/125 as peak.
  [4, { bar: "Beer & Wine" }, { 50: 32945, 75: 40220 }, "2027-03-20"],
  [4, { bar: "Beer & Wine" }, { 100: 51995, 125: 59320 }, "2027-05-15"],
  [4, { bar: "Full Bar" }, { 50: 33665, 75: 41300 }, "2027-03-20"],
  [4, { bar: "Full Bar" }, { 100: 53435, 125: 61120 }, "2027-05-15"],
  [5, { bar: "Tier 1 (Beer & Wine)" }, { 50: 33560, 75: 39855, 100: 46150 }],
  [5, { bar: "Tier 2 (Full Bar)" }, { 50: 34160, 75: 40755, 100: 47350 }],
  [6, { bar: "Beer & Wine" }, { 50: 28975, 75: 35825, 100: 46175, 125: 53575 }],
  [6, { bar: "Full Bar" }, { 50: 29935, 75: 37265, 100: 48095, 125: 55975 }],
  [7, { bar: "BYO Beer & Wine" }, { 50: 26500, 75: 31175, 100: 35850, 125: 40600 }],
  [7, { bar: "BYO Full Bar (IN-licensed)" }, { 50: 26550, 75: 31575, 100: 36600, 125: 41700 }],
  // S8 @125: doc totals (47,010 / 50,865) do not sum their own line items; corrected to the line-item sums. See docs/REVIEW-v2.md F-03.
  [8, { bar: "Beer & Wine" }, { 50: 35350, 75: 35775, 100: 40490, 125: 47060 }],
  [8, { bar: "Full Cocktail" }, { 50: 35350, 75: 36280, 100: 43570, 125: 50913 }],
  [9, { bar: "BYO Beer & Wine" }, { 50: 32330, 75: 37110, 100: 41890, 125: 46720 }],
  [9, { bar: "BYO Full Bar" }, { 50: 32930, 75: 37910, 100: 42890, 125: 47920 }],
  [10, { bar: "Beer & Wine" }, { 50: 26990, 75: 32385, 100: 37780, 125: 43225 }],
  [10, { bar: "Full Bar" }, { 50: 27910, 75: 33760, 100: 39615, 125: 45520 }],
  [11, { bar: "Kegs · Beer & Wine" }, { 50: 22150, 75: 23600, 100: 25800, 125: 27550 }],
  [11, { bar: "BYO Full Bar" }, { 50: 22500, 75: 24125, 100: 26500, 125: 28425 }],
  [12, { scope: "Full scope" }, { 50: 39905, 75: 48285, 100: 56665, 125: 65065 }],
  [12, { scope: "Reduced scope" }, { 50: 32405, 75: 39035, 100: 45665, 125: 52315 }],
  [13, { bar: "Premium Bar" }, { 200: 116485, 250: 131985 }],
  [13, { bar: "Beer & Wine" }, { 200: 113315, 250: 128020 }],
  [14, { bar: "Beer & Wine" }, { 75: 37318, 125: 54731, 200: 81345, 250: 98737 }],
  [14, { bar: "Full Bar" }, { 75: 40068, 125: 59106, 200: 88345, 250: 107487 }],
  [15, { bar: "Package Bar" }, { 75: 27974, 125: 44098, 200: 69024, 250: 85798 }],
  [15, { bar: "Premium Bar" }, { 75: 29374, 125: 46248, 200: 72124, 250: 89396 }],
  [16, { bar: "Beer & Wine" }, { 75: 40260, 125: 64473, 200: 98760, 250: 121100 }],
  [16, { bar: "Full Bar" }, { 75: 45010, 125: 70784, 200: 107360, 250: 131100 }],
];

/** Source doc rounds percent rows to the nearest ~$5–25; anything larger is a real discrepancy. */
export const GOLDEN_TOLERANCE = 30;
