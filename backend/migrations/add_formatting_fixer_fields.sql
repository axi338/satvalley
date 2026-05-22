-- Migration: Add formatting fixer fields to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS original_question_text TEXT,
ADD COLUMN IF NOT EXISTS fixed_question_html TEXT,
ADD COLUMN IF NOT EXISTS formatting_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS formatting_confidence FLOAT,
ADD COLUMN IF NOT EXISTS formatting_changes JSONB;

-- Index for status to speed up admin queries
CREATE INDEX IF NOT EXISTS idx_questions_formatting_status ON questions(formatting_status);
