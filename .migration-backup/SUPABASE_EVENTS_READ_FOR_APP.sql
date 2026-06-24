-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Fixes: data visible in Table Editor but empty in the app — RLS on `events`
-- was only allowing rows when users.university = events.university (exact).
-- Adds OR policies so hosts and ticket holders can always read the rows they need.
-- =============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Hosts: read/update/delete their own events (needed when university strings differ)
DROP POLICY IF EXISTS "Hosts can select events they created" ON public.events;
CREATE POLICY "Hosts can select events they created"
ON public.events FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- Attendees: read events they registered for (tickets / joined feed / hydration)
DROP POLICY IF EXISTS "Users can select events they registered for" ON public.events;
CREATE POLICY "Users can select events they registered for"
ON public.events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.event_id = events.id
      AND r.user_id = auth.uid()
  )
);

-- Optional: public campus feed without strict university equality on the users row.
-- Uncomment if you want any signed-in user to browse all events (demo / small deploys).
-- DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
-- CREATE POLICY "Authenticated users can view all events"
-- ON public.events FOR SELECT TO authenticated
-- USING (true);
