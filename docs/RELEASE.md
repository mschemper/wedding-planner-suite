# Release sizing

| Size | Shape | Setup | Subagents |
|---|---|---|---|
| XS | one-file fix, copy change | main only | none |
| S | one feature touching engine *or* UI, plus tests | main | Haiku for the sweep/grep; Sonnet for tests |
| M | a feature across engine, data, and UI, or a new module | plan first | Sonnet writes the code; main integrates and reviews |
| L | new app surface (guest UI, graph) | plan + ask questions up front | Sonnet per module in parallel; Haiku for fixtures/mechanical work; main for design and final review |

Release checklist: `npm run check` is green → HISTORY entry → bump `package.json` version → commit.
