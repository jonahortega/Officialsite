-- =============================================================================
-- Run in Supabase → SQL Editor (one-time) so other users can see a member's
-- registered events on OrganizationProfileScreen (RLS blocks direct SELECT
-- on someone else's registrations).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_joined_events_for_display(p_profile_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
BEGIN
  IF p_profile_user_id IS NULL THEN
    RETURN result;
  END IF;

  SELECT COALESCE(jsonb_agg(x.obj ORDER BY x.ra DESC NULLS LAST), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      jsonb_build_object(
        'event', to_jsonb(e),
        'scanned', COALESCE(r.scanned, false)
      ) AS obj,
      r.registered_at AS ra
    FROM public.registrations r
    INNER JOIN public.events e ON e.id = r.event_id
    WHERE r.user_id = p_profile_user_id
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
  ) x;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_joined_events_for_display(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_joined_events_for_display(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_profile_joined_events_for_display(uuid) IS
  'Returns [{event: <events row as json>, scanned: bool}, ...] for profile display; bypasses registrations RLS.';
