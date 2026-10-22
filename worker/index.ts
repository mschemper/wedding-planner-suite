// Worker entry. wrangler.jsonc runs it first only for /api/*; everything else is static assets with SPA fallback.
import { handleApi } from "./api";
import type { Env } from "./env";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (new URL(req.url).pathname.startsWith("/api/")) return handleApi(req, env);
    return env.ASSETS.fetch(req);
  },
};
