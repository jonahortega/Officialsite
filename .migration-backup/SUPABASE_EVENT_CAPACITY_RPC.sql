-- Live registration counts + hard cap on registrations (run in Supabase SQL editor).
-- Fixes: UI used events.attendance (often 0/stale) while real headcount is in registrations.

CREATE OR REPLACE FUNCTION public.registration_counts_for_events(p_event_ids uuid[])
RETURNS TABLE(event_id uuid, reg_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.event_id, count(*)::integer AS reg_count
  FROM public.registrations r
  WHERE p_event_ids IS NOT NULL
    AND cardinality(p_event_ids) > 0
    AND r.event_id = ANY(p_event_ids)
  GROUP BY r.event_id;
$$;

REVOKE ALL ON FUNCTION public.registration_counts_for_events(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_counts_for_events(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registration_counts_for_events(uuid[]) TO service_role;

-- Block INSERT when registrations already >= events.max_attendance (NULL or <=0 = unlimited).
CREATE OR REPLACE FUNCTION public.registrations_block_when_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap integer;
  occ integer;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  SELECT e.max_attendance::integer INTO cap FROM public.events e WHERE e.id = NEW.event_id;
  IF cap IS NULL OR cap <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::integer INTO occ FROM public.registrations r WHERE r.event_id = NEW.event_id;
  IF occ >= cap THEN
    RAISE EXCEPTION 'EVENT_FULL'
      USING ERRCODE = '23514',
            HINT = 'Event has reached max_attendance.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.registrations_block_when_full() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_registrations_capacity ON public.registrations;
CREATE TRIGGER trg_registrations_capacity
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE PROCEDURE public.registrations_block_when_full();
