// Plan feed for the Bauhaus wall dashboard (GET /api/feed/plan; docs/FEED.md). Pure. Only task titles, dates, owners,
// categories and counts leave: never task detail, source links, guests, money or contacts.
import type { Settings } from "../data/params";
import type { PlanFeed } from "../api/types";
import { weddingCountdown, weddingVenue } from "./day";
import { addDays, groupOf, nextUp } from "./tasks";
import type { Task, VenueRow } from "./types";

export const FEED_VERSION = 1;
export const FEED_NEXT = 6;

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export function planFeed(tasks: Task[], venues: VenueRow[], settings: Settings, today: string, generatedAt: string, n = FEED_NEXT): PlanFeed {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.length - open.length;
  const held = settings.heldDate;
  const cd = held ? weddingCountdown(today, held) : null;
  return {
    feed: FEED_VERSION,
    generated_at: generatedAt,
    today,
    wedding: held && cd ? { date: held, days: cd.days, weeks: cd.weeks, label: cd.big, past: cd.past, venue_status: weddingVenue(venues, settings)?.status ?? null } : null,
    progress: { done, open: open.length, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 },
    counts: {
      overdue: open.filter((t) => groupOf(t, today) === "overdue").length,
      week: open.filter((t) => groupOf(t, today) === "week").length,
      nodate: open.filter((t) => !t.due).length,
    },
    next: nextUp(tasks, today, n).map((t) => ({
      title: t.title,
      due: t.due ?? null,
      days: t.due ? dayDiff(today, t.due) : null,
      group: groupOf(t, today) as "overdue" | "week" | "later" | "nodate",
      owner: t.owner,
      category: t.category,
    })),
    week_end: addDays(today, 7),
  };
}
