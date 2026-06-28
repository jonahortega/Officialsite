-- =============================================================================
-- Pre-signup duplicate check (email + username) for anon users.
-- Run in Supabase → SQL Editor once. Then signUp flows can call RPC before auth.signUp.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_signup_availability(p_email text, p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  en text := nullif(lower(trim(p_email)), '');
  un text := nullif(lower(trim(p_username)), '');
  e_pub boolean := false;
  u_pub boolean := false;
BEGIN
  IF en IS NULL OR un IS NULL THEN
    RETURN 'invalid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users au
    WHERE lower(trim(coalesce(au.email::text, ''))) = en
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE lower(trim(coalesce(u.email::text, ''))) = en
  )
  OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE lower(trim(coalesce(o.email::text, ''))) = en
  ) THEN
    e_pub := true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE lower(trim(coalesce(u.username::text, ''))) = un
  )
  OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE lower(trim(coalesce(o.username::text, ''))) = un
  ) THEN
    u_pub := true;
  END IF;

  IF e_pub AND u_pub THEN
    RETURN 'both';
  END IF;
  IF e_pub THEN
    RETURN 'email';
  END IF;
  IF u_pub THEN
    RETURN 'username';
  END IF;
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_signup_availability(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_signup_availability(text, text) TO authenticated;
