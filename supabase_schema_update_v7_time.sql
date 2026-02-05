-- Add time_taken_seconds column to results table for Leaderboard ranking
ALTER TABLE results ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;

-- Optional: Update existing records to have a high time so they don't beat new valid times?
-- UPDATE results SET time_taken_seconds = 99999 WHERE time_taken_seconds IS NULL;
