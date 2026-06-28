import { supabase } from './supabaseClient';
import { isSupabaseUuid } from './isSupabaseUuid';

/** Resolve Supabase `events.id` from an app feed / joined event object. */
export function getSupabaseEventUuidFromAppEvent(ev) {
  if (!ev) return null;
  if (ev.supabaseId != null && isSupabaseUuid(String(ev.supabaseId).trim())) {
    return String(ev.supabaseId).trim();
  }
  const id = String(ev.id || '');
  const m = id.match(/^supabase-(.+)$/i);
  if (m && isSupabaseUuid(m[1].trim())) return m[1].trim();
  if (isSupabaseUuid(id.trim())) return id.trim();
  return null;
}

/**
 * Rows: { user_id, full_name, username, avatar_url } — RPC `list_event_attendees_public`.
 * Includes completed RSVPs and chapter roster (organization_members) for display only;
 * roster-only users have no registration/ticket. Host ticket RPCs unchanged.
 */
export async function fetchEventAttendeesPublic(ev) {
  const pEventId = getSupabaseEventUuidFromAppEvent(ev);
  if (!pEventId) {
    return { rows: [], error: new Error('missing_event_id') };
  }
  const { data, error } = await supabase.rpc('list_event_attendees_public', {
    p_event_id: pEventId,
  });
  if (error) {
    return { rows: [], error };
  }
  return { rows: Array.isArray(data) ? data : [], error: null };
}
