-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
--
-- Use when: every signed-in user should see every event on the home feed
-- (e.g. cross-university orgs like Rutgers vs AUP where university-based RLS
-- does not match both sides).
--
-- Security: any authenticated role can SELECT all rows in public.events.
-- Keep tighter policies for INSERT/UPDATE/DELETE as you already have.
-- =============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
CREATE POLICY "Authenticated users can view all events"
ON public.events FOR SELECT TO authenticated
USING (true);
