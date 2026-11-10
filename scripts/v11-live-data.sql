-- v11 live data (Mark, 9 Nov 2026): wedding likely Sat May 29 2027 at The Joinery; Firehouse = backup; Ravenswood + River Room archived.
-- Run once after migration 0006: npx wrangler d1 execute DB --remote --file scripts/v11-live-data.sql. Idempotent. No guest data.
INSERT INTO params (key, value, version, updated_at, updated_by) VALUES ('heldDate', '"2027-05-29"', 1, '2026-11-09T00:00:00Z', 'deploy:v11')
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = params.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  WHERE params.value <> excluded.value;

UPDATE venues SET active = 1, status = 'held', hold_date = '2027-05-29', tour_date = '2026-10-30',
  next_step = 'Sign the contract before the free one-week hold ends (offered 3 Nov 2026)',
  notes = 'Likely venue. Sat May 29, 2027 at the Friday rate ($7,000, Shay 3 Nov 2026). Capacity 160 seated with dance floor. Recommended (not required) vendor list; in-house bar packages or BYOB.',
  version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id = 5 AND (hold_date IS NOT '2027-05-29' OR status <> 'held');

UPDATE venues SET next_step = 'Backup: release the June 12 hold once the Joinery is signed',
  version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id = 17 AND next_step IS NOT 'Backup: release the June 12 hold once the Joinery is signed';

UPDATE venues SET active = 0, version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id IN (18, 4) AND active = 1;

INSERT OR IGNORE INTO quotes (id, scenario_id, item_desc, options, basis, amount, includes_tax, vendor, received_on, status, notes, version, updated_at, updated_by)
  VALUES ('v11-joinery-may29-rental', 5, 'Venue rental (summer/fall Saturday)', 'null', 'total', 7000, 1, 'The Joinery (Shay)', '2026-11-03', 'received',
  'Sat May 29, 2027 charged at the Friday rate; held free for one week from 3 Nov. Tax included; +3.1% if paid by card.', 1, '2026-11-09T00:00:00Z', 'deploy:v11');
