-- =============================================================================
-- Run in Supabase → SQL Editor if follower names/avatars stay "Someone" / @user
-- Lets any account read public.users rows for users who follow THEM (followee reads follower).
-- Complements mutual-follow policy; safe to re-run.
-- =============================================================================

DROP POLICY IF EXISTS "Users select profiles of their followers" ON public.users;
CREATE POLICY "Users select profiles of their followers"
ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_follows f
    WHERE f.follower_id = users.id
      AND f.following_id = auth.uid()
  )
);
