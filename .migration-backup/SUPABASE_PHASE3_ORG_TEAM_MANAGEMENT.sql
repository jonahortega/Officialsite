-- =============================================================================
-- PHASE 3 — Org admins manage members; scanner cap; org profile update by admin
-- Run in Supabase → SQL Editor after Phase 2. Backup first.
--
-- Adds:
--   • INSERT/UPDATE/DELETE policies on public.organization_members (admins only).
--   • Triggers: max 2 non-admin scanners; cannot remove/demote last admin.
--   • organizations UPDATE: founder OR org admin (via user_is_org_admin(id)).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Triggers
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

  IF TG_OP = 'UPDATE' AND OLD.is_org_admin = true AND NEW.is_org_admin = false THEN
    SELECT COUNT(*)::int INTO other_admins
    FROM public.organization_members
    WHERE organization_id = NEW.organization_id
      AND is_org_admin = true
      AND user_id IS DISTINCT FROM NEW.user_id;
    IF other_admins = 0 THEN
      RAISE EXCEPTION 'Cannot demote the last organization admin';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS organization_members_prevent_last_admin_removal_trg
  ON public.organization_members;
CREATE TRIGGER organization_members_prevent_last_admin_removal_trg
BEFORE DELETE OR UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.organization_members_prevent_last_admin_removal();

CREATE OR REPLACE FUNCTION public.organization_members_scanner_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE cnt int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.can_scan_tickets = true AND NEW.is_org_admin = false THEN
      SELECT COUNT(*)::int INTO cnt
      FROM public.organization_members
      WHERE organization_id = NEW.organization_id
        AND can_scan_tickets = true
        AND is_org_admin = false;
      IF cnt >= 2 THEN
        RAISE EXCEPTION 'At most two non-admin ticket scanners per organization';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.can_scan_tickets = true
       AND NEW.is_org_admin = false
       AND (OLD.can_scan_tickets = false OR OLD.is_org_admin = true) THEN
      SELECT COUNT(*)::int INTO cnt
      FROM public.organization_members
      WHERE organization_id = NEW.organization_id
        AND can_scan_tickets = true
        AND is_org_admin = false
        AND user_id IS DISTINCT FROM NEW.user_id;
      IF cnt >= 2 THEN
        RAISE EXCEPTION 'At most two non-admin ticket scanners per organization';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_scanner_limit_trg ON public.organization_members;
CREATE TRIGGER organization_members_scanner_limit_trg
BEFORE INSERT OR UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.organization_members_scanner_limit();

-- -----------------------------------------------------------------------------
-- 2) organization_members — admin can mutate roster
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "organization_members_insert_admin" ON public.organization_members;
CREATE POLICY "organization_members_insert_admin"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_members_update_admin" ON public.organization_members;
CREATE POLICY "organization_members_update_admin"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (public.user_is_org_admin(organization_id))
WITH CHECK (public.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_members_delete_admin" ON public.organization_members;
CREATE POLICY "organization_members_delete_admin"
ON public.organization_members
FOR DELETE
TO authenticated
USING (public.user_is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- 3) organizations — admins (not only founder user_id) may update chapter row
-- -----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations' AND cmd = 'UPDATE'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Organizations update founder or org admin"
ON public.organizations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.user_is_org_admin(id))
WITH CHECK (auth.uid() = user_id OR public.user_is_org_admin(id));

COMMIT;
