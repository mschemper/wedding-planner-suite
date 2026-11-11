// "To review" deck model (v17). Pure: builds the queue of outstanding items and maps a swipe / button to an action. No React, no I/O. Never put addresses in labels.
import { addressProgress } from "../../people/address";
import type { InviteCtx } from "../../people/invite";
import type { Ring } from "../../people/rings";
import type { Address, Decision, Party, PeopleData } from "../../people/types";
import type { Patch } from "../data";
import { DECISION_LABEL, householdLocal, unknownLocalRows } from "./model";

export type ItemType = "undecided" | "talk" | "local" | "address" | "lastname";
export type Dir = "right" | "left" | "up";
export type DeckChoice = Exclude<Decision, "undecided">;

/** One card. Ids only: the card reads live data, so the list is a stable snapshot. */
export interface DeckItem { key: string; type: ItemType; partyId: string | null; personId?: string }

export type DeckAction =
  | { kind: "decide"; value: DeckChoice; clearTalk: boolean }
  | { kind: "local"; value: "local" | "away" }
  | { kind: "open" }
  | { kind: "skip" };

export interface Choice {
  dir: Dir;
  /** keyboard 1 / 2 / 3 */
  key: "1" | "2" | "3";
  label: string;
  /** word shown on the card while swiping */
  overlay: string;
  icon: string;
  decision?: Decision;
  action: DeckAction;
}

const dec = (dir: Dir, key: Choice["key"], value: DeckChoice, clearTalk: boolean): Choice => ({
  dir, key, label: DECISION_LABEL[value], overlay: value === "ifroom" ? "IF ROOM" : DECISION_LABEL[value].toUpperCase(), icon: "", decision: value, action: { kind: "decide", value, clearTalk },
});

export const TYPE_ORDER: ItemType[] = ["undecided", "talk", "local", "address", "lastname"];
export const TYPE_LABEL: Record<ItemType, string> = {
  undecided: "To decide", talk: "To talk about", local: "Local or away", address: "Missing address", lastname: "Missing last name",
};
export const QUESTION: Record<ItemType, string> = {
  undecided: "Invite this household?", talk: "Ready to decide? Invite this household?", local: "Local or out of town?",
  address: "Add their mailing address?", lastname: "Add their last name?",
};

/** Visible buttons per type, in display order. */
export const CHOICES: Record<ItemType, Choice[]> = {
  undecided: [dec("right", "1", "invite", false), dec("up", "2", "ifroom", false), dec("left", "3", "no", false)],
  talk: [
    dec("right", "1", "invite", true), dec("left", "2", "no", true),
    { dir: "up", key: "3", label: "Keep talking", overlay: "KEEP TALKING", icon: "…", action: { kind: "skip" } },
  ],
  local: [
    { dir: "right", key: "1", label: "Local", overlay: "LOCAL", icon: "⌂", action: { kind: "local", value: "local" } },
    { dir: "left", key: "2", label: "Out of town", overlay: "OUT OF TOWN", icon: "✈", action: { kind: "local", value: "away" } },
    { dir: "up", key: "3", label: "Skip", overlay: "SKIP", icon: "→", action: { kind: "skip" } },
  ],
  address: [
    { dir: "right", key: "1", label: "Add now", overlay: "ADD NOW", icon: "+", action: { kind: "open" } },
    { dir: "left", key: "2", label: "Skip for now", overlay: "SKIP", icon: "→", action: { kind: "skip" } },
  ],
  lastname: [
    { dir: "right", key: "1", label: "Add now", overlay: "ADD NOW", icon: "+", action: { kind: "open" } },
    { dir: "left", key: "2", label: "Skip for now", overlay: "SKIP", icon: "→", action: { kind: "skip" } },
  ],
};

const SKIP: Choice = { dir: "up", key: "3", label: "Skip", overlay: "SKIP", icon: "→", action: { kind: "skip" } };

/** The choice a swipe direction (or arrow key) means for a card. A card already done only skips on. Unmapped directions skip. */
export function choiceFor(type: ItemType, dir: Dir, resolved = false): Choice {
  if (resolved) return { ...SKIP, dir };
  return CHOICES[type].find((c) => c.dir === dir) ?? { ...SKIP, dir };
}
export const actionFor = (type: ItemType, dir: Dir, resolved = false): DeckAction => choiceFor(type, dir, resolved).action;
export const choiceByKey = (type: ItemType, key: string, resolved = false): Choice | undefined =>
  resolved ? undefined : CHOICES[type].find((c) => c.key === key);

/** Swipe release: dx / dy in px against the card size. Right / left past 30% of the width, up past 25% of the height (mostly vertical drags only). */
export function swipeDir(dx: number, dy: number, w: number, h: number): Dir | null {
  if (Math.abs(dy) > Math.abs(dx)) return dy < -0.25 * h ? "up" : null;
  if (dx > 0.3 * w) return "right";
  if (dx < -0.3 * w) return "left";
  return null;
}

export interface DeckInput { data: PeopleData; rings: Ring[]; addresses: Address[]; ctx: InviteCtx }

/** Everything outstanding, as a snapshot: undecided, talk-about, local unknown, invited without address, friends without a last name. */
export function buildDeck({ data, rings, addresses, ctx }: DeckInput): DeckItem[] {
  const rows = rings.flatMap((r) => r.rows);
  const out: DeckItem[] = [];
  const hh = (type: ItemType, ids: string[]) => ids.forEach((id) => out.push({ key: `${type}:${id}`, type, partyId: id }));
  hh("undecided", rows.filter((r) => r.party.invite === "undecided").map((r) => r.party.id));
  hh("talk", rows.filter((r) => r.party.talk).map((r) => r.party.id));
  hh("local", unknownLocalRows(rows).map((r) => r.party.id));
  const missing = new Set(addressProgress(data, addresses, ctx).missing.map((p) => p.id));
  hh("address", rows.filter((r) => missing.has(r.party.id)).map((r) => r.party.id));
  const order = new Map(rows.map((r, i) => [r.party.id, i]));
  const nameless = data.people.filter((p) => p.kind === "friend" && !p.placeholder && !p.deceased && !p.last?.trim())
    .sort((a, b) => (order.get(a.party_id ?? "") ?? 1e9) - (order.get(b.party_id ?? "") ?? 1e9));
  for (const p of nameless) out.push({ key: `lastname:${p.id}`, type: "lastname", partyId: p.party_id ?? null, personId: p.id });
  return out;
}

export const deckCounts = (items: DeckItem[]): Record<ItemType, number> =>
  items.reduce((c, x) => ({ ...c, [x.type]: c[x.type] + 1 }), { undecided: 0, talk: 0, local: 0, address: 0, lastname: 0 } as Record<ItemType, number>);

/** True when the card's ask was met meanwhile (address saved, last name added, local set, decided). Such a card only skips on. */
export function isResolved(item: DeckItem, data: PeopleData, addresses: Address[]): boolean {
  if (item.type === "lastname") return !!data.people.find((p) => p.id === item.personId)?.last?.trim();
  const party = item.partyId ? data.parties.find((p) => p.id === item.partyId) : undefined;
  if (!party) return true;
  if (item.type === "address") return addresses.some((a) => a.id === party.id);
  if (item.type === "local") return householdLocal({ members: data.people.filter((p) => p.party_id === party.id) }) !== null;
  if (item.type === "undecided") return party.invite !== "undecided";
  return false;
}

/** One edit for a decision; on a talk-about card the flag clears in the same save, so Undo reverts both. */
export function decidePatches(party: Party, value: DeckChoice, clearTalk: boolean): { patches: Patch[]; label: string } {
  const row: Record<string, unknown> = {};
  if (party.invite !== value) row.invite = value;
  if (clearTalk && party.talk) row.talk = false;
  const patches: Patch[] = Object.keys(row).length ? [{ table: "parties", id: party.id, row }] : [];
  return { patches, label: `${party.name} → ${DECISION_LABEL[value]}` };
}
