-- =============================================================================
-- New signups → public.users (not only profiles)
-- =============================================================================
-- Your React app already calls supabase.from('users').upsert(...) after signUp.
-- If RLS blocks INSERT/UPDATE, the row never appears in `users` while a default
-- Supabase trigger may still insert into `profiles`.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run once (safe to re-run).
-- Adjust column names if your public.users table differs.
-- =============================================================================

-- 1) RLS: let each authenticated user create/update ONLY their own row (id = auth.uid())
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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

-- SELECT: you may already have "Organizations can view user profiles" + own row.
-- Add explicit self-read if something removed it:
DROP POLICY IF EXISTS "Users select own row" ON public.users;
CREATE POLICY "Users select own row"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- =============================================================================
-- 2) OPTIONAL but recommended: server-side row on every Auth signup (bypasses RLS)
-- =============================================================================
-- Fires when a row is inserted into auth.users. Uses SECURITY DEFINER so it
-- always writes public.users even if the client upsert fails or runs before session exists.
-- Reads metadata your app sets in signUp: full_name, username, university, is_organization.

CREATE OR REPLACE FUNCTION public.handle_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  v_is_org boolean;
  v_org_name text;
  v_username text;
  v_univ text;
  v_email text;
BEGIN
  -- Merge app + user metadata (user wins on duplicate keys). Signup data can live in either.
  meta := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_email := lower(trim(COALESCE(NEW.email, '')));
  v_univ := COALESCE(NULLIF(trim(meta->>'university'), ''), 'Rutgers University');
  v_username := COALESCE(
    NULLIF(trim(meta->>'username'), ''),
    split_part(COALESCE(NEW.email, 'user@local'), '@', 1)
  );
  v_org_name := COALESCE(
    NULLIF(trim(meta->>'organization_name'), ''),
    NULLIF(trim(meta->>'full_name'), ''),
    split_part(COALESCE(NEW.email, 'user@local'), '@', 1)
  );

  -- Org path: app sends account_type, org_signup, organization_name, is_organization.
  v_is_org :=
    (meta @> '{"org_signup": true}'::jsonb)
    OR lower(trim(COALESCE(meta->>'org_signup', ''))) IN ('true', 't', '1', 'yes')
    OR lower(trim(COALESCE(meta->>'account_type', ''))) IN ('organization', 'org')
    OR (meta @> '{"is_organization": true}'::jsonb)
    OR lower(trim(COALESCE(meta->>'is_organization', ''))) IN ('true', 't', '1', 'yes')
    OR (length(trim(COALESCE(meta->>'organization_name', ''))) > 0);

  -- Never fail Auth signup if public schema insert fails (wrong columns, RLS, etc.).
  -- Check Supabase Dashboard → Logs → Postgres for WARNING lines from this function.
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      username,
      full_name,
      university,
      is_organization,
      bio,
      avatar_url
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      v_username,
      COALESCE(NULLIF(trim(meta->>'full_name'), ''), v_org_name),
      v_univ,
      v_is_org,
      NULL,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.users.email),
      username = COALESCE(NULLIF(EXCLUDED.username, ''), public.users.username),
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
      university = COALESCE(NULLIF(EXCLUDED.university, ''), public.users.university),
      is_organization = (EXCLUDED.is_organization IS TRUE OR public.users.is_organization IS TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_auth_user_to_public_users: public.users - %', SQLERRM;
  END;

  IF v_is_org THEN
    BEGIN
      INSERT INTO public.organizations (user_id, name, username, email, university, type)
      VALUES (NEW.id, v_org_name, v_username, COALESCE(NEW.email, ''), v_univ, 'Organization')
      ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        username = COALESCE(NULLIF(EXCLUDED.username, ''), public.organizations.username),
        email = COALESCE(NULLIF(EXCLUDED.email, ''), public.organizations.email),
        university = EXCLUDED.university,
        type = EXCLUDED.type;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'handle_auth_user_to_public_users: public.organizations - %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers named zzz_* run AFTER default Supabase triggers (alphabetical order), so we
-- don't get overwritten with is_organization = false by another on_auth_user_created* hook.

DROP TRIGGER IF EXISTS on_auth_user_created_public_users ON auth.users;
DROP TRIGGER IF EXISTS zzz_sync_auth_user_to_public ON auth.users;
DROP TRIGGER IF EXISTS zzz_sync_auth_user_to_public_update ON auth.users;

CREATE TRIGGER zzz_sync_auth_user_to_public
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_to_public_users();

-- Re-sync when metadata or email confirmation changes (some projects only fill metadata later).
CREATE TRIGGER zzz_sync_auth_user_to_public_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
    OR OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
    OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
  )
  EXECUTE FUNCTION public.handle_auth_user_to_public_users();

-- =============================================================================
-- 3) Stop duplicate rows in `profiles` (optional – only if you use Supabase template)
-- =============================================================================
-- In Dashboard → Database → Triggers, find triggers on `auth.users` that call
-- something like handle_new_user → public.profiles. Note the trigger name, then:
--
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--
-- (Use the exact name from your project.) If you drop the only trigger, new
-- users will NOT get a profiles row — that is intentional if you rely on public.users only.
--
-- If you prefer to keep one trigger that does BOTH, merge the INSERT into profiles
-- and users inside one SECURITY DEFINER function (advanced).

-- =============================================================================
-- 4) organizations.user_id must be UNIQUE for ON CONFLICT (user_id) above
-- =============================================================================
-- If you see "there is no unique or exclusion constraint matching the ON CONFLICT",
-- run (adjust if you already have a differently named constraint):
--
--   ALTER TABLE public.organizations ADD CONSTRAINT organizations_user_id_key UNIQUE (user_id);

-- =============================================================================
-- 5) Verify
-- =============================================================================
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' ORDER BY cmd, policyname;
