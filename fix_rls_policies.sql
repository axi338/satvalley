-- ============================================================
-- FIX: Add explicit service_role bypass policies for all tables
-- Run this in your Supabase SQL editor AFTER fix_all_rls.sql
-- ============================================================
-- 
-- Even though service_role normally bypasses RLS, Supabase sometimes
-- requires explicit policies when RLS is newly enabled on a table.
-- These policies allow the backend (which uses service_role key) full access.
--

-- Enable RLS + service_role bypass for every core table
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- Enable RLS if not already enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop old bypass policy if it exists
    EXECUTE format('DROP POLICY IF EXISTS "service_role_bypass" ON public.%I', t);

    -- Create new bypass policy for service_role
    EXECUTE format('
      CREATE POLICY "service_role_bypass" ON public.%I
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)
    ', t);
  END LOOP;
END;
$$;

-- Also grant full table privileges to service_role just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
