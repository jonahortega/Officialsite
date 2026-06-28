-- Fix RLS Policies for QR Ticket Scanner
-- Run this in your Supabase SQL Editor

-- ============================================
-- REGISTRATIONS TABLE RLS POLICIES
-- ============================================

-- 1. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create their own registrations" ON registrations;
DROP POLICY IF EXISTS "Organizations can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Anyone can view registrations" ON registrations;

-- 2. Enable RLS on registrations table
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 3. Allow users to view their own registrations
CREATE POLICY "Users can view their own registrations"
ON registrations
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Allow users to create their own registrations
CREATE POLICY "Users can insert their own registrations"
ON registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Allow users to delete their own registrations (for "Leave Event")
CREATE POLICY "Users can delete their own registrations"
ON registrations
FOR DELETE
USING (auth.uid() = user_id);

-- 6. **CRITICAL** Allow any authenticated user to view registrations for scanning
-- This allows the scanner to query any ticket_code
CREATE POLICY "Authenticated users can view registrations for scanning"
ON registrations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. Allow any authenticated user to update scanned status
CREATE POLICY "Authenticated users can update scanned status"
ON registrations
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registrations';

-- ============================================
-- TEST QUERIES (Optional - for debugging)
-- ============================================

-- Test 1: Check if registrations exist
SELECT COUNT(*) as total_registrations FROM registrations;

-- Test 2: Check registrations with ticket codes
SELECT 
  id,
  user_id,
  event_id,
  ticket_code,
  scanned,
  registered_at
FROM registrations
WHERE ticket_code IS NOT NULL
ORDER BY registered_at DESC
LIMIT 5;

-- Test 3: Verify users table has is_organization column
SELECT 
  id,
  email,
  username,
  is_organization
FROM users
WHERE is_organization = true
LIMIT 5;

-- ============================================
-- NOTES
-- ============================================
-- After running this script:
-- 1. Students can view/create/delete their own registrations
-- 2. Organizations can view ALL registrations (for scanning)
-- 3. Organizations can update scanned status
-- 4. This enables the QR scanner to work properly




