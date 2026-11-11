// v14 wedding checklist template (DESIGN-v14 §4): tasks + decisions counted back from the wedding, with dependencies.
// Tuned for The Joinery, Sat 29 May 2027, starting ~200 days out. Pure. Task `source` = "template:<key>".
import type { Op } from "../api/types";
import { addDays } from "./tasks";
import type { Category, Owner, Task, TaskKind } from "./types";

export interface TemplateItem {
  key: string;
  title: string;
  kind: TaskKind;
  /** days before the wedding */
  before: number;
  category: Category;
  owner?: Owner;
  /** keys of template items that must be done first */
  deps?: string[];
  detail?: string;
}

const d = (key: string, title: string, before: number, category: Category, deps: string[] = [], detail?: string, owner?: Owner): TemplateItem =>
  ({ key, title, kind: "decision", before, category, deps, detail, owner });
const t = (key: string, title: string, before: number, category: Category, deps: string[] = [], detail?: string, owner?: Owner): TemplateItem =>
  ({ key, title, kind: "task", before, category, deps, detail, owner });

export const TEMPLATE: TemplateItem[] = [
  // now: the venue paperwork and the decisions everything else waits on
  t("joinery-contract", "Joinery: confirm the contract is countersigned; save the PDF to Drive", 195, "venue", [],
    "HoneyBook link in Shay's 10 Nov email \"Angela + Mark / The Joinery / 5.29.27\". Confirm the $3,000 balance of the deposit arrived.", "Mark"),
  t("joinery-questions", "Ask Shay: payment schedule, final headcount date, COI, vendor load-in, music curfew, decor rules, rain plan", 190, "venue",
    ["joinery-contract"], "Open questions live on Day → Our venue. Pay by check or Zelle to avoid the 3.1% fee."),
  d("budget", "Decide the total budget and who pays for what", 190, "budget"),
  d("palette", "Decide the look: colours and style (drives florals, stationery, decor)", 180, "design"),
  d("guest-list", "Decide the guest list (finish the undecided households)", 180, "guests", ["budget"], "People → Decide. Headcount drives catering, bar and invitations."),
  d("planner", "Decide: day-of coordinator or full planner", 185, "vendor", ["budget"], "The Joinery's recommended planners are on Day → Our venue."),
  t("planner-book", "Book the planner / coordinator", 175, "vendor", ["planner"]),
  d("photo", "Choose the photographer", 180, "vendor", ["budget"]),
  t("photo-book", "Book the photographer + pay the deposit", 170, "vendor", ["photo"]),
  d("music", "Decide music: Joel Paterson and Friends or a DJ", 180, "vendor", ["budget", "joinery-questions"], "Needs the Joinery's amplification and curfew rules."),
  t("music-book", "Book the band / DJ + pay the deposit", 165, "vendor", ["music"]),
  d("caterer", "Choose the caterer (tasting first)", 175, "vendor", ["budget"], "Catering is ours to bring: Joinery recommended list on Day → Our venue."),
  t("caterer-book", "Book the caterer + pay the deposit", 165, "vendor", ["caterer"]),
  d("attire-a", "Choose Angela's wedding attire", 185, "design", [], "Dresses often take 4–6 months plus alterations.", "Angela"),
  t("attire-a-order", "Order Angela's attire", 175, "design", ["attire-a"], undefined, "Angela"),
  // 6–4 months
  t("website", "Wedding website + RSVP page live", 160, "guests"),
  t("addresses", "Collect mailing addresses for invited households", 155, "guests", ["guest-list"], "People → Addresses shows who is missing."),
  t("lodging", "Hotel room block / Mill House for out-of-town guests", 160, "admin", ["guest-list"], "Mill House next door sleeps 10 (2-night minimum)."),
  t("engagement-photos", "Engagement photos (for the save-the-dates)", 165, "design", ["photo-book"]),
  d("std-design", "Choose the save-the-date design", 160, "design", ["palette"]),
  t("std-send", "Send save-the-dates", 150, "guests", ["std-design", "addresses", "website"], "Memorial Day weekend: out-of-town guests need notice."),
  d("bar", "Choose the bar: Joinery package (Standard / Premium / All-inclusive) or BYOB", 150, "budget", ["caterer", "guest-list"], "Bar minimum $4,000; max 5 hours."),
  d("florist", "Choose the florist", 150, "vendor", ["palette", "budget"]),
  t("florist-book", "Book the florist", 140, "vendor", ["florist"]),
  d("officiant", "Choose the officiant", 150, "vendor"),
  t("officiant-book", "Book the officiant", 140, "vendor", ["officiant"]),
  t("beauty", "Book hair & makeup (with a trial)", 130, "vendor", [], undefined, "Angela"),
  d("honeymoon", "Decide the honeymoon", 130, "admin", ["budget"]),
  t("attire-m", "Choose + order Mark's attire", 120, "design", ["palette"], undefined, "Mark"),
  d("cake", "Choose cake / dessert (the Joinery has a donut wall)", 120, "vendor", ["caterer-book"]),
  t("cake-book", "Order the cake / dessert", 110, "vendor", ["cake"]),
  d("invites-design", "Choose invitation design + wording", 110, "design", ["palette", "std-send"]),
  t("invites-order", "Order invitations", 95, "design", ["invites-design"]),
  // 3–1 months
  t("kids-party", "Plan Sylvie's party: sitters, kid food, activities", 90, "guests", ["guest-list", "joinery-questions"]),
  d("transport", "Decide guest transport / parking plan", 90, "admin", ["lodging"], "Joinery: park in front of the driveway; loading dock to the kitchen."),
  t("rings", "Choose + order wedding rings", 90, "design"),
  t("rentals", "Rentals beyond the Joinery's inventory (linens, decor)", 75, "vendor", ["caterer-book", "florist-book"], "Included: 22 tables, 180 chairs, 12 highboys, arch, table numbers."),
  t("invites-mail", "Mail invitations", 70, "guests", ["invites-order", "addresses"]),
  t("attire-a-fit", "Alterations / final fittings", 45, "design", ["attire-a-order"], undefined, "Angela"),
  t("menu-final", "Finalise the menu with the caterer", 45, "vendor", ["caterer-book", "bar"]),
  t("ceremony", "Write the ceremony + vows with the officiant", 45, "admin", ["officiant-book"]),
  t("rsvp", "RSVP deadline", 35, "guests", ["invites-mail"]),
  t("license", "Get the marriage license (Cook County)", 30, "admin", [], "Valid 60 days; takes effect the day after it is issued."),
  t("rsvp-chase", "Chase missing RSVPs", 28, "guests", ["rsvp"]),
  t("coi", "Vendor insurance certificates (COIs) to the Joinery, if required", 21, "vendor", ["joinery-questions", "caterer-book"]),
  t("walkthrough", "Final walkthrough at the Joinery with the planner", 21, "venue", ["planner-book"]),
  // last two weeks
  t("final-count", "Final headcount to the caterer + the Joinery", 14, "guests", ["rsvp-chase"]),
  t("timeline-out", "Send the day-of timeline to vendors (access 2 PM, end midnight)", 14, "vendor", ["music-book", "photo-book", "caterer-book"], "Day → Timeline."),
  t("seating", "Finish the seating plan (22 tables × 8)", 10, "guests", ["final-count"]),
  t("final-pay", "Final vendor payments", 10, "budget", ["final-count"], "Joinery: check to The Joinery Studios LLC or Zelle (no 3.1% fee)."),
  t("confirm", "Confirm vendor arrival times", 7, "vendor", ["timeline-out"]),
];

export const templateSource = (key: string) => `template:${key}`;

/** v11 Day milestones ("milestone:<key>") that already cover a template item. */
export const MILESTONE_ALIAS: Record<string, string> = {
  "venue-contract": "joinery-contract", attire: "attire-a-order", caterer: "caterer-book", photo: "photo-book", music: "music-book",
  website: "website", "save-dates": "std-send", lodging: "lodging", florals: "florist-book", officiant: "officiant-book", beauty: "beauty",
  bar: "bar", "invites-order": "invites-order", "invites-mail": "invites-mail", rsvp: "rsvp", license: "license", "final-count": "final-count",
  "timeline-out": "timeline-out", seating: "seating", "final-pay": "final-pay", confirm: "confirm",
};

/** Template key a task stands for: "template:<key>", or a v11 milestone alias. */
export function templateKey(source: string | null | undefined): string | null {
  if (source?.startsWith("template:")) return source.slice(9);
  if (source?.startsWith("milestone:")) return MILESTONE_ALIAS[source.slice(10)] ?? null;
  return null;
}

export interface TemplateDraft {
  key: string;
  title: string;
  kind: TaskKind;
  due: string;
  /** the ideal date had passed: due moved to today */
  late: boolean;
  category: Category;
  owner: Owner;
  detail?: string;
  deps: string[];
  source: string;
}

/** Template items not yet in `tasks` (matched by source), due = wedding − before, never before today. Sorted by due. */
export function templateDrafts(wedding: string, today: string, tasks: Pick<Task, "source">[]): TemplateDraft[] {
  const have = new Set(tasks.map((x) => templateKey(x.source)).filter(Boolean));
  return TEMPLATE.filter((m) => !have.has(m.key)).map((m) => {
    const ideal = addDays(wedding, -m.before);
    const late = ideal < today;
    return { key: m.key, title: m.title, kind: m.kind, due: late ? today : ideal, late, category: m.category, owner: m.owner ?? "Both",
      detail: m.detail, deps: m.deps ?? [], source: templateSource(m.key) };
  }).sort((a, b) => a.due.localeCompare(b.due) || a.key.localeCompare(b.key));
}

/**
 * One save that creates the chosen drafts. Deps point at drafts in this batch (tmp ids) or at existing tasks carrying
 * the template source; deps on neither (unticked, never added) are dropped.
 */
export function templateOps(drafts: TemplateDraft[], keys: Set<string>, tasks: Pick<Task, "id" | "source">[]): Op[] {
  const existing = new Map(tasks.flatMap((x) => { const k = templateKey(x.source); return k ? [[k, x.id] as const] : []; }));
  const chosen = drafts.filter((x) => keys.has(x.key));
  const inBatch = new Set(chosen.map((x) => x.key));
  return chosen.map((x) => ({
    table: "tasks" as const, op: "create" as const,
    row: {
      id: `tmp:${x.key}`, title: x.title, kind: x.kind, due: x.due, category: x.category, owner: x.owner, detail: x.detail ?? null,
      source: x.source, status: "open",
      depends_on: x.deps.flatMap((k) => (inBatch.has(k) ? [`tmp:${k}`] : existing.has(k) ? [existing.get(k)!] : [])),
    },
  }));
}
