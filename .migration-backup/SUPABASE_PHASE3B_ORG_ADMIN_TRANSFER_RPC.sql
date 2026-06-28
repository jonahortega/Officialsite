-- =============================================================================
-- PHASE 3B — Reliable admin handoff (run after Phase 3 in Supabase SQL Editor)
--
-- Problem: Client did UPDATE self is_org_admin=false then UPDATE member true.
--   • RLS: after the first UPDATE you are no longer admin → second UPDATE denied.
--   • Trigger: demoting the sole admin fires "Cannot demote the last organization admin".
--
-- Fix:
--   1) SECURITY DEFINER RPC performs both updates in one transaction (bypasses RLS).
--   2) BEFORE trigger only guards DELETE of last admin (not UPDATE demotion).
--   3) DEFERRABLE constraint trigger ensures each org still has exactly one admin at commit.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Soften BEFORE trigger: keep DELETE protection; allow admin demotion in RPC txn
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.organization_members_prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE other_admins int;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_org_admin = true THEN
    SELECT COUNT(*)::int INTO other_admins
    FROM public.organization_members
    WHERE organization_id = OLD.organization_id
      AND is_org_admin = true
      AND user_id IS DISTINCT FROM OLD.user_id;
    IF other_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last organization admin';
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Deferred invariant: exactly one admin row per organization_id at commit
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.organization_members_assert_one_admin_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.organization_members
    GROUP BY organization_id
    HAVING COUNT(*) FILTER (WHERE is_org_admin IS TRUE) <> 1
  ) THEN
    RAISE EXCEPTION 'Each organization must have exactly one admin';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_assert_one_admin_trg ON public.organization_members;
CREATE CONSTRAINT TRIGGER organization_members_assert_one_admin_trg
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.organization_members_assert_one_admin_fn();

-- -----------------------------------------------------------------------------
-- 3) RPC: current admin only; new admin must already be a member row
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_organization_admin(
  p_organization_id uuid,
  p_new_admin_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current uuid;
BEGIN
  v_current := auth.uid();
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_current
      AND is_org_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'only the chapter admin can transfer admin';
  END IF;

  IF p_new_admin_user_id IS NOT DISTINCT FROM v_current THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_new_admin_user_id
  ) THEN
    RAISE EXCEPTION 'new admin must already be a member';
  END IF;

  UPDATE public.organization_members
  SET is_org_admin = false
  WHERE organization_id = p_organization_id
    AND user_id = v_current;

  UPDATE public.organization_members
  SET is_org_admin = true
  WHERE organization_id = p_organization_id
    AND user_id = p_new_admin_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_organization_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_organization_admin(uuid, uuid) TO authenticated;

COMMIT;
