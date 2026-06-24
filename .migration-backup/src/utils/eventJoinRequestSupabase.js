/**
 * React app helper — do NOT paste this file into the Supabase SQL Editor.
 * DB setup: run `SUPABASE_EVENT_JOIN_REQUESTS.sql` in the SQL Editor instead.
 */
import { supabase, tryParseUuidString } from './supabaseClient';
import { getSupabaseAuthUid } from './supabaseSessionUser';
import { generateTicketCode } from './ticketCode';
import { isSupabaseUuid } from './isSupabaseUuid';
import { isRegistrationCapacityError } from './eventRegistrationCapacity';

export function joinRequestStatusForSupabaseEvent(map, event) {
  const sid = event?.supabaseId != null ? String(event.supabaseId) : '';
  if (!sid || !map || typeof map !== 'object') return null;
  const st = map[sid];
  if (st === 'pending' || st === 'accepted' || st === 'declined') return st;
  return null;
}

export async function fetchMyJoinRequestStatusMap() {
  const { data, error } = await supabase.rpc('get_my_event_join_requests');
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('get_my_event_join_requests:', error.message);
    }
    return {};
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return {};
}

export async function requestEventJoinRpc(eventUuid) {
  const { data, error } = await supabase.rpc('request_event_join', { p_event_id: eventUuid });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (data && typeof data === 'object') {
    return { ok: data.ok !== false, ...data };
  }
  return { ok: false, error: 'empty_response' };
}

export async function listEventJoinRequestsForHostRpc(eventUuid) {
  const { data, error } = await supabase.rpc('list_event_join_requests_for_host', {
    p_event_id: eventUuid,
  });
  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: Array.isArray(data) ? data : [], error: null };
}

export async function respondEventJoinRequestRpc(requestId, accept) {
  const { data, error } = await supabase.rpc('respond_event_join_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (data && typeof data === 'object') {
    return { ok: data.ok !== false, ...data };
  }
  return { ok: false, error: 'empty_response' };
}

/**
 * Free Supabase registration + local state (same behavior as Dashboard join).
 * Returns { ok: boolean, error?: string }
 */
export async function performSupabaseFreeEventRegistration({
  event,
  eventId,
  setAllEvents,
  setGeneratedEvents,
  setJoinedEvents,
  setSelectedEventDetails,
  selectedEventDetails,
}) {
  const joinAuthUid = await getSupabaseAuthUid();
  if (!joinAuthUid) {
    return { ok: false, error: 'not_signed_in' };
  }

  let actualSupabaseId = event.supabaseId;
  if (!actualSupabaseId) {
    try {
      const { data: foundEvents, error: searchError } = await supabase
        .from('events')
        .select('id')
        .eq('title', event.title)
        .eq('university', event.university)
        .limit(1);
      if (!searchError && foundEvents?.length) {
        actualSupabaseId = foundEvents[0].id;
      }
    } catch (_) {
      /* ignore */
    }
  }

  const ticketCode = generateTicketCode();
  const insertEventId = actualSupabaseId || tryParseUuidString(eventId);
  if (!insertEventId || !isSupabaseUuid(String(insertEventId))) {
    return { ok: false, error: 'missing_event_id' };
  }

  const newAttendance = (Number(event.attendance) || 0) + 1;
  const updatedEvent = { ...event, attendance: newAttendance, supabaseId: actualSupabaseId || event.supabaseId };

  const { error: regError } = await supabase.from('registrations').insert({
    user_id: joinAuthUid,
    event_id: insertEventId,
    payment_status: 'free',
    ticket_code: ticketCode,
    scanned: false,
  });

  if (regError) {
    if (isRegistrationCapacityError(regError)) {
      return { ok: false, error: 'full' };
    }
    return { ok: false, error: regError.message };
  }

  if (actualSupabaseId) {
    try {
      await supabase.from('events').update({ attendance: newAttendance }).eq('id', actualSupabaseId);
    } catch (_) {
      /* non-fatal */
    }
  }

  if (typeof setAllEvents === 'function') {
    setAllEvents((prev) => {
      const exists = prev.some((e) => e.id === eventId);
      if (exists) return prev.map((e) => (e.id === eventId ? updatedEvent : e));
      return [...prev, updatedEvent];
    });
  }
  if (typeof setGeneratedEvents === 'function') {
    setGeneratedEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
  }
  if (typeof setJoinedEvents === 'function') {
    setJoinedEvents((prev) => [...prev, { ...updatedEvent, ticketScanned: false }]);
  }
  if (typeof setSelectedEventDetails === 'function' && selectedEventDetails?.id === eventId) {
    setSelectedEventDetails(updatedEvent);
  }

  return { ok: true };
}
