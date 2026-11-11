-- v14: task dependencies + decisions (checklist/calendar) and one mailing address per household. Add-only.
-- Enums are checked in worker/db.ts SPECS. addresses.id = parties.id (one row per household); private data, D1 only.
ALTER TABLE tasks ADD COLUMN depends_on TEXT NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'task';

CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  region TEXT,
  postal TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  source TEXT,
  gathered TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
