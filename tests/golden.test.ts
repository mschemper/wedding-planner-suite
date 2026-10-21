import { describe, expect, it } from "vitest";
import { computeBudget } from "../src/engine/compute";
import { scenarioById } from "../src/data/scenarios";
import { GOLDEN, GOLDEN_TOLERANCE } from "../src/data/golden";

describe("engine reproduces Reconciled Master v2.0 totals", () => {
  for (const [id, opts, cols] of GOLDEN) {
    for (const [g, expected] of Object.entries(cols)) {
      it(`S${id} ${Object.values(opts).join("/")} @${g}`, () => {
        const total = computeBudget(scenarioById(id), Number(g), opts).total;
        expect(Math.abs(total - expected), `got ${total}, doc ${expected}`).toBeLessThanOrEqual(GOLDEN_TOLERANCE);
      });
    }
  }
});
