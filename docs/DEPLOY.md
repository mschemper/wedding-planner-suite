# Deploy runbook. Agent-facing.
Read only for a deploy session. Steps in order; stop on any failure. Cloudflare skills first: `cloudflare:wrangler`, `cloudflare:workers-best-practices`.

## Before
1. `git status` clean; `npm run check` green; release committed + tagged (docs/RELEASE.md).
2. Never ask Mark for an API token; `wrangler login` runs in his browser. Never print Access AUD/team secrets beyond wrangler vars.

## Steps
1. Backup: `npx wrangler d1 export DB --remote --output data/private/d1-backup-v<N-1>.sql` (gitignored). Note the Time Travel bookmark if a migration follows.
2. Migrations (only if the release adds one): `npx wrangler d1 migrations apply DB --remote`.
3. Seed (only on first load or Mark asks; only behind Access): `npm run import:v4`, `npm run seed:v4 -- --replace`, `npx wrangler d1 execute DB --remote --file data/private/seed-v4.sql`, delete the file. `--replace` wipes in-app edits: export first.
4. `npm run build` (hosted `dist/`).
5. `npx wrangler deploy`.
6. Verify: unauthenticated `/`, `/api/version` -> Access login redirect. Signed-in `/api/version` = package.json version needs Mark signed in: say "not checked" if he is not.
7. Record in docs/STATE.md: Worker version id, migration applied, backup file. Keep only the current and previous release rows (STATE rules).

## Secrets
No API secrets (Claude features removed in v9). If `ANTHROPIC_API_KEY` was ever set: `npx wrangler secret delete ANTHROPIC_API_KEY`.

## Rollback
Check out the previous tag, `npm run build`, `npx wrangler deploy`. Migrations are add-only, so older code ignores new columns. Restore data only from the backup file, only if Mark asks.

## Traps
- Native Windows <-> WSL: `npm ci` first (node_modules per OS).
- WSL `git push` can hang on credentials: push from Windows PowerShell.
- workerd crashes on Mark's PC: `npx wrangler dev` unusable; `npm run dev` runs the Worker in Node. If wrangler needs workerd: `node node_modules/workerd/install.js`.
- Free-tier limits for D1/Workers/Access not re-checked: confirm in the dashboard.
