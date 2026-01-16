-- SATValley Database Fix (Comprehensive)

-- 1. Tests Table Updates
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_olympiad BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS olympiad_start_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE tests ADD COLUMN IF NOT EXISTS olympiad_end_date TIMESTAMPTZ DEFAULT now();

-- 1.5. Questions Table Updates
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';


-- 2. Olympiad Profiles Table
CREATE TABLE IF NOT EXISTS olympiad_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  country_code TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Olympiad Violations Table
CREATE TABLE IF NOT EXISTS olympiad_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  violation_type TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Olympiad Registrations Table
CREATE TABLE IF NOT EXISTS olympiad_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, test_id)
);

-- 5. Site Content Table (Dynamic News)
CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS Policies (Security)
-- Enable RLS
ALTER TABLE olympiad_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON olympiad_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON olympiad_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON olympiad_profiles;
DROP POLICY IF EXISTS "Public Read Access" ON site_content;
DROP POLICY IF EXISTS "Authenticated Update Access" ON site_content;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON site_content;

-- Create Policies for Profiles
CREATE POLICY "Users can view own profile" ON olympiad_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON olympiad_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON olympiad_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create Policies for Site Content
CREATE POLICY "Public Read Access" ON site_content
    FOR SELECT USING (true);

CREATE POLICY "Authenticated Update Access" ON site_content
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Insert Access" ON site_content
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 7. Default Data
INSERT INTO site_content (key, value) VALUES
('home_olympiad_title', 'SAT Olympiad'),
('home_olympiad_subtitle', 'Season One.'),
('home_olympiad_desc', 'Compete against Uzbekistan''s brightest minds. Prove your excellence on the global stage and secure your place on the elite leaderboard.')
ON CONFLICT (key) DO NOTHING;
