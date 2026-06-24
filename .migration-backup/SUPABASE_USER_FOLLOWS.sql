-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- User/org follows + notifications source for home bell.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows (follower_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select_own" ON public.user_follows;
CREATE POLICY "user_follows_select_own"
ON public.user_follows FOR SELECT TO authenticated
USING (follower_id = auth.uid() OR following_id = auth.uid());

DROP POLICY IF EXISTS "user_follows_insert_self" ON public.user_follows;
CREATE POLICY "user_follows_insert_self"
ON public.user_follows FOR INSERT TO authenticated
WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "user_follows_delete_self" ON public.user_follows;
CREATE POLICY "user_follows_delete_self"
ON public.user_follows FOR DELETE TO authenticated
USING (follower_id = auth.uid());

-- So notification bell can load name/avatar of someone who followed you (or you follow).
DROP POLICY IF EXISTS "Users select mutual follow profiles" ON public.users;
CREATE POLICY "Users select mutual follow profiles"
ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_follows f
    WHERE (f.follower_id = users.id AND f.following_id = auth.uid())
       OR (f.following_id = users.id AND f.follower_id = auth.uid())
  )
);

-- Event hosts: registrant profiles for notifications. Do NOT inline JOIN events here —
-- that + events policies that SELECT FROM users causes infinite RLS recursion.
-- Requires public.user_is_registrant_for_my_event (see SUPABASE_RLS_FULL_FIX_COPY_PASTE.sql).
DROP POLICY IF EXISTS "Users select for event host registrants" ON public.users;
CREATE POLICY "Users select for event host registrants"
ON public.users FOR SELECT TO authenticated
USING (public.user_is_registrant_for_my_event(users.id));

-- Followee (org or user) can read follower rows — fixes "Someone / @user" in followers list.
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
