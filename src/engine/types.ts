export type Category =
  | "Venue & site"
  | "Food & beverage"
  | "Rentals & production"
  | "Photography & video"
  | "Music & entertainment"
  | "Flowers & décor"
  | "Attire, beauty & rings"
  | "Stationery & favors"
  | "Transportation & lodging"
  | "Ceremony & legal"
  | "Planning & tips"
  | "Pre-wedding events";

export type Options = Record<string, string>;

export interface AppliesIf {
  minGuests?: number;
  maxGuests?: number;
  /** season names from Scenario.seasons */
  seasons?: string[];
  /** option key -> required choice */
  options?: Options;
}

interface ItemBase {
  cat: Category;
  desc: string;
  appliesIf?: AppliesIf;
  /** included in the base for `percent` items */
  taxable?: boolean;
}

export type LineItem =
  | (ItemBase & { type: "fixed"; amount: number })
  | (ItemBase & { type: "perGuest"; rate: number; base?: number })
  /** piecewise-linear through [guests, amount] anchors; linear extrapolation outside */
  | (ItemBase & { type: "bands"; anchors: [number, number][] })
  /** first break with guests <= upTo wins */
  | (ItemBase & { type: "step"; breaks: { upTo: number; v: number }[] })
  | (ItemBase & { type: "minSpend"; min: number; rate: number })
  /** rate × sum of applicable taxable items */
  | (ItemBase & { type: "percent"; rate: number });

export interface OptionDef {
  key: string;
  label: string;
  choices: string[];
  def: string;
}

export type ScenarioKind = "local" | "destination";

export interface Scenario {
  id: number;
  name: string;
  location: string;
  desc: string;
  tag: string;
  kind: ScenarioKind;
  benchmark?: boolean;
  baseline?: boolean;
  /** 0–100, Reconciled Master §2.6 */
  confidence: number;
  /** modelled guest range (inclusive) */
  min: number;
  max: number;
  def: number;
  /** guest counts the venue cannot practically host; shown as warnings, still computed */
  capacity?: { practicalMin?: number; hardMax?: number; /** standing / cocktail-style maximum */ cocktail?: number; /** kids' room seats (kidsRoom venues) */ kids?: number };
  /** venue has a separate room for the kids' party (kids do not count toward the main room) */
  kidsRoom?: boolean;
  /** false = no published price yet ("Awaiting rate sheet"): no total is shown; items may be empty */
  priced?: boolean;
  /** official / source links shown on the venue detail */
  sources?: string[];
  /** venue's own season calendar; first match wins; `from`/`to` are "MM-DD", inclusive, may wrap the year end */
  seasons?: Season[];
  /** season the Reconciled Master priced; used when no date is given (keeps golden totals) */
  docSeason?: string;
  /** seasons in which the venue is closed or will not book */
  closedSeasons?: string[];
  /** season → minimum guests the venue requires */
  seasonMinGuests?: Record<string, number>;
  /** where the season data came from */
  seasonSource?: string;
  flag?: string;
  /** optimistic alternative total range, e.g. Three Top Model B */
  rangeNote?: string;
  /** known understatement in source model */
  understated?: { belowGuests: number; low: number; high: number };
  options: OptionDef[];
  items: LineItem[];
}

export interface Season {
  name: string;
  from: string;
  to: string;
}

export type QuoteStatus = "requested" | "received" | "accepted";

/** A vendor quote (D1 `quotes`). Applies when status is received/accepted; DESIGN-v3 §4. */
export interface Quote {
  id: string;
  scenario_id: number;
  /** a LineItem `desc`, or "*" = all-in total for the scenario */
  item_desc: string;
  /** only applies under these option choices; null = any */
  options?: Options | null;
  /** "perGuest": amount × guests */
  basis: "total" | "perGuest";
  amount: number;
  /** true: the quote already includes tax/gratuity, so it leaves the percent rows' base */
  includes_tax: boolean;
  vendor?: string | null;
  /** "YYYY-MM-DD" */
  received_on?: string | null;
  status: QuoteStatus;
  notes?: string | null;
}

export interface BudgetRow {
  cat: Category;
  desc: string;
  amount: number;
  extrapolated: boolean;
  /** amount comes from a quote */
  quoted?: boolean;
  quoteId?: string;
  /** model amount before the quote replaced it */
  estimate?: number;
}

export interface Budget {
  guests: number;
  rows: BudgetRow[];
  byCat: Map<Category, BudgetRow[]>;
  total: number;
  perGuest: number;
  /** season in effect, if the scenario has seasons */
  season?: string;
  /** set when the venue cannot be booked at this date/count; card dims, excluded from best value */
  unavailable?: string;
  warnings: string[];
  /** received/accepted quotes for this scenario that matched no row at this date/options */
  unmatchedQuotes?: Quote[];
}
