-- Enable Row Level Security (RLS) for public tables to block direct client access
-- Since your app routes database traffic through the Node.js backend (using the service_role key),
-- your backend will still be able to read and write without interruption.
-- However, this blocks malicious users from directly querying your database using your public ANON key.

ALTER TABLE IF EXISTS public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.olympiad_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vocabulary ENABLE ROW LEVEL SECURITY;

-- No REST API policies are needed because you only use the Backend API!
