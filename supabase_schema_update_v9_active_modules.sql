-- Migration v9: Add active_modules field to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['rw-m1', 'rw-m2', 'math-m1', 'math-m2'];

COMMENT ON COLUMN tests.active_modules IS 'List of enabled modules for this test (e.g., rw-m1, rw-m2, math-m1, math-m2)';
