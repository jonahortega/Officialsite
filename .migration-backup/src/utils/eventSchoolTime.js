import { toDate, formatInTimeZone } from 'date-fns-tz';

/** IANA zones for campus “wall clock” — extend as you add schools. */
export const UNIVERSITY_TIMEZONE = {
  'Rutgers University': 'America/New_York',
  'Rutgers University New Brunswick': 'America/New_York',
  'Northeastern University': 'America/New_York',
  'Stockton University': 'America/New_York',
  'Syracuse University': 'America/New_York',
  'University of Florida': 'America/New_York',
  'University of Alabama': 'America/Chicago',
  'University of Southern California': 'America/Los_Angeles',
};

const DEFAULT_TZ = 'America/New_York';

/**
 * After scheduled start, events stay visible in feeds and “upcoming” lists until this
 * window ends (then they count as past and drop from home, search, map, check-in, etc.).
 */
export const EVENT_VISIBILITY_GRACE_AFTER_START_MS = 6 * 60 * 60 * 1000;

export function getSchoolTimeZoneForUniversity(university) {
  const u = typeof university === 'string' ? university.trim() : '';
  if (u && UNIVERSITY_TIMEZONE[u]) return UNIVERSITY_TIMEZONE[u];
  return DEFAULT_TZ;
}

const MONTH_SHORT = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/**
 * Resolve calendar date as YYYY-MM-DD in the school’s zone (for parsing event start).
 * Prefers `dateISO` from Supabase-mapped events.
 */
export function resolveEventDateISO(event, timeZone) {
  if (!event) return null;
  const raw =
    event.dateISO != null
      ? String(event.dateISO).trim()
      : event.date != null
        ? String(event.date).trim()
        : '';
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);

  const withYear = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (withYear) {
    const mon = withYear[1];
    const day = parseInt(withYear[2], 10);
    const yrExplicit = withYear[3] ? parseInt(withYear[3], 10) : null;
    const m = MONTH_SHORT[mon];
    if (m === undefined || Number.isNaN(day)) return null;
    let year =
      yrExplicit != null
        ? yrExplicit
        : parseInt(formatInTimeZone(new Date(), timeZone, 'yyyy'), 10);
    let candidate = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const today = formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd');
    if (yrExplicit == null && candidate < today) {
      year += 1;
      candidate = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return candidate;
  }
  return null;
}

/** Parse "8:43 PM", "20:43", "20:43:00" → 24h parts. */
export function parseTimeToHm(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const t = timeStr.trim();
  const ampm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const s = ampm[3] ? parseInt(ampm[3], 10) : 0;
    const ap = ampm[4].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    if (h > 23 || m > 59 || s > 59) return null;
    return { hour: h, minute: m, second: s };
  }
  const twenty = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twenty) {
    const h = parseInt(twenty[1], 10);
    const m = parseInt(twenty[2], 10);
    const s = twenty[3] ? parseInt(twenty[3], 10) : 0;
    if (h > 23 || m > 59 || s > 59) return null;
    return { hour: h, minute: m, second: s };
  }
  return null;
}

/**
 * Event start instant (UTC ms) for the school’s wall clock. If time is missing, end of that day in the zone.
 */
export function getEventStartInstantMs(event, timeZone) {
  const ymd = resolveEventDateISO(event, timeZone);
  if (!ymd) return null;
  const hm = parseTimeToHm(event?.time);
  if (!hm) {
    const d = toDate(`${ymd}T23:59:59`, { timeZone });
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const { hour, minute, second } = hm;
  const str = `${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  const d = toDate(str, { timeZone });
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * True after the event’s scheduled start plus {@link EVENT_VISIBILITY_GRACE_AFTER_START_MS}
 * in the school timezone (or end of day if time missing, then grace from that instant).
 * If the date/time cannot be parsed, returns false so we don’t hide the card.
 */
export function isEventPastBySchoolClock(event, university, nowMs = Date.now()) {
  const tz = getSchoolTimeZoneForUniversity(university);
  const startMs = getEventStartInstantMs(event, tz);
  if (startMs == null) return false;
  return startMs + EVENT_VISIBILITY_GRACE_AFTER_START_MS < nowMs;
}
