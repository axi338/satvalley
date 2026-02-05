-- VOCABULARY MASTER SCHEMA
-- Creates tables for set-based vocabulary organization

-- 1. VOCABULARY SETS TABLE
CREATE TABLE vocabulary_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. VOCABULARY WORDS TABLE
CREATE TABLE vocabulary_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  theme TEXT DEFAULT 'Standard',
  mastered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_vocabulary_sets_user_id ON vocabulary_sets(user_id);
CREATE INDEX idx_vocabulary_words_set_id ON vocabulary_words(set_id);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE vocabulary_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR VOCABULARY SETS
-- Users can view their own sets
CREATE POLICY "Users can view own sets"
  ON vocabulary_sets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sets
CREATE POLICY "Users can insert own sets"
  ON vocabulary_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sets
CREATE POLICY "Users can update own sets"
  ON vocabulary_sets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sets
CREATE POLICY "Users can delete own sets"
  ON vocabulary_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS POLICIES FOR VOCABULARY WORDS
-- Users can view words in their sets
CREATE POLICY "Users can view words in own sets"
  ON vocabulary_words
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_sets
      WHERE vocabulary_sets.id = vocabulary_words.set_id
      AND vocabulary_sets.user_id = auth.uid()
    )
  );

-- Users can insert words in their sets
CREATE POLICY "Users can insert words in own sets"
  ON vocabulary_words
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vocabulary_sets
      WHERE vocabulary_sets.id = vocabulary_words.set_id
      AND vocabulary_sets.user_id = auth.uid()
    )
  );

-- Users can update words in their sets
CREATE POLICY "Users can update words in own sets"
  ON vocabulary_words
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_sets
      WHERE vocabulary_sets.id = vocabulary_words.set_id
      AND vocabulary_sets.user_id = auth.uid()
    )
  );

-- Users can delete words in their sets
CREATE POLICY "Users can delete words in own sets"
  ON vocabulary_words
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_sets
      WHERE vocabulary_sets.id = vocabulary_words.set_id
      AND vocabulary_sets.user_id = auth.uid()
    )
  );
