# Changelog

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
