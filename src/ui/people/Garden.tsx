// Family garden: couple at the top, Mark's beds left and Angela's right (>= 860px) or one bed at a time on phones.
// Parent and partner edges are an SVG overlay measured from node refs.
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { buildGarden, type Bed, type Cluster, type Edge } from "../../people/garden";
import { displayName, type Person } from "../../people/types";
import { useData } from "../data";
import { Bloom, bloomLabel } from "../garden/motifs";
import { Button, Card, EmptyState, FilterChip, Sheet } from "../kit/kit";
import { SaveError } from "../SaveError";
import { useWide, type Actions } from "./actions";
import { bloomFor, genLabel, partyRows, relationFinder, unlinkedParents } from "./model";
import { DecisionControl, KidsControl } from "./PartyCard";

interface Line { k: Edge["kind"]; x1: number; y1: number; x2: number; y2: number }
type NodeMap = MutableRefObject<Map<string, HTMLElement>>;

function useEdges(box: RefObject<HTMLDivElement | null>, nodes: NodeMap, edges: Edge[], dep: unknown): Line[] {
  const [lines, setLines] = useState<Line[]>([]);
  const measure = useCallback(() => {
    const b = box.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const out: Line[] = [];
    for (const e of edges) {
      const a = nodes.current.get(e.from);
      const c = nodes.current.get(e.to);
      if (!a || !c) continue;
      const ra = a.getBoundingClientRect();
      const rc = c.getBoundingClientRect();
      const cx = (q: DOMRect) => q.left + q.width / 2 - r.left;
      const cy = (q: DOMRect) => q.top + q.height / 2 - r.top;
      if (e.kind === "partner") out.push({ k: e.kind, x1: cx(ra), y1: cy(ra), x2: cx(rc), y2: cy(rc) });
      else if (ra.top > rc.top) out.push({ k: e.kind, x1: cx(ra), y1: ra.top - r.top, x2: cx(rc), y2: rc.bottom - r.top });
      else out.push({ k: e.kind, x1: cx(ra), y1: ra.bottom - r.top, x2: cx(rc), y2: rc.top - r.top });
    }
    const round = out.map((l) => ({ ...l, x1: Math.round(l.x1), y1: Math.round(l.y1), x2: Math.round(l.x2), y2: Math.round(l.y2) }));
    setLines((prev) => (JSON.stringify(prev) === JSON.stringify(round) ? prev : round));
  }, [box, nodes, edges]);
  useLayoutEffect(() => {
    measure();
    const b = box.current;
    if (!b) return;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(b);
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, box, dep]);
  return lines;
}

const bedKey = (b: Bed) => `${b.side}|${b.branch}`;

export function Garden({ act, onPerson, onAddRelative }: {
  act: Actions;
  onPerson(id: string, focus?: "parents"): void;
  onAddRelative(of: Person, rel: "parent" | "partner" | "child" | "sibling"): void;
}) {
  const { people, invite } = useData();
  const wide = useWide();
  const garden = useMemo(() => buildGarden(people), [people]);
  const rel = useMemo(() => relationFinder(people.people), [people.people]);
  const unlinked = useMemo(() => unlinkedParents(people.people), [people.people]);
  const rows = useMemo(() => new Map(partyRows(people).map((r) => [r.party.id, r])), [people]);
  const [chosen, setChosen] = useState("");
  const [nodeId, setNodeId] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const active = garden.beds.some((b) => bedKey(b) === chosen) ? chosen : garden.beds[0] ? bedKey(garden.beds[0]) : "";
  const shown = wide ? garden.beds : garden.beds.filter((b) => bedKey(b) === active);
  // Lines only inside one bed: cross-bed lines (couple → parents, parents on two sides) crossed the whole garden.
  const bedEdges = useMemo(() => {
    const where = new Map(people.people.map((p) => [p.id, p.kind === "couple" ? "couple" : `${p.side}|${p.branch ?? ""}`]));
    return garden.edges.filter((e) => where.get(e.from) !== "couple" && where.get(e.from) === where.get(e.to));
  }, [garden.edges, people.people]);
  const lines = useEdges(box, nodes, bedEdges, `${wide}|${active}|${people.people.length}`);
  const node = nodeId ? people.people.find((p) => p.id === nodeId) : undefined;
  const nodeRow = node?.party_id ? rows.get(node.party_id) : undefined;

  const reg = (id: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id); };
  const renderNode = (p: Person) => {
    const st = bloomFor(p, invite);
    return (
      <span className="pp-nodewrap" key={p.id}>
        <button type="button" ref={reg(p.id)} className={`pp-node st-${st}`} onClick={() => setNodeId(p.id)} aria-label={`${displayName(p)}, ${bloomLabel(st)}. Open`}>
          <Bloom state={st} size={24} title={bloomLabel(st)} /><span>{p.nick || p.first}</span>
        </button>
        {unlinked.has(p.id) && <button type="button" className="pp-link" onClick={() => onPerson(p.id, "parents")}>Set parents</button>}
      </span>
    );
  };
  const renderCluster = (c: Cluster) => (
    <div className="pp-cluster" key={c.party?.id ?? c.members[0].id} title={c.party?.name}>{c.members.map(renderNode)}</div>
  );
  const renderBed = (b: Bed) => {
    const missing = b.rows.flatMap((r) => r.clusters.flatMap((c) => c.members)).filter((p) => unlinked.has(p.id)).length;
    return (
      <section className="pp-bed" key={bedKey(b)} aria-label={`${b.side} · ${b.branch}`}>
        <h3>{b.branch} <span className="muted small">{b.count} people</span></h3>
        {missing > 0 && <p className="pp-note-line">{missing} not linked to parents yet</p>}
        {b.rows.map((r) => (
          <div key={r.gen} className="pp-genrow">
            <div className="pp-genlabel">{genLabel(r.gen)}</div>
            <div className="pp-clusters">{r.clusters.map(renderCluster)}</div>
          </div>
        ))}
      </section>
    );
  };
  const col = (side: string) => garden.beds.filter((b) => (side === "Mark" ? b.side === "Mark" : b.side !== "Mark") && shown.includes(b));

  return (
    <div className="pp-stack">
      <SaveError result={act.error} onDismiss={act.clearError} />
      {garden.beds.length === 0 && garden.couple.length === 0 ? <Card><EmptyState>No family yet. Use "Add person".</EmptyState></Card> : (
        <Card>
          {!wide && garden.beds.length > 1 && (
            <div className="pp-chips-row" role="group" aria-label="Choose a bed">
              {garden.beds.map((b) => <FilterChip key={bedKey(b)} on={bedKey(b) === active} onClick={() => setChosen(bedKey(b))}>{b.side} · {b.branch}</FilterChip>)}
            </div>
          )}
          <div className="pp-garden" ref={box}>
            <svg className="pp-edges" aria-hidden="true">
              {lines.map((l, i) => {
                const m = (l.y1 + l.y2) / 2;
                return l.k === "partner"
                  ? <line key={i} className="pp-edge-partner" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
                  : <path key={i} className="pp-edge-parent" d={`M${l.x1} ${l.y1} C${l.x1} ${m} ${l.x2} ${m} ${l.x2} ${l.y2}`} />;
              })}
            </svg>
            <div className="pp-couple">{garden.couple.map(renderNode)}</div>
            <div className="pp-beds">
              <div className="pp-col">{col("Mark").map(renderBed)}</div>
              <div className="pp-col">{col("Angela").map(renderBed)}</div>
            </div>
          </div>
        </Card>
      )}
      <Sheet title={node ? displayName(node) : "Person"} open={!!node} onClose={() => setNodeId(null)}>
        {node && (
          <div className="pp-nodesheet">
            <p className="muted"><Bloom state={bloomFor(node, invite)} /> {bloomLabel(bloomFor(node, invite))} · {rel(node)}</p>
            {node.party_id && nodeRow ? (
              <>
                <p className="pp-label">{nodeRow.party.name}</p>
                <DecisionControl party={nodeRow.party} act={act} />
                {nodeRow.hasKids && <div className="pp-row"><span className="pp-label">Kids:</span><KidsControl party={nodeRow.party} ctx={invite} act={act} /></div>}
              </>
            ) : <p className="muted small">Not part of a household decision.</p>}
            <div className="pp-row"><Button kind="primary" onClick={() => { const id = node.id; setNodeId(null); onPerson(id); }}>Edit details</Button></div>
            <p className="pp-label">Add relative</p>
            <div className="pp-row">
              {(["parent", "partner", "child", "sibling"] as const).map((r) => (
                <Button key={r} onClick={() => { setNodeId(null); onAddRelative(node, r); }}>{r[0].toUpperCase() + r.slice(1)}</Button>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
