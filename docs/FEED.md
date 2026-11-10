# FEED.md -- Plan feed for the Bauhaus wall dashboard
Consumer: repo bauhaus-dashboard, mode `wedding` (its own docs). Producer here. Contract changes -> bump `feed` + tell the consumer.

## Route
- `GET /api/feed/plan` -> `PlanFeed` (`src/api/types.ts`), built by `src/plan/feed.ts` `planFeed` (pure). Tests: `tests/feed.test.ts`, `tests/worker.test.ts` "service token".
- Fields: wedding countdown (held date, venue status), task progress, counts (overdue / this week / no date), next 6 open tasks (title, due, days, group, owner, category). Today = America/Chicago.
- Never in the feed: task detail, source links, guests, money, contacts. A new field = check it against Private data rules first.

## Auth
- Cloudflare Access in front, Worker re-verifies (`worker/auth.ts`).
- Service token JWT (claim `common_name` = Client ID, no email) passes ONLY on `/api/feed/*` and only if its Client ID is in Worker var `FEED_CLIENT_IDS` (comma list). Elsewhere -> 403. Unlisted -> 403.
- Signed-in Mark/Angela can also read it.

## Setup (deploy session, once)
1. Zero Trust -> Access -> Service Auth -> create token `bauhaus-wall` (no expiry or 1 year; note renewal in STATE). Client Secret shown once: goes straight to the Pi `secrets.toml`, never chat, docs or git.
2. Access application `wedding-planner`: add policy, action **Service Auth**, include that service token.
3. `FEED_CLIENT_IDS` = the Client ID, as a Worker var (wrangler.jsonc `vars` or `wrangler secret put`); deploy (docs/DEPLOY.md).
4. Pi sends headers `CF-Access-Client-Id` + `CF-Access-Client-Secret` to `https://wedding-planner.wedding-planner-suite.workers.dev/api/feed/plan`.
5. Verify: no headers -> Access login redirect; Pi headers -> 200 JSON; Pi headers on `/api/data` -> 403.

## Consumer brief (bauhaus-dashboard session, WSL ~/bauhaus)
Mark's picks (9 Nov 2026): show countdown + task progress + next tasks; on demand (`bauhaus-mode wedding`) + 2-3x/day short slot like lake; own design family like Tufte, flat.
1. Follow bauhaus AGENTS.md session start; size per its RELEASE.md.
2. Design first: 2-3 layout options at 1080x1920 portrait (tools/preview.py renders); Mark picks before build.
3. Fetcher: GET the route above with `CF-Access-Client-Id`/`CF-Access-Client-Secret` from `/etc/bauhaus-dashboard/secrets.toml` `[wedding]`; cache last good JSON on disk; show its age when stale; check `feed == 1`.
4. Renderer: pure data -> image; Jungalow token set beside tokens.py (exception documented like Tufte); text floor per its MODES/QA rules; dark slate 00:00-07:00 still applies.
5. Gates: its tools/checks.sh; release + deploy per its docs. Producer must be deployed first (Setup above).

## Look for the consumer
Jungalow Lounge (docs/DESIGN-v9.md "Type" + palette); tokens in `src/ui/styles.css` `:root` (day) + dusk set. Consumer copies values into its own token set, flat: no shadows, gradients.
