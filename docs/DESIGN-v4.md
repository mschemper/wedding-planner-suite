# DESIGN-v4 -- "Garden" rebuild. Agent-facing.
Status: reviewed (Opus, 22 Oct 2026; findings folded in); awaiting Mark's go. (M) = Mark's decision; the rest = lead proposals.
Size: Large (RELEASE.md). Lead Opus: design + data layer + shared UI contracts; 3 Sonnet builders; one Sonnet integration review; QA; deploy.

## 0. Inputs
- Mark 21 Oct 2026: comprehensive UX rebuild; simpler people data shown as a family tree + friends; must-haves seeded from his notebook photo; venues = active shortlist; add Firehouse Chicago; tasks from email review; garden aesthetic; full cycle to deploy; keep the GitHub repo current.
- Workbook `G:\My Drive\Wedding Planner\wedding_guest_data_comprehensive_v4.xlsx` (21 Oct 23:33) -> `data/private/guests-v4.xlsx` (gitignored).
- Email sweep + web price research 21 Oct: facts land in STATE.md / scenarios.ts / seed with sources.

## 1. Decisions
1. (M) Active venues: Firehouse Chicago, Ravenswood Event Center, River Room at Burning Bush Brewery, The Joinery. Others -> Archive (collapsed, computable, never deleted). `active` lives ONLY in D1 `venues`; scenarios.ts has no active flag.
2. (M) Aesthetic: Twinkle garden (§6). Dusk via prefers-color-scheme + optional toggle.
3. (M) Tasks: seeded once from the email sweep; edited in-app. Re-sweep = a Claude session runs docs/skills/email-sweep.md -> JSON -> Mark pastes into Plan "Paste tasks" box -> normal save (Access blocks non-browser writes).
4. (M) Date flexible. Windows: late spring 2027 (May 1 - Jun 30), early fall 2027 (Sep 1 - Oct 31). Held: Sat 12 Jun 2027 (Firehouse). Default compare date 2027-06-12; fall reference 2027-09-18; venue cards show spring/fall delta.
5. Tabs: Today, Venues, People, Plan. Budget + Quotes -> Venues. Params -> Venues "Assumptions" drawer.
6. People: enter name, adult/child, side, partner, parents. Relationship labels derived where links allow, else stored `label`. Branch + generation kept as columns (import fills; editable).
7. Kids' reception ("Sylvie's party"): headcount splits main room vs kids' room. Pricing uses adults + kids. Capacity check = main-room adults at the ceiling (+ kids when the venue has no kids room) vs `capacity.hardMax` (seated) and `capacity.cocktail`.
8. Must-haves: ordered list (up/down buttons), editable, archive not delete. Verdict per active venue: yes / partly / no / unknown + note. Fit = (yes + 0.5 partly) / answered; unknown count shown.
9. Ravenswood Event Center: `priced: false` scenario ("Awaiting rate sheet"): status, fit, tasks; no total. Firehouse priced from the official rate table; Bunk Room kids room = option line ($500).
10. Offline build: budget only (venues + scenarios + params defaults) + "Open snapshot" of a JSON exported from the hosted app. No private data bundled. People/plan export = JSON + xlsx from the hosted app (user-side backup).
11. Mailing addresses stay out (AGENTS rule) until a DATA_MODEL plan exists. Envelope name = party name.
12. (M) Invite decisions are per household (party): undecided | invite | ifroom | no. "If room" parties are ranked; a cutoff line shows which fit each venue's capacity.
13. (M) Kids: global policy param `kidsPolicy` ('ours' | 'family' | 'all'; default 'ours') + per-party `kids` ('policy' | 'in' | 'out'). A child is invited when the party is invited and kids resolve to in. Per-person `override` (invite | no) exists only for exceptions, set from Edit details.
14. (M) One shared decision; anyone can flag a party "talk about" with a note. "Recent decisions" = audit feed (who, what, when). Every decision tap saves instantly (one-op batch) with Undo (5 s toast; undo = inverse op).

## 2. Information architecture
- Today: windows + countdown; held chip; Next up (5 open tasks, overdue first); shortlist strip (status, est. total, fit, capacity ✓/✗); headcount (expected / ceiling / maybe; adults main room / kids room); must-haves (first 5).
- Venues: shortlist = cards (<860px) / compare table (>=860px). Table includes the must-have × venue verdict matrix (tap cycles verdict; long-press/edit button opens note). Venue detail: budget breakdown (v3 DetailView), quotes log (v3 quotes), status/hold/tour/contact/next step, notes. Archive below. Assumptions drawer = v3 PricesForm.
- People views: Decide (default), Family garden, Friends (grouped by circle), Envelopes (invited parties, export xlsx/JSON). One "Edit details" sheet per person. "Add relative" from a garden node (parent / partner / child / sibling) pre-fills links + branch + gen + party.
- Decide (mockup docs/mockups/v4-people.html): sticky impact bar (invited, expected, adults / kids' room, undecided, capacity bar for the selected venue + one line for the others) recomputed on every tap; search + chips (Undecided, If room, Talk about, Invited, Not inviting, Has kids, Mark's side, Angela's side, Friends, branch); party cards: 3-state segment (Invite / If room / No; undecided = none lit), kids control when the party has children (Policy · In · Out), talk flag + note, members listed with derived relation and kids' room tag; "If room" ranked list with up/down + cutoff line per venue; Recent decisions feed (/api/audit, 20 latest).
- Garden node tap -> mini card: party decision segment + kids control + Edit details.
- Plan: Tasks (Overdue, This week, Later, No date, Done; owner chips; category; Gmail link) + "Paste tasks" box; Must-haves (up/down reorder, add, edit, archive).
- Prefs: localStorage key `wps.prefs.v2`; migrate v1: tab budget|quotes -> venues, guests -> people.

## 3. Data model (migration 0002_garden.sql: ADD ONLY)
- 0002 creates tables; v3 tables (households, individuals, friends) stay untouched until 0003 in a later release. v3 stays runnable against the migrated DB (rollback = redeploy v3).
- Every row: version / updated_at / updated_by (v3 rules). Server-allocated ids; `allocate()` checks every table.
- people: id (P001..), first, last, nick, side ('Mark'|'Angela'|'Both'), branch TEXT (from FamilySide; friends: NULL), gen INT NULL (couple 0, parents -1, siblings 0, aunts -1, cousins 0, nieces +1, cousin child +1, great-aunts -2), kind ('couple'|'family'|'friend'), party_id -> parties, partner_id -> people, parent_ids TEXT (JSON array 0-2), age ('adult'|'child'), override NULL|'invite'|'no', rsvp ('none'|'accepted'|'declined'), deceased INT, placeholder INT, local ('local'|'away'|'unknown'), circle TEXT, plus_one INT, kids_room INT (default 1 for age child), label TEXT, notes, sort INT.
- Couple rows (kind 'couple') = Mark and Angela: tree root; never counted in headcount.
- parties: id (H001..), name, invite ('undecided'|'invite'|'ifroom'|'no'), kids ('policy'|'in'|'out'), rank INT NULL (ifroom order), talk INT, talk_note, notes. Every non-placeholder, non-couple person has a party; every friend group -> one party.
- Effective invite (src/people/invite.ts, pure): deceased/placeholder/couple -> not counted; override wins; adult -> party.invite; child -> party.invite when kids resolve 'in' (party.kids, else kidsPolicy: ours = couple's party only, family = family parties, all = every party), else 'no'. Headcount "invited" = effective invite; "if room" heads counted separately and in rank order for the cutoff.
- venues: scenario_id INT PK (one row per scenario, seeded; create/delete -> 400), active, status ('researching'|'tour booked'|'toured'|'held'|'quoted'|'booked'|'passed'), hold_date, tour_date, contact_name, contact_email, contact_phone, next_step, notes.
- musthaves: id (MH01..), text, detail, sort, archived. Delete -> 400 (archive instead).
- fit: id = "{scenario_id}:{musthave_id}" (derived, client-supplied), scenario_id, musthave_id, verdict ('yes'|'partly'|'no'|'unknown'), note.
- tasks: id (T001..), title, detail, due (YYYY-MM-DD|NULL), owner ('Mark'|'Angela'|'Both'), category ('venue'|'vendor'|'guests'|'budget'|'admin'|'design'), status ('open'|'done'), done_at, source (URL|'manual'|'email'), source_date, scenario_id NULL, sort.
- Kept: quotes, params, audit, _guard. New params keys: dateWindows, heldDate, kidsPolicy.
- Write rules (worker/write.ts): client sets partner on ONE side; server mirrors and clears the previous partner(s) in the same batch. Person delete clears partner/parent refs (v3 rule). Party delete only when empty. Reject only issues the save introduces.
- Validation: refs exist; parent_ids <= 2, no self, no cycle (DFS, full graph); partner symmetric; placeholder => no party; couple rows exist exactly twice; rsvp != 'none' => effective invite; rank only on ifroom parties; enums. Warning: plus_one = 1 with an invited partner.
- API: TableName = people | parties | venues | musthaves | fit | tasks | quotes | params (old guest tables not exposed). `GET /api/version` -> { version } (package.json), behind Access like every route.

## 4. Derived logic (pure; src/people/, src/plan/)
- kin.ts core set: self, partner, parent, child, step-child, sibling, grandparent, aunt/uncle, niece/nephew, cousin; "-in-law" via one partner hop. Else `label`. Derived wins only when it exists; mismatches with `label` -> QA report (counts).
- garden.ts (layout data for SVG): couple centre; Mark's branches left, Angela's right; each branch = a bed, rows by `gen`, clusters by party (blooms); edges only where parent/partner links exist. Phone: one branch at a time via chips. No pan/zoom engine; SVG scales to width, beds scroll vertically.
- headcount.ts: invited = effective-invite heads (+ plus_one); if-room heads shown separately (ranked cutoff per venue capacity); expected = Σ (accepted 1 | declined 0 | ACCEPTANCE[local]) with local->"Local Chicago Area" 0.85, away->"Out of Town" 0.55, unknown 0.78 (unchanged numbers); split adults / kids_room; ceiling = invited.
- venueSummary.ts: per scenario at (heads, date, params, quotes): priced, total, spring vs fall delta, capacity verdict, fit, status. Shared by Today + Venues.
- tasks.ts: grouping vs today in America/Chicago; sort (overdue, due asc, sort).
- Gate: tests/people.test.ts asserts v4 headcount on the imported workbook-equivalent fixture equals v3 forecastAttendance, diffs documented.

## 5. Import (scripts/import-v4.ts)
xlsx -> data/private/garden.json + data/private/import-review.json (gitignored) -> scripts/seed-v4.ts -> SQL (refuses when v4 tables are non-empty unless --replace).
- Couple: the two Couple rows -> kind 'couple'. Other COUPLE-001 members -> party "Mark & Angela's household".
- Households -> parties. Individuals -> people with branch = FamilySide, gen from GenerationGroup, label = RelationshipToMark (Mark side) / RelationshipToAngela (Angela side).
- Per-person status precedence: deceased (InviteStatus Deceased or role Deceased*) -> deceased 1; Not inviting -> 'no'; Declined -> 'invite' + rsvp declined; Accepted -> 'invite' + rsvp accepted; Yes | Invited -> 'invite'; else InvitePriority Core -> 'invite', Review -> 'undecided', Not Invite -> 'no'. Friends: InviteTier A -> invite, B/C -> undecided (rank = Ranking).
- Party decision = the value shared by its living adults; mixed -> the most common (ties -> undecided) and differing adults get `override`. Children differing from the party -> party.kids in/out when all children agree, else per-child override. kidsPolicy seeded 'all' when that reproduces the v3 headcount, else 'ours' with party.kids set to keep parity.
- Locality: Local Chicago Area -> local; Out of Town -> away; else unknown.
- Partners: keep PartnerPersonID; infer only when a household has exactly one Head + one Spouse/partner role.
- Parents: keep ParentPersonIDs; infer for HouseholdRole=Child from the household's Head (+ partner) only. Couple's household child -> Mark (Mark side) as parent.
- Siblings (GenerationGroup Sibling) -> the couple member's parents on that side as parents (Mark's parents / Angela's parents rows).
- Niece/Nephew in a sibling household -> covered by the household rule.
- Grandparent placeholders: one per parent branch ("Grandparents · <branch>"), parents of that side's Parent row and of blood Aunt/Uncle rows only (GenerationGroup "Aunt/Uncle"; spouses/partners link by partner). Unsure -> import-review.json.
- Friends: GroupName "A and B" -> two people (partners) when it splits cleanly into two first names; else one person + plus_one 1. circle = FriendCategory; side = ConnectionTo; party = the group.
- Logs and report: counts only (placed/unplaced, inferred links, placeholders, review rows). Never names.

## 6. Visual system: Twinkle garden
- Tokens only in src/ui/styles.css `:root` + dusk set. Day: ground #FBF7EF, card #FFFDF8, ink #2E3A2F, muted #5C6B5E, line #E3DCCB, blush #E8A9A0, sage #9DB08A, marigold #E3B04B, eucalyptus #6E8B74, peony #C86F7E; text inks: peony-ink #A4505F, euc-ink #4F6B55, gold-ink #7A5A12. Dusk: ground #1F3B2D, card #26453A, ink #F4EFE4, muted #C9D3C4, line #3C5E4F, twinkle #F6D98B, peony-ink #F2B7BF, euc-ink #B9D3BE.
- Gate tests/contrast.test.ts: every text/ground pair listed in it >= 4.5:1 (3:1 for >= 24px headings) in day and dusk.
- Type: Cormorant Garamond 600/700 headings; Inter 400/600 body; body 16px, meta floor 13px.
- Garden components (src/ui/garden/, lead-owned): Garland (header; twinkle only without reduced-motion), Corner (peony+vine), LeafDivider, Sprig, Bloom(state: yes|maybe|no|deceased|placeholder|couple).
- Primitives (src/ui/kit/, lead-owned): Card, Chip, Sheet (drawer/bottom sheet), OwnerChip, VerdictPicker, Stat, EmptyState.
- Shape: 18px radius cards, 1px sage-tinted border, soft shadow. Tabs = top pills >= 640px, bottom bar < 640px. 360px width works.

## 7. Release plan
1. Lead, data layer: 0002 migration; worker db/write/validate/api (+ /api/version); api types; src/people/*, src/plan/*; scenarios 17 Firehouse, 18 Ravenswood (priced false), `capacity.cocktail`, kids-room option; import + seed scripts; fixtures `data/fixtures/garden.sample.json` (synthetic); seed data for venues/musthaves/fit/tasks in `src/data/seed-v4.ts` (no guest names). Tests. `npm run check`. Commit + push.
2. Lead, shared UI: tokens, garden/*, kit/*, nav (Tab today|venues|people|plan; openVenue, openPerson, openTask, priceAt), useData() with new tables + selectors, App.tsx with stub screens, prefs v2; `git mv` BudgetScreen + quotes/* -> src/ui/venues/; delete src/ui/guests (exports move to src/ui/people/export.ts stub); rewrite AGENTS.md design/data rules for v4. Commit + push.
3. Builders (Sonnet, worktrees; own files + own CSS + own test file; styles.css, kit, garden, data, nav lead-only):
   - A People: src/ui/people/* (+ people.css, tests/people-ui.test.ts).
   - B Venues: src/ui/venues/* (+ venues.css, tests/venues-ui.test.ts).
   - C Today + Plan: src/ui/today/*, src/ui/plan/* (+ plan.css, tests/plan-ui.test.ts).
4. Sonnet integration review; lead code review + debug; QA: `npm run check`; Chrome screenshots of dev server (1280 + 390; day + dusk; each tab) cropped/downscaled.
5. Deploy: `wrangler d1 export DB --remote --output data/private/d1-backup-v3.sql`; note Time Travel bookmark; `wrangler d1 migrations apply DB --remote`; seed v4; `npm run build && wrangler deploy`; verify unauthenticated -> Access redirect and the deployed bundle/version; Mark signs in and checks on his phone. Rollback = redeploy tag v3.
6. Docs: STATE, BACKLOG, CHANGELOG, CODEMAP, DATA_MODEL, USAGE, AGENTS, GIT; tag v4; push.

## 8. Out of scope (BACKLOG)
Automatic Gmail sync; seating chart; RSVP website; vendor directory beyond venues; photos; mailing addresses; drop v3 tables (0003).
