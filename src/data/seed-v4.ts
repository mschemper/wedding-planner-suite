// v4 non-guest seed (DESIGN-v4 §7.1): venue status rows, must-haves (Mark's notebook, 21 Oct 2026), known fit, tasks from the
// email sweep of 21 Oct 2026. Vendor contacts are business contacts. No guest names here (those come from the private import).
import type { Fit, MustHave, Task, VenueRow } from "../plan/types";
import { fitId } from "../plan/types";
import { SCENARIOS } from "./scenarios";

const gmail = (hex: string) => `https://mail.google.com/mail/u/0/#all/${hex}`;

const ACTIVE: Record<number, Partial<VenueRow>> = {
  17: {
    status: "held", hold_date: "2027-06-12", tour_date: "2026-10-20", contact_name: "Sarah and Teddy (Event Producers)",
    contact_email: "events@firehousechicago.com", next_step: "Ask when the June 12 hold resolves",
    notes: "Hold pending the previous couple. Typical day: ceremony 5pm outdoors, cocktail hour in the garden, dinner + dancing inside, last song 11pm. Upstairs room fits a kids' party.",
  },
  18: { status: "researching", next_step: "Get the rate sheet, F&B minimum, catering/bar policy and 2027 dates" },
  4: {
    status: "researching", contact_name: "Alex Seavey", contact_email: "aseavey@riverroomchicago.com", contact_phone: "630-809-2686",
    next_step: "Book a tour (Calendly link in email) or drop it",
    notes: "Free lot across the street; valet for an extra fee. Fully ADA first floor, 5 single-stall bathrooms. Peak Saturdays need 100+ on the bar package.",
  },
  5: {
    status: "researching", contact_name: "Shay", contact_email: "info@thejoinerychicago.com", next_step: "Confirm a visit time (asked 21 Oct)",
    notes: "Capacity 160 seated with dance floor. Approved-list caterer, florals, planner. BYOB through the venue.",
  },
};
const ARCHIVE: Record<number, Partial<VenueRow>> = {
  3: { contact_name: "Colleen Plowman", contact_email: "events@salvageone.com", contact_phone: "312-733-0098" },
  8: { status: "passed", contact_name: "Mackenzie Murphy", contact_email: "mackenzie@16oncenterchicago.com",
    notes: "Quote 18 Jun 2026: $10k rental + $20k F&B minimum + $1,500 ceremony fee; cocktail-style only." },
};

export const SEED_VENUES: VenueRow[] = SCENARIOS.map((s) => ({
  scenario_id: s.id, active: s.id in ACTIVE, status: "researching", ...(ACTIVE[s.id] ?? ARCHIVE[s.id] ?? {}),
} as VenueRow));

export const SEED_MUSTHAVES: MustHave[] = [
  ["Late-night food", null],
  ["Dancing / good music", null],
  ["Enough bartenders / enough bars", null],
  ["Lots of flowers & twinkle lights", null],
  ["Sylvie / kids component", "A parallel supervised kids' party during the reception"],
  ["Comfort for elders: valet, seats, service", "Firehouse: valet not included, parking is far; 2 bathrooms on the main level"],
  ["Good food & drink", null],
  ["Signature cocktail", null],
  ["Afterparty", null],
].map(([text, detail], i) => ({ id: `MH${String(i + 1).padStart(2, "0")}`, text: text!, detail, sort: (i + 1) * 10, archived: false }));

const f = (scenario_id: number, n: number, verdict: Fit["verdict"], note: string | null = null): Fit =>
  ({ id: fitId(scenario_id, `MH0${n}`), scenario_id, musthave_id: `MH0${n}`, verdict, note });
export const SEED_FIT: Fit[] = [
  f(17, 2, "yes", "DJ booth + dance floor inside; first dances at 8pm"),
  f(17, 4, "partly", "Garden + lighting included; florals are ours"),
  f(17, 5, "yes", "Upstairs room (Bunk Room) for the kids' party"),
  f(17, 6, "partly", "No valet; lot one block away; ADA ramps; 2 main-level bathrooms"),
  f(4, 6, "partly", "Valet for a fee; free lot across the street; ADA first floor"),
  f(5, 2, "unknown", "Ask whether a jazz combo is allowed"),
  f(5, 6, "partly", "ADA first floor; parking unknown"),
];

const t = (n: number, title: string, owner: Task["owner"], category: Task["category"], due: string | null, source: string | null,
  source_date: string | null, detail: string | null = null, scenario_id: number | null = null): Task =>
  ({ id: `T${String(n).padStart(3, "0")}`, title, owner, category, due, status: "open", source, source_date, detail, scenario_id, sort: n * 10 });
export const SEED_TASKS: Task[] = [
  t(1, "Confirm a Joinery visit time with Shay", "Mark", "venue", "2026-10-28", gmail("19efc6fe28540168"), "2026-10-21", "You asked for a weekday-evening or weekend visit on Oct 21.", 5),
  t(2, "Ask Firehouse when the June 12 hold resolves", "Both", "venue", "2026-10-28", gmail("1a15ba6656f42867"), "2026-10-20", null, 17),
  t(3, "Ask Firehouse: seated cap with kids upstairs, Bunk Room, caterer + DJ rules, valet options", "Mark", "venue", "2026-10-30", gmail("1a15ba6656f42867"), "2026-10-20", null, 17),
  t(4, "Get Ravenswood Event Center's rate sheet, F&B minimum and 2027 dates", "Mark", "venue", "2026-10-30", "manual", null, null, 18),
  t(5, "River Room: book a tour (Calendly) or drop it", "Mark", "venue", "2026-11-04", gmail("19efc6feaa40f9da"), "2026-06-26", "Saturdays were fully booked for tours; closed Sundays.", 4),
  t(6, "Tell Claire at Rockwell on the River you're passing (unanswered since Oct 9)", "Mark", "venue", "2026-10-24", gmail("1a11203dcdced277"), "2026-10-09"),
  t(7, "Tell Mackenzie at the Salt Shed you're passing", "Mark", "venue", null, gmail("19ed6d6e1dc03b67"), "2026-06-18", null, 8),
  t(8, "Plan Sylvie's party: supervision, kid food, activities", "Both", "guests", null, gmail("1a16022302a76cf5"), "2026-10-21"),
  t(9, "Confirm music: Joel Paterson and Friends vs a DJ (Firehouse timeline assumes a DJ)", "Both", "vendor", "2026-11-15", "email", "2026-06-11"),
  t(10, "Pick the window: late spring vs early fall 2027", "Both", "admin", "2026-11-15", "manual", null),
  t(11, "Decide the undecided households on the guest list", "Both", "guests", "2026-11-30", "manual", null),
];
