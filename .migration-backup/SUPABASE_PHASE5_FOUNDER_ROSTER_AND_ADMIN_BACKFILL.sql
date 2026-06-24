-- Phase 5: Founder roster + admin consistency
-- Run in Supabase SQL Editor in order: (1) backfill, (2) trigger function + trigger.
-- Safe to re-run: backfill only updates rows that match conditions; trigger uses IF NOT EXISTS pattern for name.

-- -----------------------------------------------------------------------------
-- 1) Backfill: set founder member row is_org_admin = true only when no OTHER admin exists.
--    Fixes drift where organizations.user_id appears in organization_members but is_org_admin is false.
-- -----------------------------------------------------------------------------
UPDATE public.organization_members m
SET is_org_admin = true
FROM public.organizations o
WHERE m.organization_id = o.id
  AND m.user_id = o.user_id
  AND COALESCE(m.is_org_admin, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m2
    WHERE m2.organization_id = m.organization_id
      AND m2.user_id <> m.user_id
      AND COALESCE(m2.is_org_admin, false) = true
  );

-- -----------------------------------------------------------------------------
-- 2) Block DELETE of the row that ties organizations.user_id to the roster.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_remove_organization_founder_member()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = OLD.organization_id
      AND o.user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the official organization account from the roster.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_members_prevent_founder_delete ON public.organization_members;

CREATE TRIGGER trg_org_members_prevent_founder_delete
  BEFORE DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_remove_organization_founder_member();
