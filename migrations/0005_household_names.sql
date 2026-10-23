-- v8: household (envelope) names follow their people unless written by hand. Add-only.
-- 0 = automatic (the Worker rewrites the name whenever the household's people change); 1 = custom (kept as written).
ALTER TABLE parties ADD COLUMN name_custom INTEGER NOT NULL DEFAULT 0;
