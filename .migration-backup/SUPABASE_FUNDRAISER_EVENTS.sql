-- Fundraiser events: variable donations via Stripe; no ticket rows in `registrations`.
-- Run in Supabase SQL Editor after reviewing.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_fundraiser boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.is_fundraiser IS
  'When true, checkout uses donation flow (variable amount, no registration/ticket).';

CREATE TABLE IF NOT EXISTS public.fundraiser_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_list_cents integer NOT NULL CHECK (amount_list_cents >= 50),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fundraiser_contributions_event_id_idx
  ON public.fundraiser_contributions (event_id);

COMMENT ON TABLE public.fundraiser_contributions IS
  'Completed Stripe donations for is_fundraiser events (webhook inserts; no tickets).';

ALTER TABLE public.fundraiser_contributions ENABLE ROW LEVEL SECURITY;

-- Donors see their own contributions
CREATE POLICY "fundraiser_contributions_select_own"
  ON public.fundraiser_contributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Event creator can read contributions for their events
CREATE POLICY "fundraiser_contributions_select_host"
  ON public.fundraiser_contributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = fundraiser_contributions.event_id
        AND e.created_by = auth.uid()
    )
  );

-- Inserts only via service role (Stripe webhook), not from PostgREST clients
