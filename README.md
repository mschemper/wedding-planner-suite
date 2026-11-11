# Wedding Planner Suite

Mark & Angela, The Joinery, Sat 29 May 2027. Private planning app on Cloudflare (Workers + D1 + Access): budget, guest list + addresses, dependency-aware checklist + calendar, day-of plan.

```powershell
npm ci
npm run dev      # http://localhost:5173 (UI + local API on synthetic data)
npm run check    # typecheck + tests + hosted and offline builds (CI runs the same)
```

- Agents: start at `AGENTS.md`; what is true now is in `docs/STATE.md`.
- Deploy: `docs/DEPLOY.md` (Mark's explicit go only).
- Real guest data lives only in D1 and `data/private/` (gitignored).
