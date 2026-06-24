-- QR Scanner host-only RLS fix (safe to re-run)
-- Run in Supabase SQL Editor.

DROP POLICY IF EXISTS "Organizations can view all registrations for scanning" ON registrations;
DROP POLICY IF EXISTS "Organizations can update scanned status" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can view registrations for scanning" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can update scanned status" ON registrations;

CREATE POLICY "Organizations can view all registrations for scanning"
ON registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.events e ON e.id = registrations.event_id
    WHERE u.id = auth.uid()
      AND u.is_organization = true
      AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Organizations can update scanned status"
ON registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.events e ON e.id = registrations.event_id
    WHERE u.id = auth.uid()
      AND u.is_organization = true
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.events e ON e.id = registrations.event_id
    WHERE u.id = auth.uid()
      AND u.is_organization = true
      AND e.created_by = auth.uid()
  )
);

SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'registrations'
ORDER BY policyname, cmd;
