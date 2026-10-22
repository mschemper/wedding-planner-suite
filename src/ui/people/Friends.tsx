// Friends view: grouped by side + circle (garden.circles), each household with its decision.
import { useMemo } from "react";
import { buildGarden } from "../../people/garden";
import { displayName } from "../../people/types";
import { useData } from "../data";
import { Card, EmptyState } from "../kit/kit";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { partyRows, relationFinder } from "./model";
import { MemberLine, PartyCard } from "./PartyCard";

export function Friends({ act, onPerson }: { act: Actions; onPerson(id: string): void }) {
  const { people, invite } = useData();
  const garden = useMemo(() => buildGarden(people), [people]);
  const rows = useMemo(() => new Map(partyRows(people).map((r) => [r.party.id, r])), [people]);
  const rel = useMemo(() => relationFinder(people.people), [people]);
  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      {garden.circles.length === 0 && <Card><EmptyState>No friends added yet. Use "Add friend".</EmptyState></Card>}
      {garden.circles.map((c) => (
        <Card key={`${c.side}|${c.circle}`} title={`${c.side === "Both" ? "Both" : `${c.side}'s`} · ${c.circle}`}>
          {c.clusters.map((cl) => {
            const row = cl.party ? rows.get(cl.party.id) : undefined;
            if (row) return <PartyCard key={cl.party!.id} row={row} ctx={invite} act={act} rel={rel} onPerson={onPerson} />;
            return <div key={cl.members[0].id} className="pp-party" aria-label={displayName(cl.members[0])}>{cl.members.map((p) => <MemberLine key={p.id} p={p} ctx={invite} rel={rel} onPerson={onPerson} />)}</div>;
          })}
        </Card>
      ))}
    </div>
  );
}
