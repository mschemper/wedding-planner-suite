// Pure helpers behind Today (src/ui/today/model.ts, v14): Ready now, decision label, venue chip, payments, error boundary. Synthetic data.
import { describe, expect, it } from "vitest";
import type { Payment } from "../src/plan/day";
import type { Task } from "../src/plan/types";
import { ErrorBoundary } from "../src/ui/ErrorBoundary";
import { NO_DATE, decisionLabel, paymentText, readyTop, venueStatusChip } from "../src/ui/today/model";

const TODAY = "2026-11-10";
const t = (id: string, o: Partial<Task> = {}): Task =>
  ({ id, title: id, owner: "Both", category: "venue", status: "open", due: null, sort: 0, version: 1, ...o }) as unknown as Task;

describe("Ready now", () => {
  const tasks = [
    t("a", { due: "2026-12-01" }),
    t("dec", { kind: "decision", due: "2027-01-01" }),
    t("late", { due: "2026-11-01" }),
    t("blocked", { depends_on: ["a"] } as Partial<Task>),
    t("done", { status: "done" }),
    ...["x1", "x2", "x3", "x4"].map((id, i) => t(id, { due: `2027-02-0${i + 1}` })),
  ];
  it("decisions first, then overdue; blocked and done excluded; top 5", () => {
    const r = readyTop(tasks, TODAY, 5);
    expect(r).toHaveLength(5);
    expect(r[0].id).toBe("dec");
    expect(r[1].id).toBe("late");
    expect(r.map((x) => x.id)).not.toContain("blocked");
    expect(r.map((x) => x.id)).not.toContain("done");
  });
  it("decision label is text", () => {
    expect(decisionLabel(t("d", { kind: "decision" }))).toBe("◆ Decision");
    expect(decisionLabel(t("n"))).toBe("");
  });
});

describe("venue card + countdown fallback", () => {
  it("chip says the status in words", () => {
    expect(venueStatusChip("booked")).toEqual({ tone: "euc", text: "booked" });
    expect(venueStatusChip("held")).toEqual({ tone: "peony", text: "held" });
    expect(NO_DATE.big).toBe("No date");
  });
});

describe("payments", () => {
  const p = (o: Partial<Payment> = {}): Payment => ({ vendor: { id: "v", name: "The Joinery", category: "venue", status: "booked" } as Payment["vendor"], kind: "balance", due: "2026-11-13", amount: 3500, overdue: false, ...o });
  it("line has kind, vendor, amount, due", () => {
    expect(paymentText(p(), TODAY)).toBe("Balance · The Joinery · $3,500 · due Fri, Nov 13");
    expect(paymentText(p({ kind: "deposit", amount: null, due: "2026-11-08" }), TODAY)).toBe("Deposit · The Joinery · overdue 2 days");
  });
});

describe("ErrorBoundary", () => {
  it("fails, and resets when the tab key changes", () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    expect(ErrorBoundary.getDerivedStateFromProps({ resetKey: "plan", children: null }, { failed: true, key: "today" })).toEqual({ failed: false, key: "plan" });
    expect(ErrorBoundary.getDerivedStateFromProps({ resetKey: "today", children: null }, { failed: true, key: "today" })).toBeNull();
  });
});
