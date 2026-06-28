/**
 * Supabase Postgres UUID columns reject mock ids like "user_1773934170451" → HTTP 400.
 * Only query registrations / RLS-scoped tables when this is true.
 */
export function isSupabaseUuid(value) {
  if (value == null || typeof value !== 'string') return false;
  const s = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Normalize UUID-ish values from JSON (sometimes 32 hex without hyphens, or non-string).
 * Returns canonical lowercase hyphenated form, or null if not a valid UUID.
 */
export function coerceToUuidString(value) {
  if (value == null) return null;
  const s0 =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number'
        ? String(value)
        : String(value).trim();
  if (!s0) return null;
  if (isSupabaseUuid(s0)) return s0.toLowerCase();
  const compact = s0.replace(/-/g, '').toLowerCase();
  if (compact.length === 32 && /^[0-9a-f]{32}$/.test(compact)) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20, 32)}`;
  }
  return null;
}
