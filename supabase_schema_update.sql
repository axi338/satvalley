
-- 5. OLYMPIAD REGISTRATIONS TABLE
CREATE TABLE olympiad_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, test_id)
);

-- Enable RLS (Recommended)
-- ALTER TABLE olympiad_registrations ENABLE ROW LEVEL SECURITY;
