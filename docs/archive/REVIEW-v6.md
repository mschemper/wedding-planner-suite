# REVIEW-v6 -- design + debug review, easier input, email quotes, people links (22 Oct 2026). Agent-facing.
Inputs: v5 code (tag v5), gate `npm run check` green (284 tests, both builds); live D1 read 22 Oct (read-only SELECT on people, parties, quotes, tasks); Gmail read-only search for venue threads. Guest findings = counts only (AGENTS "Private data").
Status (22 Oct 2026): v6 built B11–B14, Q2 (form check), V1–V2, R1–R4, visual pass; open → BACKLOG D4, D5, F18–F22.
Mark's asks: (1) add information more easily; (2) prompt Claude to gather quotes from venue/vendor emails; (3) review guest data; (4) make relatives + households easy to add and link.

## 0. Act first
Q1 H. Firehouse (held venue, scenario 17) has 3 live quotes entered 22 Oct 07:27, status received, no vendor/source/notes: "Tax + service (~22%)" $0, "Event insurance" $0, "Photography" $500. Effect: Firehouse total @75 $44,480 → $36,875 (−$7,605); @82 −$7,916 (≈17% low). Ask Mark: real quotes or test taps? If test → delete. Then fix Q2.

## 1. Bugs (verified in code)
B11 H. Kids counted two ways: `headcount.ts:39` uses `kids_room`; `rings.ts:87-88` uses `age`. A child added via Add person without ticking "Kids' room" = main-room adult in Room check, kid in ring seats → cap line and counts disagree. Live data clean today (0 mismatches). Fix: one rule — kids' room = age child unless an explicit override; drop the checkbox from the default form.
B12 H. Partner picker silently breaks another couple: `worker/write.ts` step 3 clears the chosen person's existing partner; the picker shows no warning. Partner in a different household is not flagged either (validate.ts). Fix: picker shows "partner of X" on hits and asks to confirm; on save offer "same household"; validate warns on split partners.
B13 M. `relationRoot` (kin.ts) matches substrings: "Grandson" → child (ring 1), "Godson"/"Mason" → child, "Aunt's stepson" → aunt/uncle, "Brother-in-law's mother" → sibling, "Nephew's girlfriend" → niece/nephew. Drives derived ring for the 39 people whose relation comes only from a workbook label. Fix: word boundaries; "X's Y" possessive → null; grandchild case; test table.
B14 M. New relatives vanish into "Not placed yet": gen is a typed number (blank → 0) and never derived from links; outline roots need gen ≤ −1. Fix: derive gen from parent/partner/child links; hide the field; stored gen only as fallback.
Q2 M. A $0 "received" quote is indistinguishable from "line not needed" and needs no source. Fix: status `excluded` (line removed on purpose, shown struck through) vs quote; require vendor or source on received/accepted.
B15 L. Dead paths: `personOps` `parentOf` + `SheetTarget.parentOf` have no caller; `relativeDefaults` unused (B9). Reuse in R1, else delete.
B16 L. STATE.md stale: live = 121 people, 56 households; decisions invite 46 · if room 3 · undecided 7 (STATE: 42 undecided). T001 (Joinery visit) answered 22 Oct: visit Fri 30 Oct 12:30 confirmed by Mark.
Open from BACKLOG (unchanged): B5, B6, B7, B8, B10, B4.

## 2. Guest data (live, counts only)
- 121 people (97 family, 22 friends, 2 couple; 4 placeholders, 3 deceased), 56 households (9 singles, 42 couples, 5 with kids), 4 with unnamed kids.
- Tree: relation derived from links for 54 / 93 family; 39 rely on a workbook label (Cousin 18, Cousin-in-law 13, aunt/uncle variants 6, other 2); 0 contradictions. 44 people "Not placed yet"; 29 of them share branch + surname with others (likely sibling sets → one parent link each fixes them).
- Links: 88 partnered, all same household + same side; 3 two-adult households with no partner link; 2 parent links where gen ≠ parent gen + 1; 2 duplicate first+last pairs (check: same person twice or Jr./Sr.).
- Attendance input: locality unknown for 113 of 117 guests → expected counts use the blanket 0.78 rate. Biggest accuracy gain per minute: set local/away per household.
- Validator warnings: 1 RSVP on a non-invited person; 1 rank on a non-"if room" household. 1 friend household without circle. Tiers: 11 set by hand, 45 derived; family rings 1: 8 · 2: 10 · 3: 27 households.
- Branch titles are still raw workbook strings (4 of 4 with parentheses) unless renamed in Family.

## 3. Proposals: relatives + households (ask 4)
Root cause: linking = open a 17-field person sheet, search a parent, search the second parent; siblings link only through shared parents; gen, side, branch, household and kids' room are typed by hand.
R1 "Add relative" on every person row and in the household sheet: + Partner · + Child · + Sibling · + Parent. Mini-sheet = first name, last name (prefilled), age. Links, side, branch, gen, household, kids' room filled from `relativeDefaults`. Partner/child → same household; adult child → "own household" toggle. Sibling with unknown parents → creates an unnamed parent placeholder pair once, reused by later siblings.
R2 Placement assistant for "Not placed yet": per person a suggestion ("probably a child of <household>": same branch + surname + label Cousin → children of that branch's aunts/uncles; Cousin-in-law → partner of a placed cousin) with Accept / Pick other. Multi-select "These are <household>'s kids" sets both parents for a whole sibling set in one save. Est. 44 → 0 in ~10 min of Mark's time.
R3 Derive, don't ask: gen (B14), kids' room (B11), relation words (label field only when the tree can't say it; B10). Person sheet: "Basics" (name, age, household, relatives) + collapsed "More" (RSVP, exception, local, notes, deceased).
R4 Household moves: in the household sheet "Move to household…", "Give own household" (adult child moving out), "Merge with…". Household picker = searchable, same side first, "Same as partner" shortcut.
R5 "Tell it in a sentence": paste or type "Chad's wife Emma and their kids Liam (6) and Ava (3)" → Claude (paste-JSON flow like Paste tasks) or an in-app parser → preview of people + links → one save. Same sheet accepts a pasted list from a text/email.
R6 Relationship view per person: "How is X related?" line + mini tree (parents, partner, kids) inside the person sheet, each node tappable; replaces reading branch outlines to verify a link.

## 4. Proposals: quotes from email (ask 2)
Facts: quotes arrive as PDFs/packets (Joinery 22 Oct, River Room 25 Jun event packet, Salvage One 2027 guide). The Gmail connector returns attachment metadata, not file contents. Quotes today attach only to a venue scenario line; no vendor entity, no source link, no expiry, no deposit schedule.
E1 S. `docs/skills/quote-sweep.md` + Plan/Venues "Paste quotes": Claude searches Gmail (read-only) for watched senders, extracts line items → JSON {scenario_id, item_desc, amount, basis, includes_tax, vendor, received_on, source, valid_until, notes} → preview vs current estimate (delta per line, total delta) → one save. Attachments: Mark saves the PDF to Drive or `data/private/inbox/`; Claude reads it (pdf skill). Prompt: "sweep my email for quotes".
E2 M. `vendors` table (migration 0004): name, category (venue/catering/music/photo/florals/…), email domains + contacts, scenario_id (venues) or null. Sweep query = `from:(<domains>)`; vendor quotes (photographer, DJ, caterer) stored once and applied to every venue's matching line. Quote + `source`, `valid_until`, `deposit`, `due_dates`, `vendor_id`; status + `excluded` (Q2).
E3 L. Email inbox in the app: D1 `inbox` (proposed quotes / tasks / venue facts, each with source link). Claude writes proposals via `/api/write` with an Access service token (Mark creates it in the dashboard; stored in `.dev.vars`, never in chat); a daily scheduled task runs the sweep. Today shows "3 new from email" → Accept / Edit / Dismiss. Claude never changes real rows; Mark accepts.
E4 XL. Worker-side Gmail OAuth (BACKLOG F16). Not recommended: OAuth app review + token storage for two users.
Recommendation: E1 now (works with today's Gmail connector), E2 with it if Mark wants non-venue vendors tracked, E3 once the paste flow proves useful.

## 5. Proposals: easier input generally (ask 1)
I1 One "Add" button app-wide (task, quote, person, note) with a free-text box; Claude-format JSON or plain text both accepted.
I2 Data health card on Today: unplaced relatives, unknown locality, quotes without source, undecided households, validator warnings; each opens the fixing view.
I3 Bulk edit on Decide: multi-select households → local/away, ring, decision, kids rule (one save, Undo).
I4 Accepted quote → payment tasks auto-created from deposit/due dates.
I5 Per-household cost on Decide rows ("≈ $1,040 at Firehouse"): seats × marginal per-guest cost at the held venue.
Later: RSVP + addresses (F17) needs a DATA_MODEL plan first.

## 6. Release plan (sizes per docs/RELEASE.md)
v5.1 S: Q1 (after Mark answers), B11, B12, B13, B14, Q2, B16. ~2 h lead + tests.
v6 M "Easy people": R1, R2, R3, R4, R6 (+ R5 via paste JSON). Mockup options first (AGENTS design rule). ~1 day incl. Sonnet builder.
v6.1 S–M "Quotes from email": E1 (+ E2 if chosen). ~half day.
v7 L "Inbox": E3 + scheduled sweep. ~1–2 days incl. Access service token setup by Mark.
