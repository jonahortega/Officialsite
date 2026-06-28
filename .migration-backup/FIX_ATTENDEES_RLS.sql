-- Fix RLS policies to allow organizations to view attendees with user details
-- This allows the "View Attendees" feature to work properly

-- IMPORTANT: Do NOT use EXISTS (SELECT ... FROM users ...) inside a policy ON users —
-- PostgreSQL raises "infinite recursion" on public.users. Use SUPABASE_FIX_USERS_RLS_INFINITE_RECURSION.sql instead.
DROP POLICY IF EXISTS "Organizations can view user profiles" ON users;

-- Verify the registrations SELECT policy exists for organizations
-- (This should already exist from previous SQL, but let's make sure)
DROP POLICY IF EXISTS "Organizations can view all registrations for scanning" ON registrations;

CREATE POLICY "Organizations can view all registrations for scanning"
ON registrations
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
  )
);

-- Test the query to make sure it works
SELECT 
  r.id,
  r.user_id,
  r.registered_at,
  r.scanned,
  r.scanned_at,
  r.payment_status,
  u.id as user_id_check,
  u.username,
  u.full_name,
  u.email
FROM registrations r
LEFT JOIN users u ON u.id = r.user_id
LIMIT 5;








