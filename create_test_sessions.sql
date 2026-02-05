
-- Create test_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own test sessions"
  ON test_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test sessions"
  ON test_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
