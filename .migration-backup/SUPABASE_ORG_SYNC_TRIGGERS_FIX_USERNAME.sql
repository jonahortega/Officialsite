-- =============================================================================
-- If you added sync triggers that INSERT into public.organizations without
-- `username` and your table has NOT NULL username, run this to fix the function.
-- Safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_org_row_from_user_org_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  IF coalesce(new.is_organization, false) = true THEN
    v_username := coalesce(
      nullif(trim(new.username), ''),
      regexp_replace(
        lower(split_part(coalesce(new.email, 'user@local'), '@', 1)),
        '[^a-z0-9]+',
        '_',
        'g'
      )
    );

    INSERT INTO public.organizations (user_id, name, username, email, university, type)
    VALUES (
      new.id,
      coalesce(nullif(trim(new.full_name), ''), split_part(coalesce(new.email, 'org@local'), '@', 1)),
      v_username,
      coalesce(new.email, ''),
      coalesce(nullif(trim(new.university), ''), 'Rutgers University'),
      'Organization'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = excluded.name,
      username = coalesce(nullif(excluded.username, ''), public.organizations.username),
      email = coalesce(nullif(excluded.email, ''), public.organizations.email),
      university = excluded.university,
      type = excluded.type;
  END IF;
  RETURN new;
END;
$$;
