-- Enable RLS for olympiad_profiles
ALTER TABLE olympiad_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON olympiad_profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON olympiad_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON olympiad_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
