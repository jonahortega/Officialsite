-- =============================================================================
-- Event join requests ("request to join" before RSVP / ticket)
-- Run THIS FILE in Supabase SQL Editor — not the JavaScript helper
-- `src/utils/eventJoinRequestSupabase.js` (that file is for the React app only).
-- Requires: public.events (uuid id), public.is_event_host(uuid), auth.users.
-- =============================================================================

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS requires_join_request boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.requires_join_request IS
  'When true, students see Request instead of Join until a host accepts their event_join_requests row.';

CREATE TABLE IF NOT EXISTS public.event_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT event_join_requests_event_user_key UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_join_requests_event_id
  ON public.event_join_requests (event_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_user_id
  ON public.event_join_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_event_status
  ON public.event_join_requests (event_id, status);

ALTER TABLE public.event_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_join_requests_select_own_or_host" ON public.event_join_requests;
CREATE POLICY "event_join_requests_select_own_or_host"
  ON public.event_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_event_host (event_id));

REVOKE ALL ON TABLE public.event_join_requests FROM PUBLIC;
GRANT SELECT ON TABLE public.event_join_requests TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: current user's pending + accepted requests as { "<event_uuid>": "status" }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_event_join_requests ()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT coalesce(
    jsonb_object_agg(eid::text, st),
    '{}'::jsonb
  )
  FROM (
    SELECT r.event_id AS eid, r.status AS st
    FROM public.event_join_requests r
    WHERE r.user_id = auth.uid()
      AND r.status IN ('pending', 'accepted')
  ) sub;
$$;

REVOKE ALL ON FUNCTION public.get_my_event_join_requests () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_event_join_requests () TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: student submits (or re-submits after decline) a join request
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_event_join (p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  uid uuid := auth.uid ();
  ev public.events%ROWTYPE;
  cur_status text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO ev FROM public.events e WHERE e.id = p_event_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;
  IF ev.requires_join_request IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_requestable');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.registrations r
    WHERE r.event_id = p_event_id
      AND r.user_id = uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_registered');
  END IF;

  SELECT r.status
  INTO cur_status
  FROM public.event_join_requests r
  WHERE r.event_id = p_event_id
    AND r.user_id = uid
  LIMIT 1;

  IF cur_status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'accepted');
  END IF;

  IF cur_status = 'pending' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'pending');
  END IF;

  IF cur_status = 'declined' THEN
    UPDATE public.event_join_requests r
    SET
      status = 'pending',
      decided_at = NULL,
      created_at = now()
    WHERE r.event_id = p_event_id
      AND r.user_id = uid;
    RETURN jsonb_build_object('ok', true, 'status', 'pending');
  END IF;

  INSERT INTO public.event_join_requests (event_id, user_id, status)
  VALUES (p_event_id, uid, 'pending');
  RETURN jsonb_build_object('ok', true, 'status', 'pending');
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'status', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.request_event_join (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_event_join (uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: host / scanner lists requests for one event (with requester display names)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_event_join_requests_for_host (p_event_id uuid)
RETURNS TABLE (
  request_id uuid,
  user_id uuid,
  full_name text,
  username text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    r.id AS request_id,
    r.user_id,
    coalesce(nullif(trim(u.full_name), ''), nullif(trim(u.username), ''), 'Member') AS full_name,
    u.username,
    r.status,
    r.created_at
  FROM public.event_join_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.event_id = p_event_id
    AND public.is_event_host (p_event_id)
  ORDER BY r.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_event_join_requests_for_host (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_event_join_requests_for_host (uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: host accepts or declines one request
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_event_join_request (
  p_request_id uuid,
  p_accept boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  r public.event_join_requests%ROWTYPE;
  new_status text;
BEGIN
  IF auth.uid () IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO r
  FROM public.event_join_requests j
  WHERE j.id = p_request_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF NOT public.is_event_host (r.event_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending', 'status', r.status);
  END IF;

  new_status := CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;

  UPDATE public.event_join_requests j
  SET
    status = new_status,
    decided_at = now()
  WHERE j.id = p_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', new_status,
    'event_id', r.event_id,
    'user_id', r.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_event_join_request (uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_event_join_request (uuid, boolean) TO authenticated;

COMMIT;
