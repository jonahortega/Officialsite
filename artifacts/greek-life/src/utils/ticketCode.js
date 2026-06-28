/**
 * Short, URL-safe ticket codes → smaller, easier-to-scan QR payloads.
 * Legacy rows may still use long `TICKET-...` strings; both are valid.
 */
export function generateTicketCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `TKT-${hex}`;
}
