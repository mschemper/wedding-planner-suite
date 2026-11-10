-- v12 live data (Mark, 10 Nov 2026): the Joinery $7,000 May 29 rate applies to that date only.
-- Run once after migration 0007: npx wrangler d1 execute DB --remote --file scripts/v12-live-data.sql. Idempotent. No guest data.
UPDATE quotes SET date = '2027-05-29', version = version + 1, updated_at = '2026-11-10T00:00:00Z', updated_by = 'deploy:v12'
  WHERE scenario_id = 5 AND item_desc = 'Venue rental (summer/fall Saturday)' AND amount = 7000 AND date IS NULL;
