-- Fix existing registrations that have NULL ticket_code
-- Run this in Supabase SQL Editor to backfill missing ticket codes

-- Update all registrations where ticket_code is NULL
-- Generate a ticket code using: TICKET-{event_id}-{user_id}-{random_timestamp}
UPDATE registrations
SET ticket_code = CONCAT(
  'TICKET-',
  event_id::text,
  '-',
  user_id::text,
  '-',
  EXTRACT(EPOCH FROM NOW() + (random() * interval '1 second'))::bigint::text
)
WHERE ticket_code IS NULL;

-- Verify the update
SELECT 
  id,
  user_id,
  event_id,
  ticket_code,
  scanned,
  payment_status
FROM registrations
WHERE ticket_code IS NOT NULL
ORDER BY created_at DESC;

-- Expected output: All rows should now have ticket_code starting with "TICKET-"












