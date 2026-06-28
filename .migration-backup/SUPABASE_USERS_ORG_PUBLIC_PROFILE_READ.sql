-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Lets any signed-in user SELECT rows in public.users where is_organization = true
-- (avatar_url, bio, full_name, username) for org profile views / Search → profile.
-- Student rows stay private: only "Users select own row" matches id = auth.uid().
-- =============================================================================

DROP POLICY IF EXISTS "Users select organization public profile" ON public.users;
CREATE POLICY "Users select organization public profile"
ON public.users
FOR SELECT
TO authenticated
USING (COALESCE(is_organization, false) = true);
