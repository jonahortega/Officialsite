-- =============================================================================
-- Fix: student (or any) account PATCHes public.users with bio but Table Editor
-- still shows bio = NULL — usually missing columns, missing UPDATE RLS, or
-- revoked privileges. Safe to re-run in Supabase → SQL Editor.
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- INSERT: Settings uses upsert when no row exists yet (same id as auth.uid()).
DROP POLICY IF EXISTS "Users insert own row" ON public.users;
CREATE POLICY "Users insert own row"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users update own row" ON public.users;
CREATE POLICY "Users update own row"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Needed so PATCH ... RETURNING (used by the app after save) can read the row.
DROP POLICY IF EXISTS "Users select own row" ON public.users;
CREATE POLICY "Users select own row"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;

-- Verify policies (optional):
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'users'
-- ORDER BY cmd, policyname;
