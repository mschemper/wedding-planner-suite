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

-- Mark's Joinery quotes (5 Nov 2026) point at v10 line names; move them to the v11 lines so they keep applying. Values untouched.
UPDATE quotes SET item_desc = 'Venue rental (summer/fall Saturday)', version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id = 5 AND item_desc = 'Venue rental (Saturday)';
UPDATE quotes SET item_desc = 'Bar — Tier 1 Standard ($4,000 min)', options = '{"bar":"Tier 1 Standard"}', version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id = 5 AND item_desc = 'Bar — Tier 1';
UPDATE quotes SET item_desc = 'Bar — Tier 2 Premium ($4,000 min)', options = '{"bar":"Tier 2 Premium"}', version = version + 1, updated_at = '2026-11-09T00:00:00Z', updated_by = 'deploy:v11'
  WHERE scenario_id = 5 AND item_desc = 'Bar — Tier 2';
