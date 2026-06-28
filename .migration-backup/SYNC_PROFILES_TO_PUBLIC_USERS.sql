-- =============================================================================
-- Optional: copy Auth users from `profiles` (Supabase template) into `users`
-- =============================================================================
-- Your app upserts to public.users on signup. If RLS blocks that insert, you may
-- only see rows in `profiles` (from a trigger). Org policies and attendee UIs
-- that join `registrations` → `users` then miss display data.
--
-- 1) In Supabase → Table Editor, open `profiles` and note column names.
-- 2) Adjust the SELECT below to match YOUR profiles columns.
-- 3) Run in SQL Editor (safe to re-run if you use ON CONFLICT).
--
-- Typical starter `profiles` columns: id, updated_at, username, full_name, avatar_url, website

INSERT INTO public.users (id, email, username, full_name, university, is_organization, bio, avatar_url)
SELECT
  p.id,
  au.email,
  COALESCE(NULLIF(trim(p.username), ''), split_part(au.email, '@', 1)),
  COALESCE(NULLIF(trim(p.full_name), ''), split_part(au.email, '@', 1)),
  'Rutgers University',
  false,
  NULL,
  p.avatar_url
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

-- If `profiles` does not exist, skip this file and fix RLS on `public.users` instead
-- so signup upserts succeed (Authentication policies for INSERT on users).
