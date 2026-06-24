-- Run in SQL Editor (as postgres). Paste results if the app still shows zero events.
-- Confirms which SELECT policies exist on public.events.

SELECT policyname, permissive, roles::text, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events'
ORDER BY policyname;
