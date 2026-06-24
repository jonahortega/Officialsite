-- Optional: if hosts see "Ticket Not Found" while the registration row exists in the table,
-- the SELECT policy may require public.users.is_organization = true (see FIX_REGISTRATIONS_RLS.sql).
-- These policies allow any authenticated user who created the event (events.created_by = auth.uid())
-- to read and update registrations for that event — no join to public.users required.

DROP POLICY IF EXISTS "Hosts can select registrations for their events" ON public.registrations;
CREATE POLICY "Hosts can select registrations for their events"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Hosts can update registrations for their events" ON public.registrations;
CREATE POLICY "Hosts can update registrations for their events"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.created_by = auth.uid()
  )
);
