import { getEventMaxAttendance, getEventAttendanceCount } from './eventCapacity';

/**
 * True counts from `registrations` (SECURITY DEFINER RPC). Returns `null` if RPC is missing / failed.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string[]} eventUuidStrings
 * @returns {Promise<Record<string, number>|null>}
 */
export async function fetchRegistrationCountsForEventIds(supabaseClient, eventUuidStrings) {
  const ids = [...new Set((eventUuidStrings || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabaseClient.rpc('registration_counts_for_events', {
    p_event_ids: ids,
  });
  if (error) {
    console.warn('[GL_CAPACITY] registration_counts_for_events:', error.message || error);
    return null;
  }
  const out = {};
  for (const id of ids) out[id] = 0;
  for (const row of data || []) {
    const eid = row.event_id;
    if (eid != null) out[String(eid)] = Number(row.reg_count) || 0;
  }
  return out;
}

/**
 * Capacity using live registration count when `event.supabaseId` exists and RPC works; otherwise falls back to row attendance.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {object} event — app event shape (supabaseId, attendance, maxAttendance, …)
 */
export async function isEventAtCapacityFromServer(supabaseClient, event) {
  if (event?.isFundraiser) return false;
  const max = getEventMaxAttendance(event);
  if (max == null) return false;
  const sid = event?.supabaseId;
  if (sid) {
    const map = await fetchRegistrationCountsForEventIds(supabaseClient, [String(sid)]);
    if (map != null) {
      const c = map[String(sid)] ?? 0;
      return c >= max;
    }
  }
  return getEventAttendanceCount(event) >= max;
}

export function isRegistrationCapacityError(regError) {
  if (!regError) return false;
  const code = String(regError.code || '');
  const msg = String(regError.message || '');
  return code === '23514' || msg.includes('EVENT_FULL');
}
