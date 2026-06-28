-- =============================================================================
-- One-off fix: org account has public.users row but is_organization = false
-- and NO public.organizations row → no host / create-event / scan powers.
-- UUID: 6fe35e6d-4294-4e63-8a2f-5bcfa483ccea (AI Club / al15564@aup.edu)
-- Run in Supabase → SQL Editor as postgres (or role that can write both tables).
-- Safe to re-run: upsert + idempotent update.
-- =============================================================================

BEGIN;

UPDATE public.users
SET is_organization = true
WHERE id = '6fe35e6d-4294-4e63-8a2f-5bcfa483ccea'::uuid;

INSERT INTO public.organizations (user_id, name, username, email, university, type)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.full_name), ''), 'Organization'),
  COALESCE(NULLIF(trim(u.username), ''), split_part(lower(u.email), '@', 1)),
  lower(trim(u.email)),
  COALESCE(NULLIF(trim(u.university), ''), 'Rutgers University'),
  'Organization'
FROM public.users u
WHERE u.id = '6fe35e6d-4294-4e63-8a2f-5bcfa483ccea'::uuid
ON CONFLICT (user_id) DO UPDATE SET
  name = COALESCE(NULLIF(trim(EXCLUDED.name), ''), public.organizations.name),
  username = COALESCE(
    NULLIF(trim(EXCLUDED.username), ''),
    NULLIF(trim(public.organizations.username), ''),
    public.organizations.username
  ),
  email = COALESCE(NULLIF(lower(trim(EXCLUDED.email)), ''), public.organizations.email),
  university = COALESCE(NULLIF(trim(EXCLUDED.university), ''), public.organizations.university),
  type = COALESCE(EXCLUDED.type, public.organizations.type);

COMMIT;

-- Verify (optional — run after the block above)
-- SELECT id, email, username, full_name, university, is_organization FROM public.users WHERE id = '6fe35e6d-4294-4e63-8a2f-5bcfa483ccea';
-- SELECT * FROM public.organizations WHERE user_id = '6fe35e6d-4294-4e63-8a2f-5bcfa483ccea';
