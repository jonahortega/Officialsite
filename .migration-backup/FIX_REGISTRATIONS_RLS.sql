-- FIX REGISTRATIONS RLS POLICIES
-- This will allow students to create their own registrations when joining events
-- Run this in your Supabase SQL Editor

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can delete own registrations" ON registrations;
DROP POLICY IF EXISTS "Organizations can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Organizations can view all registrations for scanning" ON registrations;
DROP POLICY IF EXISTS "Organizations can update scanned status" ON registrations;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY 1: Users can SELECT their own registrations
-- ============================================
CREATE POLICY "Users can view their own registrations"
ON registrations
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- POLICY 2: Users can INSERT their own registrations
-- THIS IS THE CRITICAL ONE FOR JOINING EVENTS!
-- ============================================
CREATE POLICY "Users can create their own registrations"
ON registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLICY 3: Users can DELETE their own registrations (leave event)
-- ============================================
CREATE POLICY "Users can delete their own registrations"
ON registrations
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLICY 4: Organizations can only SELECT registrations for events they host
-- ============================================
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

-- ============================================
-- POLICY 5: Organizations can only UPDATE scanned status for events they host
-- ============================================
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

-- ============================================
-- VERIFY POLICIES WERE CREATED
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registrations'
ORDER BY policyname;

-- ============================================
-- TEST: Check if current user can insert
-- ============================================
-- You should see results for this query after running
SELECT 
  auth.uid() as current_user_id,
  email,
  is_organization
FROM users
WHERE id = auth.uid();

SELECT 'RLS policies updated successfully!' as status;







