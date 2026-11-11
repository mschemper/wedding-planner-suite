// Name fixes sheet (v17, from More): name fixes, unplaced relatives, friends without a last name. Locality, talk-about, addresses and last names are cards in the To review deck.
import { useMemo, useState } from "react";
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

export function TidySheet({ tidy, people, act, onClose, onFamily }: {
  tidy: Tidy; people: PeopleData; act: Actions; onClose(): void; onFamily(): void;
}) {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <Sheet title="Name fixes and tree" open onClose={onClose}>
      <SaveError result={act.error} onDismiss={act.clearError} />
      {tidy.names.length + tidy.unplaced + tidy.lastNames === 0 && <p className="pp-hint" role="status">All tidy. Nothing needs a look.</p>}
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
      <LastNames people={people} />
    </Sheet>
  );
}
