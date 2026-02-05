-- Add status column to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add olympiad_profiles table
CREATE TABLE IF NOT EXISTS olympiad_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  country_code TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint to avoid duplicate phones if needed
-- ALTER TABLE olympiad_profiles ADD CONSTRAINT unique_phone UNIQUE (phone);
