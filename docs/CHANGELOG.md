# Changelog

## v3 (UNRELEASED, part 2 of 2) - Online editors on Cloudflare (built 21 Oct 2026; not deployed)

Mark's request, 21 Oct 2026: build DESIGN-v3 (Workers + Static Assets + D1 + Access, guest editor, quotes & prices editor); deploy in a separate session. Mark picked Guests layout A (list + side panel).

**Tabs**: Budget · Guests · Quotes & prices, sticky at the top, working at 390 px.

**Guests**
  * Households grouped by family side, filters (side, adult/child, locality, status, priority, exceptions), search, a forecast strip with "Price at …".
  * Side panel: edit a household and its people, add/remove people and households, partner/parent pickers, problems shown next to the person. Full screen on a phone.
  * Friend groups edited the same way. Export to xlsx (same sheets as the workbook).

**Quotes & prices**
  * Log vendor quotes per venue (requested / received / accepted). Received or accepted quotes replace the estimate on that budget line, tax recomputed; the line shows "quote" and the difference from the estimate. An all-in quote replaces a venue's whole budget.
  * "+ quote" on any budget line.
  * Prices: edit the personal costs (dress, photo, band, favors, florals …); every venue reprices. "Reset to doc values".

**Saving and safety**
  * Saves go to a database (Cloudflare D1). If Angela changed the same row first, the save is refused with her name and a Reload, never silently overwritten.
  * A save that would break the guest list (unknown partner, missing household) is refused with the reason.
  * Login via Cloudflare Access (email code) for Mark and Angela only; the server checks it again on every request.
  * Every change is logged (who, when, before/after; last 1,000).
  * The offline single-file page still works (read-only) as `dist-offline/index.html`.

**Fixes**: the dev server no longer serves `data/private` (B3). All dependencies pinned to exact versions.

## v3 (UNRELEASED, part 1 of 2) - Venue seasons, review fixes, mobile (built 21 Oct 2026)

Ships together with part 2 (Cloudflare hosting, login, guest and quotes/prices editors) as ONE release (Mark, 21 Oct 2026). Plan: docs/DESIGN-v3.md.

Mark's request, 20–21 Oct 2026: another refinement pass (hardening, seasons, a fresh code review, mobile) plus an evaluation of platforms for hosting. Findings: docs/REVIEW-v3.md. Platforms: docs/PLATFORMS.md.

**Pricing**
  * Wedding **date** picker (default Sat Apr 24, 2027) replaces the month picker. Venues follow their own season calendars:
    * River Room peak from Apr 16 ($9,000, 100+ guests).
    * Salvage One 2027 rental by month ($9k–12k).
    * Morton's $5,000 package Jan–Apr only, $9,000 from May.
    * Promontory open May–Oct.
  * Cards say "Closed this date" or "Not offered" and drop out of best value. The detail page shows the season and its source.
  * Compare prices the other venue at the **same bar tier** (beer & wine ↔ beer & wine, full ↔ full).
  * Shared personal costs (dress, photo, band, favors, florals) live in one place (`src/data/params.ts`). No total changed.

**Fixes** (cold review, 20 findings; details in REVIEW-v3)
  * The "exactly" guest box can now be typed into.
  * A bad friend locality can no longer produce "~NaN" guests.
  * The importer: friends validated, numeric IDs and header spaces handled, and a failed import no longer overwrites the last good data.
  * Real surnames removed from the docs and from git history. Stricter .gitignore, and force-adding is blocked.
  * Contrast meets WCAG AA. Toggles announce their state, and cards read out total, best value and availability.

**Mobile**
  * One column at phone width, no sideways scrolling, 16 px inputs (no iOS zoom), bigger tap targets. Checked at 390 px.

**Remembers** guests, date, contingency and the open venue between visits.

## v2 - Port to a Claude Code repo; review fixes; guest data layer (20 Oct 2026)

Mark's request, 20 Oct 2026: a comprehensive design and solution review, and a move to Claude Code, then aligned with the bauhaus-dashboard practices (AGENTS.md entry point). Findings: docs/REVIEW-v2.md.

**Budget Studio**
  * Fixed: clicking any venue card crashed the page (F-01).
  * Fixed: the Drake, ULCC and Marco Island were off by up to $1,113; they now follow the source totals (F-02).
  * Fixed: costs stopped growing past 125 guests; they now keep rising and are marked ≈ (F-04).
  * Best value considers only venues that can host the count and are open that month (F-05, F-08).
  * New: wedding month picker (Promontory is flagged closed Mar/Apr), contingency 0–10%, an exact guest-count field.
  * New: confidence %, capacity warnings, Three Top range, Drake understatement note.
  * Compare: defaults to the Baseline, with per-category deltas and a "where the difference comes from" panel.
  * Builds to one offline `dist/index.html` (no CDN).

**Guest data**
  * `npm run import:guests` reads the workbook, validates it, and writes `data/private/guests.json` (gitignored).
  * Home shows households, invited, and expected attendance (§2.3 rates), with buttons to price at expected or at full acceptance.

**Repo**
  * AGENTS.md entry point (CLAUDE.md imports it); STATE, BACKLOG, CODEMAP, RELEASE, GIT, USAGE, HISTORY; ADHD output skill; claude-here.cmd / start-claude.cmd.
  * 138 tests, including 122 golden totals from Reconciled Master v2.0.
