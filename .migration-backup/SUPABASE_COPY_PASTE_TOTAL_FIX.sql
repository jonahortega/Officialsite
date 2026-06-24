-- =============================================================================
-- TOTAL RLS FIX — copy entire file → Supabase SQL Editor → Run once
--
-- Includes:
--   • Safe helpers (no users RLS recursion from events)
--   • events + registrations + users policies reset (drops ALL old names)
--   • "Authenticated users can view all events" so every org sees every event
--     on the home feed (Rutgers + AUP, etc.), regardless of university string
--
-- Requires: public.organizations, public.user_follows (see notes below)
-- =============================================================================
--
-- If public.user_follows does not exist yet, run SUPABASE_USER_FOLLOWS.sql first,
-- OR comment out the two policies whose names contain "follow" in section D.
--
-- Run as one batch (one Run click).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- A) Helpers (SECURITY DEFINER + row_security off — no RLS re-entry)
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
-- B) Drop ALL policies on public.events, then recreate
-- -----------------------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', r.policyname);
  END LOOP;
END $$;

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

-- Cross-university home feed: any signed-in user can read every event row.
CREATE POLICY "Authenticated users can view all events"
ON public.events FOR SELECT TO authenticated
USING (true);

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
-- C) Drop ALL policies on public.registrations, then recreate
-- -----------------------------------------------------------------------------

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'registrations'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.registrations', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view their own registrations"
ON public.registrations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registrations"
ON public.registrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registrations"
ON public.registrations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can select registrations for their events"
ON public.registrations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Hosts can update registrations for their events"
ON public.registrations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
);

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
    SELECT 1 FROM public.organizations o
    JOIN public.events e ON e.id = registrations.event_id
    WHERE o.user_id = auth.uid()
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    JOIN public.events e ON e.id = registrations.event_id
    WHERE o.user_id = auth.uid()
      AND e.created_by = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- D) Drop ALL policies on public.users, then recreate
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users insert own row"
ON public.users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own row"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users select own row"
ON public.users FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Organizations can view user profiles"
ON public.users FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Users select organization public profile"
ON public.users FOR SELECT TO authenticated
USING (COALESCE(is_organization, false) = true);

CREATE POLICY "Users select mutual follow profiles"
ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_follows f
    WHERE (f.follower_id = users.id AND f.following_id = auth.uid())
       OR (f.following_id = users.id AND f.follower_id = auth.uid())
  )
);

CREATE POLICY "Users select for event host registrants"
ON public.users FOR SELECT TO authenticated
USING (public.user_is_registrant_for_my_event(users.id));

CREATE POLICY "Users select profiles of their followers"
ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_follows f
    WHERE f.follower_id = users.id
      AND f.following_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- E) Optional legacy helper
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.auth_is_organization();

COMMIT;
