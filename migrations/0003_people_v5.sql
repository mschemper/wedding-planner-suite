-- v5 people fields (docs/DESIGN-v5.md §1). Add-only columns + one generic data fix (no names).
ALTER TABLE parties ADD COLUMN tier INTEGER;
ALTER TABLE parties ADD COLUMN unnamed_kids INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parties ADD COLUMN circle TEXT;
ALTER TABLE parties ADD COLUMN known_by TEXT;
ALTER TABLE parties ADD COLUMN reciprocal INTEGER NOT NULL DEFAULT 0;

-- friend circle + who knows them move to the household
UPDATE parties SET circle = (SELECT p.circle FROM people p WHERE p.party_id = parties.id AND p.kind = 'friend' AND p.circle IS NOT NULL ORDER BY p.id LIMIT 1)
  WHERE EXISTS (SELECT 1 FROM people p WHERE p.party_id = parties.id AND p.kind = 'friend');
UPDATE parties SET known_by = (SELECT p.side FROM people p WHERE p.party_id = parties.id AND p.kind = 'friend' ORDER BY p.id LIMIT 1)
  WHERE EXISTS (SELECT 1 FROM people p WHERE p.party_id = parties.id AND p.kind = 'friend');

-- placeholder children ("Child 1", "Child 2", …) become a count on their household
UPDATE parties SET unnamed_kids = unnamed_kids + (SELECT COUNT(*) FROM people p WHERE p.party_id = parties.id AND p.age = 'child' AND p.first GLOB 'Child [0-9]*');
DELETE FROM people WHERE age = 'child' AND first GLOB 'Child [0-9]*';
