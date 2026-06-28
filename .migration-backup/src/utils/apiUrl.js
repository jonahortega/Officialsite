/**
 * Builds the URL for the Node/Express API (Stripe checkout, Connect onboarding, etc.).
 *
 * - **Local dev:** Leave `REACT_APP_API_URL` **unset**. Then paths are `/api/...` and the CRA
 *   dev server (package.json `proxy`) forwards them to `http://localhost:3001` — same tab,
 *   fewer CORS issues. Run API + web (`npm run start:local`) or `npm run server` + `npm start`.
 *   Only set `REACT_APP_API_URL=http://localhost:3001` if you *want* direct cross-origin calls;
 *   then `CORS_ORIGIN` on the API must include `http://localhost:3000`.
 * - **Vercel / production:** Set `REACT_APP_API_URL` at **build** time to your API origin
 *   (no trailing slash), e.g. `https://your-api.onrender.com`.
 */
export function getApiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');
  if (base) return `${base}${normalized}`;
  return normalized;
}

/** True when CRA build embedded a non-empty production API origin (See getApiUrl). */
export function hasApiBaseUrl() {
  return Boolean((process.env.REACT_APP_API_URL || '').trim());
}

/** If Pay is clicked on Vercel/production without REACT_APP_API_URL, checkout calls this site (HTML), not Render. */
export function alertIfProductionMissingApiBase() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return false;
  if (hasApiBaseUrl()) return false;
  alert(
    'Payments are not wired for this deployment yet.\n\n' +
      'In Vercel → Project → Settings → Environment Variables (Production), add:\n' +
      'REACT_APP_API_URL = https://YOUR-RENDER-API.onrender.com\n' +
      '(your Render API URL from the dashboard, no slash at the end)\n\n' +
      'Then redeploy so the build picks it up.'
  );
  return true;
}

/** Vercel SPA HTML when /api was requested without REACT_APP_API_URL (often HTTP 200). */
export function responseLooksLikeHtml(raw) {
  const s = String(raw || '').trimStart();
  return s.startsWith('<') || /^<!DOCTYPE/i.test(s);
}

/** User-facing hint when fetch() throws (wrong API URL, CORS, or API down). */
export function checkoutFetchFailedMessage(path = '/api/create-checkout-session') {
  const url = getApiUrl(path);
  const baseOk = hasApiBaseUrl();
  return (
    'Could not reach the payment server (network/CORS).\n\n' +
    `Attempted URL:\n${url}\n\n` +
    (baseOk
      ? 'If the URL is wrong, fix REACT_APP_API_URL on Vercel and redeploy.\n'
      : 'If you only see "/api/…" above, Vercel is missing REACT_APP_API_URL (set to your Render API origin, no trailing slash) — redeploy.\n') +
    'On Render: set CORS_ORIGIN to your exact site origin (e.g. https://your-app.vercel.app). ' +
    'For Preview + Production, use a comma-separated list. Redeploy the API after changes.\n\n' +
    'Tip: DevTools → Network → create-checkout-session. A failed OPTIONS request usually means CORS_ORIGIN mismatch.'
  );
}
