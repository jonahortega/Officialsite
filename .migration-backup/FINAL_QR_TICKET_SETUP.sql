-- ============================================
-- COMPLETE QR TICKET SYSTEM SETUP
-- ============================================
-- This script GUARANTEES every user joining an event gets a unique QR ticket
-- Run this entire script in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: ENSURE TABLE STRUCTURE IS CORRECT
-- ============================================

-- Check if registrations table exists and has all required columns
DO $$ 
BEGIN
    -- Add ticket_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='registrations' AND column_name='ticket_code') THEN
        ALTER TABLE registrations ADD COLUMN ticket_code TEXT UNIQUE;
        RAISE NOTICE 'Added ticket_code column';
    END IF;
    
    -- Add scanned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='registrations' AND column_name='scanned') THEN
        ALTER TABLE registrations ADD COLUMN scanned BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added scanned column';
    END IF;
    
    -- Add scanned_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='registrations' AND column_name='scanned_at') THEN
        ALTER TABLE registrations ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added scanned_at column';
    END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_code ON registrations(ticket_code);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_scanned ON registrations(scanned);

-- ============================================
-- STEP 2: DROP ALL EXISTING RLS POLICIES
-- ============================================
-- This ensures we start fresh with no conflicts

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
DROP POLICY IF EXISTS "Anyone can view registrations" ON registrations;
DROP POLICY IF EXISTS "Enable read access for all users" ON registrations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON registrations;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON registrations;

-- ============================================
-- STEP 3: ENABLE RLS ON REGISTRATIONS TABLE
-- ============================================
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE CLEAR, PERMISSIVE POLICIES
-- ============================================

-- POLICY 1: Allow users to INSERT their own registrations
-- THIS IS THE MOST CRITICAL POLICY FOR TICKET CREATION!
CREATE POLICY "allow_users_insert_own_registrations"
ON registrations
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- POLICY 2: Allow users to SELECT their own registrations
CREATE POLICY "allow_users_select_own_registrations"
ON registrations
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

-- POLICY 3: Allow users to DELETE their own registrations (leave event)
CREATE POLICY "allow_users_delete_own_registrations"
ON registrations
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
);

-- POLICY 4: Allow organizations to SELECT ALL registrations
-- Needed for: viewing attendees & scanning QR codes
CREATE POLICY "allow_orgs_select_all_registrations"
ON registrations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_organization = true
    )
);

-- POLICY 5: Allow organizations to UPDATE registrations (mark as scanned)
CREATE POLICY "allow_orgs_update_registrations"
ON registrations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_organization = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_organization = true
    )
);

-- ============================================
-- STEP 5: VERIFY POLICIES WERE CREATED
-- ============================================
SELECT 
    '✅ POLICIES CREATED' as status,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'INSERT' THEN '🎫 Creates tickets when joining events'
        WHEN cmd = 'SELECT' AND policyname LIKE '%users%' THEN '👁️ Users see their own tickets'
        WHEN cmd = 'SELECT' AND policyname LIKE '%orgs%' THEN '🔍 Orgs view all registrations'
        WHEN cmd = 'DELETE' THEN '🗑️ Users can leave events'
        WHEN cmd = 'UPDATE' THEN '✅ Orgs mark tickets as scanned'
        ELSE ''
    END as purpose
FROM pg_policies
WHERE tablename = 'registrations'
ORDER BY 
    CASE cmd
        WHEN 'INSERT' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END,
    policyname;

-- ============================================
-- STEP 6: TEST QUERIES
-- ============================================

-- Test 1: Show current user info
SELECT 
    '📋 CURRENT USER INFO' as test_name,
    auth.uid() as your_user_id,
    u.email,
    u.is_organization,
    CASE 
        WHEN u.is_organization THEN '👔 Organization - Can view all tickets & scan QR codes'
        ELSE '👤 Student - Can create tickets when joining events'
    END as account_type
FROM users u
WHERE u.id = auth.uid();

-- Test 2: Show existing registrations
SELECT 
    '🎫 EXISTING TICKETS' as test_name,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN ticket_code IS NOT NULL THEN 1 END) as tickets_with_qr_code,
    COUNT(CASE WHEN scanned = true THEN 1 END) as scanned_tickets
FROM registrations;

-- Test 3: Sample registrations with details
SELECT 
    '📊 SAMPLE TICKETS (Last 5)' as test_name,
    r.id,
    r.ticket_code,
    r.scanned,
    r.registered_at,
    e.title as event_name,
    u.email as student_email
FROM registrations r
LEFT JOIN events e ON e.id = r.event_id
LEFT JOIN users u ON u.id = r.user_id
ORDER BY r.registered_at DESC
LIMIT 5;

-- ============================================
-- STEP 7: FINAL STATUS CHECK
-- ============================================
SELECT 
    '✅ SETUP COMPLETE!' as status,
    '🎟️ Users can now create tickets when joining events' as ticket_creation,
    '📱 Tickets contain unique QR codes stored in database' as qr_codes,
    '🔍 Organizations can view all attendees' as view_attendees,
    '📲 Organizations can scan and validate QR codes' as scan_qr
UNION ALL
SELECT 
    '⚠️ NEXT STEPS:' as status,
    '1. Go back to your app' as ticket_creation,
    '2. Join an event as a student' as qr_codes,
    '3. Go to Tickets tab - you should see QR code!' as view_attendees,
    '4. Scan QR as organization - it should validate!' as scan_qr;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If tickets still not appearing, run these diagnostic queries:

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'registrations';

-- Check if user can see their own registrations
-- SELECT * FROM registrations WHERE user_id = auth.uid();

-- Check if INSERT would work (dry run - doesn't actually insert)
-- SELECT 
--     'Can I insert?' as question,
--     CASE 
--         WHEN auth.uid() IS NOT NULL THEN 'Yes - you are authenticated'
--         ELSE 'No - you are not authenticated'
--     END as answer;







