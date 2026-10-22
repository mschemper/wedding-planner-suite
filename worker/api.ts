// /api router (DESIGN-v3 §3; /api/version DESIGN-v4 §3). Same origin only: no CORS; writes need JSON + a matching Origin (CSRF).
import type { JWTVerifyGetKey } from "jose";
import type { ApiErrorBody, AuditEntry, WriteRequest } from "../src/api/types";
import { authenticate } from "./auth";
import { loadState, stateToApi } from "./db";
import type { Env } from "./env";
import { applyWrite } from "./write";
import pkg from "../package.json";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const err = (status: number, error: ApiErrorBody["error"], message: string) => json({ error, message } satisfies ApiErrorBody, status);

export async function handleApi(req: Request, env: Env, jwks?: JWTVerifyGetKey): Promise<Response> {
  const url = new URL(req.url);
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("Origin");
    if (!origin || origin !== url.origin) return err(403, "forbidden", "Cross-site request refused");
    if (!(req.headers.get("Content-Type") ?? "").includes("application/json")) return err(403, "forbidden", "JSON only");
  }
  const auth = await authenticate(req, env, jwks);
  if (!auth.ok) return err(auth.status, auth.status === 403 ? "forbidden" : auth.status === 500 ? "server" : "unauthorized", auth.message);

  try {
    if (url.pathname === "/api/version" && req.method === "GET") return json({ version: pkg.version });

    if (url.pathname === "/api/data" && req.method === "GET") return json(stateToApi(await loadState(env.DB), auth.email));

    if (url.pathname === "/api/write" && req.method === "POST") {
      let body: WriteRequest;
      try {
        body = (await req.json()) as WriteRequest;
      } catch {
        return err(400, "bad_request", "Body is not JSON");
      }
      const out = await applyWrite(env.DB, body?.ops, auth.email);
      if (!out.ok) return json(out.body, out.status);
      return json({ ids: out.ids, data: stateToApi(await loadState(env.DB), auth.email) });
    }

    if (url.pathname === "/api/audit" && req.method === "GET") {
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const { results } = await env.DB.prepare("SELECT * FROM audit ORDER BY id DESC LIMIT ?").bind(limit).all<Record<string, unknown>>();
      const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : null);
      return json(results.map((r) => ({ ...r, before: parse(r.before), after: parse(r.after) })) as AuditEntry[]);
    }

    return err(404, "not_found", `No route ${req.method} ${url.pathname}`);
  } catch (e) {
    console.error("api error", e);
    return err(500, "server", "Server error — try again");
  }
}
