import { existsSync, mkdirSync, readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import fixture from "./data/fixtures/guests.sample.json";

// Two builds (DESIGN-v3 §6):
//   hosted  (`vite build`)                → dist/          multi-file, served by the Worker; guests come only from /api. Never bundles data/private.
//   offline (`vite build --mode offline`) → dist-offline/  one self-contained index.html, read-only, opens from disk; real names if data/private/guests.json exists.
const PRIVATE_GUESTS = "data/private/guests.json";
const VIRTUAL = "virtual:private-guests";

function privateGuests(offline: boolean): Plugin {
  return {
    name: "private-guests",
    resolveId: (id) => (id === VIRTUAL ? "\0" + VIRTUAL : null),
    load(id) {
      if (id === "\0" + VIRTUAL) return `export default ${offline && existsSync(PRIVATE_GUESTS) ? readFileSync(PRIVATE_GUESTS, "utf8") : "null"};`;
      if (!offline && id.replace(/\\/g, "/").includes("/data/private/")) this.error(`hosted build must not bundle ${id}`);
      return null;
    },
  };
}

/** `npm run dev`: /api runs worker/api.ts in Node against .wrangler/dev/db.sqlite (seeded from the synthetic fixture). */
function devApi(): Plugin {
  type Db = { empty: boolean; raw: { prepare(sql: string): { run(...v: unknown[]): unknown } }; migrate(): unknown };
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
            mkdirSync(".wrangler/dev", { recursive: true });
            const d = new SqliteD1(".wrangler/dev/db.sqlite") as Db;
            const fresh = !(d.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'households'") as unknown as { get(): unknown }).get();
            if (fresh) d.migrate();
            if (d.empty) for (const r of seedRows(fixture, "seed")) d.raw.prepare(r.sql).run(...r.values);
            return d;
          })();
          const db = await ready;
          const { handleApi } = await server.ssrLoadModule("/worker/api.ts");
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(`http://${req.headers.host ?? "localhost"}${req.url}`, { method: req.method, headers, body: hasBody ? await body(req) : undefined });
          const out: Response = await handleApi(request, { DB: db, ASSETS: { fetch: async () => new Response(null, { status: 404 }) }, DEV_ACCESS_EMAIL: "dev@localhost" });
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
  const plugins: PluginOption[] = [react(), privateGuests(offline)];
  if (offline) plugins.push(viteSingleFile());
  if (!offline && command === "serve") plugins.push(devApi());
  return {
    plugins,
    build: { outDir: offline ? "dist-offline" : "dist", emptyOutDir: true },
    // REVIEW-v3 R18 / BACKLOG B3: the dev server never serves private data or local secrets.
    server: { fs: { deny: [".env", ".env.*", "*.{crt,pem}", ".dev.vars", "**/data/private/**"] } },
    test: { environment: "node", include: ["tests/**/*.test.ts"] },
  };
});
