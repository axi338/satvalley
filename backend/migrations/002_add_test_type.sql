-- Add test_type column to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS test_type TEXT DEFAULT 'full';

-- Make sure existing tests default to 'math' if appropriate, 
-- or we can just update them manually. 
-- For now, let's just add the column.
