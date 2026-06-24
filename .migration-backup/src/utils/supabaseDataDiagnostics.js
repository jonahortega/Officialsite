import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Run in the browser console: __greekLifeDiagSupabase()
 * Paste the printed object (or screenshot) when debugging empty feeds / RLS.
 */
export async function runSupabaseDataDiagnostics() {
  const out = {
    configured: isSupabaseConfigured(),
    urlHost: (process.env.REACT_APP_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('/')[0] || '(missing)',
    time: new Date().toISOString(),
  };

  if (!out.configured) {
    out.error = 'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env then restart npm start.';
    console.warn('[GL_DIAG]', out);
    return out;
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  out.sessionError = sessionErr?.message || null;
  out.hasSession = Boolean(session?.user?.id);
  out.uid = session?.user?.id || null;
  out.hasAccessToken = Boolean(session?.access_token);

  const evHead = await supabase.from('events').select('*', { count: 'exact', head: true });
  out.eventsCountRls = evHead.count;
  out.eventsHeadError = evHead.error
    ? { message: evHead.error.message, code: evHead.error.code, details: evHead.error.details }
    : null;

  const evSample = await supabase.from('events').select('id,title').limit(3);
  out.eventsSampleLength = evSample.data?.length ?? 0;
  out.eventsSampleError = evSample.error
    ? { message: evSample.error.message, code: evSample.error.code, details: evSample.error.details }
    : null;

  const regHead = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true });
  out.registrationsCountRls = regHead.count;
  out.registrationsHeadError = regHead.error
    ? { message: regHead.error.message, code: regHead.error.code, details: regHead.error.details }
    : null;

  const regSample = await supabase.from('registrations').select('event_id,user_id').limit(5);
  out.registrationsSampleLength = regSample.data?.length ?? 0;
  out.registrationsSampleError = regSample.error
    ? { message: regSample.error.message, code: regSample.error.code, details: regSample.error.details }
    : null;

  out.readThisFirst =
    !out.hasAccessToken &&
    'NOT LOGGED IN — you ran this on Welcome/Login. Sign in first, open Home, then run __greekLifeDiagSupabase() again. (While logged out, hasSession is always false; that is normal.)';

  console.warn('[GL_DIAG] Supabase data check — copy this object:', out);

  if (!out.hasAccessToken) {
    console.warn(
      '[GL_DIAG] No JWT while on login/welcome = expected. After you click Sign In and land on Home, run __greekLifeDiagSupabase() again. If hasSession is still false then, try another browser tab or clear site data for localhost.'
    );
  } else if (out.eventsCountRls === 0 && !out.eventsHeadError && !out.eventsSampleError) {
    console.warn(
      '[GL_DIAG] JWT present but 0 events visible: RLS on public.events is still blocking SELECT for this user. Re-run the SQL that adds "Authenticated users can view all events" (USING true) or fix policies in Supabase.'
    );
  }

  return out;
}

export function exposeSupabaseDiagnostics() {
  if (typeof window === 'undefined') return;
  window.__greekLifeDiagSupabase = runSupabaseDataDiagnostics;
}
