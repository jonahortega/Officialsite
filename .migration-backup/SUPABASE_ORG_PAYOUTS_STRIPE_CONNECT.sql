-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run)
-- Requires: public.organization_payouts from SUPABASE_ORG_PAYOUTS.sql first.
-- Adds Stripe Connect columns for Express onboarding + split payouts.
-- =============================================================================

ALTER TABLE public.organization_payouts
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;
