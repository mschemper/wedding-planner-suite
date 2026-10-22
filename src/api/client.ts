// Browser client for worker/api.ts. Same origin; the Access cookie rides along.
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
  data: () => request<ApiData>("/api/data"),
  write: (ops: Op[]) => request<WriteResult>("/api/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) }),
  audit: (limit = 50) => request<AuditEntry[]>(`/api/audit?limit=${limit}`),
};
