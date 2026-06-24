-- =============================================================================
-- Same-university visibility (loose match) WITHOUT calling auth_user_university()
-- many times per row — that pattern made login / home feeds very slow.
--
-- This version uses ONE plpgsql function per row: one SELECT from public.users,
-- then cheap string checks. Optional pg_trgm index speeds ILIKE on events.university.
--
-- Run once in Supabase SQL Editor. Replaces policy + adds function + index.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_events_university_gin_trgm
  ON public.events USING gin (university gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.event_visible_for_auth_user_uni(ev_university text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  my_uni text;
  tok text;
  ev_tok text;
BEGIN
  IF ev_university IS NULL OR btrim(ev_university) = '' THEN
    RETURN false;
  END IF;
  SELECT u.university INTO my_uni FROM public.users u WHERE u.id = auth.uid();
  IF my_uni IS NULL OR btrim(my_uni) = '' THEN
    RETURN false;
  END IF;
  IF lower(btrim(ev_university)) = lower(btrim(my_uni)) THEN
    RETURN true;
  END IF;
  tok := btrim(split_part(my_uni, ' ', 1));
  IF length(tok) >= 3 AND ev_university ILIKE '%' || tok || '%' THEN
    RETURN true;
  END IF;
  ev_tok := btrim(split_part(ev_university, ' ', 1));
  IF length(ev_tok) >= 3 AND my_uni ILIKE '%' || ev_tok || '%' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.event_visible_for_auth_user_uni(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_visible_for_auth_user_uni(text) TO authenticated;

DROP POLICY IF EXISTS "Users can view events from their university" ON public.events;

CREATE POLICY "Users can view events from their university"
ON public.events FOR SELECT TO authenticated
USING (public.event_visible_for_auth_user_uni(events.university));
