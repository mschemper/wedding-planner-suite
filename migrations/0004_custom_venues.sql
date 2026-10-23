-- v7: venues added in the app (researched on the web or typed in). Add-only. Ids start at 1000 so they never collide with
-- the code scenarios in src/data/scenarios.ts; each has a matching `venues` row (shortlist status) created in the same save.
CREATE TABLE custom_venues (
  scenario_id INTEGER PRIMARY KEY CHECK (scenario_id >= 1000),
  name TEXT NOT NULL,
  location TEXT,
  kind TEXT NOT NULL DEFAULT 'local' CHECK (kind IN ('local', 'destination')),
  description TEXT,
  capacity_seated INTEGER,
  capacity_kids INTEGER,
  capacity_cocktail INTEGER,
  confidence INTEGER NOT NULL DEFAULT 40,
  items TEXT NOT NULL DEFAULT '[]',
  sources TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  researched_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
