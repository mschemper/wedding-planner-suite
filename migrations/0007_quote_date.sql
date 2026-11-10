-- v12 (B14): a quote may apply to one date only (YYYY-MM-DD); NULL = every date.
ALTER TABLE quotes ADD COLUMN date TEXT;
