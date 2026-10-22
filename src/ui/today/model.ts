// Pure helpers for Today (DESIGN-v4 §2): window countdown.
import type { DateWindow } from "../../data/params";
import { dayDiff, fmtDay } from "../plan/model";

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
