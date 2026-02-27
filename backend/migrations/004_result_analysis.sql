-- Migration: Result AI Analysis
-- Description: Adds ai_suggestions column to results table.

ALTER TABLE results ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT '{}'::jsonb;
