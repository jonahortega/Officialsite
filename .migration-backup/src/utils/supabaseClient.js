import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const TAB_AUTH_ID_KEY = 'greeklife_supabase_tab_auth_id';

/**
 * Per-tab Supabase session: each browser tab gets a unique storage key (stable for that tab
 * until it closes). Login uses password grant + setSession, so this no longer hangs like
 * signInWithPassword with a mismatched custom storageKey.
 * Tabs do not share auth via BroadcastChannel because each tab's channel name differs.
 */
function getPerTabAuthStorageKey() {
  if (typeof window === 'undefined') return 'sb-local-auth-token';
  let tabId = sessionStorage.getItem(TAB_AUTH_ID_KEY);
  if (!tabId) {
    tabId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(TAB_AUTH_ID_KEY, tabId);
  }
  const ref =
    (supabaseUrl && supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]) || 'project';
  return `sb-${ref}-auth-token-${tabId}`;
}

// Check if Supabase is configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Please check your .env file has:');
  console.error('REACT_APP_SUPABASE_URL=your_project_url');
  console.error('REACT_APP_SUPABASE_ANON_KEY=your_anon_key');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Per-tab auth isolation for localhost testing across multiple windows/accounts.
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    storageKey: getPerTabAuthStorageKey(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * `public.registrations` uses `registered_at`, not `created_at`. Old/cached bundles sometimes
 * still request `created_at`, which returns HTTP 400 and causes visible delay + console spam.
 * Only rewrite the registrations REST path (not `events` or `user_follows`, which use created_at).
 */
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const origFetch = window.fetch.bind(window);
  window.fetch = function fetchPatchRegistrationsTimestamp(input, init) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : '';
    if (
      typeof url === 'string' &&
      url.includes('/rest/v1/registrations') &&
      url.includes('created_at')
    ) {
      const fixed = url.replace(/created_at/g, 'registered_at');
      if (typeof input === 'string') {
        return origFetch(fixed, init);
      }
      if (input instanceof Request) {
        return origFetch(new Request(fixed, input), init);
      }
    }
    return origFetch(input, init);
  };
}

/** Canonical auth uid for RLS + events.created_by (always matches JWT sub when logged in). */
export function getSupabaseAuthCreatorUserId(user) {
  if (!user || typeof user !== 'object') return null;
  const id = user.supabaseUserId || user.userId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Strip legacy `supabase-` prefix; return a canonical UUID string or null. */
export function tryParseUuidString(id) {
  if (id == null || id === '') return null;
  const s = String(id).trim().replace(/^supabase-/, '');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    )
  ) {
    return null;
  }
  return s;
}

/** Used before login — empty env means fetch may hang or fail silently. */
export function isSupabaseConfigured() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  return Boolean(
    typeof url === 'string' &&
      url.trim().length > 0 &&
      typeof key === 'string' &&
      key.trim().length > 0
  );
}

/** Shown when signup finds an existing email/username or Auth rejects duplicate email. */
export const SIGNUP_DUPLICATE_ACCOUNT_MESSAGE =
  'An account with this username or email already exists';

/** Safari/WebKit often reports failed fetch as "Load failed" — give actionable text. */
export function humanizeSupabaseAuthError(message) {
  if (!message) return 'Something went wrong. Try again.';
  const m = String(message).toLowerCase();
  if (
    m.includes('load failed') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed')
  ) {
    return (
      'Could not reach Supabase (network or missing config). ' +
      'If you are on the deployed site: add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your host (e.g. Vercel) Environment Variables, then redeploy. ' +
      'On localhost, ensure .env has those values. Try another browser, disable VPN/ad blockers, and confirm the Supabase project is not paused.'
    );
  }
  if (
    m.includes('user already registered') ||
    m.includes('already been registered') ||
    m.includes('email address has already been registered') ||
    m.includes('email already registered') ||
    m.includes('a user with this email address has already been registered') ||
    (m.includes('email') && m.includes('already') && m.includes('registered'))
  ) {
    return SIGNUP_DUPLICATE_ACCOUNT_MESSAGE;
  }
  return message;
}

// Email validation — accepts any valid email format (no domain restrictions).
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const validateEmailForSignup = (email) => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, error: null };
};






























