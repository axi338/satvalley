-- SATVALLEY SUPABASE SCHEMA

-- 1. TESTS TABLE
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Medium',
  description TEXT,
  sections TEXT[],
  mathQ TEXT DEFAULT '0',
  readingQ TEXT DEFAULT '0',
  writingQ TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. QUESTIONS TABLE
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  passage TEXT,
  options TEXT[],
  type TEXT DEFAULT 'multiple-choice',
  module TEXT DEFAULT 'm1',
  skill TEXT,
  explanation TEXT,
  image_url TEXT,
  subject TEXT DEFAULT 'rw',
  option_images TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RESULTS TABLE
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  name TEXT DEFAULT 'Student',
  score INTEGER NOT NULL,
  improvement TEXT DEFAULT '+0',
  note TEXT,
  photo_url TEXT,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  responses JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PROFILES TABLE (for user data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY (Optional, but recommended later)
-- ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
