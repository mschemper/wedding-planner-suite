// Pure helpers for Today (DESIGN-v4 §2, v14 §3): countdown, venue card, Ready now, payments.
import type { DateWindow } from "../../data/params";
import type { Payment } from "../../plan/day";
import { readyNow } from "../../plan/deps";
import type { Task } from "../../plan/types";
import { dayDiff, dueLabel, fmtDay } from "../plan/model";

/** "12 days" | "6 weeks" | "7½ months" | "2 years" style span for a day count (>= 0). */
export function spanText(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  const months = Math.round((days / 30.44) * 2) / 2;
  if (months >= 24) return `${Math.round(months / 12)} years`;
  const whole = Math.floor(months);
  const half = months - whole === 0.5;
  const text = whole === 0 ? "½" : `${whole}${half ? "½" : ""}`;
  return `${text} month${months === 1 ? "" : "s"}`;
}

export interface Countdown { big: string; sub: string; inWindow: boolean }

/** Countdown to the next window start, or "now" when today is inside a window. */
export function countdown(today: string, windows: DateWindow[]): Countdown {
  const now = windows.find((w) => w.from <= today && today <= w.to);
  if (now) return { big: "Now", sub: `in the ${now.name.toLowerCase()} window (until ${fmtDay(now.to)})`, inWindow: true };
  const next = windows.filter((w) => w.from > today).sort((a, b) => a.from.localeCompare(b.from))[0];
  if (next) return { big: spanText(dayDiff(today, next.from)), sub: `until the ${next.name.toLowerCase()} window opens (${fmtDay(next.from)})`, inWindow: false };
  return { big: "Past", sub: "all date windows have passed", inWindow: false };
}

/** "When" card sub-line when a venue holds the wedding date: "to Sat May 29, 2027 · The Joinery". */
export const weddingSub = (date: string, venueName: string): string => `to ${fmtDay(date, true)} · ${venueName}`;

/** "Our venue" card room line: "≈ 64 / 160 seats" (cap null = no seated cap). */
export const roomLine = (expected: number, cap: number | null): string => (cap == null ? `≈ ${expected} expected` : `≈ ${expected} / ${cap} seats`);

/** "When" card when no venue holds a date. */
export const NO_DATE = { big: "No date", sub: "no venue holds a wedding date yet" } as const;

/** Venue card chip: booked = euc, anything else (held, ...) = peony; text is always the status word. */
export const venueStatusChip = (status: string | undefined): { tone: "euc" | "peony"; text: string } =>
  status === "booked" ? { tone: "euc", text: "booked" } : { tone: "peony", text: status ?? "held" };

/** "Ready now" rows: the first `n` of readyNow (decisions first). */
export const readyTop = (tasks: Task[], today: string, n = 5): Task[] => readyNow(tasks, today).slice(0, n);
/** Text label for decisions (never colour alone). */
export const decisionLabel = (t: Pick<Task, "kind">): string => (t.kind === "decision" ? "◆ Decision" : "");

/** Payment row: "Deposit · The Joinery · $3,500 · due Fri Nov 13". */
export const paymentText = (p: Payment, today: string): string =>
  `${p.kind === "deposit" ? "Deposit" : "Balance"} · ${p.vendor.name}${p.amount != null ? ` · $${Math.round(p.amount).toLocaleString("en-US")}` : ""} · ${dueLabel(p.due, today).text}`;
