-- =============================================================================
-- FIX: 42P17 "infinite recursion detected in policy" on events / registrations
--
-- Cause: events SELECT policy checks registrations, while registrations SELECT
-- checks events → Postgres re-enters RLS in a loop.
--
-- Fix: Host/or-scan checks use SECURITY DEFINER + row_security = off so inner
-- reads do NOT re-apply RLS. Events SELECT for the app is a single USING (true)
-- for authenticated (your broad-read policy), plus host/registered helpers only
-- if you want stricter reads later — here we avoid any events↔registrations
-- subquery in plain policies.
--
-- Run once in Supabase SQL Editor (whole file, one Run). Safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Helper: is this user the host of this event? (no RLS re-entry)
-- -----------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.is_event_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_host(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) events — drop ALL policies, recreate (no registrations subquery in policies)
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
-- 3) registrations — drop ALL policies; host/org paths use is_event_host only
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

CREATE POLICY "Organizations can view registrations for scanning"
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

COMMIT;
