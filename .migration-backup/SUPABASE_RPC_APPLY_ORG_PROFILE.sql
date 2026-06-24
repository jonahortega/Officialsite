-- =============================================================================
-- RUN THIS ENTIRE FILE IN: Supabase → SQL Editor → Run
-- Fixes: RPC used to read ONLY auth.users; on many projects that SELECT fails or
-- returns nothing inside SECURITY DEFINER. Now we merge JWT claims + auth.users.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_organization_signup_from_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  row_meta jsonb;
  meta jsonb;
  v_is_org boolean;
  uid uuid;
  v_org_name text;
  v_username text;
  v_univ text;
  au_email text;
  db_email text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN;
  END IF;

  au_email := '';
  meta := '{}'::jsonb;

  -- 1) Metadata from the JWT PostgREST sends with the RPC (most reliable for “what app sent at signup”)
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
    IF claims IS NOT NULL THEN
      au_email := COALESCE(claims->>'email', '');
      meta :=
        COALESCE(claims->'app_metadata', '{}'::jsonb)
        || COALESCE(claims->'user_metadata', '{}'::jsonb);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      meta := '{}'::jsonb;
  END;

  -- 2) Merge in auth.users row when readable (full copy of server-side metadata)
  BEGIN
    SELECT
      COALESCE(u.raw_app_meta_data, '{}'::jsonb) || COALESCE(u.raw_user_meta_data, '{}'::jsonb),
      u.email
    INTO row_meta, db_email
    FROM auth.users AS u
    WHERE u.id = uid;

    IF FOUND AND row_meta IS NOT NULL THEN
      meta := row_meta || meta;
      au_email := COALESCE(NULLIF(trim(au_email), ''), db_email);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  IF au_email IS NULL OR trim(au_email) = '' THEN
    au_email := '';
  END IF;

  v_is_org :=
    (meta @> '{"org_signup": true}'::jsonb)
    OR lower(trim(COALESCE(meta->>'org_signup', ''))) IN ('true', 't', '1', 'yes')
    OR lower(trim(COALESCE(meta->>'account_type', ''))) IN ('organization', 'org')
    OR (meta @> '{"is_organization": true}'::jsonb)
    OR lower(trim(COALESCE(meta->>'is_organization', ''))) IN ('true', 't', '1', 'yes')
    OR (length(trim(COALESCE(meta->>'organization_name', ''))) > 0);

  IF NOT v_is_org THEN
    RETURN;
  END IF;

  v_univ := COALESCE(NULLIF(trim(meta->>'university'), ''), 'Rutgers University');
  v_username := COALESCE(
    NULLIF(trim(meta->>'username'), ''),
    split_part(COALESCE(NULLIF(au_email, ''), 'user@local'), '@', 1)
  );
  v_org_name := COALESCE(
    NULLIF(trim(meta->>'organization_name'), ''),
    NULLIF(trim(meta->>'full_name'), ''),
    split_part(COALESCE(NULLIF(au_email, ''), 'user@local'), '@', 1)
  );

  -- Separate blocks: if organizations insert fails (missing UNIQUE, email conflict, etc.),
  -- public.users still keeps is_organization = true — matches handle_auth_user_to_public_users.
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
      uid,
      COALESCE(au_email, ''),
      v_username,
      COALESCE(NULLIF(trim(meta->>'full_name'), ''), v_org_name),
      v_univ,
      true,
      NULL,
      NULL
    )
    -- Prefer existing public.users row when the user has already saved profile in the app.
    -- JWT metadata is often stale until the next token refresh; unconditional EXCLUDED.* was
    -- reverting organization name, handle, and bio on every login / TOKEN_REFRESHED.
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.users.email),
      username = COALESCE(
        NULLIF(trim(public.users.username), ''),
        NULLIF(EXCLUDED.username, ''),
        public.users.username
      ),
      full_name = COALESCE(
        NULLIF(trim(public.users.full_name), ''),
        NULLIF(EXCLUDED.full_name, ''),
        public.users.full_name
      ),
      university = COALESCE(NULLIF(EXCLUDED.university, ''), public.users.university),
      is_organization = true,
      bio = COALESCE(
        NULLIF(trim(public.users.bio), ''),
        NULLIF(EXCLUDED.bio, ''),
        public.users.bio
      );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'apply_organization_signup_from_auth: public.users - %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.organizations (user_id, name, username, email, university, type)
    VALUES (uid, v_org_name, v_username, COALESCE(au_email, ''), v_univ, 'Organization')
    ON CONFLICT (user_id) DO UPDATE SET
      name = COALESCE(
        NULLIF(trim(public.organizations.name), ''),
        EXCLUDED.name
      ),
      username = COALESCE(
        NULLIF(trim(public.organizations.username), ''),
        NULLIF(EXCLUDED.username, ''),
        public.organizations.username
      ),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.organizations.email),
      university = EXCLUDED.university,
      type = EXCLUDED.type;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'apply_organization_signup_from_auth: public.organizations - %', SQLERRM;
  END;
END;
$$;

-- Optional: after you log in, run from SQL Editor to see what the DB + JWT see (debug only)
CREATE OR REPLACE FUNCTION public.debug_org_detection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  jwt_meta jsonb;
  row_meta jsonb;
  merged jsonb;
  uid uuid;
  v_is_org boolean;
BEGIN
  uid := auth.uid();
  jwt_meta := '{}'::jsonb;
  row_meta := '{}'::jsonb;

  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
    jwt_meta :=
      COALESCE(claims->'app_metadata', '{}'::jsonb)
      || COALESCE(claims->'user_metadata', '{}'::jsonb);
  EXCEPTION
    WHEN OTHERS THEN
      jwt_meta := jsonb_build_object('jwt_error', SQLERRM);
  END;

  BEGIN
    SELECT COALESCE(u.raw_app_meta_data, '{}'::jsonb) || COALESCE(u.raw_user_meta_data, '{}'::jsonb)
    INTO row_meta
    FROM auth.users AS u
    WHERE u.id = uid;
    IF NOT FOUND THEN
      row_meta := jsonb_build_object('auth_users', 'not_found_or_no_access');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      row_meta := jsonb_build_object('auth_users_error', SQLERRM);
  END;

  merged := COALESCE(row_meta, '{}'::jsonb) || COALESCE(jwt_meta, '{}'::jsonb);

  v_is_org :=
    (merged @> '{"org_signup": true}'::jsonb)
    OR lower(trim(COALESCE(merged->>'org_signup', ''))) IN ('true', 't', '1', 'yes')
    OR lower(trim(COALESCE(merged->>'account_type', ''))) IN ('organization', 'org')
    OR (merged @> '{"is_organization": true}'::jsonb)
    OR (length(trim(COALESCE(merged->>'organization_name', ''))) > 0);

  RETURN jsonb_build_object(
    'uid', uid,
    'jwt_meta', jwt_meta,
    'auth_users_meta', row_meta,
    'merged_meta', merged,
    'would_detect_org', v_is_org
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_organization_signup_from_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_organization_signup_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_organization_signup_from_auth() TO service_role;

REVOKE ALL ON FUNCTION public.debug_org_detection() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debug_org_detection() TO authenticated;
