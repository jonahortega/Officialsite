-- Diagnostic: chapter-hosted events visibility (delegated posting vs org login profile)
-- Run in Supabase SQL Editor. No schema changes.
--
-- A) For one chapter (`organizations.id` = your UUID), list recent events the app treats as
--    "theirs" (founder created OR organization_id matches):

/*
SELECT e.id, e.title, e.created_by, e.organization_id, e.created_at
FROM public.events e
WHERE e.organization_id = '<PASTE_ORGANIZATIONS_ID_UUID>'::uuid
   OR e.created_by = (SELECT user_id FROM public.organizations WHERE id = '<SAME_UUID>'::uuid)
ORDER BY e.created_at DESC
LIMIT 50;
*/

-- B) Member-posted rows missing organization_id (home/search may still show them via other
--    paths, but chapter-scoped queries will skip them). Fix with Phase 2 backfill or manual UPDATE.

/*
SELECT e.id, e.title, e.created_by, e.organization_id, e.created_at
FROM public.events e
WHERE e.organization_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = e.created_by
  )
ORDER BY e.created_at DESC
LIMIT 50;
*/
