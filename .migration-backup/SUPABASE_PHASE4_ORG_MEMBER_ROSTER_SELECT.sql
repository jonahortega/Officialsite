-- =============================================================================
-- PHASE 4 — Members can read full chapter roster (SELECT only)
-- Run in Supabase SQL Editor after Phase 1–3B. Backup first.
--
-- Today: members only see their own organization_members row; admins see all.
-- This adds: any authenticated member of an org may SELECT every row for that org
-- (so Settings can show admin / scanners to non-admins). INSERT/UPDATE/DELETE
-- unchanged (Phase 3 admin-only).
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "organization_members_select_if_org_member" ON public.organization_members;

CREATE POLICY "organization_members_select_if_org_member"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

COMMIT;
