-- =============================================================================
-- COMPLETE FIX: "infinite recursion detected in policy for relation users"
--
-- Root cause: ANY policy on another table that does EXISTS (SELECT … FROM users …)
-- re-enters public.users RLS. If a policy ON users references events/registrations
-- that in turn reference users again, Postgres loops.
--
-- This script:
--   1) Adds SECURITY DEFINER helpers that read users (or join reg/events) with
--      row_security OFF so they do NOT re-enter users RLS.
--   2) Rewrites events policies to NEVER subquery public.users (uses helpers +
--      public.organizations for org checks).
--   3) Rewrites "Users select for event host registrants" to call a helper.
--   4) Ensures org registration policies use organizations + events, not users.
--
-- Run in Supabase → SQL Editor (postgres). Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Helpers (bypass RLS only inside these functions — avoids policy cycles)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_user_university()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT university FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_is_registrant_for_my_event(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.user_id = p_user_id
      AND e.created_by = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_university() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_university() TO authenticated;

REVOKE ALL ON FUNCTION public.user_is_registrant_for_my_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_registrant_for_my_event(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- B) events: drop policies that subquery users, then recreate without users
-- -----------------------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events from their university" ON public.events;
DROP POLICY IF EXISTS "Organizations can create events" ON public.events;
DROP POLICY IF EXISTS "Organizations can update their own events" ON public.events;
DROP POLICY IF EXISTS "Organizations can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Hosts can select events they created" ON public.events;
DROP POLICY IF EXISTS "Users can select events they registered for" ON public.events;
DROP POLICY IF EXISTS "Logged in users can read all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;

-- Read: host OR registered attendee OR same university (no SELECT FROM users in policy)
CREATE POLICY "Hosts can select events they created"
ON public.events FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can select events they registered for"
ON public.events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.event_id = events.id
      AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view events from their university"
ON public.events FOR SELECT TO authenticated
USING (
  public.auth_user_university() IS NOT NULL
  AND events.university IS NOT NULL
  AND events.university = public.auth_user_university()
);

-- Write: org accounts (row in organizations), only own created events for mutations
CREATE POLICY "Organizations can create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Organizations can update their own events"
ON public.events FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Organizations can delete their own events"
ON public.events FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- C) users: host can see registrant profiles — must not JOIN events in-policy
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users select for event host registrants" ON public.users;

CREATE POLICY "Users select for event host registrants"
ON public.users FOR SELECT TO authenticated
USING (public.user_is_registrant_for_my_event(users.id));

-- -----------------------------------------------------------------------------
-- D) registrations: org policies without public.users
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Organizations can view all registrations for scanning" ON public.registrations;
DROP POLICY IF EXISTS "Organizations can update scanned status" ON public.registrations;
DROP POLICY IF EXISTS "Authenticated users can view registrations for scanning" ON public.registrations;
DROP POLICY IF EXISTS "Authenticated users can update scanned status" ON public.registrations;

CREATE POLICY "Organizations can view all registrations for scanning"
ON public.registrations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.events e ON e.id = registrations.event_id
    WHERE o.user_id = auth.uid()
      AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Organizations can update scanned status"
ON public.registrations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.events e ON e.id = registrations.event_id
    WHERE o.user_id = auth.uid()
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.events e ON e.id = registrations.event_id
    WHERE o.user_id = auth.uid()
      AND e.created_by = auth.uid()
  )
);
