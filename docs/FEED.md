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

## Look for the consumer
Jungalow Lounge (docs/DESIGN-v9.md "Type" + palette); tokens in `src/ui/styles.css` `:root` (day) + dusk set. Consumer copies values into its own token set, flat: no shadows, gradients.
