-- =============================================================================
-- PHASE 2 — Events + registrations use organization_members (safe with Phase 1)
-- Run in Supabase → SQL Editor AFTER Phase 1 ran successfully. Backup first.
--
-- Changes:
--   1) Backfill events.organization_id where null (founder = organizations.user_id).
--   2) Replace public.is_event_host: event creator OR org admin OR can_scan_tickets.
--   3) events INSERT/UPDATE/DELETE: member of events.organization_id (not only org row owner).
--   4) registrations: simplify scan policies; add host cleanup DELETE for event removal.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Backfill organization_id on legacy events (creator matched org founder)
-- -----------------------------------------------------------------------------
UPDATE public.events e
SET organization_id = o.id
FROM public.organizations o
WHERE e.organization_id IS NULL
  AND e.created_by IS NOT NULL
  AND o.user_id = e.created_by;

-- -----------------------------------------------------------------------------
-- 1) is_event_host — host/scanner paths without RLS re-entry
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
      AND (
        e.created_by = auth.uid()
        OR (
          e.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.organization_members m
            WHERE m.organization_id = e.organization_id
              AND m.user_id = auth.uid()
              AND (m.is_org_admin OR m.can_scan_tickets)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_event_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_host(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) events — replace write policies (keep broad SELECT)
-- -----------------------------------------------------------------------------
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
  AND organization_id IS NOT NULL
  AND public.user_is_org_member(organization_id)
);

CREATE POLICY "Organizations can update their own events"
ON public.events FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND (
    (organization_id IS NOT NULL AND public.user_is_org_member(organization_id))
    OR (
      organization_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND (
    (organization_id IS NOT NULL AND public.user_is_org_member(organization_id))
    OR (
      organization_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Organizations can delete their own events"
ON public.events FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND (
    (organization_id IS NOT NULL AND public.user_is_org_member(organization_id))
    OR (
      organization_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
      )
    )
  )
);

-- -----------------------------------------------------------------------------
-- 3) registrations — recreate policies (same names as your export where possible)
-- -----------------------------------------------------------------------------
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
  OR public.is_event_host(registrations.event_id)
);

CREATE POLICY "Organizations can update scanned status"
ON public.registrations FOR UPDATE TO authenticated
USING (public.is_event_host(registrations.event_id))
WITH CHECK (public.is_event_host(registrations.event_id));

-- Lets org admins remove attendee rows when deleting an event created by someone else
CREATE POLICY "Org admins can delete registrations for org events"
ON public.registrations FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.organization_id IS NOT NULL
      AND public.user_is_org_admin(e.organization_id)
  )
);

-- Event creator can delete all registrations for that event (cleanup on delete event)
CREATE POLICY "Event creators can delete registrations for their events"
ON public.registrations FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
);

COMMIT;
