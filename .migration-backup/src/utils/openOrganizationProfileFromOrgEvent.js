import { supabase } from './supabaseClient';
import { isSupabaseUuid, coerceToUuidString } from './isSupabaseUuid';

/**
 * Navigate to a registered chapter profile using `events.organization_id` when present,
 * so member-posted events open the org (founder uid + chapter id), not the member's user profile.
 *
 * @returns {Promise<boolean>} true if navigation was handled
 */
export async function openOrganizationProfileFromOrgEvent(hostEvent, { userUniversity, onNavigate }) {
  if (!hostEvent || typeof onNavigate !== 'function') return false;

  const chapterOrgId = coerceToUuidString(
    hostEvent.organizationId ?? hostEvent.organization_id
  );
  if (!chapterOrgId || !isSupabaseUuid(chapterOrgId)) return false;

  const { data, error } = await supabase
    .from('organizations')
    .select('user_id, name, username, university, email')
    .eq('id', chapterOrgId)
    .maybeSingle();

  if (error || !data?.user_id) return false;

  const founder = coerceToUuidString(data.user_id);
  if (!founder || !isSupabaseUuid(founder)) return false;

  const label =
    (data.name && String(data.name).trim()) ||
    (hostEvent.organization && String(hostEvent.organization).trim()) ||
    'Organization';

  onNavigate('organization-profile', {
    organization: {
      name: label,
      type: 'Organization',
      description: '',
      supabaseUserId: String(founder),
      university: data.university || userUniversity,
      username: data.username ? String(data.username).replace(/^@/, '') : undefined,
      email: data.email || undefined,
      isSupabaseOrganization: true,
      organizationTableId: chapterOrgId,
    },
  });
  return true;
}
