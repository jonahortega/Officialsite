-- Allow event hosts to SELECT their own events (needed for QR check-in / validation).
-- Without this, RLS can block reads when `users.university` ≠ `events.university`
-- (e.g. org profile default vs event campus), and the scanner gets no event row.
--
-- Run in Supabase SQL Editor once. Safe to re-run.

DROP POLICY IF EXISTS "Hosts can select events they created" ON public.events;

CREATE POLICY "Hosts can select events they created"
ON public.events
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Optional: let authenticated users read events they have a registration for (attendee ticket UIs).
-- Uncomment if you need it.
-- DROP POLICY IF EXISTS "Users can select events they registered for" ON public.events;
-- CREATE POLICY "Users can select events they registered for"
-- ON public.events FOR SELECT TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.registrations r
--     WHERE r.event_id = events.id AND r.user_id = auth.uid()
--   )
-- );
