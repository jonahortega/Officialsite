-- Run in Supabase → SQL Editor (safe to re-run)
-- Fixes: Settings sync error "Could not find the 'avatar_url' column of 'users'"

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text;
