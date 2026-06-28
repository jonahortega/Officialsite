/**
 * Capacity for "Full" / join blocking. Uses `attendance` + `maxAttendance` (and common aliases).
 * When max is missing or ≤ 0, there is no numeric cap.
 */
export function getEventAttendanceCount(event) {
  if (!event || typeof event !== 'object') return 0;
  const raw = event.attendance ?? event.attendees;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function getEventMaxAttendance(event) {
  if (!event || typeof event !== 'object') return null;
  const raw = event.maxAttendance ?? event.max_attendance ?? event.maxAttendees;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function isEventAtCapacity(event) {
  const max = getEventMaxAttendance(event);
  if (max == null) return false;
  return getEventAttendanceCount(event) >= max;
}
