# Wedding Planner Suite

Budget Studio (16 venue scenarios from Reconciled Master v2.0) plus a guest-list data layer that feeds the guest count.

```bash
npm install
npm run import:guests -- data/private/guests.xlsx   # optional; stays local
npm run dev                                         # http://localhost:5173
npm run check                                       # typecheck + 138 tests + build
```

`npm run build` → `dist/index.html`, one self-contained file that opens from disk.

Start with `docs/REVIEW.md` for what was found and fixed, then `docs/ROADMAP.md` for what's next.

Working with Claude Code: run `claude` in this folder. `CLAUDE.md` loads automatically.
