-- 1. Add banner_url and class_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT FALSE;

-- 1.5 Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY, -- Human readable ID like SAT-123
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Premium Class Tables
CREATE TABLE IF NOT EXISTS public.class_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_marks INTEGER NOT NULL DEFAULT 100,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES public.class_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT,
    score INTEGER,
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.class_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    quiz_scores JSONB DEFAULT '[]'::jsonb,
    homework_scores JSONB DEFAULT '[]'::jsonb,
    overall_score NUMERIC(5,2) DEFAULT 0,
    improvement_percentage NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    points INTEGER DEFAULT 0,
    rank INTEGER,
    badges JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_group_chat BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_todo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_exam_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subject TEXT NOT NULL,
    UNIQUE(student_id, subject)
);

-- 3. Enable RLS (Optional but recommended)
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_exam_dates ENABLE ROW LEVEL SECURITY;

-- 4. Storage Setup (Buckets and Policies)
-- Note: This requires the storage extension to be active.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read avatars/banners
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'banners'));

-- Allow authenticated users to upload their own files
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own files
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE 
USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE 
USING (auth.uid()::text = (storage.foldername(name))[1]);
