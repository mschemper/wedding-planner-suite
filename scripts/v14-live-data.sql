-- v14 live data (Mark, 10 Nov 2026): The Joinery signed for Sat 29 May 2027, deposit paid. Venue selection ends.
-- Run once after migration 0008: npx wrangler d1 execute DB --remote --file scripts/v14-live-data.sql. Idempotent. No guest data.
UPDATE venues SET status = 'booked', active = 1, hold_date = '2027-05-29', next_step = 'Save the signed contract PDF; get the payment schedule',
  updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v14', version = version + 1
  WHERE scenario_id = 5 AND status <> 'booked';
UPDATE venues SET active = 0, status = 'passed', updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v14', version = version + 1
  WHERE scenario_id <> 5 AND (active = 1 OR status NOT IN ('passed'));
-- Joinery vendor row (amount = Friday rate; deposit $500 Zelle 10 Nov + $3,000 11 Nov per Angela's email; balance date unknown)
INSERT INTO vendors (id, category, name, status, amount, deposit, deposit_paid, contact, notes, scenario_id, sort, version, updated_at, updated_by)
  SELECT 'V01', 'venue', 'The Joinery', 'booked', 7000, 3500, '2026-11-11', 'Shay Schultz · shay@thejoinerychicago.com · 219-308-1926',
    'Signed via HoneyBook 10 Nov 2026. Pay by check or Zelle (no 3.1% fee). Balance due date: ask Shay.', 5, 0, 1, '2026-11-10T00:00:00Z', 'deploy:v14'
  WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE category = 'venue');
-- existing open tasks that a checklist item covers: tag them so "Add the wedding checklist" links instead of duplicating
UPDATE tasks SET source = 'template:music', kind = 'decision', version = version + 1, updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v14'
  WHERE id = 'T009' AND status = 'open' AND source <> 'template:music';
UPDATE tasks SET source = 'template:guest-list', kind = 'decision', version = version + 1, updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v14'
  WHERE id = 'T011' AND status = 'open' AND source <> 'template:guest-list';
UPDATE tasks SET source = 'template:kids-party', version = version + 1, updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v14'
  WHERE id = 'T008' AND status = 'open' AND source <> 'template:kids-party';
