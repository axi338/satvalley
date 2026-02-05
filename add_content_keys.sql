-- Add Customizable Text Content
-- Run this in Supabase SQL Editor

INSERT INTO site_content (key, value) VALUES
-- General Site
('site_title', 'SAT Valley'),
('site_tagline', 'Master the Digital SAT'),

-- Hero Section
('hero_title', 'Elite Preparation'),
('hero_subtitle', 'Architectural Excellence'),
('hero_description', 'Master the Digital SAT with our cutting-edge platform'),

-- Practice Section
('practice_title', 'Test Portal'),
('practice_subtitle', 'Execute full-length simulations in the world''s most accurate Digital SAT testing environment'),

-- Olympiad Section
('olympiad_title', 'Elite Olympiad'),
('olympiad_subtitle', 'Compete with the world''s brightest minds'),
('olympiad_description', 'Achieve architectural excellence and claim your position on the global grid'),

-- Prize Section
('prize_text', '🏆 Win $500 Cash Prize'),
('prize_badge', 'GRAND PRIZE'),
('prize_badge_style', 'gold')

ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
