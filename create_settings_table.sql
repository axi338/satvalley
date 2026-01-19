-- 1. Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    high_scores INTEGER DEFAULT 42,
    score_variance TEXT DEFAULT '+178',
    architectural_mean INTEGER DEFAULT 1547,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure at least one row exists
INSERT INTO settings (id, high_scores, score_variance, architectural_mean)
VALUES (1, 42, '+178', 1547)
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure all site_content keys exist
INSERT INTO site_content (key, value) VALUES
('hero_description', 'Master the Digital SAT with the world''s most advanced adaptive preparation ecosystem.'),
('prize_text', '🏆 Win $500 Cash Prize'),
('prize_badge', 'GRAND PRIZE'),
('prize_badge_style', 'gold')
ON CONFLICT (key) DO NOTHING;
