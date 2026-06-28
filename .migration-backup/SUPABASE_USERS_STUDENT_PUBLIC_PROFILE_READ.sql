-- =============================================================================
-- Run in Supabase → SQL Editor if Search → people returns empty / profile
-- cannot load public.users for regular (non-org) accounts.
-- Mirrors SUPABASE_USERS_ORG_PUBLIC_PROFILE_READ.sql: any signed-in user may
-- SELECT public.users rows where is_organization is false/null so Search and
-- OrganizationProfileScreen (member view) can read name, handle, avatar, bio.
-- =============================================================================

DROP POLICY IF EXISTS "Users select student public profile for authenticated peers" ON public.users;
CREATE POLICY "Users select student public profile for authenticated peers"
ON public.users
FOR SELECT
TO authenticated
USING (COALESCE(is_organization, false) = false);
