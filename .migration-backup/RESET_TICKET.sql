-- Reset Scanned Tickets
-- Run this in your Supabase SQL Editor to reset a ticket for testing

-- Option 1: Reset ALL tickets (use for testing)
UPDATE registrations
SET scanned = false, scanned_at = NULL
WHERE scanned = true;

-- Option 2: Reset only the most recent ticket (safer)
-- UPDATE registrations
-- SET scanned = false, scanned_at = NULL
-- WHERE id = (
--   SELECT id FROM registrations
--   ORDER BY registered_at DESC
--   LIMIT 1
-- );

-- Verify the reset
SELECT 
  id,
  user_id,
  event_id,
  ticket_code,
  scanned,
  scanned_at,
  registered_at
FROM registrations
ORDER BY registered_at DESC
LIMIT 5;









