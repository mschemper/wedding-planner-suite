# Wedding Planner Suite

Mark & Angela, 2027. The Budget Studio prices 16 venue scenarios by guest count (from Reconciled Master v2.0), and a guest data layer feeds it the guest count.

```powershell
npm ci
npm run import:guests -- data\private\guests.xlsx   # optional; stays local
npm run dev                                         # http://localhost:5173
npm run check                                       # typecheck + tests + build -> dist\index.html
```

Claude Code: double-click `claude-here.cmd` (Windows) or `start-claude.cmd` (WSL). Agents start at `AGENTS.md`; the current state is in `docs/STATE.md`.
