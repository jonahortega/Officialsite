-- =============================================================================
-- Run in Supabase SQL Editor if the app shows NO data but SQL (as postgres) does.
-- Fixes: JWT role = authenticated must pass RLS on events + registrations + organizations.
-- Safe to re-run.
-- =============================================================================

-- 1) Events: every signed-in user can read rows (writes still restricted by your other policies).
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
CREATE POLICY "Authenticated users can view all events"
ON public.events FOR SELECT TO authenticated
USING (true);

-- 2) Registrations: students must read their own ticket rows.
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
CREATE POLICY "Users can view their own registrations"
ON public.registrations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3) Organizations: directory read (Search / org cards) — own-row-only hides other orgs.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizations select directory authenticated" ON public.organizations;
CREATE POLICY "Organizations select directory authenticated"
ON public.organizations FOR SELECT TO authenticated
USING (true);
