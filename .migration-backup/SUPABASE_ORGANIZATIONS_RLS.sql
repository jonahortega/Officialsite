-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Lets each logged-in org account INSERT/UPDATE/SELECT their own organizations row.
-- Without this, the app’s client upsert to public.organizations often fails under RLS
-- while public.users succeeds — Table Editor shows users but not organizations.
-- =============================================================================

-- Required for ON CONFLICT (user_id) in triggers / RPC (no-op if constraint already exists)
DO $$
BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_user_id_key UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizations insert own row" ON public.organizations;
CREATE POLICY "Organizations insert own row"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizations update own row" ON public.organizations;
CREATE POLICY "Organizations update own row"
ON public.organizations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizations select own row" ON public.organizations;
CREATE POLICY "Organizations select own row"
ON public.organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Directory: any signed-in user can read organization rows (e.g. Search by university).
-- OR-combined with "select own row"; required because the own-row policy alone hides other orgs.
DROP POLICY IF EXISTS "Organizations select directory authenticated" ON public.organizations;
CREATE POLICY "Organizations select directory authenticated"
ON public.organizations
FOR SELECT
TO authenticated
USING (true);
