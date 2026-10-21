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
  capacity?: { practicalMin?: number; hardMax?: number };
  /** e.g. seasonal building; checked against wedding month */
  openMonths?: number[];
  flag?: string;
  /** optimistic alternative total range, e.g. Three Top Model B */
  rangeNote?: string;
  /** known understatement in source model */
  understated?: { belowGuests: number; low: number; high: number };
  options: OptionDef[];
  items: LineItem[];
}

export interface BudgetRow {
  cat: Category;
  desc: string;
  amount: number;
  extrapolated: boolean;
}

export interface Budget {
  guests: number;
  rows: BudgetRow[];
  byCat: Map<Category, BudgetRow[]>;
  total: number;
  perGuest: number;
  warnings: string[];
}
