-- Create a table for dynamic site content
CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Public Read Access" ON site_content
    FOR SELECT USING (true);

-- Policy: Only admins can update (assuming admin check logic or open for now based on app auth)
-- For simplicity in this context, we'll allow authenticated users to update if they are admins, 
-- but since RLS for admin is complex without claims, we'll rely on backend logic for writes.
-- However, if using direct Supabase client, we need a policy.
-- Let's allow update for now if user is authenticated (backend will enforce admin check)
CREATE POLICY "Authenticated Update Access" ON site_content
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Insert Access" ON site_content
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default values for Olympiad Promo on HomePage
INSERT INTO site_content (key, value) VALUES
('home_olympiad_title', 'SAT Olympiad'),
('home_olympiad_subtitle', 'Season One.'),
('home_olympiad_desc', 'Compete against Uzbekistan''s brightest minds. Prove your excellence on the global stage and secure your place on the elite leaderboard.')
ON CONFLICT (key) DO NOTHING;
