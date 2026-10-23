import { mkdirSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Two builds (DESIGN-v4 §1.10):
//   hosted  (`vite build`)                → dist/          multi-file, served by the Worker; data only from /api.
//   offline (`vite build --mode offline`) → dist-offline/  one self-contained index.html, read-only budget; no fonts CDN, no fetch.
// Neither build may bundle data/private (real names).
function noPrivate(): Plugin {
  return {
    name: "no-private",
    load(id) {
      if (id.replace(/\\/g, "/").includes("/data/private/")) this.error(`build must not bundle ${id}`);
      return null;
    },
  };
}

/** Offline copy opens from disk: drop the Google Fonts links (falls back to Georgia / system sans). */
function stripFonts(): Plugin {
  return { name: "strip-fonts", transformIndexHtml: (html) => html.replace(/\s*<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, "") };
}

/** `npm run dev`: /api runs worker/api.ts in Node against .wrangler/dev/db-v4.sqlite (seeded from the synthetic fixture + seed-v4). */
function devApi(): Plugin {
  type Db = { raw: { prepare(sql: string): { run(...v: unknown[]): unknown } }; migrate(): unknown };
  let ready: Promise<Db> | undefined;
  const body = (req: IncomingMessage) => new Promise<Buffer>((ok) => { const c: Buffer[] = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          // one init for concurrent first requests (React StrictMode fires two)
          ready ??= (async () => {
            const { SqliteD1 } = await server.ssrLoadModule("/scripts/d1-sqlite.ts");
            const { seedRows } = await server.ssrLoadModule("/worker/seed.ts");
            const { SEED_VENUES, SEED_MUSTHAVES, SEED_FIT, SEED_TASKS } = await server.ssrLoadModule("/src/data/seed-v4.ts");
            // WPS_DEV_DATA=<path to a garden.json> seeds the local dev DB from it (e.g. data/private/garden.json for a real-data look; never served or bundled)
            const fixture = process.env.WPS_DEV_DATA
              ? JSON.parse((await import("node:fs")).readFileSync(process.env.WPS_DEV_DATA, "utf8"))
              : (await server.ssrLoadModule("/data/fixtures/garden.sample.json")).default;
            mkdirSync(".wrangler/dev", { recursive: true });
            const d = new SqliteD1(".wrangler/dev/db-v4.sqlite") as Db;
            const fresh = !(d.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'people'") as unknown as { get(): unknown }).get();
            if (fresh) {
              d.migrate();
              const set = { ...fixture, venues: SEED_VENUES, musthaves: SEED_MUSTHAVES, fit: SEED_FIT, tasks: SEED_TASKS };
              for (const r of seedRows(set, "seed")) d.raw.prepare(r.sql).run(...r.values);
            }
            return d;
          })();
          const db = await ready;
          const { handleApi } = await server.ssrLoadModule("/worker/api.ts");
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(`http://${req.headers.host ?? "localhost"}${req.url}`, { method: req.method, headers, body: hasBody ? await body(req) : undefined });
          // venue research in dev: ANTHROPIC_API_KEY from the shell runs the real thing; WPS_FAKE_RESEARCH=1 returns a canned draft after 2 s
          const fake = process.env.WPS_FAKE_RESEARCH ? (await server.ssrLoadModule("/worker/research.ts")).fakeResearch : undefined;
          const out: Response = await handleApi(request, {
            DB: db, ASSETS: { fetch: async () => new Response(null, { status: 404 }) }, DEV_ACCESS_EMAIL: "dev@localhost", ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          }, undefined, fake ? { research: fake } : {});
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const offline = mode === "offline";
  const plugins: PluginOption[] = [react(), noPrivate()];
  if (offline) plugins.push(stripFonts(), viteSingleFile());
  if (!offline && command === "serve") plugins.push(devApi());
  return {
    plugins,
    build: { outDir: offline ? "dist-offline" : "dist", emptyOutDir: true },
    // REVIEW-v3 R18 / BACKLOG B3: the dev server never serves private data or local secrets.
    server: { fs: { deny: [".env", ".env.*", "*.{crt,pem}", ".dev.vars", "**/data/private/**"] } },
    test: { environment: "node", include: ["tests/**/*.test.ts"] },
  };
});
