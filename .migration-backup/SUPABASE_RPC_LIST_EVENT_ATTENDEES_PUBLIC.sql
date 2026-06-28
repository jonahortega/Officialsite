-- Attendee list (name + avatar) for an event. Re-run in Supabase SQL Editor after updates.
-- Rules: caller must have a COMPLETED registration (not Stripe pending) OR be a host.
-- Rows = completed RSVPs PLUS chapter roster (organization_members for events.organization_id).
-- Roster-only users appear here only — no registration row, no ticket (host RPCs unchanged).
-- Full one-file migration: SUPABASE_RPC_ATTENDEES_EXCLUDE_PENDING.sql

CREATE OR REPLACE FUNCTION public.list_event_attendees_public(p_event_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.registrations r
      INNER JOIN public.events e ON e.id = r.event_id
      WHERE r.event_id = p_event_id
        AND r.user_id = auth.uid()
        AND r.payment_status IS DISTINCT FROM 'pending'
        AND (
          (COALESCE(e.price, 0) > 0 AND r.payment_status = 'paid')
          OR (
            COALESCE(e.price, 0) <= 0
            AND (
              r.payment_status IN ('free', 'paid')
              OR r.payment_status IS NULL
              OR r.payment_status = ''
            )
          )
        )
    )
    OR public.is_event_host(p_event_id)
  ) THEN
    RAISE EXCEPTION 'Must join the event to view attendees';
  END IF;

  RETURN QUERY
  WITH ev_org AS (
    SELECT e.organization_id
    FROM public.events e
    WHERE e.id = p_event_id
  ),
  reg_attendees AS (
    SELECT
      u.id AS uid,
      COALESCE(
        NULLIF(trim(both from u.full_name), ''),
        NULLIF(trim(both from u.username), ''),
        'Member'
      )::text AS display_name,
      u.username::text AS uname,
      u.avatar_url::text AS avatar
    FROM public.registrations r
    INNER JOIN public.events e ON e.id = r.event_id
    INNER JOIN public.users u ON u.id = r.user_id
    WHERE r.event_id = p_event_id
      AND r.payment_status IS DISTINCT FROM 'pending'
      AND (
        (COALESCE(e.price, 0) > 0 AND r.payment_status = 'paid')
        OR (
          COALESCE(e.price, 0) <= 0
          AND (
            r.payment_status IN ('free', 'paid')
            OR r.payment_status IS NULL
            OR r.payment_status = ''
          )
        )
      )
  ),
  org_roster AS (
    SELECT
      u.id AS uid,
      COALESCE(
        NULLIF(trim(both from u.full_name), ''),
        NULLIF(trim(both from u.username), ''),
        'Member'
      )::text AS display_name,
      u.username::text AS uname,
      u.avatar_url::text AS avatar
    FROM ev_org vo
    INNER JOIN public.organization_members m ON m.organization_id = vo.organization_id
    INNER JOIN public.users u ON u.id = m.user_id
    WHERE vo.organization_id IS NOT NULL
  ),
  combined AS (
    SELECT * FROM reg_attendees
    UNION ALL
    SELECT * FROM org_roster
  )
  SELECT DISTINCT ON (c.uid)
    c.uid AS user_id,
    c.display_name AS full_name,
    c.uname AS username,
    c.avatar AS avatar_url
  FROM combined c
  ORDER BY c.uid;
END;
$$;

REVOKE ALL ON FUNCTION public.list_event_attendees_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_event_attendees_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_attendees_public(uuid) TO service_role;
