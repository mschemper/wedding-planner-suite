// Pure helpers for the Day tab "Our venue" section (DESIGN-v11).
import { addDays } from "../../plan/tasks";

/** Memorial Day (last Monday of May) weekend: the Fri, Sat, Sun or Mon of it. Returns the holiday date or null. */
export function memorialWeekend(date: string): string | null {
  const [y] = date.split("-").map(Number);
  let d = `${y}-05-31`;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, -1);
  const off = Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000);
  return off >= 0 && off <= 3 ? d : null;
}

/** First `max` items and how many are hidden. */
export function capList<T>(items: T[], max: number, all: boolean): { shown: T[]; hidden: number } {
  if (all || items.length <= max) return { shown: items, hidden: 0 };
  return { shown: items.slice(0, max), hidden: items.length - max };
}

/** Split contact text into plain text and mailto:/tel: links (emails, phone numbers). */
export function contactParts(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  const re = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?<!\d)\d{3}[-. ]\d{3}[-. ]\d{4}(?!\d)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: m[0], href: m[0].includes("@") ? `mailto:${m[0]}` : `tel:+1${m[0].replace(/\D/g, "")}` });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
