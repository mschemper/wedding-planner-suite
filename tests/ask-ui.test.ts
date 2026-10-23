// Ask panel pure helpers (src/ui/ask/model.ts).
import { describe, expect, it } from "vitest";
import { EXAMPLES, HISTORY_TURNS, MAX_QUESTION, NO_KEY_MESSAGE, askErrorText, cleanQuestion, trimHistory, type Turn } from "../src/ui/ask/model";

describe("ask model", () => {
  it("keeps the last 6 non-empty turns", () => {
    const t: Turn[] = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` }));
    const h = trimHistory([...t, { role: "user", text: "  " }]);
    expect(h).toHaveLength(HISTORY_TURNS);
    expect(h[0].text).toBe("m3");
    expect(h.at(-1)?.text).toBe("m8");
  });
  it("cleans questions", () => {
    expect(cleanQuestion("  hi ")).toBe("hi");
    expect(cleanQuestion("   ")).toBeNull();
    expect(cleanQuestion("x".repeat(MAX_QUESTION))).not.toBeNull();
    expect(cleanQuestion("x".repeat(MAX_QUESTION + 1))).toBeNull();
  });
  it("explains errors", () => {
    expect(askErrorText(503, "x")).toEqual({ text: NO_KEY_MESSAGE, retry: false });
    expect(askErrorText(502, "Bad")).toEqual({ text: "Bad", retry: true });
    expect(askErrorText(undefined, "").retry).toBe(true);
  });
  it("has 3-4 examples", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(3);
    expect(EXAMPLES.length).toBeLessThanOrEqual(4);
  });
});
