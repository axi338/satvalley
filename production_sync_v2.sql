-- SATValley Production Schema Sync
-- Execute this in the Supabase SQL Editor to fix "Synchronization Failed" errors.

-- 1. Ensure 'results' table has the new columns
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS is_olympiad BOOLEAN DEFAULT false;

ALTER TABLE results 
ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;

ALTER TABLE results 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Ensure 'tests' table has Olympiad metadata
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS is_olympiad BOOLEAN DEFAULT false;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS olympiad_start_date TIMESTAMPTZ DEFAULT now();

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS olympiad_end_date TIMESTAMPTZ DEFAULT now();

-- 3. Refresh PostgREST cache (optional but recommended)
NOTIFY pgrst, 'reload schema';
