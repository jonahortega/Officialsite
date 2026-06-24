const DEFAULT_EVENT_COVER =
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop';

const EVENT_IMAGES_BUCKET = 'event-images';

/**
 * Prefer `image`, then `image_url` (common schema split). Trims; empty → null.
 */
export function resolveEventImageFromRow(row) {
  if (!row || typeof row !== 'object') return null;
  const a = row.image;
  const b = row.image_url;
  const pick = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };
  return pick(a) || pick(b) || null;
}

export function eventImageOrFallback(row, fallback = DEFAULT_EVENT_COVER) {
  return resolveEventImageFromRow(row) || fallback;
}

/**
 * If value is a data-URL from FileReader, try Supabase Storage → public URL (best for other users).
 * Plain https (or any non-data URL) is returned unchanged — same as storing in `events.image` before.
 * If Storage is missing or upload fails, keeps the original data-URL so behavior matches “DB-only” uploads.
 */
export async function ensureEventCoverPublicUrl(supabaseClient, creatorUid, imageValue, fallbackUrl = DEFAULT_EVENT_COVER) {
  if (imageValue == null || typeof imageValue !== 'string') return fallbackUrl;
  const trimmed = imageValue.trim();
  if (!trimmed) return fallbackUrl;
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return trimmed;

  const contentType = match[1] || 'image/jpeg';
  let binary;
  try {
    binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  } catch (_) {
    return trimmed;
  }

  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg';

  const uid = creatorUid && String(creatorUid).trim() ? String(creatorUid) : 'anonymous';
  const fileName = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${uid}/${fileName}.${ext}`;

  try {
    const blob = new Blob([binary], { type: contentType });
    const { error: upErr } = await supabaseClient.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(path, blob, { contentType, upsert: false });
    if (upErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[event-image] Storage upload failed — saving image in DB as before (optional bucket: event-images):', upErr.message);
      }
      return trimmed;
    }
    const { data: pub } = supabaseClient.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
    const url = pub?.publicUrl;
    return url && String(url).trim() ? String(url).trim() : trimmed;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[event-image] upload error — keeping inline image:', e?.message || e);
    }
    return trimmed;
  }
}
