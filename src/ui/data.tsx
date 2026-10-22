// The one data source for every screen (DESIGN-v3 §5). Hosted: /api. Offline build: read-only bundled guests, doc params, no quotes.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiFailure, api } from "../api/client";
import type { ApiData, ApiErrorBody, Op, ParamRow } from "../api/types";
import { DEFAULT_PARAMS, mergeParams, type Params } from "../data/params";
import { buildScenarios } from "../data/scenarios";
import type { Quote, Scenario } from "../engine/types";
import { GUESTS, GUESTS_ARE_SAMPLE } from "../guests/load";
import type { GuestData } from "../guests/schema";
import type { Issue } from "../guests/validate";

export const OFFLINE = import.meta.env.MODE === "offline";

export type SaveResult =
  | { ok: true; ids: Record<string, string> }
  | { ok: false; kind: ApiErrorBody["error"] | "readonly"; message: string; issues?: Issue[]; row?: ApiErrorBody["row"] };

export interface DataCtx {
  status: "loading" | "ready" | "error";
  /** set when status = "error" (load failed) */
  error?: string;
  offline: boolean;
  /** offline build without data/private → synthetic names */
  sample: boolean;
  /** signed-in email ("" offline) */
  me: string;
  /** versioned rows as the API returned them (null offline / before load); editors read `version` from here */
  raw: ApiData | null;
  guests: GuestData;
  quotes: Quote[];
  paramRows: ParamRow[];
  /** doc values + stored overrides */
  params: Params;
  /** buildScenarios(params): use these, not SCENARIOS, everywhere in the UI */
  scenarios: Scenario[];
  /** One atomic save. Success replaces the data. On "conflict" the caller shows `message` (names who changed it) + a Reload button. */
  save(ops: Op[]): Promise<SaveResult>;
  reload(): Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function useData(): DataCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData outside <DataProvider>");
  return c;
}

const EMPTY: GuestData = { households: [], individuals: [], friends: [] };

export function DataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<ApiData | null>(null);
  const [status, setStatus] = useState<DataCtx["status"]>(OFFLINE ? "ready" : "loading");
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (OFFLINE) return;
    try {
      setRaw(await api.data());
      setStatus("ready");
      setError(undefined);
    } catch (e) {
      setStatus("error");
      setError(e instanceof ApiFailure ? e.body.message : String(e));
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

  const value = useMemo<DataCtx>(() => {
    const paramRows = raw?.params ?? [];
    const params = OFFLINE ? DEFAULT_PARAMS : mergeParams(paramRows);
    const guests: GuestData = OFFLINE ? GUESTS : raw ? { households: raw.households, individuals: raw.individuals, friends: raw.friends } : EMPTY;
    return {
      status, error, offline: OFFLINE, sample: OFFLINE && GUESTS_ARE_SAMPLE, me: raw?.me ?? "", raw,
      guests, quotes: raw?.quotes ?? [], paramRows, params, scenarios: buildScenarios(params), save, reload,
    };
  }, [raw, status, error, save, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
