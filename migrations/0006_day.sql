-- v11: Day tab. Vendor bookings and the day-of timeline. Add-only. Enums are checked in worker/db.ts SPECS, not here.
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idea',
  amount REAL,
  deposit REAL,
  deposit_due TEXT,
  balance_due TEXT,
  deposit_paid TEXT,
  balance_paid TEXT,
  contact TEXT,
  notes TEXT,
  scenario_id INTEGER,
  sort INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE timeline (
  id TEXT PRIMARY KEY,
  start TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 30,
  title TEXT NOT NULL,
  place TEXT,
  who TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
