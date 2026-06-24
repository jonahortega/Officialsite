-- =============================================================================
-- PHASE 1 — Organization members (foundation only)
-- Run in Supabase → SQL Editor after a fresh pg_dump backup.
--
-- What this does:
--   • Creates public.organization_members (who belongs to which org + flags).
--   • Backfills one row per existing org: founder = admin + scanner.
--   • Enables RLS with READ policies only (no INSERT from client yet).
--
-- What this does NOT do yet (Phase 2+ — avoids breaking events / QR / Stripe):
--   • Does NOT change events / registrations / organizations / payouts policies.
--   • Does NOT add invite/remove flows (those need RPC or policies + app).
--
-- Product flags (aligned with your spec):
--   • is_org_admin: exactly one true row per organization_id (partial unique index).
--   • can_scan_tickets: up to two extra scanners + admin always can scan in app/RLS later.
--   • All members (including admin) may post events once Phase 2 updates events RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  is_org_admin boolean NOT NULL DEFAULT false,
  can_scan_tickets boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
  ON public.organization_members (user_id);

CREATE INDEX IF NOT EXISTS organization_members_org_id_idx
  ON public.organization_members (organization_id);

-- Exactly one admin per org (Postgres partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_admin_per_org
  ON public.organization_members (organization_id)
  WHERE is_org_admin = true;

COMMENT ON TABLE public.organization_members IS
  'Chapter membership: admin (single), optional scanners; drives future RLS for events/payouts/QR.';

COMMENT ON COLUMN public.organization_members.is_org_admin IS
  'Only one true per organization_id; can invite/remove, payout, org profile, scan (always).';

COMMENT ON COLUMN public.organization_members.can_scan_tickets IS
  'Up to two non-admin scanners in app logic; admin always has scan without needing this true.';

-- -----------------------------------------------------------------------------
-- 2) SECURITY DEFINER helpers (avoid RLS recursion when policies reference members)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.is_org_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_org_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Backfill: each organizations.user_id becomes sole admin + scanner row
-- -----------------------------------------------------------------------------
INSERT INTO public.organization_members (organization_id, user_id, is_org_admin, can_scan_tickets)
SELECT o.id, o.user_id, true, true
FROM public.organizations o
WHERE o.user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  is_org_admin = EXCLUDED.is_org_admin,
  can_scan_tickets = EXCLUDED.can_scan_tickets,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 4) RLS — read only; founders see their row; admins see full roster for their org
-- -----------------------------------------------------------------------------
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_members_select_self" ON public.organization_members;
CREATE POLICY "organization_members_select_self"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "organization_members_select_if_org_admin" ON public.organization_members;
CREATE POLICY "organization_members_select_if_org_admin"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.user_is_org_admin(organization_id));

-- No INSERT/UPDATE/DELETE for authenticated yet → nothing in the app can misuse the table
-- until we add RPCs or tight policies in Phase 2.

-- -----------------------------------------------------------------------------
-- 5) Optional sanity check (run manually; comment out if noisy)
-- -----------------------------------------------------------------------------
-- SELECT o.id, o.name, o.user_id, m.is_org_admin, m.can_scan_tickets
-- FROM public.organizations o
-- LEFT JOIN public.organization_members m ON m.organization_id = o.id AND m.user_id = o.user_id
-- ORDER BY o.created_at;
