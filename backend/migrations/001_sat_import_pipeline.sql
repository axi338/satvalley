-- Migration: SAT Import Pipeline
-- Description: Adds tables for AI-powered SAT question importing and test mapping.

-- 1. Import Jobs Table
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, extracting, candidate_split, normalizing, review_required, publishing, done, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    destination_test_id UUID, -- Optional: if targetting a specific test
    config JSONB DEFAULT '{}'::jsonb, -- Store test type, etc.
    error_message TEXT
);

-- 2. Import Candidates Table
CREATE TABLE IF NOT EXISTS import_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    raw_text TEXT,
    page INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, normalized, needs_review, approved, rejected
    normalized_json JSONB DEFAULT '{}'::jsonb,
    question_id UUID REFERENCES questions(id),
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Test Questions (Join Table for ordering)
CREATE TABLE IF NOT EXISTS test_questions (
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

-- 4. Enhance Questions Table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '{}'::jsonb;

-- 5. Create Test Sessions Table (Phase 2 preview)
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    test_id UUID REFERENCES tests(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    score INTEGER,
    rw_score INTEGER,
    math_score INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Session Answers Table (Phase 2 preview)
CREATE TABLE IF NOT EXISTS session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    user_answer TEXT,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Admins only for imports
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_candidates ENABLE ROW LEVEL SECURITY;

-- Simple policy: Only admins can access these (this is usually handled via service role on backend, but good for security)
-- Note: Assuming admin role is checked via application metadata or a custom function if available in this env.
-- For now, we'll keep it simple as the backend uses the service role key.
