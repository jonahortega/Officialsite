-- =============================================================================
-- Event cover images: Storage bucket + policies (run in Supabase SQL Editor)
--
-- 1) Dashboard → Storage → New bucket
--    Name: event-images
--    Public bucket: ON
--
-- 2) Run this file (safe to re-run).
--
-- Optional: without this bucket, the app still stores covers in `events.image` like before
-- (data URLs or https). Storage only improves reliability for very large uploads / all viewers.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Event images public read" ON storage.objects;
CREATE POLICY "Event images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated upload" ON storage.objects;
CREATE POLICY "Event images authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated update" ON storage.objects;
CREATE POLICY "Event images authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-images')
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated delete" ON storage.objects;
CREATE POLICY "Event images authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-images');
