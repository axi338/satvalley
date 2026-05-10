-- Premium Class Section Schema (Supabase / PostgreSQL)

-- 1. Homework Assignments
CREATE TABLE IF NOT EXISTS public.class_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_marks INTEGER NOT NULL DEFAULT 100,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content JSONB, -- For text, PDF URLs, video links, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Homework Submissions
CREATE TABLE IF NOT EXISTS public.class_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES public.class_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT, -- Student response or file link
    score INTEGER,
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, student_id)
);

-- 3. Performance & Statistics
CREATE TABLE IF NOT EXISTS public.class_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    quiz_scores JSONB DEFAULT '[]'::jsonb,
    homework_scores JSONB DEFAULT '[]'::jsonb,
    overall_score NUMERIC(5,2) DEFAULT 0,
    improvement_percentage NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Gamification & Leaderboards
CREATE TABLE IF NOT EXISTS public.class_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    points INTEGER DEFAULT 0,
    rank INTEGER,
    badges JSONB DEFAULT '[]'::jsonb, -- e.g. [{"name": "Top Scorer", "awarded_at": "..."}]
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Teacher-Student Messaging
CREATE TABLE IF NOT EXISTS public.class_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Can be NULL for group chat
    message_text TEXT NOT NULL,
    is_group_chat BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. To-Do List for Students
CREATE TABLE IF NOT EXISTS public.class_todo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Exam Date Countdown
CREATE TABLE IF NOT EXISTS public.class_exam_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subject TEXT NOT NULL,
    UNIQUE(student_id, subject)
);

-- Enable RLS
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_exam_dates ENABLE ROW LEVEL SECURITY;

-- Note: Policies will be refined during implementation.
