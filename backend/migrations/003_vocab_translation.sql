-- Migration: Vocabulary Translation
-- Description: Adds a translation column to vocabulary_words table.

ALTER TABLE vocabulary_words ADD COLUMN IF NOT EXISTS translation TEXT;
