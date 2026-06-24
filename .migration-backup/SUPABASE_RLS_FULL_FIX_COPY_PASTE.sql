-- Requires public.user_follows to exist for the two follow-related policies.
-- If that table is missing, run SUPABASE_USER_FOLLOWS.sql first (CREATE TABLE only),
-- or temporarily comment out "Users select mutual follow profiles" and
-- "Users select profiles of their followers" before running.
--
-- Run this whole file in one go (one Run click) so it stays one transaction.
-- =============================================================================
-- FULL RLS RESET — copy entire file → Supabase SQL Editor → Run (postgres)
--
-- Client loads registrations + users for org dashboards, tickets, etc. If ANY policy on registrations still does
-- EXISTS (SELECT … FROM users …), Postgres re-enters users RLS and can loop
-- with policies that touch events/registrations. Common leftover names we never
-- dropped before: allow_orgs_select_all_registrations, allow_orgs_update_registrations
-- (FINAL_QR_TICKET_SETUP.sql). This script DROPS EVERY POLICY on events,
-- registrations, and users, then recreates a safe set — no stray names left.
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

-- Host check without events↔registrations RLS recursion (42P17).
CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.created_by = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_university() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_university() TO authenticated;

REVOKE ALL ON FUNCTION public.user_is_registrant_for_my_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_registrant_for_my_event(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_event_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_host(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- B) Drop ALL policies on public.events, then recreate (never subquery users)
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

-- Single SELECT policy: do NOT add EXISTS(registrations) here — it loops with
-- registrations policies that reference events → 42P17.
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
-- C) Drop ALL policies on public.registrations, then recreate (never subquery users)
--    Removes allow_orgs_* and any other legacy names.
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
USING (public.is_event_host(registrations.event_id));

CREATE POLICY "Hosts can update registrations for their events"
ON public.registrations FOR UPDATE TO authenticated
USING (public.is_event_host(registrations.event_id))
WITH CHECK (public.is_event_host(registrations.event_id));

CREATE POLICY "Organizations can view all registrations for scanning"
ON public.registrations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (
    public.is_event_host(registrations.event_id)
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Organizations can update scanned status"
ON public.registrations FOR UPDATE TO authenticated
USING (
  public.is_event_host(registrations.event_id)
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_event_host(registrations.event_id)
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- D) Drop ALL policies on public.users, then recreate (no in-policy JOIN events)
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
