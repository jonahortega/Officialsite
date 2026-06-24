-- =============================================================================
-- Run in Supabase → SQL Editor (one script).
-- Fixes: "View attendees" showed users who abandoned Stripe (payment_status = pending).
-- Only completed RSVPs appear: paid listings require payment_status = 'paid';
-- free listings require free/paid/null/'' and not pending.
-- list_event_attendees_public also unions chapter roster (organization_members) for display
-- only — no registration, no ticket; host list + scan RPCs stay registration-only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Guest / joined-user attendee list (Dashboard "View attendees")
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2) Host attendee export + scan (Tickets tab for organizers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chapter_can_check_in_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND (
        (
          e.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.organization_members m
            WHERE m.organization_id = e.organization_id
              AND m.user_id = auth.uid()
              AND (m.is_org_admin OR COALESCE(m.can_scan_tickets, false))
          )
        )
        OR (
          e.organization_id IS NULL
          AND e.created_by = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.list_registrations_for_host_event(p_event_id uuid)
RETURNS SETOF public.registrations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.registrations r
  INNER JOIN public.events e ON e.id = r.event_id
  WHERE r.event_id = p_event_id
    AND public.chapter_can_check_in_event(p_event_id)
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
  ORDER BY r.registered_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.scan_ticket_for_host(
  p_ticket_code text,
  p_event_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_rec public.registrations%ROWTYPE;
  updated_id uuid;
  ev_title text;
BEGIN
  IF p_ticket_code IS NULL OR trim(p_ticket_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT r.* INTO reg_rec
  FROM public.registrations r
  INNER JOIN public.events e ON e.id = r.event_id
  WHERE r.ticket_code = trim(p_ticket_code)
    AND public.chapter_can_check_in_event(e.id)
    AND (p_event_id IS NULL OR r.event_id = p_event_id)
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
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF reg_rec.scanned IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_scanned');
  END IF;

  UPDATE public.registrations
  SET scanned = true,
      scanned_at = now()
  WHERE id = reg_rec.id
    AND scanned = false
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_scanned');
  END IF;

  SELECT e.title INTO ev_title
  FROM public.events e
  WHERE e.id = reg_rec.event_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'registration_id', reg_rec.id,
    'event_id', reg_rec.event_id,
    'user_id', reg_rec.user_id,
    'ticket_code', reg_rec.ticket_code,
    'event_title', ev_title
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chapter_can_check_in_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_registrations_for_host_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scan_ticket_for_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chapter_can_check_in_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_registrations_for_host_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_ticket_for_host(text, uuid) TO authenticated;
