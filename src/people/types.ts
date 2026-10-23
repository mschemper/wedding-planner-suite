// v4 people model (DESIGN-v4 §3). Pure types + enums; D1 columns = these field names.

export const SIDES = ["Mark", "Angela", "Both"] as const;
export const KINDS = ["couple", "family", "friend"] as const;
export const AGES = ["adult", "child"] as const;
export const OVERRIDES = ["invite", "no"] as const;
export const RSVPS = ["none", "accepted", "declined"] as const;
export const LOCALS = ["local", "away", "unknown"] as const;
export const DECISIONS = ["undecided", "invite", "ifroom", "no"] as const;
export const KIDS_RULES = ["policy", "in", "out"] as const;
export const KIDS_POLICIES = ["ours", "family", "all"] as const;
export const KNOWN_BY = ["Mark", "Angela", "Both"] as const;

export type Side = (typeof SIDES)[number];
export type Kind = (typeof KINDS)[number];
export type Age = (typeof AGES)[number];
export type Override = (typeof OVERRIDES)[number];
export type Rsvp = (typeof RSVPS)[number];
export type Local = (typeof LOCALS)[number];
export type Decision = (typeof DECISIONS)[number];
export type KidsRule = (typeof KIDS_RULES)[number];
export type KidsPolicy = (typeof KIDS_POLICIES)[number];
export type KnownBy = (typeof KNOWN_BY)[number];

export interface Person {
  id: string;
  first: string;
  last?: string | null;
  nick?: string | null;
  side: Side;
  /** family branch, e.g. "Mark's father's side" (friends: null) */
  branch?: string | null;
  /** generation vs the couple: 0 couple/siblings/cousins, -1 parents/aunts, -2 grandparents, +1 children/nieces */
  gen?: number | null;
  kind: Kind;
  party_id?: string | null;
  partner_id?: string | null;
  parent_ids: string[];
  age: Age;
  /** one-person exception to the party decision */
  override?: Override | null;
  rsvp: Rsvp;
  deceased: boolean;
  /** not a guest; exists to connect the tree (e.g. grandparents) */
  placeholder: boolean;
  local: Local;
  circle?: string | null;
  plus_one: boolean;
  /** attends the kids' room ("Sylvie's party") instead of the main room */
  kids_room: boolean;
  /** relationship text when the tree cannot derive one */
  label?: string | null;
  notes?: string | null;
  sort?: number | null;
}

export interface Party {
  id: string;
  /** envelope name */
  name: string;
  invite: Decision;
  kids: KidsRule;
  /** order among "ifroom" parties (1 = first in) */
  rank?: number | null;
  talk: boolean;
  talk_note?: string | null;
  notes?: string | null;
  /** closeness ring: family 1 Inner circle · 2 Close · 3 Extended · 4 Wider; friends 1 Must · 2 Want · 3 Nice to have. null = derived (tier.ts) */
  tier?: number | null;
  /** children not yet named (count toward the kids' room when kids come) */
  unnamed_kids?: number;
  /** friends: social circle, who knows them, we went to their wedding */
  circle?: string | null;
  known_by?: KnownBy | null;
  reciprocal?: boolean;
  /** v8: true = envelope name written by hand; false = follows the people (envelopeName, kept in sync by the Worker) */
  name_custom?: boolean;
}

export interface PeopleData {
  people: Person[];
  parties: Party[];
}

export const displayName = (p: Pick<Person, "first" | "last" | "nick">) => `${p.nick || p.first}${p.last ? ` ${p.last}` : ""}`;
