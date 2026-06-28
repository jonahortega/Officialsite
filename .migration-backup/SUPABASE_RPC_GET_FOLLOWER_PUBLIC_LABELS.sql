-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Lets the bell + followers list load real names/handles/avatars for accounts
-- that follow YOU, even when RLS hides their public.users row from direct SELECT.
-- Only returns rows where user_follows.follower_id = u.id AND following_id = auth.uid().
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_follower_public_labels(p_follower_ids uuid[])
RETURNS TABLE (
  follower_id uuid,
  display_name text,
  profile_handle text,
  avatar_url text,
  is_org boolean,
  university text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.id AS follower_id,
    COALESCE(
      NULLIF(trim(o.name), ''),
      NULLIF(trim(u.full_name), ''),
      NULLIF(replace(trim(u.username), '@', ''), ''),
      NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
      'Someone'
    ) AS display_name,
    COALESCE(
      NULLIF(replace(trim(o.username), '@', ''), ''),
      NULLIF(replace(trim(u.username), '@', ''), ''),
      ''
    ) AS profile_handle,
    NULLIF(trim(u.avatar_url), '') AS avatar_url,
    (COALESCE(u.is_organization, false) OR o.user_id IS NOT NULL) AS is_org,
    COALESCE(NULLIF(trim(o.university), ''), NULLIF(trim(u.university), ''), '') AS university
  FROM public.users u
  LEFT JOIN public.organizations o ON o.user_id = u.id
  WHERE u.id = ANY(p_follower_ids)
    AND EXISTS (
      SELECT 1
      FROM public.user_follows f
      WHERE f.follower_id = u.id
        AND f.following_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_follower_public_labels(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_follower_public_labels(uuid[]) TO authenticated;
