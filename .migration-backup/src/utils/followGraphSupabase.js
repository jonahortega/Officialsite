import { supabase } from './supabaseClient';
import { getSupabaseAuthUid } from './supabaseSessionUser';
import { coerceToUuidString } from './isSupabaseUuid';

function dicebear(id) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(id))}`;
}

function emailLocalPart(email) {
  const s = String(email || '').trim();
  const i = s.indexOf('@');
  if (i <= 0) return '';
  return s.slice(0, i);
}

/**
 * Name / handle / avatar for an account when you have `public.users` and optional `public.organizations`.
 * Org display names usually live on `organizations.name`, not `users.full_name`.
 */
export function resolveFollowerDisplay(u, org, followerId) {
  const isOrg = Boolean(u?.is_organization) || Boolean(org);
  const orgHandle = org?.username ? String(org.username).replace(/^@/, '') : '';
  const userHandle = u?.username ? String(u.username).replace(/^@/, '') : '';
  const handleRaw =
    isOrg && org ? orgHandle || userHandle : userHandle || orgHandle;
  const handleLabel = handleRaw ? `@${handleRaw}` : '';
  const fromEmail = emailLocalPart(u?.email);
  const fromOrgEmail = emailLocalPart(org?.email);
  const name =
    (isOrg && org?.name && String(org.name).trim()) ||
    (u?.full_name && String(u.full_name).trim()) ||
    handleRaw ||
    fromEmail ||
    fromOrgEmail ||
    'Someone';
  const avatarRaw = u?.avatar_url != null ? String(u.avatar_url).trim() : '';
  const avatar =
    avatarRaw &&
    (avatarRaw.startsWith('http') ||
      avatarRaw.startsWith('data:') ||
      avatarRaw.startsWith('/'))
      ? avatarRaw
      : dicebear(followerId);
  return { name, handleLabel, handleRaw, avatar };
}

export function avatarUrlOrDicebear(url, id) {
  const s = url != null ? String(url).trim() : '';
  if (
    s &&
    (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/'))
  ) {
    return s;
  }
  return dicebear(id);
}

/**
 * Server-side labels for accounts that follow you (bypasses RLS on public.users).
 * Returns null if the RPC is missing or failed — caller should fall back to direct selects.
 */
export async function fetchFollowerPublicLabelsMap(followerIds) {
  const uniq = [...new Set((followerIds || []).filter(Boolean).map(String))];
  if (!uniq.length) return {};
  const { data, error } = await supabase.rpc('get_follower_public_labels', {
    p_follower_ids: uniq,
  });
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('get_follower_public_labels:', error.message);
    }
    return null;
  }
  const out = {};
  for (const row of data || []) {
    if (row?.follower_id == null) continue;
    out[String(row.follower_id)] = row;
  }
  return out;
}

/**
 * Follower / following counts for any profile (`users.id`).
 *
 * Prefer RPC `get_profile_follow_counts`: under typical RLS, direct `user_follows` counts are
 * only correct for your own profile (see `user_follows_select_own`). The RPC runs with definer
 * rights and returns aggregate counts only (no row exposure).
 */
export async function fetchFollowGraphCountsForAccount(userId) {
  const idNorm = coerceToUuidString(userId);
  if (!idNorm) return { followers: 0, following: 0 };

  const { data, error } = await supabase.rpc('get_profile_follow_counts', {
    p_profile_user_id: idNorm,
  });

  const rpcRow =
    Array.isArray(data) && data.length > 0
      ? data[0]
      : data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          ('followers' in data || 'following' in data)
        ? data
        : null;

  if (!error && rpcRow) {
    return {
      followers: Number(rpcRow.followers ?? 0) || 0,
      following: Number(rpcRow.following ?? 0) || 0,
    };
  }

  if (error && process.env.NODE_ENV === 'development') {
    console.warn(
      'get_profile_follow_counts:',
      error.message,
      '— using direct counts (wrong for other users until RPC is installed in Supabase)'
    );
  }

  const [fRes, gRes] = await Promise.all([
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', idNorm),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', idNorm),
  ]);
  return {
    followers: fRes.error ? 0 : (fRes.count ?? 0),
    following: gRes.error ? 0 : (gRes.count ?? 0),
  };
}

/**
 * Cards for App state `followedOrganizations` — source: public.user_follows + organizations/users.
 */
export async function fetchFollowedOrganizationCardsFromSupabase() {
  const uid = await getSupabaseAuthUid();
  if (!uid) return [];

  const { data: rows, error } = await supabase
    .from('user_follows')
    .select('following_id, created_at')
    .eq('follower_id', uid)
    .order('created_at', { ascending: false });

  if (error || !rows?.length) return [];

  const followingIdsOrdered = [];
  const seen = new Set();
  for (const r of rows) {
    const k = String(r.following_id);
    if (!r.following_id || seen.has(k)) continue;
    seen.add(k);
    followingIdsOrdered.push(r.following_id);
  }
  if (!followingIdsOrdered.length) return [];

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, user_id, name, username, email, university, type')
    .in('user_id', followingIdsOrdered);

  const orgByUser = Object.fromEntries((orgs || []).map((o) => [String(o.user_id), o]));

  const { data: profiles } = await supabase
    .from('users')
    .select('id, avatar_url, full_name, username, university, is_organization, email')
    .in('id', followingIdsOrdered);

  const profileById = Object.fromEntries((profiles || []).map((u) => [String(u.id), u]));

  const cards = [];
  for (const fid of followingIdsOrdered) {
    const key = String(fid);
    const o = orgByUser[key];
    const p = profileById[key];

    if (o) {
      const handle = o.username ? String(o.username).replace(/^@/, '') : '';
      const avatarRaw = p?.avatar_url != null ? String(p.avatar_url).trim() : '';
      const img =
        avatarRaw &&
        (avatarRaw.startsWith('http') ||
          avatarRaw.startsWith('data:') ||
          avatarRaw.startsWith('/'))
          ? avatarRaw
          : dicebear(o.user_id);
      cards.push({
        id: `supabase-org-${o.user_id}`,
        name: o.name || 'Organization',
        type: o.type || 'Organization',
        description: handle ? `@${handle} · ${o.university || ''}` : o.university || '',
        members: 0,
        image: img,
        email: o.email,
        university: o.university,
        username: handle,
        supabaseUserId: o.user_id,
        organizationTableId: coerceToUuidString(o.id),
        orgType: o.type,
        isSupabaseOrganization: true,
        category: 'Organization',
      });
      continue;
    }

    if (p) {
      const handle = p.username ? String(p.username).replace(/^@/, '') : '';
      const name =
        (p.full_name && String(p.full_name).trim()) ||
        handle ||
        emailLocalPart(p.email) ||
        'Member';
      const avatarRaw = p.avatar_url != null ? String(p.avatar_url).trim() : '';
      const image =
        avatarRaw &&
        (avatarRaw.startsWith('http') ||
          avatarRaw.startsWith('data:') ||
          avatarRaw.startsWith('/'))
          ? avatarRaw
          : dicebear(p.id);
      cards.push({
        id: `user-${p.id}`,
        name,
        type: p.is_organization ? 'Organization' : 'Member',
        description: handle ? `@${handle}` : '',
        members: 0,
        image,
        university: p.university,
        username: handle,
        supabaseUserId: p.id,
        isSupabaseOrganization: Boolean(p.is_organization),
        category: 'Organization',
      });
      continue;
    }

    cards.push({
      id: `follow-${key}`,
      name: 'Followed account',
      supabaseUserId: fid,
      image: dicebear(fid),
      university: '',
      category: 'Organization',
    });
  }

  return cards;
}

/** Accounts that follow the current user (or org). */
export async function fetchFollowersForProfile() {
  const uid = await getSupabaseAuthUid();
  if (!uid) return [];

  const { data: rows, error } = await supabase
    .from('user_follows')
    .select('follower_id, created_at')
    .eq('following_id', uid)
    .order('created_at', { ascending: false });

  if (error || !rows?.length) return [];

  const followerIds = [...new Set(rows.map((r) => r.follower_id).filter(Boolean))];

  const rpcMap = await fetchFollowerPublicLabelsMap(followerIds);

  let byId = {};
  let orgByUserId = {};
  const needClientFallback =
    rpcMap == null ||
    followerIds.some((fid) => !rpcMap[String(fid)]);
  if (needClientFallback) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, username, university, avatar_url, is_organization, email')
      .in('id', followerIds);

    byId = Object.fromEntries((users || []).map((u) => [String(u.id), u]));

    const { data: orgRows } = await supabase
      .from('organizations')
      .select('user_id, name, username, university, email')
      .in('user_id', followerIds);

    orgByUserId = Object.fromEntries((orgRows || []).map((o) => [String(o.user_id), o]));
  }

  return rows.map((r) => {
    const id = String(r.follower_id);
    const rpc = rpcMap && rpcMap[id];

    if (rpc) {
      const rawHandle = rpc.profile_handle
        ? String(rpc.profile_handle).replace(/^@/, '').trim()
        : '';
      const handleLabel = rawHandle ? `@${rawHandle}` : '';
      return {
        id,
        supabaseUserId: id,
        name: rpc.display_name || 'Someone',
        username: handleLabel || '@user',
        handleRaw: rawHandle || 'user',
        avatar: avatarUrlOrDicebear(rpc.avatar_url, r.follower_id),
        university: rpc.university != null ? String(rpc.university) : '',
        email: '',
        isOrganization: Boolean(rpc.is_org),
        isSupabaseOrganization: Boolean(rpc.is_org),
        createdAt: r.created_at,
      };
    }

    const u = byId[id];
    const org = orgByUserId[id];
    const { name, handleLabel, handleRaw: hr, avatar } = resolveFollowerDisplay(
      u,
      org,
      r.follower_id
    );
    const isOrg = Boolean(u?.is_organization) || Boolean(org);
    const fromEmail = emailLocalPart(u?.email);
    const handleRaw = hr || fromEmail || 'user';
    return {
      id,
      supabaseUserId: id,
      name,
      username: handleLabel || (fromEmail ? `@${fromEmail}` : '@user'),
      handleRaw,
      avatar,
      university: (isOrg && org?.university) || u?.university || '',
      email: org?.email || u?.email || '',
      isOrganization: isOrg,
      isSupabaseOrganization: isOrg,
      createdAt: r.created_at,
    };
  });
}
