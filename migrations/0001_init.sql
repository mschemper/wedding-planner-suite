-- v3 schema (docs/DESIGN-v3.md §2). Guest columns = workbook column names (src/guests/schema.ts); optional/enum columns are
-- nullable TEXT and checked by the Worker (worker/shape.ts + validateGuests). Every row: version / updated_at (ISO UTC) / updated_by (Access email).
CREATE TABLE households (
  HouseholdID TEXT PRIMARY KEY,
  Family TEXT NOT NULL,
  FamilySide TEXT,
  PrimaryHouseholdName TEXT,
  HouseholdType TEXT,
  Notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE individuals (
  PersonID TEXT PRIMARY KEY,
  HouseholdID TEXT NOT NULL REFERENCES households(HouseholdID) ON DELETE RESTRICT,
  FirstName TEXT,
  LastName TEXT,
  DisplayName TEXT,
  Family TEXT NOT NULL,
  FamilySide TEXT,
  RelationshipToMark TEXT,
  RelationshipToAngela TEXT,
  GenerationGroup TEXT,
  AdultOrChild TEXT,
  HouseholdRole TEXT,
  PartnerPersonID TEXT,
  ParentPersonIDs TEXT,
  InviteException TEXT,
  ExceptionReason TEXT,
  Locality TEXT,
  CityState TEXT,
  InvitePriority TEXT,
  InviteStatus TEXT,
  Notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE INDEX individuals_household ON individuals(HouseholdID);

CREATE TABLE friends (
  FriendGroupID TEXT PRIMARY KEY,
  GroupName TEXT,
  PrimaryContact TEXT,
  ConnectionTo TEXT,
  FriendCategory TEXT,
  Ranking TEXT,
  InviteTier TEXT,
  Locality TEXT,
  CityState TEXT,
  PlusOneDefault TEXT,
  AdultOrChild TEXT,
  InviteException TEXT,
  ExceptionReason TEXT,
  InviteStatus TEXT,
  Notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  scenario_id INTEGER NOT NULL,
  item_desc TEXT NOT NULL,
  options TEXT,
  basis TEXT NOT NULL CHECK (basis IN ('total', 'perGuest')),
  amount REAL NOT NULL CHECK (amount >= 0),
  includes_tax INTEGER NOT NULL DEFAULT 0,
  vendor TEXT,
  received_on TEXT,
  status TEXT NOT NULL CHECK (status IN ('requested', 'received', 'accepted')),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE params (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  who TEXT NOT NULL,
  tbl TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL,
  before TEXT,
  after TEXT
);

-- Concurrency guard: inserting 0 violates the CHECK and rolls back the whole batch (worker/write.ts).
CREATE TABLE _guard (x INTEGER CHECK (x = 1));
