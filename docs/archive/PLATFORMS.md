# Platform options — taking the suite off the PC

Written 21 Oct 2026, for Mark's request: Angela uses it too, it opens from any device, data is edited without code, guest list on a private link is fine, and the free tier with low upkeep is preferred. **Decided 21 Oct 2026: route A on Cloudflare, using Workers + Static Assets rather than Pages (Cloudflare's current recommendation for new projects).** Build plan: DESIGN-v3.md.

## Two routes, depending on where editing happens

### A. Edit in our own screens (Mark's preference, 21 Oct) — recommended
**Cloudflare Pages + Pages Functions + D1 + Cloudflare Access.**
- This page stays as the app. A few Pages Functions act as the save API, writing into D1, Cloudflare's built-in database.
- Access puts an email one-time-code login in front of the whole site for Mark and Angela, with nothing to build.
- $0 on the free tiers (confirm the D1 and Access limits at setup), and no server to maintain.
- The engine and golden tests are untouched. Guest validation runs both in the browser and in the save function.
- xlsx export is kept as the offline copy.
- Build: **v4** = D1 schema + save API + Access + guest editor (BACKLOG F6). **v5** = quotes/prices editor (F9 + `src/data/params.ts`) + hosting polish.

Fallback for A: **our screens save into a hidden Google Sheet through an Apps Script web app.** This is the smallest change, and the Sheet doubles as a backup. Saves take ~1–3 s.

### B. Edit in a Google Sheet
Google Sheets as the source (same tabs and columns as the workbook, plus Quotes and Prices). An Apps Script `doGet` serves JSON to the page, and the page is hosted on Cloudflare Pages.

Use Apps Script, not "publish to web" CSV: browsers block cross-origin fetches of the published CSV, so this static page can't read it.

## Rejected

| Option | Why |
|---|---|
| Airtable | The page could only read the data by embedding an API token in it. The engine can't run in Airtable. |
| Glide / AppSheet | Glide's free plan allows one editor and no Google Sheets. Rebuilding pricing in a no-code tool loses the golden tests. |
| Supabase | Free projects pause after 7 days without activity. |
| GitHub Pages | Free only from a public repo, and the site is public regardless. |
| Netlify / Vercel | Workable, but Netlify's free plan has a credit cap and Vercel Hobby is non-commercial only. No advantage over Cloudflare. |
| Claude artifact with shared db | Zero hosting, but viewers must be signed in to claude.ai and invited. Keep it in mind only if Angela uses Claude. |

## Before anything goes online
- Remove real names from git history (done in v3) and from docs (AGENTS "Private data").
- A private link isn't authentication. Access closes that gap at $0.

Sources (checked 21 Oct 2026): flaviocopes.com/hosting-free-tiers (Sep 2026); github.com/orgs/community/discussions/22817; forums.realmacsoftware.com (Sheets CSV CORS); automationatlas.io (Supabase free tier, May 2026); jetadmin.io (Glide pricing, Jul 2026); cloudflare.com/plans/zero-trust-services.
