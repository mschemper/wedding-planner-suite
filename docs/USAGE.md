# Usage per release

One row per release, newest first (RELEASE.md rule 10). The handover message gives the same assessment in words. The lead session's own tokens can't be measured from inside a session; subagent figures are the `subagent_tokens` each Agent result reports.

| Version | Size / setup | Lead | Subagents (model: tokens) | Rework | Verdict and next time |
|---|---|---|---|---|---|
| v2 (20 Oct 2026) | Large (review + port + guest layer), then Small (align with bauhaus practices): one cloud session, no subagents | Opus (review, engine port, golden table, guest layer, UI, docs, transfer to PC) | none | ~10%: exceljs couldn't read the workbook (swapped to SheetJS); tsx 4.19 module-sync failure (upgraded); one test assumption relaxed; agent docs restructured after delivery to match bauhaus-dashboard | Fitted: the work was tightly coupled, and subagents would have cost cold-start reading for little parallelism. Next: start in this repo with AGENTS.md from the outset; Sonnet sessions for the S items in BACKLOG. |
