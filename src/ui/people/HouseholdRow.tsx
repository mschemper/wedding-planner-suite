// One Decide row (DESIGN-v5 §3): mark, names + relation, seats, kids chip, talk chip, 3-way control, ⋯ menu.
import type { InviteCtx } from "../../people/invite";
import type { RingRow } from "../../people/rings";
import { namesLine } from "../../people/rings";
import { FAMILY_TIERS, FRIEND_TIERS, tierLabel } from "../../people/tier";
import type { Party } from "../../people/types";
import type { Actions } from "./actions";
import { DecisionControl, DecisionMark, KidsChip } from "./DecisionControl";
import { hasKids, seatsText } from "./model";
import { Menu, type MenuItem } from "./Menu";

export interface RowProps {
  row: RingRow;
  relation: string;
  ctx: InviteCtx;
  act: Actions;
  /** parties of this household's ring, display order (for move up / down) */
  ringParties: Party[];
  onHousehold(id: string): void;
  onPerson(id: string): void;
}

export function HouseholdRow({ row, relation, ctx, act, ringParties, onHousehold, onPerson }: RowProps) {
  const { party } = row;
  const first = row.members.find((m) => !m.deceased) ?? row.members[0];
  const tiers = row.friend ? FRIEND_TIERS : FAMILY_TIERS;
  const idx = ringParties.findIndex((x) => x.id === party.id);
  const items: MenuItem[] = [
    { key: "h-ring", heading: "Move to ring" },
    ...tiers.map((t) => ({ key: `t${t}`, label: tierLabel(t, row.friend), checked: row.tier === t, onSelect: () => act.tier(party, t, row.friend) })),
    { key: "auto", label: "Reset to automatic", disabled: !row.setByHand, onSelect: () => act.tier(party, null, row.friend) },
    { key: "h-order", heading: "Order in ring" },
    { key: "up", label: "Move up", disabled: idx <= 0, onSelect: () => act.move(ringParties, party.id, -1) },
    { key: "down", label: "Move down", disabled: idx < 0 || idx >= ringParties.length - 1, onSelect: () => act.move(ringParties, party.id, 1) },
    { key: "h-more", heading: "Household" },
    { key: "talk", label: party.talk ? "Remove from talk about" : "Talk about", onSelect: () => act.talk(party, !party.talk) },
    { key: "edit", label: "Edit household…", onSelect: () => onHousehold(party.id) },
    { key: "people", label: "Open people…", disabled: !first, onSelect: () => first && onPerson(first.id) },
  ];
  return (
    <li className={`pp-hrow st-${party.invite}`} aria-label={party.name}>
      <span className="pp-hmark"><DecisionMark state={party.invite} /></span>
      <button type="button" className="pp-hname" onClick={() => onHousehold(party.id)} aria-label={`Edit household: ${party.name}`}>
        <b>{namesLine(row)}</b>
        {relation && <small>{relation}</small>}
      </button>
      <span className="pp-seats" title="Seats if this household comes">{seatsText(row)}</span>
      <span className="pp-hchips">
        {hasKids(row) && <KidsChip party={party} ctx={ctx} act={act} />}
        {party.talk && (
          <button type="button" className="pp-chipbtn" onClick={() => onHousehold(party.id)} aria-label={`Talk about ${party.name}${party.talk_note ? `: ${party.talk_note}` : ""}`}>
            <span className="k-chip k-chip-peony" title={party.talk_note ?? undefined}><span aria-hidden="true">◉</span> talk</span>
          </button>
        )}
      </span>
      <span className="pp-hdec"><DecisionControl party={party} act={act} /></span>
      <Menu label={`More for ${party.name}`} align="right" triggerClass="k-icon-btn" trigger={<span aria-hidden="true">⋯</span>} items={items} />
    </li>
  );
}
