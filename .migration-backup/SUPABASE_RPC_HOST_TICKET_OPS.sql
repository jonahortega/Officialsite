-- Host ticket scan + attendee list via SECURITY DEFINER RPCs.
-- Use when RLS blocks direct SELECT/UPDATE on registrations for org scanners (e.g. users.is_organization not set).
-- Allows: event creator when organization_id is null, OR chapter org_admin / can_scan_tickets for the event's organization_id.
-- If your events.id / registrations.event_id are BIGINT (not uuid), change parameter types to match.

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
