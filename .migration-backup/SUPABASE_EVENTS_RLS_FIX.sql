-- Fix RLS Policies for Events Table
-- Run this in your Supabase SQL Editor
--
-- DEPRECATED for recursion safety: policies below use SELECT FROM users, which
-- re-enters public.users RLS and can loop with policies that JOIN events.
-- Use SUPABASE_FIX_RLS_RECURSION_EVENTS_AND_USERS.sql instead.

-- ============================================
-- EVENTS TABLE RLS POLICIES
-- ============================================

-- 1. Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view events from their university" ON events;
DROP POLICY IF EXISTS "Organizations can create events" ON events;
DROP POLICY IF EXISTS "Organizations can update their own events" ON events;
DROP POLICY IF EXISTS "Organizations can delete their own events" ON events;

-- 3. Allow users to view events from their university
CREATE POLICY "Users can view events from their university"
ON events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.university = events.university
  )
);

-- 4. Allow organizations to create events
CREATE POLICY "Organizations can create events"
ON events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_organization = true
  )
);

-- 5. Allow organizations to update their own events
CREATE POLICY "Organizations can update their own events"
ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_organization = true
    AND events.created_by = auth.uid()
  )
);

-- 6. Allow organizations to delete their own events
CREATE POLICY "Organizations can delete their own events"
ON events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_organization = true
    AND events.created_by = auth.uid()
  )
);

-- 7. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'events';



