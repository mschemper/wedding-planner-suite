// One Tidy-up list (v9): name fixes, unplaced relatives, unknown locality, talk-about households, friends without a last name. Sheet from the top row.
import { useMemo, useState } from "react";
import { namesLine } from "../../people/rings";
import type { PeopleData } from "../../people/types";
import { useData, type SaveResult } from "../data";
import { Button, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import type { Actions } from "./actions";
import { friendLastNameFixes, type Tidy } from "./model";
import { NameTidy } from "./NameTidy";

function LastNames({ people }: { people: PeopleData }) {
  const { edit } = useData();
  const fx = useMemo(() => friendLastNameFixes(people), [people]);
  const [err, setErr] = useState<Extract<SaveResult, { ok: false }> | null>(null);
  const missing = people.people.filter((p) => p.kind === "friend" && !p.placeholder && !p.last?.trim()).length;
  if (!missing) return null;
  const apply = async () => { const r = await edit(fx.patches, `Last names filled for ${fx.patches.length} friends`); setErr(r.ok ? null : r); };
  return (
    <section className="pp-tidy-sec" aria-label="Friends without a last name">
      <h3>{missing} friend{missing === 1 ? " has" : "s have"} no last name</h3>
      <SaveError result={err} onDismiss={() => setErr(null)} />
      {fx.patches.length > 0 ? (
        <>
          <p className="pp-hint">{fx.patches.length} can be filled from their household name.</p>
          <ul className="pp-fixlist">{fx.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <Button kind="primary" onClick={() => void apply()}>Fill {fx.patches.length} last names</Button>
        </>
      ) : <p className="pp-hint">Open a household to add them.</p>}
    </section>
  );
}

export function TidySheet({ tidy, people, act, onClose, onFamily, onHousehold }: {
  tidy: Tidy; people: PeopleData; act: Actions; onClose(): void; onFamily(): void; onHousehold(id: string): void;
}) {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <Sheet title={tidy.total ? `Tidy up · ${tidy.total}` : "Tidy up"} open onClose={onClose}>
      <SaveError result={act.error} onDismiss={act.clearError} />
      {tidy.total === 0 && <p className="pp-hint" role="status">All tidy. Nothing needs a look.</p>}
      {tidy.names.length > 0 && (
        <section className="pp-tidy-sec" aria-label="Name fixes"><h3>{tidy.names.length} name fix{tidy.names.length === 1 ? "" : "es"}</h3><NameTidy fixes={tidy.names} /></section>
      )}
      {tidy.unplaced > 0 && (
        <section className="pp-tidy-sec" aria-label="Relatives not placed">
          <h3>{plural(tidy.unplaced, "relative")} not placed in the tree</h3>
          <p className="pp-hint">Each family branch lists them in a tray at the bottom, with a guess.</p>
          <Button onClick={() => { onClose(); onFamily(); }}>Open Family</Button>
        </section>
      )}
      {tidy.unknownLocal.length > 0 && (
        <section className="pp-tidy-sec" aria-label="Locality unknown">
          <h3>{plural(tidy.unknownLocal.length, "household")} with local / away not set</h3>
          <ul className="pp-tidy-list">
            {tidy.unknownLocal.map((r) => (
              <li key={r.party.id}>
                <span className="pp-tidy-name">{namesLine(r)}</span>
                <span className="pp-tidy-acts">
                  <button type="button" className="k-btn" onClick={() => void act.bulk([r.party], { kind: "local", value: "local" })}>Local</button>
                  <button type="button" className="k-btn" onClick={() => void act.bulk([r.party], { kind: "local", value: "away" })}>Away</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tidy.talk.length > 0 && (
        <section className="pp-tidy-sec" aria-label="Talk about">
          <h3>{plural(tidy.talk.length, "household")} to talk about</h3>
          <ul className="pp-tidy-list">
            {tidy.talk.map((r) => (
              <li key={r.party.id}>
                <button type="button" className="pp-hname" onClick={() => { onClose(); onHousehold(r.party.id); }} aria-label={`Open household: ${r.party.name}`}>
                  <b>{namesLine(r)}</b>{r.party.talk_note && <small>{r.party.talk_note}</small>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <LastNames people={people} />
    </Sheet>
  );
}
