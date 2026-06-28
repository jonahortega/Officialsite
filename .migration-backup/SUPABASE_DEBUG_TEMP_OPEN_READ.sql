-- =============================================================================
-- TEMPORARY DEBUG ONLY — NOT FOR PRODUCTION
--
-- If Table Editor shows rows but the app shows 0 events / 0 registrations,
-- RLS is almost certainly blocking the browser (authenticated role).
--
-- This adds ONE extra SELECT policy per table: USING (true) for role
-- "authenticated". Because Postgres ORs permissive policies, any logged-in
-- user can then read all rows — use only to confirm the diagnosis, then
-- REMOVE these policies (see bottom).
-- =============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "__temp_debug_authenticated_read_all_events" ON public.events;
CREATE POLICY "__temp_debug_authenticated_read_all_events"
ON public.events FOR SELECT TO authenticated USING (true);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "__temp_debug_authenticated_read_all_registrations" ON public.registrations;
CREATE POLICY "__temp_debug_authenticated_read_all_registrations"
ON public.registrations FOR SELECT TO authenticated USING (true);

-- After you confirm the app loads data, remove debug policies:
-- DROP POLICY IF EXISTS "__temp_debug_authenticated_read_all_events" ON public.events;
-- DROP POLICY IF EXISTS "__temp_debug_authenticated_read_all_registrations" ON public.registrations;
