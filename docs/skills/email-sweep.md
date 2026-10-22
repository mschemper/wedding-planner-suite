# email-sweep -- re-sweep Gmail for wedding tasks. Agent-facing.
Output: one JSON array for Plan -> "Paste tasks". Nothing else is written. Read-only Gmail.

## Inputs
- Mark pastes the current task titles (Plan list). Missing -> ask for them once, then proceed.
- Sweep window: since the newest `source_date` among pasted tasks, else last 30 days.

## Rules
- Gmail read tools only (search_threads, get_thread, get_message). Never send, draft, label, trash, archive or mark read.
- Search wedding threads: venues (Firehouse, Ravenswood, River Room, Joinery, tour, quote, rate sheet, hold, contract), vendors (DJ, band, caterer, florist, photographer, planner, officiant), guests (RSVP, invite, hotel block), budget (deposit, invoice, payment due), admin (license, insurance, permit).
- Skip: marketing, newsletters, promotions, receipts with no action, anything already answered, threads Mark or Angela sent last with no reply pending.
- One task per open action. Imperative title, <= 90 chars, starts with a verb.
- Dedupe: skip a task whose title matches a pasted title (case-insensitive) or the same action in the same thread.
- Never put guest names, addresses, phone numbers or emails in output. Vendor business contacts only, in `detail`.
- No guessing: unknown due -> omit `due`. Unknown owner -> "Both".

## Output
Print only the array, in one fenced json block. Fields:
- title (string, required)
- detail (string, optional; <= 200 chars; the ask, deadline wording, amount)
- due (YYYY-MM-DD, optional; from the email's stated deadline, else omit)
- owner: Mark | Angela | Both
- category: venue | vendor | guests | budget | admin | design
- source: `https://mail.google.com/mail/u/0/#all/<threadId>`
- source_date: YYYY-MM-DD of the newest message that created the task

```json
[{"title":"Confirm Joinery visit time","detail":"Asked for weekday evening or weekend","due":"2026-10-28","owner":"Mark","category":"venue","source":"https://mail.google.com/mail/u/0/#all/19efc6fe28540168","source_date":"2026-10-21"}]
```

## After printing
Tell Mark in one line: N tasks, M skipped as duplicates. Next step for Mark: Plan -> Paste tasks -> paste -> Add.
