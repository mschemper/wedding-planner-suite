-- v4 schema (docs/DESIGN-v4.md §3). ADD ONLY: v3 tables stay until 0003 so v3 can be redeployed (rollback).
-- Enums, refs, partner symmetry and cycles are checked by the Worker (worker/db.ts SPECS + src/people/validate.ts).
-- Every row: version / updated_at (ISO UTC) / updated_by (Access email).
CREATE TABLE parties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite TEXT NOT NULL DEFAULT 'undecided',
  kids TEXT NOT NULL DEFAULT 'policy',
  rank INTEGER,
  talk INTEGER NOT NULL DEFAULT 0,
  talk_note TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  first TEXT NOT NULL,
  last TEXT,
  nick TEXT,
  side TEXT NOT NULL,
  branch TEXT,
  gen INTEGER,
  kind TEXT NOT NULL,
  party_id TEXT REFERENCES parties(id) ON DELETE RESTRICT,
  partner_id TEXT,
  parent_ids TEXT NOT NULL DEFAULT '[]',
  age TEXT NOT NULL DEFAULT 'adult',
  override TEXT,
  rsvp TEXT NOT NULL DEFAULT 'none',
  deceased INTEGER NOT NULL DEFAULT 0,
  placeholder INTEGER NOT NULL DEFAULT 0,
  local TEXT NOT NULL DEFAULT 'unknown',
  circle TEXT,
  plus_one INTEGER NOT NULL DEFAULT 0,
  kids_room INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  notes TEXT,
  sort INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE INDEX people_party ON people(party_id);

CREATE TABLE venues (
  scenario_id INTEGER PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'researching',
  hold_date TEXT,
  tour_date TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  next_step TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE musthaves (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  detail TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE fit (
  id TEXT PRIMARY KEY,
  scenario_id INTEGER NOT NULL,
  musthave_id TEXT NOT NULL REFERENCES musthaves(id) ON DELETE RESTRICT,
  verdict TEXT NOT NULL DEFAULT 'unknown',
  note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT,
  due TEXT,
  owner TEXT NOT NULL DEFAULT 'Both',
  category TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'open',
  done_at TEXT,
  source TEXT,
  source_date TEXT,
  scenario_id INTEGER,
  sort INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
