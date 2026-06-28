import { supabase, isSupabaseConfigured, humanizeSupabaseAuthError } from './supabaseClient';
import { isSupabaseUuid } from './isSupabaseUuid';

/**
 * If profile/RPC/network fails after a successful password sign-in, still produce a usable app user
 * so login does not randomly fail while Auth session is valid.
 */
export function buildMinimalAppUserFromSession(session) {
  if (!session?.user?.id) return null;
  const u = session.user;
  const uid = u.id;
  const authEmail = (u.email || '').trim();
  const meta = u.user_metadata || {};
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.organization_name === 'string' && meta.organization_name.trim()) ||
    (authEmail.includes('@') ? authEmail.split('@')[0] : 'User');
  const unameRaw = String(meta.username || displayName || 'user').replace(/^@/, '');
  const acct = String(meta.account_type || '').toLowerCase();
  const isOrg =
    meta.org_signup === true ||
    meta.org_signup === 'true' ||
    acct === 'organization' ||
    acct === 'org' ||
    meta.is_organization === true ||
    meta.is_organization === 'true' ||
    Boolean(meta.organization_name);

  return {
    userId: uid,
    email: authEmail || meta.email || '',
    username: `@${unameRaw}`,
    isOrganization: isOrg,
    organizationName: isOrg ? displayName : undefined,
    name: displayName,
    firstName: isOrg ? displayName.split(/\s+/)[0] : displayName.split(/\s+/)[0],
    lastName: isOrg ? 'Admin' : displayName.split(/\s+/).slice(1).join(' ') || '',
    university: (typeof meta.university === 'string' && meta.university.trim()) || 'Rutgers University',
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid)}`,
    bio: undefined,
    chapter: isOrg ? displayName : undefined,
    phone: '',
    organization: isOrg
      ? {
          name: displayName,
          email: authEmail,
          university: (typeof meta.university === 'string' && meta.university.trim()) || 'Rutgers University',
          type: 'Organization',
        }
      : null,
    club: null,
    supabaseUserId: uid,
    supabaseIsOrganization: isOrg,
  };
}

/**
 * Use this for inserts into RLS-protected tables (e.g. registrations) where
 * WITH CHECK (auth.uid() = user_id) must match the JWT, not stale React state.
 */
export async function getSupabaseAuthUid() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const id = session?.user?.id;
  return id && isSupabaseUuid(id) ? id : null;
}

/**
 * After login / refresh, getSession() can briefly return null while the client writes JWT
 * to storage — RLS then returns empty rows. Poll until a uid exists or attempts exhausted.
 */
export async function waitForSupabaseAuthUid(options = {}) {
  const maxAttempts = typeof options.maxAttempts === 'number' ? options.maxAttempts : 14;
  const baseDelayMs = typeof options.baseDelayMs === 'number' ? options.baseDelayMs : 90;
  for (let i = 0; i < maxAttempts; i++) {
    const uid = await getSupabaseAuthUid();
    if (uid) return uid;
    await new Promise((r) => setTimeout(r, baseDelayMs + i * 45));
  }
  return null;
}

export function truthyDatabaseOrgFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === 't' || s === '1' || s === 'yes';
  }
  return false;
}

/**
 * Proactive refreshSession() right after password login raced with setSession + autoRefreshToken
 * for org accounts and could yield SIGNED_OUT a few seconds later. Only rotate the JWT when the
 * access token is near expiry; fresh sessions already carry claims from the token grant.
 */
function shouldRefreshOrgSessionForClaims(session) {
  if (!session) return false;
  const exp = session.expires_at;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;
  const secondsLeft = exp - Math.floor(Date.now() / 1000);
  return secondsLeft < 120;
}

/** DB RPC: writes is_organization + organizations from auth.users metadata (requires active JWT). */
export async function syncOrgProfileFromAuthRpc() {
  return supabase.rpc('apply_organization_signup_from_auth');
}

/**
 * Profile / UI: show org tools when DB or JWT says this auth user is an organization.
 * syncPatch merges into React user state (fixes stale localStorage missing isOrganization).
 */
export async function checkSupabaseOrganizationAccess(options = {}) {
  const fallbackEmail = (options.email || '').trim().toLowerCase();

  const compactOrgHandle = (label) =>
    String(label || '')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9._]/g, '')
      .toLowerCase() || 'organization';

  /** handleRaw = signup username from public.organizations / users (no @). */
  const buildOrgPatch = (uid, name, rowEmail, university, handleRaw, organizationId = null) => {
    const display =
      name ||
      (email && email.includes('@') ? email.split('@')[0] : null) ||
      'Organization';
    const handle =
      handleRaw != null && String(handleRaw).trim()
        ? String(handleRaw).replace(/^@/, '').trim()
        : compactOrgHandle(display);
    return {
      userId: uid,
      supabaseUserId: uid,
      isOrganization: true,
      supabaseIsOrganization: true,
      organizationName: display,
      name: display,
      username: `@${handle}`,
      university: university || 'Rutgers University',
      organization: {
        name: display,
        email: rowEmail || email || fallbackEmail,
        university: university || 'Rutgers University',
        type: 'Organization',
        ...(organizationId ? { id: organizationId } : {}),
      },
    };
  };

  const patchFromMinimal = (minimal) => {
    if (!minimal?.userId) return null;
    return {
      userId: minimal.userId,
      supabaseUserId: minimal.supabaseUserId || minimal.userId,
      isOrganization: true,
      supabaseIsOrganization: true,
      organizationName: minimal.organizationName,
      name: minimal.name,
      email: minimal.email,
      university: minimal.university,
      organization: minimal.organization,
    };
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { isOrg: false, reason: 'no_session', syncPatch: null };
    }

    const uid = session.user.id;
    const email = (session.user.email || fallbackEmail || '').trim().toLowerCase();

    const _pm = session.user.user_metadata || {};
    if (
      _pm.org_signup === true ||
      _pm.org_signup === 'true' ||
      String(_pm.account_type || '').toLowerCase() === 'organization' ||
      (typeof _pm.organization_name === 'string' && _pm.organization_name.trim().length > 0)
    ) {
      if (shouldRefreshOrgSessionForClaims(session)) {
        try {
          await supabase.auth.refreshSession();
        } catch (_) {
          /* ignore */
        }
      }
    }

    const { error: rpcOrgErr } = await supabase.rpc('apply_organization_signup_from_auth');
    if (rpcOrgErr && process.env.NODE_ENV === 'development') {
      console.warn('apply_organization_signup_from_auth:', rpcOrgErr.message);
    }

    let urow = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await supabase
        .from('users')
        .select('is_organization, full_name, university, email, username')
        .eq('id', uid)
        .maybeSingle();
      urow = data;
      if (urow && truthyDatabaseOrgFlag(urow.is_organization)) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 100));
    }

    if (urow && truthyDatabaseOrgFlag(urow.is_organization)) {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('id, name, username')
        .eq('user_id', uid)
        .maybeSingle();
      const display =
        (orgRow?.name && String(orgRow.name).trim()) ||
        (urow.full_name && String(urow.full_name).trim()) ||
        (urow.username && String(urow.username).trim()) ||
        (email ? email.split('@')[0] : 'Organization');
      const handle =
        (orgRow?.username && String(orgRow.username).trim()) ||
        (urow.username && String(urow.username).trim()) ||
        null;
      return {
        isOrg: true,
        reason: 'users.is_organization',
        syncPatch: buildOrgPatch(uid, display, urow.email || email, urow.university, handle, orgRow?.id),
      };
    }

    const { data: orgByUid } = await supabase
      .from('organizations')
      .select('id, name, username, email, university')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();

    if (orgByUid) {
      return {
        isOrg: true,
        reason: 'organizations.user_id',
        syncPatch: buildOrgPatch(
          uid,
          orgByUid.name,
          orgByUid.email || email,
          orgByUid.university,
          orgByUid.username,
          orgByUid.id
        ),
      };
    }

    if (email) {
      const { data: orgByEmail } = await supabase
        .from('organizations')
        .select('id, name, username, email, university')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (orgByEmail) {
        return {
          isOrg: true,
          reason: 'organizations.email',
          syncPatch: buildOrgPatch(
            uid,
            orgByEmail.name,
            orgByEmail.email || email,
            orgByEmail.university,
            orgByEmail.username,
            orgByEmail.id
          ),
        };
      }

      const { data: orgByEmailIlike } = await supabase
        .from('organizations')
        .select('id, name, username, email, university')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (orgByEmailIlike) {
        return {
          isOrg: true,
          reason: 'organizations.email_ilike',
          syncPatch: buildOrgPatch(
            uid,
            orgByEmailIlike.name,
            orgByEmailIlike.email || email,
            orgByEmailIlike.university,
            orgByEmailIlike.username,
            orgByEmailIlike.id
          ),
        };
      }
    }

    const { data: memRows, error: memErr } = await supabase
      .from('organization_members')
      .select('organization_id, is_org_admin, organizations ( id, name, username, email, university )')
      .eq('user_id', uid);

    if (!memErr && memRows && memRows.length > 0) {
      const sorted = [...memRows].sort(
        (a, b) => Number(Boolean(b.is_org_admin)) - Number(Boolean(a.is_org_admin))
      );
      const primary = sorted[0];
      const inner = primary.organizations;
      const oid = inner?.id || primary.organization_id;
      /** Personal account: do not merge org display name / username onto the member. */
      return {
        isOrg: false,
        orgMemberPosting: true,
        reason: 'organization_members',
        syncPatch: {
          orgMemberPosting: true,
          organization: {
            id: oid,
            name: (inner?.name && String(inner.name).trim()) || '',
            university: (inner?.university && String(inner.university).trim()) || '',
            email: (inner?.email && String(inner.email).trim()) || '',
            type: 'Organization',
          },
        },
      };
    }

    const minimal = buildMinimalAppUserFromSession(session);
    if (minimal?.isOrganization) {
      return {
        isOrg: true,
        reason: 'auth.user_metadata',
        syncPatch: patchFromMinimal(minimal),
      };
    }

    return { isOrg: false, reason: 'not_organization', syncPatch: null };
  } catch (e) {
    console.warn('checkSupabaseOrganizationAccess:', e);
    return { isOrg: false, reason: 'error', syncPatch: null };
  }
}

/**
 * Writes public.users (is_organization = true) + public.organizations for accounts
 * that signed up via "Sign up as organization" (metadata: organization_name / is_organization).
 * Call when a JWT exists (sign-in or signUp that returns a session).
 *
 * @returns {{ ok: true, skipped?: true } | { ok: false, error: string }}
 */
export async function ensureSupabaseOrganizationProfile(session) {
  if (!session?.user?.id) return { ok: true, skipped: true };

  const u = session.user;
  const meta = u.user_metadata || {};
  const orgNameMeta =
    typeof meta.organization_name === 'string' ? meta.organization_name.trim() : '';
  const accountType = String(meta.account_type || '').toLowerCase();
  const isOrgMeta =
    meta.org_signup === true ||
    meta.org_signup === 'true' ||
    meta.org_signup === 1 ||
    accountType === 'organization' ||
    accountType === 'org' ||
    meta.is_organization === true ||
    meta.is_organization === 'true' ||
    orgNameMeta.length > 0;

  if (!isOrgMeta) return { ok: true, skipped: true };

  const uid = u.id;
  const email = (u.email || '').trim().toLowerCase();
  if (!email) {
    return { ok: false, error: 'Account has no email; cannot save organization profile.' };
  }

  const orgName =
    orgNameMeta ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    email.split('@')[0];
  const university =
    (typeof meta.university === 'string' && meta.university.trim()) || 'Rutgers University';
  const usernameRaw =
    (typeof meta.username === 'string' && meta.username.replace(/^@/, '').trim()) ||
    orgName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();

  const { data: existingUser } = await supabase
    .from('users')
    .select('username, full_name')
    .eq('id', uid)
    .maybeSingle();
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('username, name')
    .eq('user_id', uid)
    .maybeSingle();

  // Do not overwrite Settings-saved values with stale JWT metadata on every session rebuild.
  const effectiveUsername =
    (existingUser?.username && String(existingUser.username).trim()) ||
    (existingOrg?.username && String(existingOrg.username).trim()) ||
    usernameRaw;
  const effectiveOrgName =
    (existingUser?.full_name && String(existingUser.full_name).trim()) ||
    (existingOrg?.name && String(existingOrg.name).trim()) ||
    orgName;

  const userPayload = {
    id: uid,
    email,
    username: effectiveUsername,
    full_name: effectiveOrgName,
    university,
    is_organization: true,
  };
  if (!existingUser) {
    userPayload.avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=organization`;
  }

  const { error: userErr } = await supabase.from('users').upsert(userPayload, { onConflict: 'id' });

  const { error: orgErr } = await supabase.from('organizations').upsert(
    {
      user_id: uid,
      name: effectiveOrgName,
      username: effectiveUsername,
      email,
      university,
      type: 'Organization',
    },
    { onConflict: 'user_id' }
  );

  if (userErr || orgErr) {
    const msg = [userErr?.message, orgErr?.message].filter(Boolean).join(' ');
    console.warn('ensureSupabaseOrganizationProfile:', msg);
    return {
      ok: false,
      error: msg || 'Could not save organization profile (public.users / organizations).',
    };
  }

  return { ok: true };
}

/**
 * Load public.users (and fallback organizations row) for the authenticated Supabase user.
 * This is what makes "Create Event" appear for org accounts stored in Supabase.
 */
export async function buildAppUserFromAuthSession(session) {
  if (!session?.user?.id) return null;

  // Refresh JWT when metadata looks like org signup so PostgREST sends full user_metadata in RPC claims.
  const _m = session.user.user_metadata || {};
  if (
    _m.org_signup === true ||
    _m.org_signup === 'true' ||
    String(_m.account_type || '').toLowerCase() === 'organization' ||
    (typeof _m.organization_name === 'string' && _m.organization_name.trim().length > 0)
  ) {
    if (shouldRefreshOrgSessionForClaims(session)) {
      try {
        await supabase.auth.refreshSession();
      } catch (_) {
        /* ignore */
      }
    }
  }

  // Server-side fix: JWT + auth.users metadata → public.users.is_organization (see SUPABASE_RPC_APPLY_ORG_PROFILE.sql).
  const { error: rpcOrgErr } = await supabase.rpc('apply_organization_signup_from_auth');
  if (rpcOrgErr) {
    console.warn(
      'apply_organization_signup_from_auth (run SUPABASE_RPC_APPLY_ORG_PROFILE.sql if missing):',
      rpcOrgErr.message
    );
  }

  const ensured = await ensureSupabaseOrganizationProfile(session);
  if (!ensured.ok && !ensured.skipped) {
    console.warn('buildAppUserFromAuthSession: org profile sync failed:', ensured.error);
  }

  const uid = session.user.id;
  const authEmail = session.user.email || '';

  let { data: profile } = await supabase
    .from('users')
    .select('id, email, username, full_name, university, is_organization, bio, avatar_url')
    .eq('id', uid)
    .maybeSingle();

  // Row missing, null org flag, or false after a bad sync — still honor organizations row
  const needsOrgFallback =
    !profile ||
    profile.is_organization == null ||
    !truthyDatabaseOrgFlag(profile.is_organization);

  if (needsOrgFallback) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, username, email, university, user_id, type')
      .eq('user_id', uid)
      .maybeSingle();

    if (org) {
      const nameSlug =
        org.name?.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._]/g, '').toLowerCase() || 'organization';
      profile = {
        ...(profile || {}),
        id: uid,
        email: org.email || profile?.email || authEmail,
        username: org.username || profile?.username || nameSlug,
        full_name: org.name || profile?.full_name,
        university: org.university || profile?.university,
        is_organization: true,
        bio: profile?.bio ?? null,
        avatar_url: profile?.avatar_url ?? null,
      };
    }
  }

  // Auth user_metadata from signUp (e.g. org flow) when public.users row is missing
  const meta = session.user.user_metadata || {};
  if (!profile) {
    const acct = String(meta.account_type || '').toLowerCase();
    const metaOrg =
      meta.org_signup === true ||
      meta.org_signup === 'true' ||
      meta.org_signup === 1 ||
      acct === 'organization' ||
      acct === 'org' ||
      meta.is_organization === true ||
      meta.is_organization === 'true' ||
      Boolean(meta.organization_name);
    profile = {
      id: uid,
      email: authEmail,
      username: meta.username || authEmail.split('@')[0],
      full_name: meta.organization_name || meta.full_name || authEmail.split('@')[0],
      university: meta.university || 'Rutgers University',
      is_organization: metaOrg,
      bio: meta.bio || null,
      avatar_url: meta.avatar_url || null,
    };
  }

  if (profile && truthyDatabaseOrgFlag(profile.is_organization)) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name, username')
      .eq('user_id', uid)
      .maybeSingle();
    if (orgRow?.name) {
      const fn = profile?.full_name != null ? String(profile.full_name).trim() : '';
      if (!fn) {
        profile = { ...profile, full_name: orgRow.name };
      }
    }
    // Prefer public.users.username (Settings updates both; users row is canonical for handle).
    if (orgRow?.username) {
      const uName = profile?.username != null ? String(profile.username).trim() : '';
      if (!uName) {
        profile = { ...profile, username: orgRow.username };
      }
    }
  }

  const rawOrg = profile?.is_organization;
  const isOrg =
    rawOrg === true ||
    rawOrg === 'true' ||
    rawOrg === 1 ||
    String(rawOrg).toLowerCase() === 't';

  const displayName =
    profile?.full_name ||
    authEmail.split('@')[0] ||
    'User';

  const unameRaw = (profile?.username || displayName || 'user').replace(/^@/, '');

  return {
    userId: uid,
    email: profile?.email || authEmail,
    username: `@${unameRaw}`,
    isOrganization: isOrg,
    organizationName: isOrg ? profile?.full_name : undefined,
    name: displayName,
    firstName: isOrg
      ? (profile?.full_name || 'Organization').split(/\s+/)[0]
      : displayName.split(/\s+/)[0],
    lastName: isOrg
      ? 'Admin'
      : displayName.split(/\s+/).slice(1).join(' ') || '',
    university: profile?.university || 'Rutgers University',
    image:
      profile?.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid)}`,
    bio:
      profile?.bio != null && String(profile.bio).trim() !== ''
        ? profile.bio
        : undefined,
    chapter: isOrg ? profile?.full_name : undefined,
    phone: '',
    organization: isOrg
      ? {
          name: profile?.full_name,
          email: profile?.email || authEmail,
          university: profile?.university,
          type: 'Organization',
        }
      : null,
    club: null,
    supabaseUserId: uid,
    supabaseIsOrganization: isOrg,
  };
}

/** Every Supabase auth HTTP call must be bounded — unbounded awaits caused infinite spinners. */
function withTimeout(promise, ms, label = 'op') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_timeout`)), ms)
    ),
  ]);
}

const GET_SESSION_TIMEOUT_MS = 10000;
const SET_SESSION_TIMEOUT_MS = 20000;

/**
 * Password login via Auth HTTP API + setSession — bypasses supabase-js signInWithPassword when
 * that promise never settles after HTTP 200 (seen with custom storage + some browsers).
 */
async function signInViaPasswordGrant(email, password) {
  const base = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  if (!base || !key) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }

  let res;
  try {
    res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    return {
      data: null,
      error: { message: humanizeSupabaseAuthError(err?.message) || String(err?.message || 'Network error') },
    };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      json.error_description ||
      json.error ||
      json.msg ||
      json.message ||
      `Sign in failed (${res.status})`;
    return { data: null, error: { message: msg } };
  }

  const access_token = json.access_token;
  const refresh_token = json.refresh_token;
  if (!access_token || !refresh_token) {
    return { data: null, error: { message: 'Invalid response from authentication server.' } };
  }

  try {
    const setResult = await withTimeout(
      supabase.auth.setSession({ access_token, refresh_token }),
      SET_SESSION_TIMEOUT_MS,
      'setSession'
    );
    const setErr = setResult?.error;
    if (setErr) {
      return { data: null, error: setErr };
    }
  } catch (e) {
    const m = String(e?.message || e);
    if (m.includes('setSession_timeout')) {
      return {
        data: null,
        error: {
          message:
            'Session could not be saved in this browser. Try clearing site data for localhost, disabling extensions, or another browser.',
        },
      };
    }
    throw e;
  }

  let session;
  let u;
  try {
    const { data: gs, error: gErr } = await withTimeout(
      supabase.auth.getSession(),
      GET_SESSION_TIMEOUT_MS,
      'getSession'
    );
    if (gErr) {
      return { data: null, error: gErr };
    }
    session = gs?.session;
    u = session?.user;
  } catch (e) {
    const m = String(e?.message || e);
    if (m.includes('getSession_timeout') && json.user?.id) {
      u = json.user;
      session = {
        access_token,
        refresh_token,
        expires_in: json.expires_in,
        expires_at: json.expires_at,
        token_type: json.token_type,
        user: json.user,
      };
    } else {
      throw e;
    }
  }

  if (!u?.id) {
    return { data: null, error: { message: 'No user in session after sign-in.' } };
  }

  return {
    data: { user: u, session },
    error: null,
  };
}

/**
 * Real Supabase sign-in. Returns `{ ok, appUser?, session?, error? }`.
 * Uses minimal user from JWT only; full profile loads in App via onAuthStateChange.
 */
export async function trySupabaseLoginAndBuildUser(emailInput, password) {
  const trimmed = (emailInput || '').trim();
  if (!trimmed || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file, restart the dev server (npm start), then try again.',
    };
  }

  const authEmail = trimmed.includes('@') ? trimmed.toLowerCase() : null;
  if (!authEmail) {
    return { ok: false, error: 'Please sign in with your full email address.' };
  }

  const { data: authData, error: authError } = await signInViaPasswordGrant(authEmail, password);

  if (authError) {
    return {
      ok: false,
      error: humanizeSupabaseAuthError(authError.message) || 'Invalid email or password.',
    };
  }

  if (!authData?.user) {
    return {
      ok: false,
      error: 'No user returned. Confirm your email or try again.',
    };
  }

  let session = authData.session;
  if (session?.user?.id) {
    const minimal = buildMinimalAppUserFromSession(session);
    if (minimal) return { ok: true, appUser: minimal, session };
    return { ok: false, error: 'Could not build your profile from the session.' };
  }

  try {
    const { data: gs } = await withTimeout(
      supabase.auth.getSession(),
      GET_SESSION_TIMEOUT_MS,
      'getSession'
    );
    session = gs?.session;
  } catch {
    session = null;
  }

  if (!session?.user?.id && authData.user?.id) {
    session = { user: authData.user };
  }

  if (!session?.user?.id) {
    return {
      ok: false,
      error:
        'Confirm your email before signing in (check your inbox), then try again.',
    };
  }

  const minimal = buildMinimalAppUserFromSession(session);
  if (minimal) return { ok: true, appUser: minimal, session };
  return { ok: false, error: 'Could not load your account. Try again.' };
}
