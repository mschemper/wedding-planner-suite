// The one data source for every screen (DESIGN-v3 §5, v4 tables DESIGN-v4 §3). Hosted: /api. Offline build: read-only budget
// (doc params, seeded venues + must-haves, no people/tasks). `edit()` = one-tap save with Undo (DESIGN-v4 §1.14).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiFailure, api } from "../api/client";
import type { ApiData, ApiErrorBody, AuditEntry, Issue, Op, ParamRow, TableName } from "../api/types";
import { DEFAULT_PARAMS, mergeParams, mergeSettings, type Params, type Settings } from "../data/params";
import { buildScenarios } from "../data/scenarios";
import { SEED_FIT, SEED_MUSTHAVES, SEED_VENUES } from "../data/seed-v4";
import type { Quote, Scenario } from "../engine/types";
import { headcount, type Headcount } from "../people/headcount";
import { inviteCtx, type InviteCtx } from "../people/invite";
import type { PeopleData } from "../people/types";
import type { Fit, MustHave, Task, VenueRow } from "../plan/types";

export const OFFLINE = import.meta.env.MODE === "offline";

export type SaveResult =
  | { ok: true; ids: Record<string, string> }
  | { ok: false; kind: ApiErrorBody["error"] | "readonly"; message: string; issues?: Issue[]; row?: ApiErrorBody["row"] };

/** One row change for edit(): only the fields being changed. */
export interface Patch {
  table: TableName;
  id: string;
  row: Record<string, unknown>;
}

export interface UndoState {
  label: string;
  /** inverse patches (field values before the edit) */
  inverse: Patch[];
  at: number;
}

export interface DataCtx {
  status: "loading" | "ready" | "error";
  /** last load/reload failure; status stays "ready" when data was already loaded */
  error?: string;
  /** "unauthorized" → the Access session expired: reload the whole page */
  errorKind?: ApiErrorBody["error"];
  offline: boolean;
  /** signed-in email ("" offline) */
  me: string;
  /** versioned rows as the API returned them (null offline / before load) */
  raw: ApiData | null;
  people: PeopleData;
  venues: VenueRow[];
  musthaves: MustHave[];
  fit: Fit[];
  tasks: Task[];
  quotes: Quote[];
  paramRows: ParamRow[];
  /** price params: doc values + stored overrides */
  params: Params;
  /** shared planning settings (date windows, held date, kids policy) */
  settings: Settings;
  /** buildScenarios(params): use these, not SCENARIOS, everywhere in the UI */
  scenarios: Scenario[];
  /** invite context + headcount at the current kids policy */
  invite: InviteCtx;
  headcount: Headcount;
  /** current version of a row, for building ops */
  version(table: TableName, id: string): number | undefined;
  /** One atomic save. Success replaces the data. On "conflict" show `message` (names who changed it) + Reload. */
  save(ops: Op[]): Promise<SaveResult>;
  /** Update fields on existing rows in one save and offer Undo for `label`. Params: id = key, row = { value }. */
  edit(patches: Patch[], label: string): Promise<SaveResult>;
  /** the last edit() that can be undone (cleared by undo/dismiss/another edit) */
  undoState: UndoState | null;
  undo(): Promise<SaveResult>;
  dismissUndo(): void;
  reload(): Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function useData(): DataCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData outside <DataProvider>");
  return c;
}

const pkOf = (t: TableName) => (t === "venues" ? "scenario_id" : t === "params" ? "key" : "id");
const EMPTY_PEOPLE: PeopleData = { people: [], parties: [] };

export function DataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<ApiData | null>(null);
  const [status, setStatus] = useState<DataCtx["status"]>(OFFLINE ? "ready" : "loading");
  const [error, setError] = useState<{ message: string; kind?: ApiErrorBody["error"] }>();
  const [undoState, setUndo] = useState<UndoState | null>(null);
  const rawRef = useRef<ApiData | null>(null);
  rawRef.current = raw;

  const reload = useCallback(async () => {
    if (OFFLINE) return;
    try {
      setRaw(await api.data());
      setStatus("ready");
      setError(undefined);
    } catch (e) {
      setStatus((s) => (s === "ready" ? "ready" : "error"));
      setError(e instanceof ApiFailure ? { message: e.body.message, kind: e.body.error } : { message: String(e) });
    }
  }, []);
  useEffect(() => void reload(), [reload]);

  const save = useCallback(async (ops: Op[]): Promise<SaveResult> => {
    if (OFFLINE) return { ok: false, kind: "readonly", message: "This offline copy is read-only. Edit in the online planner." };
    try {
      const r = await api.write(ops);
      setRaw(r.data);
      return { ok: true, ids: r.ids };
    } catch (e) {
      if (e instanceof ApiFailure) return { ok: false, kind: e.body.error, message: e.body.message, issues: e.body.issues, row: e.body.row };
      return { ok: false, kind: "server", message: String(e) };
    }
  }, []);

  const findRow = useCallback((table: TableName, id: string): Record<string, unknown> | undefined => {
    const rows = (rawRef.current?.[table] ?? []) as unknown as Record<string, unknown>[];
    const pk = pkOf(table);
    return rows.find((r) => String(r[pk]) === id);
  }, []);

  const version = useCallback((table: TableName, id: string) => findRow(table, id)?.version as number | undefined, [findRow]);

  const toOps = useCallback((patches: Patch[]): Op[] | string => {
    const ops: Op[] = [];
    for (const p of patches) {
      const cur = findRow(p.table, p.id);
      if (!cur) {
        if (p.table === "params") { ops.push({ table: "params", op: "create", row: { key: p.id, ...p.row } }); continue; }
        return `${p.id} no longer exists — reload`;
      }
      ops.push({ table: p.table, op: "update", id: p.id, version: Number(cur.version), row: p.row });
    }
    return ops;
  }, [findRow]);

  const edit = useCallback(async (patches: Patch[], label: string): Promise<SaveResult> => {
    const inverse: Patch[] = patches.map((p) => {
      const cur = findRow(p.table, p.id) ?? {};
      return { table: p.table, id: p.id, row: Object.fromEntries(Object.keys(p.row).map((k) => [k, cur[k] ?? null])) };
    });
    const ops = toOps(patches);
    if (typeof ops === "string") return { ok: false, kind: "not_found", message: ops };
    const r = await save(ops);
    if (r.ok) setUndo({ label, inverse, at: Date.now() });
    return r;
  }, [findRow, toOps, save]);

  const undo = useCallback(async (): Promise<SaveResult> => {
    const u = undoState;
    if (!u) return { ok: true, ids: {} };
    setUndo(null);
    const ops = toOps(u.inverse);
    if (typeof ops === "string") return { ok: false, kind: "not_found", message: ops };
    return save(ops);
  }, [undoState, toOps, save]);

  const value = useMemo<DataCtx>(() => {
    const paramRows = raw?.params ?? [];
    const params = OFFLINE ? DEFAULT_PARAMS : mergeParams(paramRows);
    const settings = mergeSettings(paramRows);
    const people: PeopleData = raw ? { people: raw.people, parties: raw.parties } : EMPTY_PEOPLE;
    const invite = inviteCtx(people, settings.kidsPolicy);
    return {
      status, error: error?.message, errorKind: error?.kind, offline: OFFLINE, me: raw?.me ?? "", raw,
      people,
      venues: raw?.venues ?? (OFFLINE ? SEED_VENUES : []),
      musthaves: raw?.musthaves ?? (OFFLINE ? SEED_MUSTHAVES : []),
      fit: raw?.fit ?? (OFFLINE ? SEED_FIT : []),
      tasks: raw?.tasks ?? [],
      quotes: raw?.quotes ?? [],
      paramRows, params, settings, scenarios: buildScenarios(params),
      invite, headcount: headcount(people, settings.kidsPolicy, invite),
      version, save, edit, undoState, undo, dismissUndo: () => setUndo(null), reload,
    };
  }, [raw, status, error, version, save, edit, undoState, undo, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Recent changes (Recent decisions feed). Refetches whenever the data changes. Empty offline. */
export function useAudit(limit = 20): AuditEntry[] {
  const { raw, offline } = useData();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => {
    if (offline || !raw) return;
    let live = true;
    api.audit(limit).then((r) => live && setRows(r)).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [raw, offline, limit]);
  return rows;
}
