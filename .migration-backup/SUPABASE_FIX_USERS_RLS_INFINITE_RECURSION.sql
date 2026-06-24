-- =============================================================================
-- FIX: "infinite recursion detected in policy for relation users"
--
-- v1 used a function that SELECTs public.users — that STILL triggers users RLS
-- and loops. This version uses ONLY public.organizations (no users subquery).
--
-- If you STILL see recursion after this, your database likely has events policies
-- that SELECT FROM users and/or "Users select for event host registrants" that
-- JOINs events — run SUPABASE_FIX_RLS_RECURSION_EVENTS_AND_USERS.sql.
--
-- Run in Supabase → SQL Editor (safe to re-run).
-- =============================================================================
-- Order matters: drop policies that reference auth_is_organization BEFORE
-- dropping the function, or Postgres will error (2BP01).
-- =============================================================================

-- 1) Users: org accounts can read profiles via organizations row (no users subquery)
DROP POLICY IF EXISTS "Organizations can view user profiles" ON public.users;

CREATE POLICY "Organizations can view user profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

-- 2) Registrations: same idea — do NOT use EXISTS (SELECT ... FROM users ...)
--    or reading registrations will re-enter users RLS and recurse.
DROP POLICY IF EXISTS "Organizations can view all registrations for scanning" ON public.registrations;

CREATE POLICY "Organizations can view all registrations for scanning"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

-- Remove v1 helper last — only after every policy that referenced it is replaced
DROP FUNCTION IF EXISTS public.auth_is_organization();
