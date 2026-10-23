// Browser client for worker/api.ts. Same origin; the Access cookie rides along.
import type { AskAnswer, AskInput } from "../../worker/ask";
import type { ResearchDraft } from "../../worker/research";
import type { ApiData, ApiErrorBody, AuditEntry, Op, WriteResult } from "./types";

export class ApiFailure extends Error {
  constructor(readonly status: number, readonly body: ApiErrorBody) {
    super(body.message);
  }
}

const EXPIRED: ApiErrorBody = { error: "unauthorized", message: "Your sign-in expired — reload the page to sign in again." };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    // An expired Access session redirects cross-origin to the login page; fetch reports that as a network error.
    throw new ApiFailure(0, EXPIRED);
  }
  if (r.redirected || !(r.headers.get("Content-Type") ?? "").includes("application/json")) throw new ApiFailure(401, EXPIRED);
  const body = await r.json();
  if (!r.ok) throw new ApiFailure(r.status, body as ApiErrorBody);
  return body as T;
}

export const api = {
  /** Ask the planner (v8): answer + proposed edits; nothing is saved. 503 = no API key. */
  ask: (input: AskInput, signal?: AbortSignal) =>
    request<AskAnswer>("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal }),
  data: () => request<ApiData>("/api/data"),
  write: (ops: Op[]) => request<WriteResult>("/api/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) }),
  /** Venue research (30–90 s). Rejects with ApiFailure (503 = no API key); abort via `signal`. */
  research: (input: { name: string; city?: string; guests?: number }, signal?: AbortSignal) =>
    request<ResearchDraft>("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal }),
  audit: (limit = 50) => request<AuditEntry[]>(`/api/audit?limit=${limit}`),
};
