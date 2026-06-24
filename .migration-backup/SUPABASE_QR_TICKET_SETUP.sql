-- QR Ticket System Setup for Supabase
-- Run these commands in your Supabase SQL Editor

-- 1. Ensure ticket_code column exists and is unique
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS ticket_code TEXT UNIQUE;

-- 2. Ensure scanned column exists (for validation)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT false;

-- 3. Ensure scanned_at column exists (for tracking when ticket was scanned)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMP WITH TIME ZONE;

-- 4. Create index on ticket_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_code 
ON registrations(ticket_code);

-- 5. Create index on event_id for fast queries
CREATE INDEX IF NOT EXISTS idx_registrations_event_id 
ON registrations(event_id);

-- 6. Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'registrations';

-- Expected columns:
-- id, user_id, event_id, registered_at, payment_status, ticket_code, scanned, scanned_at













