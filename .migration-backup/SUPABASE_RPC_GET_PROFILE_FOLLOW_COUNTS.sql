-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
--
-- Why: RLS on public.user_follows usually allows SELECT only when
--   follower_id = auth.uid() OR following_id = auth.uid()
-- so counting another user's followers/following from the app returns wrong
-- numbers (often 0). This RPC returns only two integers — no follow graph rows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_follow_counts(p_profile_user_id uuid)
RETURNS TABLE (followers bigint, following bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*)::bigint FROM public.user_follows WHERE following_id = p_profile_user_id),
    (SELECT COUNT(*)::bigint FROM public.user_follows WHERE follower_id = p_profile_user_id);
$$;

REVOKE ALL ON FUNCTION public.get_profile_follow_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_counts(uuid) TO authenticated;
-- Uncomment if you need counts on public (logged-out) profile pages:
-- GRANT EXECUTE ON FUNCTION public.get_profile_follow_counts(uuid) TO anon;
