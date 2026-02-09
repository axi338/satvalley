CREATE TABLE IF NOT EXISTS olympiad_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  violation_type TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

  