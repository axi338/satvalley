-- Enable Row Level Security (RLS) for all public tables.
-- By enabling RLS without creating any permissive policies, public frontend clients (anon/authenticated) are completely blocked from querying the DB directly.
-- Your Node.js backend uses the Supabase 'service_role' key, which inherently bypasses RLS, so it will continue working perfectly!

ALTER TABLE IF EXISTS public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.olympiad_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.olympiad_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.olympiad_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vocabulary_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_exam_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vocabulary ENABLE ROW LEVEL SECURITY;

-- If there are any other specific tables your database uses, RLS is active for them too now!
