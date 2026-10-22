// Defence in depth behind Cloudflare Access: every /api request needs a valid Cf-Access-Jwt-Assertion for an allowed email.
// Fails closed: missing config → 500, never open. Dev bypass only with DEV_ACCESS_EMAIL (never in wrangler.jsonc) AND a localhost host.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Env } from "./env";

export type AuthResult = { ok: true; email: string } | { ok: false; status: number; message: string };

const list = (s?: string) => (s ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const teamUrl = (d: string) => (d.startsWith("https://") ? d : `https://${d}`).replace(/\/+$/, "");

let cached: { team: string; jwks: JWTVerifyGetKey } | undefined;
const remoteJwks = (team: string) => {
  if (cached?.team !== team) cached = { team, jwks: createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`)) };
  return cached.jwks;
};

export async function authenticate(req: Request, env: Env, jwks?: JWTVerifyGetKey): Promise<AuthResult> {
  const host = new URL(req.url).hostname;
  if (env.DEV_ACCESS_EMAIL && (host === "localhost" || host === "127.0.0.1")) return { ok: true, email: env.DEV_ACCESS_EMAIL.toLowerCase() };

  const auds = list(env.ACCESS_AUD);
  const allowed = list(env.ALLOWED_EMAILS);
  if (!env.ACCESS_TEAM_DOMAIN || !auds.length || !allowed.length) return { ok: false, status: 500, message: "Access is not configured on the server" };
  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { ok: false, status: 401, message: "Not signed in — reload the page" };
  const team = teamUrl(env.ACCESS_TEAM_DOMAIN);
  try {
    const { payload } = await jwtVerify(token, jwks ?? remoteJwks(team), {
      issuer: team, audience: auds, algorithms: ["RS256"], clockTolerance: 60,
    });
    const email = String(payload.email ?? "").toLowerCase();
    if (!allowed.includes(email)) return { ok: false, status: 403, message: "This account is not on the guest list for the planner" };
    return { ok: true, email };
  } catch {
    return { ok: false, status: 401, message: "Sign-in expired — reload the page" };
  }
}
