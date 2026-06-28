import {
  supabase,
  isSupabaseConfigured,
  humanizeSupabaseAuthError,
  SIGNUP_DUPLICATE_ACCOUNT_MESSAGE,
} from './supabaseClient';

/**
 * Call before supabase.auth.signUp. Uses RPC check_signup_availability (anon-executable).
 * If the RPC is not installed, signup continues (see SQL file in repo).
 */
export async function checkSignupAvailabilityBeforeCreate(email, usernameRaw) {
  if (!isSupabaseConfigured()) return { ok: true };

  const p_email = String(email || '').trim().toLowerCase();
  const p_username = String(usernameRaw || '').replace(/^@/, '').trim().toLowerCase();
  if (!p_email || !p_username) return { ok: true };

  const { data, error } = await supabase.rpc('check_signup_availability', {
    p_email,
    p_username,
  });

  if (error) {
    const msg = String(error.message || '');
    if (/could not find the function|function .* does not exist|404/i.test(msg)) {
      console.warn('check_signup_availability RPC missing — run SUPABASE_SIGNUP_AVAILABILITY_RPC.sql');
      return { ok: true };
    }
    return { ok: false, error: humanizeSupabaseAuthError(msg) };
  }

  const status = typeof data === 'string' ? data : String(data || '');
  if (status === 'ok' || status === '') return { ok: true };
  if (status === 'invalid') return { ok: false, error: 'Email and username are required.' };
  return { ok: false, error: SIGNUP_DUPLICATE_ACCOUNT_MESSAGE };
}
