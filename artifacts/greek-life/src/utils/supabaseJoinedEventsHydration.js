import { supabase } from './supabaseClient';
import { waitForSupabaseAuthUid, getSupabaseAuthUid } from './supabaseSessionUser';
import { isSupabaseUuid, coerceToUuidString } from './isSupabaseUuid';
import { eventImageOrFallback } from './supabaseEventImage';
import { fetchRegistrationCountsForEventIds } from './eventRegistrationCapacity';
import { fetchMyJoinRequestStatusMap } from './eventJoinRequestSupabase';

function logSupabaseIssue(label, error) {
  if (!error) return;
  console.warn('[GL_SUPABASE]', label, error.message || error, error.code || '', error.details || '');
}

/**
 * Registration counts as "joined" / ticketed only after checkout is finished (or free RSVP completed).
 * `pending` = Stripe session opened but not paid — must not show Joined or Tickets.
 */
export function registrationQualifiesForJoinedList(registration, eventRow) {
  if (!registration) return false;
  const ps = String(registration.payment_status ?? '').toLowerCase();
  if (ps === 'pending') return false;
  // Event row is missing when PostgREST embed fails or events SELECT is restricted for this session.
  // Without this branch, users (e.g. chapter members after losing scanner) lose all tickets in UI.
  if (!eventRow) {
    if (ps === 'paid' || ps === 'free') return true;
    if (ps === '') return true;
    return false;
  }
  const price = Number(eventRow.price ?? 0);
  const isPaidListing = Number.isFinite(price) && price > 0;
  if (isPaidListing) return ps === 'paid';
  return ps === 'free' || ps === 'paid' || ps === '';
}

export function mapSupabaseEventDbRowToAppEvent(event) {
  if (!event?.id) return null;
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  let coords = event.coordinates;
  if (typeof coords === 'string') {
    try {
      coords = JSON.parse(coords);
    } catch (_) {
      coords = null;
    }
  }
  return {
    id: `supabase-${event.id}`,
    supabaseId: event.id,
    title: event.title,
    organization: event.organization_name,
    orgColor: '#7c3aed',
    date: formattedDate,
    dateISO: event.date != null ? event.date : null,
    time: event.time,
    location: event.location,
    locationAddress: event.location_address,
    coordinates: coords,
    attendance: Number.isFinite(Number(event.attendance)) ? Math.max(0, Math.floor(Number(event.attendance))) : 0,
    maxAttendance: (() => {
      const raw = event.max_attendance;
      if (raw == null || raw === '') return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.floor(n);
    })(),
    price: event.price || 0,
    image: eventImageOrFallback(event),
    type: event.category?.toUpperCase() || 'SOCIAL',
    category: event.category,
    description: event.description,
    university: event.university,
    createdBy: event.organization_name,
    createdByUserId: event.created_by,
    organizationId: event.organization_id != null ? String(event.organization_id) : null,
    isOrganizationEvent: true,
    eventCreatedAt: event.created_at || null,
    requiresJoinRequest: Boolean(event.requires_join_request),
    isFundraiser: Boolean(event.is_fundraiser),
  };
}

/**
 * Home feed: one `events` query. Row visibility is entirely RLS (host / registered / uni / broad read).
 * Avoids N parallel ILIKE scans that slowed login and amplified empty-result races.
 */
export async function fetchMergedSupabaseEventsForUser(_user) {
  try {
    await waitForSupabaseAuthUid({ maxAttempts: 18, baseDelayMs: 70 });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn(
        '[GL_SUPABASE] events feed: no JWT on Supabase client yet (or signed out). RLS treats requests as anon → empty list. Try sign-in again.'
      );
      return [];
    }

    const { data: rows, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      logSupabaseIssue('events feed query failed', error);
      return [];
    }

    const sorted = [...(rows || [])].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });

    return await mapDbEventRowsToAppEventsWithLiveCounts(supabase, sorted);
  } catch (e) {
    console.warn('[GL_SUPABASE] fetchMergedSupabaseEventsForUser:', e?.message || e);
    return [];
  }
}

/** Map raw `events` rows to app events, replacing `attendance` with live `registrations` counts when RPC is available. */
export async function mapDbEventRowsToAppEventsWithLiveCounts(supabaseClient, rows) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const ids = list.map((r) => r?.id).filter(Boolean).map(String);
  const counts = ids.length ? await fetchRegistrationCountsForEventIds(supabaseClient, ids) : {};
  return list
    .map((row) => {
      if (!row?.id) return null;
      const merged = { ...row };
      if (counts != null) merged.attendance = counts[String(row.id)] ?? 0;
      return mapSupabaseEventDbRowToAppEvent(merged);
    })
    .filter(Boolean);
}

/**
 * Rebuild Profile/Dashboard `joinedEvents` from `registrations` + `events` (source of truth).
 */
export async function buildJoinedEventsFromRegistrations(uid) {
  if (!uid || !isSupabaseUuid(String(uid))) return [];

  const effectiveUid = String(uid);

  await waitForSupabaseAuthUid({ maxAttempts: 18, baseDelayMs: 70 });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn('[GL_SUPABASE] joinedEvents: no JWT — registrations query will return nothing under RLS.');
    return [];
  }

  const { data: regs, error } = await supabase
    .from('registrations')
    .select('event_id, scanned, payment_status')
    .eq('user_id', effectiveUid);

  if (error) {
    logSupabaseIssue('joinedEvents registrations', error);
    return [];
  }
  if (!regs?.length) return [];

  const regByEventId = {};
  for (const r of regs) {
    if (r.event_id != null) regByEventId[String(r.event_id)] = r;
  }

  const eventIds = [...new Set(regs.map((r) => r.event_id).filter(Boolean))];
  const { data: events, error: evErr } = await supabase.from('events').select('*').in('id', eventIds);

  if (evErr) {
    logSupabaseIssue('joinedEvents events by ids', evErr);
    return [];
  }
  if (!events?.length) return [];

  return events
    .filter((row) => registrationQualifiesForJoinedList(regByEventId[String(row.id)], row))
    .map((row) => {
      const app = mapSupabaseEventDbRowToAppEvent(row);
      if (!app) return null;
      const r = regByEventId[String(row.id)];
      return {
        ...app,
        ticketScanned: r ? Boolean(r.scanned) : false,
      };
    })
    .filter(Boolean);
}

function extractJoinedEventRowsFromRpcPayload(data) {
  let arr = data;
  if (arr == null) return [];
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const pairs = [];
  for (const item of arr) {
    const row = item && typeof item === 'object' ? item.event : null;
    if (!row || row.id == null) continue;
    pairs.push({ row, scanned: Boolean(item?.scanned) });
  }
  return pairs;
}

/**
 * Joined / ticketed events for a profile user. Uses normal registration queries
 * when viewing yourself; otherwise calls RPC `get_profile_joined_events_for_display`
 * (install SUPABASE_RPC_PROFILE_JOINED_EVENTS.sql) so visitors can see public activity.
 */
export async function buildJoinedEventsFromRegistrationsForViewer(profileUserId) {
  const uid = coerceToUuidString(profileUserId);
  if (!uid || !isSupabaseUuid(String(uid))) return [];

  await waitForSupabaseAuthUid({ maxAttempts: 18, baseDelayMs: 70 });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return [];
  }

  const myUid = await getSupabaseAuthUid();
  if (myUid && String(myUid) === String(uid)) {
    return buildJoinedEventsFromRegistrations(String(uid));
  }

  const { data, error } = await supabase.rpc('get_profile_joined_events_for_display', {
    p_profile_user_id: uid,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      logSupabaseIssue('get_profile_joined_events_for_display', error);
    }
    return [];
  }

  const pairs = extractJoinedEventRowsFromRpcPayload(data);
  if (!pairs.length) return [];

  const scanByEventId = {};
  const rawRows = [];
  for (const p of pairs) {
    const idKey = String(p.row.id);
    scanByEventId[idKey] = p.scanned;
    rawRows.push(p.row);
  }

  try {
    const hydrated = await mapDbEventRowsToAppEventsWithLiveCounts(supabase, rawRows);
    return hydrated.map((app) => ({
      ...app,
      ticketScanned: scanByEventId[String(app.supabaseId)] ?? false,
    }));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GL_SUPABASE] buildJoinedEventsFromRegistrationsForViewer:', e?.message || e);
    }
    return [];
  }
}

/** JWT metadata only — used when hydrating events before React user state exists. */
export function universityFromAuthSessionMeta(session) {
  const m = session?.user?.user_metadata || {};
  if (typeof m.university === 'string' && m.university.trim()) return m.university.trim();
  return '';
}

/**
 * Load Supabase events + joined list for an auth session (e.g. login preload).
 * Call and apply results before navigating to Home so the first paint has data.
 */
export async function preloadEventsAndJoinedForSession(session) {
  const uid = session?.user?.id;
  if (!uid || !isSupabaseUuid(String(uid))) return null;
  const university = universityFromAuthSessionMeta(session);
  const userForQuery = {
    supabaseUserId: uid,
    userId: uid,
    university,
  };
  const [list, joined, joinRequestStatusByEventId] = await Promise.all([
    fetchMergedSupabaseEventsForUser(userForQuery),
    buildJoinedEventsFromRegistrations(String(uid)),
    fetchMyJoinRequestStatusMap().catch(() => ({})),
  ]);
  return {
    supabaseEvents: Array.isArray(list) ? list : [],
    joinedEvents: Array.isArray(joined) ? joined : [],
    joinRequestStatusByEventId:
      joinRequestStatusByEventId && typeof joinRequestStatusByEventId === 'object'
        ? joinRequestStatusByEventId
        : {},
  };
}
