-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Stores payout information for organizations (where to send their event revenue).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE UNIQUE,
  payout_method text NOT NULL DEFAULT 'bank',
  bank_routing_number text,
  bank_account_number text,
  venmo_handle text,
  paypal_email text,
  zelle_identifier text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_payouts_select_own" ON public.organization_payouts;
CREATE POLICY "org_payouts_select_own"
ON public.organization_payouts FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "org_payouts_insert_own" ON public.organization_payouts;
CREATE POLICY "org_payouts_insert_own"
ON public.organization_payouts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "org_payouts_update_own" ON public.organization_payouts;
CREATE POLICY "org_payouts_update_own"
ON public.organization_payouts FOR UPDATE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "org_payouts_delete_own" ON public.organization_payouts;
CREATE POLICY "org_payouts_delete_own"
ON public.organization_payouts FOR DELETE TO authenticated
USING (user_id = auth.uid());
