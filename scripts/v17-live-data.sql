-- v17 live data (idempotent). Review found no open tasks for passed venues on live; only T009's title still names Firehouse.
UPDATE tasks SET title = 'Confirm music: Joel Paterson and Friends vs a DJ', updated_at = '2026-11-11T00:00:00Z', updated_by = 'deploy:v17', version = version + 1
  WHERE id = 'T009' AND title LIKE '%Firehouse%';
