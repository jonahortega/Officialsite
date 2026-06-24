-- =============================================================================
-- SIMPLE FIX — "Why don't my events show in the app after refresh?"
--
-- In Supabase, "RLS" (row level security) is like a bouncer: it can block the
-- app from READING rows even when you see them in the Table Editor.
--
-- This adds ONE rule: if someone is logged in, they may read every row in
-- public.events. Your app only talks to the database as "logged in", so
-- events and tickets can load after refresh.
--
-- Run once: Supabase Dashboard → SQL Editor → paste → Run
-- =============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Logged in users can read all events" ON public.events;

CREATE POLICY "Logged in users can read all events"
ON public.events
FOR SELECT
TO authenticated
USING (true);
