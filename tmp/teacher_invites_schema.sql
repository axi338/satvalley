-- 1. Create teacher_invites table
CREATE TABLE IF NOT EXISTS public.teacher_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_by UUID REFERENCES public.profiles(id) DEFAULT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. Enable RLS but allow service role (backend) to manage it
ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

-- 3. Add index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_teacher_invites_code ON public.teacher_invites(code);

-- 4. Inform user
-- Run this in your Supabase SQL Editor to enable the Invitation Code system.
