import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useReducer } from 'react';
import './App.css';
import ErrorBoundary from './ErrorBoundary';
import { supabase } from './utils/supabaseClient';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import UserInfoScreen from './screens/UserInfoScreen';
import UniversityScreen from './screens/UniversityScreen';
import OrganizationsScreen from './screens/OrganizationsScreen';
import OrganizationProfileScreen from './screens/OrganizationProfileScreen';
import ClubsScreen from './screens/ClubsScreen';
import DashboardScreen from './screens/DashboardScreen';
import EventsScreen from './screens/EventsScreen';
import MapScreen from './screens/MapScreen';
import MessagesScreen from './screens/MessagesScreen';
import TicketsScreen from './screens/TicketsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import LabScreen from './screens/LabScreen';
import SearchScreen from './screens/SearchScreen';
import OrganizationSignupScreen from './screens/OrganizationSignupScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import Navigation from './components/Navigation';
import MessagesDropdown from './components/MessagesDropdown';
import DarkModeToggle from './components/DarkModeToggle';
import WelcomeModal from './components/WelcomeModal';
import {
  buildAppUserFromAuthSession,
  buildMinimalAppUserFromSession,
  ensureSupabaseOrganizationProfile,
  syncOrgProfileFromAuthRpc,
} from './utils/supabaseSessionUser';
import { validateEmailForSignup, humanizeSupabaseAuthError } from './utils/supabaseClient';
import { checkSignupAvailabilityBeforeCreate } from './utils/signupAvailability';
import { fetchFollowedOrganizationCardsFromSupabase } from './utils/followGraphSupabase';
import { isSupabaseUuid } from './utils/isSupabaseUuid';
import {
  buildJoinedEventsFromRegistrations,
  fetchMergedSupabaseEventsForUser,
  preloadEventsAndJoinedForSession,
} from './utils/supabaseJoinedEventsHydration';
import { fetchMyJoinRequestStatusMap } from './utils/eventJoinRequestSupabase';

const ORG_LOGIN_HINT_KEY = 'greeklife_last_org_login';
const ORG_NAME_HINT_KEY = 'greeklife_last_org_name';
/** Persisted when user taps "Show Create Event" on Profile (demo / mock logins). */
const ORG_HOSTING_KEY = 'greeklife_manual_org_hosting';
const SIGNUP_TIMEOUT_MS = 15000;

/** Org signup writes these to localStorage; first-login fallback must read the same stores. */
function readOrgSignupHintRaw() {
  try {
    return (
      sessionStorage.getItem(ORG_LOGIN_HINT_KEY) ||
      localStorage.getItem(ORG_LOGIN_HINT_KEY) ||
      ''
    );
  } catch (_) {
    return '';
  }
}

function readOrgSignupNameHint() {
  try {
    return (
      sessionStorage.getItem(ORG_NAME_HINT_KEY) ||
      localStorage.getItem(ORG_NAME_HINT_KEY) ||
      ''
    );
  } catch (_) {
    return '';
  }
}

function clearOrgSignupHints() {
  try {
    sessionStorage.removeItem(ORG_LOGIN_HINT_KEY);
    sessionStorage.removeItem(ORG_NAME_HINT_KEY);
    localStorage.removeItem(ORG_LOGIN_HINT_KEY);
    localStorage.removeItem(ORG_NAME_HINT_KEY);
  } catch (_) {
    /* ignore */
  }
}

/**
 * Optional dev testing only: `?devWelcome=1` signs out once and opens login (no env flag).
 */
let devWelcomeAuthSuppress = false;

function isDevWelcomeQueryActive() {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('devWelcome') === '1';
  } catch (_) {
    return false;
  }
}

function stripDevWelcomeQuery() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('devWelcome') !== '1') return;
    u.searchParams.delete('devWelcome');
    const qs = u.searchParams.toString();
    window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
  } catch (_) {}
}

function devLoggedOutLandingScreen() {
  return isDevWelcomeQueryActive() ? 'login' : 'welcome';
}

const initialRoute = { screen: 'welcome', navigationData: null };

function routeReducer(state, action) {
  if (action.type === 'NAVIGATE') {
    return {
      screen: action.screen,
      navigationData: action.data == null ? null : action.data,
    };
  }
  return state;
}

function applyManualOrgHostingToUser(user) {
  if (!user || typeof user !== 'object') return user;
  const orgName =
    user.organizationName ||
    user.organization?.name ||
    user.name ||
    'My Organization';
  return {
    ...user,
    isOrganization: true,
    supabaseIsOrganization: true,
    organizationName: orgName,
    organization: {
      name: orgName,
      email: user.email,
      university: user.university || 'Rutgers University',
      type: 'Organization',
    },
  };
}

function localLoginIdFromUser(user) {
  const raw = user?.username || user?.email || '';
  return raw.replace(/^@/, '').split('@')[0].toLowerCase().trim();
}

/** Fix older sessions: usernames like testorg logged in as plain students without isOrganization */
function normalizeOrganizationUser(user) {
  if (!user || typeof user !== 'object') return user;
  if (user.isOrganization === true || user?.organization?.type === 'Organization') return user;

  const id = localLoginIdFromUser(user);
  if (!id) return user;
  // Only treat known demo org logins — avoid false positives (e.g. usernames ending in "org")
  const inferred = id === 'testorg' || id === 'demoorg';
  if (!inferred) return user;

  const orgName =
    user.organizationName ||
    user.organization?.name ||
    user.name ||
    (id.endsWith('org') && id.length > 3
      ? [id.slice(0, -3), 'org']
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      : id.charAt(0).toUpperCase() + id.slice(1));

  const emailLower = String(user.email || `${id}@example.com`).toLowerCase();

  return {
    ...user,
    isOrganization: true,
    organizationName: user.organizationName || orgName,
    name: orgName,
    userId: user.userId || `org_${emailLower}`,
    organization: {
      name: orgName,
      email: user.email,
      university: user.university,
      type: 'Organization'
    }
  };
}

/**
 * Auth events (e.g. TOKEN_REFRESHED) rebuild the user from Supabase. Merge in local profile
 * edits that are not stored yet (data: avatars, bio) so navigation does not wipe Settings changes.
 */
function mergeSessionUserWithPrevious(prev, next) {
  if (!next) return prev;
  if (!prev) return next;
  const a = String(prev.supabaseUserId || prev.userId || '');
  const b = String(next.supabaseUserId || next.userId || '');
  if (!a || !b || a !== b) return next;
  const m = { ...next };

  const prevImg = prev.image;
  const nextImg = next.image;
  if (
    typeof prevImg === 'string' &&
    prevImg.startsWith('data:') &&
    (!nextImg ||
      (typeof nextImg === 'string' &&
        (nextImg.includes('dicebear.com') || nextImg.includes('api.dicebear.com'))))
  ) {
    m.image = prevImg;
  }

  const prevBio = prev.bio != null ? String(prev.bio).trim() : '';
  const nextBio = next.bio != null ? String(next.bio).trim() : '';
  const nextLooksLikeStockOrgBio =
    Boolean(next.isOrganization) && nextBio.startsWith('Official account for');
  if (prevBio && (nextBio === '' || nextLooksLikeStockOrgBio)) {
    m.bio = prev.bio;
  }

  return m;
}

function App() {
  const [route, dispatchRoute] = useReducer(routeReducer, initialRoute);
  const currentScreen = route.screen;
  const navigationData = route.navigationData;
  const navigateTo = useCallback((screen, data = null) => {
    dispatchRoute({ type: 'NAVIGATE', screen, data });
  }, []);

  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [supabaseEvents, setSupabaseEvents] = useState([]);
  const [joinRequestStatusByEventId, setJoinRequestStatusByEventId] = useState({});
  /** Stale-safe read inside refreshSupabaseEvents (avoid skipping refetch while feed still empty). */
  const supabaseEventsRef = useRef([]);
  const [followedOrganizations, setFollowedOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchSortBy, setSearchSortBy] = useState('date');
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [searchType, setSearchType] = useState('events');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  /** Avoid redundant profile rebuilds; cross-tab sync often uses TOKEN_REFRESHED, not SIGNED_IN. */
  const lastAppliedAuthUidRef = useRef(null);
  /** Dedupe: preload already ran fetchMerged + joined; skip immediate duplicate effects. */
  const eventsRefreshRef = useRef({ inFlight: false, lastKey: '', lastAt: 0 });
  const joinedHydrateSkipRef = useRef({ uid: null, at: 0 });
  /** LoginScreen already ran preloadEventsAndJoinedForSession — skip duplicate fetch in applyAuthSession. */
  const loginPreloadDoneRef = useRef({ uid: null, at: 0 });
  /** Supabase PASSWORD_RECOVERY — do not send user to Home until they finish ResetPasswordScreen. */
  const passwordRecoveryActiveRef = useRef(false);

  const [paymentToast, setPaymentToast] = useState(null);

  useLayoutEffect(() => {
    if (isDevWelcomeQueryActive()) {
      devWelcomeAuthSuppress = true;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (!paymentStatus) return;
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    if (paymentStatus === 'success') {
      const kind = params.get('kind');
      setPaymentToast(
        kind === 'fundraiser'
          ? 'Thank you! Your donation was received.'
          : 'Payment successful! Your ticket is ready.'
      );
      setTimeout(() => setPaymentToast(null), 5000);
      void supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id;
        if (uid) void buildJoinedEventsFromRegistrations(uid).then(setJoinedEvents);
      });
    } else if (paymentStatus === 'cancelled') {
      setPaymentToast('Payment was cancelled.');
      setTimeout(() => setPaymentToast(null), 4000);
      void supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id;
        if (uid) void buildJoinedEventsFromRegistrations(uid).then(setJoinedEvents);
      });
    }
  }, []);

  /** Stripe Connect onboarding return — open Settings → Payouts on the CRA app (port 3000). */
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const payoutReturn =
        u.searchParams.get('stripe_payout_return') === '1' || u.searchParams.get('stripe_payout_refresh') === '1';
      if (!payoutReturn) return;
      if (!isAuthenticated) return;
      navigateTo('settings', { settingsSection: 'payouts' });
      u.searchParams.delete('stripe_payout_return');
      u.searchParams.delete('stripe_payout_refresh');
      const qs = u.searchParams.toString();
      window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
    } catch (_) {
      /* ignore */
    }
  }, [isAuthenticated, navigateTo]);

  const applyAuthSession = useCallback(async (session, fullProfile = true) => {
    if (!session?.user?.id) return;
    const sessionUid = session.user.id;
    /** Same uid = token refresh / duplicate auth events — still merge user, never touch navigation (avoids post-login flicker for orgs). */
    const isSameSessionIdentity = lastAppliedAuthUidRef.current === sessionUid;

    const loginPreloadSkip =
      loginPreloadDoneRef.current.uid === sessionUid &&
      Date.now() - loginPreloadDoneRef.current.at < 12000;

    const applyFastPath = (preloaded) => {
      const minimal = buildMinimalAppUserFromSession(session);
      if (!minimal) return;
      setUser((prev) => normalizeOrganizationUser(mergeSessionUserWithPrevious(prev, minimal)));
      setIsAuthenticated(true);
      if (preloaded) {
        setSupabaseEvents(preloaded.supabaseEvents);
        setJoinedEvents(preloaded.joinedEvents);
        if (preloaded.joinRequestStatusByEventId) {
          setJoinRequestStatusByEventId(preloaded.joinRequestStatusByEventId);
        }
        const uni = (typeof minimal.university === 'string' ? minimal.university : '').trim();
        eventsRefreshRef.current.lastKey = `${sessionUid}|${uni || '(none)'}`;
        eventsRefreshRef.current.lastAt = Date.now();
        joinedHydrateSkipRef.current = { uid: sessionUid, at: Date.now() };
      }
      const recoveryLanding =
        passwordRecoveryActiveRef.current ||
        (typeof window !== 'undefined' &&
          window.location.pathname.replace(/\/$/, '') === '/reset-password');

      if (!isSameSessionIdentity) {
        if (recoveryLanding) {
          navigateTo('reset-password');
        } else {
          navigateTo('home');
        }
        lastAppliedAuthUidRef.current = sessionUid;
      }
    };

    try {
      let preloaded = null;
      if (loginPreloadSkip) {
        loginPreloadDoneRef.current = { uid: null, at: 0 };
      } else {
        try {
          preloaded = await preloadEventsAndJoinedForSession(session);
        } catch (pe) {
          console.warn('applyAuthSession preload:', pe?.message || pe);
        }
      }

      applyFastPath(preloaded);

      if (!fullProfile) return;

      /** RPC + users row — do not block Home; merge when ready (org flags, avatar, etc.). */
      void (async () => {
        try {
          const appUser = await buildAppUserFromAuthSession(session);
          if (!appUser) return;
          if (lastAppliedAuthUidRef.current !== sessionUid) return;
          setUser((prev) =>
            normalizeOrganizationUser(mergeSessionUserWithPrevious(prev, appUser))
          );
        } catch (e) {
          console.warn('applyAuthSession full profile:', e?.message || e);
        }
      })();
    } catch (e) {
      console.warn('applyAuthSession:', e?.message || e);
      let preloaded = null;
      if (!loginPreloadSkip) {
        try {
          preloaded = await preloadEventsAndJoinedForSession(session);
        } catch (_) {
          preloaded = null;
        }
      }
      applyFastPath(preloaded);
    }
  }, [navigateTo]);

  // Refs so session bootstrap + auth listener run once; re-running saw stale getSession() and bounced users to login.
  const navigateToRef = useRef(navigateTo);
  navigateToRef.current = navigateTo;
  const applyAuthSessionRef = useRef(applyAuthSession);
  applyAuthSessionRef.current = applyAuthSession;

  const authUidForData =
    (user?.supabaseUserId && String(user.supabaseUserId)) ||
    (user?.userId && String(user.userId)) ||
    null;
  const universityForData =
    (typeof user?.university === 'string' ? user.university : String(user?.university || '')).trim();

  useEffect(() => {
    supabaseEventsRef.current = supabaseEvents;
  }, [supabaseEvents]);

  const refreshSupabaseEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setSupabaseEvents([]);
      setJoinRequestStatusByEventId({});
      return;
    }

    const refreshKey = `${authUidForData || '(session)'}|${universityForData || '(none)'}`;
    const now = Date.now();
    if (eventsRefreshRef.current.inFlight) return;
    /**
     * Skip duplicate fetch only when we already have rows (preload + effect used to share a key).
     * If the last load was empty (RLS race, slow JWT), always refetch — never leave the feed stuck blank.
     */
    if (
      eventsRefreshRef.current.lastKey === refreshKey &&
      now - eventsRefreshRef.current.lastAt < 1800 &&
      supabaseEventsRef.current.length > 0
    ) {
      return;
    }
    eventsRefreshRef.current.inFlight = true;
    eventsRefreshRef.current.lastKey = refreshKey;
    eventsRefreshRef.current.lastAt = now;

    try {
      const userForQuery = {
        supabaseUserId: authUidForData,
        userId: authUidForData,
        university: universityForData,
      };
      const list = await fetchMergedSupabaseEventsForUser(userForQuery);
      const allRows = Array.isArray(list) ? list : [];
      const uni = (universityForData || '').trim().toLowerCase();
      const filtered = uni
        ? allRows.filter((e) => {
            const eventUni = (e.university || '').trim().toLowerCase();
            return !eventUni || eventUni === uni;
          })
        : allRows;
      setSupabaseEvents(filtered);
      try {
        const m = await fetchMyJoinRequestStatusMap();
        setJoinRequestStatusByEventId(m && typeof m === 'object' ? m : {});
      } catch (_) {
        setJoinRequestStatusByEventId({});
      }
    } catch (error) {
      console.error('❌ App - Error fetching events:', error);
      setSupabaseEvents([]);
      setJoinRequestStatusByEventId({});
    } finally {
      eventsRefreshRef.current.inFlight = false;
    }
  }, [authUidForData, universityForData, isAuthenticated]);

  const refreshJoinRequestMap = useCallback(async () => {
    if (!isAuthenticated) {
      setJoinRequestStatusByEventId({});
      return;
    }
    try {
      const m = await fetchMyJoinRequestStatusMap();
      setJoinRequestStatusByEventId(m && typeof m === 'object' ? m : {});
    } catch (_) {
      setJoinRequestStatusByEventId({});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSupabaseEvents();
  }, [refreshSupabaseEvents]);

  /** Restore joined list — skip once when preload already hydrated (same uid) to avoid duplicate registrations fetch. */
  useEffect(() => {
    const rawUid = user?.supabaseUserId || user?.userId;
    if (!isAuthenticated || !rawUid || !isSupabaseUuid(String(rawUid))) {
      return undefined;
    }
    const skip = joinedHydrateSkipRef.current;
    if (
      skip.uid &&
      String(skip.uid) === String(rawUid) &&
      Date.now() - skip.at < 2800
    ) {
      joinedHydrateSkipRef.current = { uid: null, at: 0 };
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const evs = await buildJoinedEventsFromRegistrations(String(rawUid));
      if (!cancelled) setJoinedEvents(evs);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.supabaseUserId, user?.userId]);

  const refreshFollowedOrganizations = useCallback(async () => {
    const cards = await fetchFollowedOrganizationCardsFromSupabase();
    setFollowedOrganizations(cards);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.supabaseUserId) return undefined;
    let cancelled = false;
    (async () => {
      const cards = await fetchFollowedOrganizationCardsFromSupabase();
      if (!cancelled) setFollowedOrganizations(cards);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.supabaseUserId]);

  useEffect(() => {
    let cancelled = false;
    let suppressClearTimer = null;
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);

    (async () => {
      try {
        if (isDevWelcomeQueryActive()) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (e) {
            console.warn('dev welcome signOut:', e?.message || e);
          }
          for (let i = 0; i < 3; i++) {
            const {
              data: { session: s },
            } = await supabase.auth.getSession();
            if (!s?.user) break;
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch (_) {
              /* ignore */
            }
          }
          stripDevWelcomeQuery();
          if (cancelled) return;
          sessionStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
          navigateToRef.current(devLoggedOutLandingScreen());
          lastAppliedAuthUidRef.current = null;
          // Keep blocking INITIAL_SESSION until storage settles; clearing immediately re-applied session.
          suppressClearTimer = setTimeout(() => {
            if (!cancelled) devWelcomeAuthSuppress = false;
          }, 200);
          return;
        }

        // Restore existing Supabase session (required for multi-tab + reliable login).
        // Do NOT signOut on every load — that cleared sessions in other tabs and raced with sign-in.
        let {
          data: { session },
        } = await supabase.auth.getSession();
        // If login completes right after first paint, a second read avoids a rare null→welcome race.
        if (!session?.user) {
          await new Promise((r) => setTimeout(r, 250));
          ({
            data: { session },
          } = await supabase.auth.getSession());
        }
        if (cancelled) return;
        if (session?.user) {
          if (!cancelled) await applyAuthSessionRef.current(session, true);
          return;
        }
        // Login can finish while the awaits above run — don’t send a live session to welcome/login.
        const {
          data: { session: late },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (late?.user) {
          await applyAuthSessionRef.current(late, true);
          return;
        }
        sessionStorage.removeItem('user');
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
          try {
            const path = window.location.pathname.replace(/\/$/, '') || '/';
            if (path === '/reset-password') {
              navigateToRef.current('reset-password');
            } else {
              navigateToRef.current('welcome');
            }
          } catch (_) {
            navigateToRef.current('welcome');
          }
        }
      } catch (e) {
        console.warn('Session bootstrap failed:', e);
        if (!cancelled) {
          try {
            const {
              data: { session: afterErr },
            } = await supabase.auth.getSession();
            if (afterErr?.user) {
              await applyAuthSessionRef.current(afterErr, true);
              return;
            }
          } catch (_) {
            /* ignore */
          }
          navigateToRef.current('welcome');
        }
      }
    })();

    const handleGlobalError = (event) => {
      if (event.error?.message?.includes('errorCb') || 
          event.message?.includes('errorCb') ||
          event.error?.stack?.includes('mapbox-gl')) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Mapbox error suppressed');
        return false;
      }
    };

    window.addEventListener('error', handleGlobalError);
    return () => {
      cancelled = true;
      if (suppressClearTimer) clearTimeout(suppressClearTimer);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  // Auth: cross-tab sync + org profile RPC on sign-in.
  // Other tabs often get INITIAL_SESSION / TOKEN_REFRESHED when storage syncs, not SIGNED_IN.
  //
  // Important: Supabase awaits every onAuthStateChange callback before setSession() resolves.
  // Do not await network/DB work in this callback — it blocked sign-in (setSession timeout).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        passwordRecoveryActiveRef.current = false;
        lastAppliedAuthUidRef.current = null;
        joinedHydrateSkipRef.current = { uid: null, at: 0 };
        loginPreloadDoneRef.current = { uid: null, at: 0 };
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setJoinedEvents([]);
        setSupabaseEvents([]);
        setFollowedOrganizations([]);
        navigateToRef.current(devLoggedOutLandingScreen());
        return;
      }

      if (devWelcomeAuthSuppress) return;

      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryActiveRef.current = true;
        navigateToRef.current('reset-password');
      }

      const uid = session?.user?.id;
      if (!uid) return;

      // Do not skip TOKEN_REFRESHED — org accounts need applyAuthSession after refresh or
      // Profile's Supabase org check can see DB flags while React user still looks like a student.

      void (async () => {
        // Full profile build already runs apply_organization_signup_from_auth + ensureSupabaseOrganizationProfile
        // inside buildAppUserFromAuthSession — duplicating here caused extra latency and auth churn for org accounts.
        await applyAuthSessionRef.current(session, true);

        // Hard fallback for "signup as organization" when Supabase metadata is delayed/missing.
        // Only on SIGNED_IN — other tabs get INITIAL_SESSION; hint upsert should run once.
        if (event !== 'SIGNED_IN') return;

        try {
          const raw = readOrgSignupHintRaw();
          const orgNameHint = readOrgSignupNameHint();
          if (!raw) return;
          const hint = JSON.parse(raw);
          const hintEmail = String(hint?.email || '').trim().toLowerCase();
          const sessionEmail = String(session.user.email || '').trim().toLowerCase();
          const createdAtMs = Number(hint?.at || 0);
          const recentEnough = createdAtMs > 0 && Date.now() - createdAtMs < 24 * 60 * 60 * 1000;
          if (!hintEmail || hintEmail !== sessionEmail || !recentEnough) return;

          const orgName =
            orgNameHint.trim() ||
            (sessionEmail.includes('@') ? sessionEmail.split('@')[0] : 'Organization');
          const university =
            (typeof hint?.university === 'string' && hint.university.trim()) || 'Rutgers University';

          const { error: userErr } = await supabase.from('users').upsert(
            {
              id: session.user.id,
              email: sessionEmail,
              username: orgName.replace(/\s+/g, '_').toLowerCase(),
              full_name: orgName,
              university,
              is_organization: true,
              bio: null,
            },
            { onConflict: 'id' }
          );
          const orgUsername = orgName.replace(/\s+/g, '_').toLowerCase();
          const { error: orgErr } = await supabase.from('organizations').upsert(
            {
              user_id: session.user.id,
              name: orgName,
              username: orgUsername,
              email: sessionEmail,
              university,
              type: 'Organization',
            },
            { onConflict: 'user_id' }
          );
          if (!userErr && !orgErr) {
            clearOrgSignupHints();
          } else {
            console.warn(
              'ORG hint fallback upsert failed:',
              [userErr?.message, orgErr?.message].filter(Boolean).join(' ')
            );
          }
        } catch (e) {
          console.warn('ORG hint fallback parse failed:', e?.message || e);
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Before paint — avoids a one-frame flash of scrolled content from the previous route
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [currentScreen]);

  const handleNavigate = navigateTo;

  /** Profile screen merges Supabase org detection (fixes stale localStorage / missing flags). */
  const mergeUserFromSupabaseOrg = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setUser((prev) => {
      if (prev) return { ...prev, ...patch };
      const email = patch.email || patch.organization?.email || '';
      return {
        ...patch,
        email,
        username: patch.username || (email ? `@${email.split('@')[0]}` : '@user'),
      };
    });
  }, []);

  const handleLoginSuccess = (userData, loginExtra = null) => {
    const preloaded = loginExtra?.preloaded;
    // Create a complete user object for login with Rutgers University as default
    const completeUserData = {
      ...userData,
      firstName: userData.firstName || 'Alex',
      lastName: userData.lastName || 'Johnson',
      name: userData.name || `${userData.firstName || 'Alex'} ${userData.lastName || 'Johnson'}`,
      username: userData.username || '@alex.johnson',
      email: userData.email || userData.emailOrUsername,
      image: userData.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=greek',
      bio:
        userData.bio != null && String(userData.bio).trim() !== ''
          ? String(userData.bio).trim()
          : '',
      chapter: userData.chapter || 'Alpha Delta Pi',
      phone: userData.phone || '',
      university: user?.university || userData.university || 'Rutgers University', // Use selected university or default to Rutgers
      organization: userData.organization || null,
      organizationName: userData.organizationName || userData.organization?.name || null,
      club: userData.club || null,
      isOrganization: Boolean(
        userData.isOrganization ||
          userData.supabaseIsOrganization ||
          userData.organization?.type === 'Organization' ||
          // Org signup sometimes omits type but sets name + organizationName
          (userData.organizationName &&
            userData.organization?.name &&
            userData.organizationName === userData.organization?.name)
      ) // Preserve org flag from login / Supabase
    };

    const uidForSupabase = completeUserData.supabaseUserId;
    const isSupabaseAccount =
      uidForSupabase && isSupabaseUuid(String(uidForSupabase));
    if (isSupabaseAccount && preloaded) {
      setSupabaseEvents(preloaded.supabaseEvents || []);
      setJoinedEvents(preloaded.joinedEvents || []);
      if (preloaded.joinRequestStatusByEventId) {
        setJoinRequestStatusByEventId(preloaded.joinRequestStatusByEventId);
      }
      const uni = (typeof completeUserData.university === 'string' ? completeUserData.university : '')
        .trim();
      eventsRefreshRef.current.lastKey = `${uidForSupabase}|${uni || '(none)'}`;
      eventsRefreshRef.current.lastAt = Date.now();
      joinedHydrateSkipRef.current = { uid: uidForSupabase, at: Date.now() };
      loginPreloadDoneRef.current = { uid: uidForSupabase, at: Date.now() };
    }

    setUser(normalizeOrganizationUser(completeUserData));
    setIsAuthenticated(true);
    
    // Default Rutgers organizations to follow
    const defaultRutgersOrganizations = [
      {
        id: 'rutgers-alpha-delta-pi',
        name: 'Alpha Delta Pi',
        type: 'Sorority',
        description: 'Alpha Delta Pi at Rutgers University - Building lifelong friendships and leadership skills.',
        members: 45,
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-sigma-chi',
        name: 'Sigma Chi',
        type: 'Fraternity',
        description: 'Sigma Chi at Rutgers University - Developing character, friendship, and justice.',
        members: 52,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-kappa-delta',
        name: 'Kappa Delta',
        type: 'Sorority',
        description: 'Kappa Delta at Rutgers University - Building confidence and inspiring action.',
        members: 38,
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop',
        university: 'Rutgers University'
      }
    ];

    // Default Rutgers events
    const defaultRutgersEvents = [
      {
        id: 'rutgers-welcome-week',
        title: 'Rutgers Welcome Week Mixer',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        time: '7:00 PM',
        location: 'Student Center, Rutgers University',
        locationAddress: '126 College Ave, New Brunswick, NJ 08901',
        coordinates: [-74.4478, 40.5008],
        description: 'Join us for an amazing welcome week mixer with food, music, and games!',
        attendees: 150,
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Alpha Delta Pi',
        orgColor: '#ec4899', // Pink for sorority
        attendance: 42,
        maxAttendance: 55,
        price: 0,
        type: 'SOCIAL',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-greek-life-fair',
        title: 'Greek Life Recruitment Fair',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        time: '2:00 PM',
        location: 'Campus Center, Rutgers University',
        locationAddress: '126 College Ave, New Brunswick, NJ 08901',
        coordinates: [-74.4485, 40.5015],
        description: 'Meet all the fraternities and sororities at Rutgers!',
        attendees: 300,
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop',
        category: 'Recruitment',
        organization: 'Greek Life Council',
        orgColor: '#7c3aed', // Purple for Greek council
        attendance: 28,
        maxAttendance: 50,
        price: 0,
        type: 'RECRUITMENT',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-homecoming',
        title: 'Rutgers Homecoming Game',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
        time: '3:30 PM',
        location: 'SHI Stadium, Rutgers University',
        locationAddress: '83 Rockafeller Rd, Piscataway, NJ 08854',
        coordinates: [-74.4625, 40.5145],
        description: 'Cheer on the Scarlet Knights at the biggest game of the season!',
        attendees: 500,
        image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
        category: 'Sports',
        organization: 'Rutgers Athletics',
        orgColor: '#ef4444', // Red for athletics
        attendance: 15,
        maxAttendance: 30,
        price: 25,
        type: 'SPORTS',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-actuarial-networking',
        title: 'Actuarial Career Night',
        date: 'Nov 14',
        time: '8:00 PM',
        location: 'Livingston Student Center, Board Room 203',
        locationAddress: 'Livingston Student Center, 84 Joyce Kilmer Ave, Piscataway, NJ 08854',
        coordinates: [-74.4350, 40.5235],
        description: 'Network with actuarial professionals and learn about career paths in risk management and finance. Guest speakers from top firms.',
        attendees: 35,
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Actuarial Club',
        orgColor: '#6366f1', // Indigo for professional clubs
        attendance: 35,
        maxAttendance: 50,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-accounting-panel',
        title: 'Big 4 Accounting Panel',
        date: 'Nov 19',
        time: '7:30 PM',
        location: 'Rutgers Business School',
        locationAddress: '100 Rockafeller Rd, Piscataway, NJ 08854',
        coordinates: [-74.4625, 40.5235],
        description: 'Hear from professionals at Deloitte, PwC, EY, and KPMG. Learn about recruiting, career paths, and what it takes to succeed in public accounting.',
        attendees: 70,
        image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Accounting Association',
        orgColor: '#6366f1', // Indigo for professional clubs
        attendance: 70,
        maxAttendance: 100,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-datascience-workshop',
        title: 'Machine Learning Workshop',
        date: 'Nov 22',
        time: '6:00 PM',
        location: 'Hill Center for Mathematical Sciences',
        locationAddress: '110 Frelinghuysen Rd, Piscataway, NJ 08854',
        coordinates: [-74.4650, 40.5225],
        description: 'Hands-on workshop covering machine learning fundamentals, neural networks, and real-world applications. Bring your laptop!',
        attendees: 85,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Data Science Club',
        orgColor: '#06b6d4', // Cyan for academic clubs
        attendance: 85,
        maxAttendance: 120,
        price: 0,
        type: 'ACADEMIC',
        university: 'Rutgers University'
      },
      {
        id: 'rutgers-finance-investing',
        title: 'Stock Market Investing 101',
        date: 'Nov 26',
        time: '7:00 PM',
        location: 'Rutgers Student Center',
        locationAddress: '126 College Ave, New Brunswick, NJ 08901',
        coordinates: [-74.4478, 40.5008],
        description: 'Learn the fundamentals of stock market investing, portfolio management, and financial planning from industry professionals.',
        attendees: 60,
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Personal Finance Club',
        orgColor: '#6366f1', // Indigo for professional clubs
        attendance: 60,
        maxAttendance: 85,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'Rutgers University'
      }
    ];

    // Default Northeastern events
    const defaultNortheasternEvents = [
      {
        id: 'northeastern-aiche-speaker',
        title: 'Chemical Engineering Industry Speaker Series',
        date: 'Nov 18',
        time: '6:30 PM',
        location: 'Snell Engineering Center',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0893, 42.3398],
        description: 'Join AIChE for an evening with industry professionals from top chemical companies. Learn about career paths and network with experts.',
        attendees: 45,
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'American Institute of Chemical Engineers (AIChE)',
        orgColor: '#6366f1',
        attendance: 45,
        maxAttendance: 65,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-ai-hackathon',
        title: 'AI & Machine Learning Hackathon',
        date: 'Nov 21',
        time: '10:00 AM',
        location: 'Curry Student Center',
        locationAddress: '346 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0875, 42.3395],
        description: '24-hour hackathon building AI solutions! Work in teams, attend workshops, and compete for prizes. All skill levels welcome.',
        attendees: 120,
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Artificial Intelligence Club',
        orgColor: '#06b6d4',
        attendance: 120,
        maxAttendance: 150,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-car-show',
        title: 'Annual Car Show & Meet',
        date: 'Nov 24',
        time: '12:00 PM',
        location: 'Columbus Parking Garage',
        locationAddress: '455 Columbus Ave, Boston, MA 02116',
        coordinates: [-71.0850, 42.3420],
        description: 'Showcase your ride or admire modified cars, classics, and exotics. Open to all car enthusiasts!',
        attendees: 80,
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Automotive Club',
        orgColor: '#ec4899',
        attendance: 80,
        maxAttendance: 100,
        price: 0,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-biochem-research',
        title: 'Graduate School & Research Opportunities Panel',
        date: 'Nov 27',
        time: '5:00 PM',
        location: 'Mugar Life Sciences Building',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0880, 42.3385],
        description: 'Learn about PhD programs, research opportunities, and graduate school applications from current grad students and professors.',
        attendees: 35,
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Biochemistry Club',
        orgColor: '#06b6d4',
        attendance: 35,
        maxAttendance: 50,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-cooking-italian',
        title: 'Italian Cooking Night',
        date: 'Nov 29',
        time: '7:00 PM',
        location: 'International Village',
        locationAddress: '1155 Tremont St, Boston, MA 02120',
        coordinates: [-71.0920, 42.3380],
        description: 'Learn to make authentic Italian pasta from scratch! All ingredients provided. Come hungry and leave with new cooking skills.',
        attendees: 25,
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Cooking Club',
        orgColor: '#ec4899',
        attendance: 25,
        maxAttendance: 30,
        price: 5,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-model-un',
        title: 'Model United Nations Conference',
        date: 'Dec 2',
        time: '9:00 AM',
        location: 'West Village',
        locationAddress: '10 Leon St, Boston, MA 02115',
        coordinates: [-71.0930, 42.3390],
        description: 'Participate in debate and diplomacy simulations. Represent a country and tackle global issues. Great for resume building!',
        attendees: 60,
        image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'International Relations Council',
        orgColor: '#06b6d4',
        attendance: 60,
        maxAttendance: 80,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-kpop-showcase',
        title: 'K-Pop Dance Showcase',
        date: 'Dec 5',
        time: '7:30 PM',
        location: 'Blackman Auditorium',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0895, 42.3400],
        description: 'Watch KADA perform the latest K-pop choreography! Includes performances from guest teams and a dance workshop after the show.',
        attendees: 200,
        image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'KADA K-Pop Dance Team',
        orgColor: '#ec4899',
        attendance: 200,
        maxAttendance: 250,
        price: 8,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-latin-social',
        title: 'Salsa & Bachata Social Night',
        date: 'Dec 8',
        time: '8:00 PM',
        location: 'Curry Student Center Ballroom',
        locationAddress: '346 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0875, 42.3395],
        description: 'Dance the night away with Kaliente! Beginner lesson at 8pm, then social dancing until midnight. No partner needed!',
        attendees: 90,
        image: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Kaliente Dance Group',
        orgColor: '#ec4899',
        attendance: 90,
        maxAttendance: 120,
        price: 5,
        type: 'SOCIAL',
        university: 'Northeastern University'
      }
    ];
    
    // Set default data based on university
    const loginUni = (completeUserData.university || '').trim().toLowerCase();
    let defaultEvents = [];
    if (loginUni.includes('rutgers')) {
      defaultEvents = defaultRutgersEvents;
    } else if (loginUni.includes('northeastern')) {
      defaultEvents = defaultNortheasternEvents;
    }
    
    console.log('🎓 Login - University:', completeUserData.university);
    console.log('🎉 Login - Setting events:', defaultEvents.length, 'events');
    console.log('📋 Login - Event organizations:', defaultEvents.map(e => e.organization));
    
    if (!isSupabaseAccount) {
      setFollowedOrganizations([]);
      setJoinedEvents([]);
    } else if (!preloaded) {
      void buildJoinedEventsFromRegistrations(String(uidForSupabase)).then(setJoinedEvents);
    }
    setAllEvents(defaultEvents);
    navigateTo('home');
  };

  const handleLogout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    setJoinedEvents([]);
    setSupabaseEvents([]);
    setJoinRequestStatusByEventId({});
    setFollowedOrganizations([]);
    navigateTo(devLoggedOutLandingScreen());
    sessionStorage.removeItem('user');
    try {
      clearOrgSignupHints();
      sessionStorage.removeItem(ORG_HOSTING_KEY);
      await supabase.auth.signOut();
    } catch (_) {
      /* ignore */
    }
  };

  const handleUserInfo = async (userData) => {
    const emailCheck = validateEmailForSignup(userData?.email || '');
    if (!emailCheck.valid) {
      return { ok: false, error: emailCheck.error };
    }

    const usernameHandle = String(userData.username || '').replace(/^@/, '').trim();
    const availability = await checkSignupAvailabilityBeforeCreate(userData.email, usernameHandle);
    if (!availability.ok) {
      return { ok: false, error: availability.error };
    }

    // Parse the fullName into firstName and lastName
    const nameParts = userData.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create a complete user object with all necessary fields
    const completeUserData = {
      ...userData,
      firstName,
      lastName,
      name: userData.fullName,
      username: userData.username,
      email: userData.email,
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=greek', // Default avatar
      bio: '',
      chapter: '',
      phone: '',
      university: userData.university || user?.university || '',
      organization: null,
      club: null
    };
    
    try {
      const { data: authData, error: signUpError } = await Promise.race([
        supabase.auth.signUp({
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: userData.fullName,
              username: userData.username,
              university: userData.university || completeUserData.university || 'Rutgers University',
              is_organization: false,
              account_type: 'student',
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Signup timed out. Please try again.')), SIGNUP_TIMEOUT_MS)
        ),
      ]);

      if (signUpError) {
        return { ok: false, error: humanizeSupabaseAuthError(signUpError.message) };
      }

      if (!authData?.user?.id) {
        console.error('signUp returned no user', authData);
        return {
          ok: false,
          error:
            'No user was created. Check the Network tab for auth/v1/signup and that .env points at the correct Supabase project.',
        };
      }

      // Best-effort profile row for organization/attendee features.
      if (authData?.user?.id) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: userData.email.trim().toLowerCase(),
            username: userData.username.replace(/^@/, ''),
            full_name: userData.fullName,
            university: completeUserData.university || 'Rutgers University',
            is_organization: false,
            bio: completeUserData.bio?.trim() ? completeUserData.bio.trim() : null,
            avatar_url: completeUserData.image,
          }, { onConflict: 'id' });

        if (profileError) {
          console.warn('Profile row upsert failed (non-blocking):', profileError.message);
        }
      }

      navigateTo('login', {
        signupMessage: 'Verification email sent. Please confirm your email, then log in.',
        signupEmail: userData.email.trim().toLowerCase(),
      });
      return { ok: true };
    } catch (error) {
      console.error('User signup failed:', error);
      return {
        ok: false,
        error: humanizeSupabaseAuthError(error?.message) || 'Failed to create account. Please try again.',
      };
    }
  };

  const handleOrganizationSignup = async (organizationData) => {
    // Create a user object for the organization with blank profile
    // Ensure username starts with @
    const formattedUsername = organizationData.username.startsWith('@') 
      ? organizationData.username 
      : `@${organizationData.username}`;
    
    const orgEmail = (organizationData.email || '').trim().toLowerCase();
    const organizationUserData = {
      firstName: organizationData.organizationName || 'Organization',
      lastName: 'Admin',
      name: organizationData.organizationName || 'Organization Admin',
      username: formattedUsername,
      email: organizationData.email,
      password: organizationData.password,
      // Stable id for Supabase created_by + profile filters (must persist across sessions)
      userId: orgEmail ? `org_${orgEmail}` : `org_${Date.now()}`,
      organizationName: organizationData.organizationName,
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=organization',
      bio: null,
      chapter: organizationData.organizationName || '',
      phone: '',
      university: organizationData.university || 'Stockton University',
      organization: {
        name: organizationData.organizationName,
        email: organizationData.email,
        university: organizationData.university,
        type: 'Organization'
      },
      club: null,
      isOrganization: true // Flag to identify this as an organization account
    };
    
    const emailCheck = validateEmailForSignup(organizationData?.email || '');
    if (!emailCheck.valid) {
      return { ok: false, error: emailCheck.error };
    }

    const orgHandle = String(organizationData.username || '').replace(/^@/, '').trim();
    const orgAvailability = await checkSignupAvailabilityBeforeCreate(orgEmail, orgHandle);
    if (!orgAvailability.ok) {
      return { ok: false, error: orgAvailability.error };
    }

    try {
      const { data: authData, error: signUpError } = await Promise.race([
        supabase.auth.signUp({
          email: organizationData.email.trim().toLowerCase(),
          password: organizationData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: organizationData.organizationName,
              organization_name: organizationData.organizationName,
              username: organizationData.username?.replace(/^@/, ''),
              university: organizationData.university || 'Rutgers University',
              is_organization: true,
              account_type: 'organization',
              org_signup: true,
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Signup timed out. Please try again.')), SIGNUP_TIMEOUT_MS)
        ),
      ]);

      if (signUpError) {
        return { ok: false, error: humanizeSupabaseAuthError(signUpError.message) };
      }

      if (!authData?.user?.id) {
        console.error('Org signUp returned no user', authData);
        return {
          ok: false,
          error:
            'No user was created. Check Network tab for auth/v1/signup and that .env points at the correct Supabase project.',
        };
      }

      if (authData?.user?.id) {
        // Same flow as student signup: with "confirm email" there is often no session here,
        // so DB trigger + first login run ensureSupabaseOrganizationProfile. If Supabase returns
        // a session (e.g. auto-confirm), write org rows immediately and fail loudly if RLS blocks.
        if (authData.session) {
          const { error: rpcErr } = await syncOrgProfileFromAuthRpc();
          if (rpcErr) {
            console.warn('Organization signup RPC:', rpcErr.message);
          }
          const ensured = await ensureSupabaseOrganizationProfile(authData.session);
          // RPC can swallow SQL errors; client upsert also fixes "users row but no organizations row"
          // when RLS allows it (see SUPABASE_ORGANIZATIONS_RLS.sql).
          if (ensured.skipped || !ensured.ok) {
            const { error: profileError } = await supabase
              .from('users')
              .upsert(
                {
                  id: authData.user.id,
                  email: organizationData.email.trim().toLowerCase(),
                  username: organizationData.username?.replace(/^@/, ''),
                  full_name: organizationData.organizationName,
                  university: organizationData.university || 'Rutgers University',
                  is_organization: true,
                  bio: organizationUserData.bio,
                  avatar_url: organizationUserData.image,
                },
                { onConflict: 'id' }
              );
            const orgUname =
              organizationData.username?.replace(/^@/, '') ||
              organizationData.organizationName.replace(/\s+/g, '_').toLowerCase();
            const { error: orgError } = await supabase.from('organizations').upsert(
              {
                user_id: authData.user.id,
                name: organizationData.organizationName,
                username: orgUname,
                email: organizationData.email.trim().toLowerCase(),
                university: organizationData.university || 'Rutgers University',
                type: 'Organization',
              },
              { onConflict: 'user_id' }
            );
            if (profileError || orgError) {
              return {
                ok: false,
                error:
                  [profileError?.message, orgError?.message].filter(Boolean).join(' ') ||
                  rpcErr?.message ||
                  'Could not save organization in Supabase. Run SUPABASE_ORGANIZATIONS_RLS.sql and SUPABASE_RPC_APPLY_ORG_PROFILE.sql in the SQL Editor.',
              };
            }
          }
        } else {
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: authData.user.id,
              email: organizationData.email.trim().toLowerCase(),
              username: organizationData.username?.replace(/^@/, ''),
              full_name: organizationData.organizationName,
              university: organizationData.university || 'Rutgers University',
              is_organization: true,
              bio: organizationUserData.bio,
              avatar_url: organizationUserData.image,
            }, { onConflict: 'id' });

          if (profileError) {
            console.warn(
              'Organization users upsert skipped until login (no session):',
              profileError.message
            );
          }

          const orgUnameNoSession =
            organizationData.username?.replace(/^@/, '') ||
            organizationData.organizationName.replace(/\s+/g, '_').toLowerCase();
          const { error: orgError } = await supabase
            .from('organizations')
            .upsert({
              user_id: authData.user.id,
              name: organizationData.organizationName,
              username: orgUnameNoSession,
              email: organizationData.email.trim().toLowerCase(),
              university: organizationData.university || 'Rutgers University',
              type: 'Organization',
            }, { onConflict: 'user_id' });

          if (orgError) {
            console.warn(
              'Organization row upsert skipped until login (no session):',
              orgError.message
            );
          }
        }
      }

      // Save a local "org signup intent" hint so first login can force org row creation
      // even if user_metadata is delayed after email confirmation.
      localStorage.setItem(
        ORG_LOGIN_HINT_KEY,
        JSON.stringify({
          email: organizationData.email.trim().toLowerCase(),
          university: organizationData.university || 'Rutgers University',
          at: Date.now(),
        })
      );
      localStorage.setItem(ORG_NAME_HINT_KEY, organizationData.organizationName || 'Organization');

      navigateTo('login', {
        signupMessage: 'Organization account created. Check your email to verify, then log in.',
        signupEmail: organizationData.email.trim().toLowerCase(),
      });
      return { ok: true };
    } catch (error) {
      console.error('Organization signup failed:', error);
      return {
        ok: false,
        error:
          humanizeSupabaseAuthError(error?.message) ||
          'Failed to create organization account. Please try again.',
      };
    }
  };

  const handleUniversitySelect = (university) => {
    setUser(prev => ({ ...prev, university: university.name }));
    setIsAuthenticated(true); // Auto-authenticate after university selection in signup flow
    
    // Set university-specific events based on selection
    const defaultNortheasternEvents = [
      {
        id: 'northeastern-aiche-speaker',
        title: 'Chemical Engineering Industry Speaker Series',
        date: 'Nov 18',
        time: '6:30 PM',
        location: 'Snell Engineering Center',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0893, 42.3398],
        description: 'Join AIChE for an evening with industry professionals from top chemical companies. Learn about career paths and network with experts.',
        attendees: 45,
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'American Institute of Chemical Engineers (AIChE)',
        orgColor: '#6366f1',
        attendance: 45,
        maxAttendance: 65,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-ai-hackathon',
        title: 'AI & Machine Learning Hackathon',
        date: 'Nov 21',
        time: '10:00 AM',
        location: 'Curry Student Center',
        locationAddress: '346 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0875, 42.3395],
        description: '24-hour hackathon building AI solutions! Work in teams, attend workshops, and compete for prizes. All skill levels welcome.',
        attendees: 120,
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Artificial Intelligence Club',
        orgColor: '#06b6d4',
        attendance: 120,
        maxAttendance: 150,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-car-show',
        title: 'Annual Car Show & Meet',
        date: 'Nov 24',
        time: '12:00 PM',
        location: 'Columbus Parking Garage',
        locationAddress: '455 Columbus Ave, Boston, MA 02116',
        coordinates: [-71.0850, 42.3420],
        description: 'Showcase your ride or admire modified cars, classics, and exotics. Open to all car enthusiasts!',
        attendees: 80,
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Automotive Club',
        orgColor: '#ec4899',
        attendance: 80,
        maxAttendance: 100,
        price: 0,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-biochem-research',
        title: 'Graduate School & Research Opportunities Panel',
        date: 'Nov 27',
        time: '5:00 PM',
        location: 'Mugar Life Sciences Building',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0880, 42.3385],
        description: 'Learn about PhD programs, research opportunities, and graduate school applications from current grad students and professors.',
        attendees: 35,
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Biochemistry Club',
        orgColor: '#06b6d4',
        attendance: 35,
        maxAttendance: 50,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-cooking-italian',
        title: 'Italian Cooking Night',
        date: 'Nov 29',
        time: '7:00 PM',
        location: 'International Village',
        locationAddress: '1155 Tremont St, Boston, MA 02120',
        coordinates: [-71.0920, 42.3380],
        description: 'Learn to make authentic Italian pasta from scratch! All ingredients provided. Come hungry and leave with new cooking skills.',
        attendees: 25,
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Cooking Club',
        orgColor: '#ec4899',
        attendance: 25,
        maxAttendance: 30,
        price: 5,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-model-un',
        title: 'Model United Nations Conference',
        date: 'Dec 2',
        time: '9:00 AM',
        location: 'West Village',
        locationAddress: '10 Leon St, Boston, MA 02115',
        coordinates: [-71.0930, 42.3390],
        description: 'Participate in debate and diplomacy simulations. Represent a country and tackle global issues. Great for resume building!',
        attendees: 60,
        image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'International Relations Council',
        orgColor: '#06b6d4',
        attendance: 60,
        maxAttendance: 80,
        price: 0,
        type: 'ACADEMIC',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-kpop-showcase',
        title: 'K-Pop Dance Showcase',
        date: 'Dec 5',
        time: '7:30 PM',
        location: 'Blackman Auditorium',
        locationAddress: '360 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0895, 42.3400],
        description: 'Watch KADA perform the latest K-pop choreography! Includes performances from guest teams and a dance workshop after the show.',
        attendees: 200,
        image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'KADA K-Pop Dance Team',
        orgColor: '#ec4899',
        attendance: 200,
        maxAttendance: 250,
        price: 8,
        type: 'SOCIAL',
        university: 'Northeastern University'
      },
      {
        id: 'northeastern-latin-social',
        title: 'Salsa & Bachata Social Night',
        date: 'Dec 8',
        time: '8:00 PM',
        location: 'Curry Student Center Ballroom',
        locationAddress: '346 Huntington Ave, Boston, MA 02115',
        coordinates: [-71.0875, 42.3395],
        description: 'Dance the night away with Kaliente! Beginner lesson at 8pm, then social dancing until midnight. No partner needed!',
        attendees: 90,
        image: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Kaliente Dance Group',
        orgColor: '#ec4899',
        attendance: 90,
        maxAttendance: 120,
        price: 5,
        type: 'SOCIAL',
        university: 'Northeastern University'
      }
    ];

    // Default USC events
    const defaultUSCEvents = [
      {
        id: 'usc-aerospace-symposium',
        title: 'Aerospace Medicine Career Symposium',
        date: 'Nov 20',
        time: '5:30 PM',
        location: 'Health Sciences Campus',
        locationAddress: '1975 Zonal Ave, Los Angeles, CA 90033',
        coordinates: [-118.2851, 34.0224],
        description: 'Learn about careers in aerospace medicine from industry professionals and NASA physicians. Network with flight surgeons and aviation medical examiners.',
        attendees: 55,
        image: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8e0?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Aerospace Medicine Interest Group',
        orgColor: '#6366f1',
        attendance: 55,
        maxAttendance: 75,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'University of Southern California'
      },
      {
        id: 'usc-law-networking',
        title: 'Corporate Law Networking Night',
        date: 'Nov 23',
        time: '7:00 PM',
        location: 'USC Gould School of Law',
        locationAddress: '699 Exposition Blvd, Los Angeles, CA 90089',
        coordinates: [-118.2830, 34.0195],
        description: 'Network with corporate attorneys and learn about business law careers. Panel discussion on mergers, acquisitions, and startup legal strategy.',
        attendees: 90,
        image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Business Law Society',
        orgColor: '#6366f1',
        attendance: 90,
        maxAttendance: 120,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'University of Southern California'
      },
      {
        id: 'usc-entertainment-summit',
        title: 'Entertainment Industry Summit',
        date: 'Nov 26',
        time: '6:00 PM',
        location: 'USC School of Cinematic Arts',
        locationAddress: '900 Exposition Blvd, Los Angeles, CA 90007',
        coordinates: [-118.2890, 34.0223],
        description: 'Explore the business of entertainment with executives from major studios, streaming platforms, and music labels. Learn about contracts, distribution, and financing.',
        attendees: 140,
        image: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Business of Entertainment Association',
        orgColor: '#6366f1',
        attendance: 140,
        maxAttendance: 180,
        price: 10,
        type: 'PROFESSIONAL',
        university: 'University of Southern California'
      },
      {
        id: 'usc-med-research-fair',
        title: 'Medical Research & Residency Fair',
        date: 'Nov 28',
        time: '4:00 PM',
        location: 'Keck School of Medicine',
        locationAddress: '1975 Zonal Ave, Los Angeles, CA 90033',
        coordinates: [-118.2845, 34.0220],
        description: 'Meet with program directors, explore research opportunities, and learn about residency applications. Perfect for pre-med and current medical students.',
        attendees: 110,
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop',
        category: 'Academic',
        organization: 'Associated Students of the School of Medicine',
        orgColor: '#06b6d4',
        attendance: 110,
        maxAttendance: 150,
        price: 0,
        type: 'ACADEMIC',
        university: 'University of Southern California'
      },
      {
        id: 'usc-track-meet',
        title: 'Intercollegiate Track & Field Meet',
        date: 'Dec 1',
        time: '10:00 AM',
        location: 'Loker Stadium',
        locationAddress: '3401 S Figueroa St, Los Angeles, CA 90089',
        coordinates: [-118.2860, 34.0195],
        description: 'Compete against other universities in sprints, distance, hurdles, and field events. All skill levels welcome!',
        attendees: 75,
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
        category: 'Sports',
        organization: 'Club Track',
        orgColor: '#ef4444',
        attendance: 75,
        maxAttendance: 100,
        price: 0,
        type: 'SPORTS',
        university: 'University of Southern California'
      },
      {
        id: 'usc-softball-tournament',
        title: 'Annual Softball Tournament',
        date: 'Dec 3',
        time: '9:00 AM',
        location: 'Cromwell Field',
        locationAddress: '1021 Childs Way, Los Angeles, CA 90089',
        coordinates: [-118.2880, 34.0205],
        description: 'Round-robin tournament with teams from across Southern California. BBQ and awards ceremony after the games!',
        attendees: 45,
        image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=300&fit=crop',
        category: 'Sports',
        organization: 'Club Softball',
        orgColor: '#ef4444',
        attendance: 45,
        maxAttendance: 60,
        price: 0,
        type: 'SPORTS',
        university: 'University of Southern California'
      },
      {
        id: 'usc-tech-hackathon',
        title: 'Business Tech Innovation Hackathon',
        date: 'Dec 6',
        time: '6:00 PM',
        location: 'USC Marshall School of Business',
        locationAddress: '701 Exposition Blvd, Los Angeles, CA 90089',
        coordinates: [-118.2870, 34.0190],
        description: '48-hour hackathon building business tech solutions. Workshops on fintech, e-commerce, and startup tools. Prizes for top teams!',
        attendees: 130,
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Business Tech Group',
        orgColor: '#6366f1',
        attendance: 130,
        maxAttendance: 160,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'University of Southern California'
      },
      {
        id: 'usc-investment-workshop',
        title: 'Global Markets Investment Workshop',
        date: 'Dec 9',
        time: '5:00 PM',
        location: 'USC Marshall School of Business',
        locationAddress: '701 Exposition Blvd, Los Angeles, CA 90089',
        coordinates: [-118.2870, 34.0190],
        description: 'Hands-on portfolio management simulation and analysis of international markets. Guest speakers from JP Morgan and Goldman Sachs.',
        attendees: 100,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
        category: 'Professional',
        organization: 'Global Investment Society',
        orgColor: '#6366f1',
        attendance: 100,
        maxAttendance: 130,
        price: 0,
        type: 'PROFESSIONAL',
        university: 'University of Southern California'
      },
      {
        id: 'usc-gymnastics-showcase',
        title: 'Gymnastics End-of-Semester Showcase',
        date: 'Dec 11',
        time: '7:00 PM',
        location: 'Lyon Center',
        locationAddress: '650 W Childs Way, Los Angeles, CA 90089',
        coordinates: [-118.2895, 34.0210],
        description: 'Watch our gymnasts perform floor, beam, vault, and bars routines. All friends and family welcome!',
        attendees: 65,
        image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=300&fit=crop',
        category: 'Sports',
        organization: 'Gymnastics at USC',
        orgColor: '#ef4444',
        attendance: 65,
        maxAttendance: 90,
        price: 5,
        type: 'SPORTS',
        university: 'University of Southern California'
      },
      {
        id: 'usc-design-expo',
        title: 'Innovative Design Expo',
        date: 'Dec 13',
        time: '6:30 PM',
        location: 'USC Viterbi School of Engineering',
        locationAddress: '3650 McClintock Ave, Los Angeles, CA 90089',
        coordinates: [-118.2900, 34.0200],
        description: 'Showcase of student design projects from UX/UI, product design, and service innovation teams. Industry judges and networking!',
        attendees: 85,
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop',
        category: 'Design',
        organization: 'Innovative Design at USC',
        orgColor: '#8b5cf6',
        attendance: 85,
        maxAttendance: 110,
        price: 0,
        type: 'ACADEMIC',
        university: 'University of Southern California'
      },
      {
        id: 'usc-literary-reading',
        title: 'Literary Society Open Mic Night',
        date: 'Dec 15',
        time: '8:00 PM',
        location: 'USC Ground Zero Coffee',
        locationAddress: '3501 Trousdale Pkwy, Los Angeles, CA 90089',
        coordinates: [-118.2850, 34.0215],
        description: 'Share your poetry, prose, and creative writing in a supportive community. Open mic followed by featured reader from the MFA program.',
        attendees: 60,
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
        category: 'Social',
        organization: 'Literary Society',
        orgColor: '#ec4899',
        attendance: 60,
        maxAttendance: 80,
        price: 0,
        type: 'SOCIAL',
        university: 'University of Southern California'
      }
    ];
    
    // Set default events based on selected university
    let universityEvents = [];
    if (university.name === 'Northeastern University') {
      universityEvents = defaultNortheasternEvents;
    } else if (university.name === 'University of Southern California') {
      universityEvents = defaultUSCEvents;
    }
    
    console.log('🎓 Signup - University selected:', university.name);
    console.log('🎉 Signup - Setting events:', universityEvents.length, 'events');
    
    setAllEvents(universityEvents);
    navigateTo('home');
  };


  const handleOrganizationSelect = (organization) => {
    setUser(prev => ({ ...prev, organization }));
    navigateTo('home');
  };

  const handleClubSelect = (club) => {
    setUser(prev => ({ ...prev, club }));
    navigateTo('home');
  };

  const handleStartConversation = (organization) => {
    const newConversation = {
      id: Date.now(),
      organization,
      messages: [],
      lastMessage: null,
      timestamp: new Date()
    };
    setConversations(prev => [...prev, newConversation]);
    setActiveConversation(newConversation.id);
    navigateTo('messages');
  };

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
  };

  const renderScreen = () => {
    console.log('🔍 App.js: Current screen is:', currentScreen);
    console.log('🔍 App.js: Navigation data:', navigationData);
    
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} />;
      case 'user-info':
        return <UserInfoScreen onContinue={handleUserInfo} onBack={() => navigateTo('welcome')} onNavigate={handleNavigate} />;
      case 'organization-signup':
        return <OrganizationSignupScreen onContinue={handleOrganizationSignup} onBack={() => navigateTo('user-info')} onNavigate={handleNavigate} />;
      case 'login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} onBack={() => navigateTo('welcome')} onNavigate={handleNavigate} signupMessage={navigationData?.signupMessage} signupEmail={navigationData?.signupEmail} />;
      case 'reset-password':
        return <ResetPasswordScreen onNavigate={navigateTo} />;
      case 'university':
        return <UniversityScreen onUniversitySelect={handleUniversitySelect} onBack={() => navigateTo('user-info')} />;
      case 'organizations':
        return <OrganizationsScreen user={user} onSelect={handleOrganizationSelect} onNavigate={handleNavigate} />;
      case 'organization-profile':
        console.log('🏢 App.js: Rendering organization-profile with navigationData:', navigationData);
        return <OrganizationProfileScreen 
          organization={navigationData?.organization} 
          user={user}
          onNavigate={handleNavigate} 
          onStartConversation={handleStartConversation}
          joinedEvents={joinedEvents}
          setJoinedEvents={setJoinedEvents}
          followedOrganizations={followedOrganizations}
          setFollowedOrganizations={setFollowedOrganizations}
          allEvents={allEvents}
          setAllEvents={setAllEvents}
          supabaseEvents={supabaseEvents}
          onFollowsChanged={refreshFollowedOrganizations}
        />;
      case 'clubs':
        return <ClubsScreen user={user} onSelect={handleClubSelect} onBack={() => navigateTo('greek-question')} />;
      case 'home':
        console.log('🔍 App - Passing supabaseEvents to DashboardScreen:', supabaseEvents?.length || 0);
        return <DashboardScreen 
          user={user} 
          onNavigate={handleNavigate} 
          joinedEvents={joinedEvents}
          setJoinedEvents={setJoinedEvents}
          allEvents={allEvents}
          setAllEvents={setAllEvents}
          supabaseEvents={supabaseEvents}
          joinRequestStatusByEventId={joinRequestStatusByEventId}
          onJoinRequestMapRefresh={refreshJoinRequestMap}
          homeNavigationData={navigationData}
          onConsumeHomeNavigation={() => navigateTo('home', null)}
        />;
      case 'events':
        return <EventsScreen 
          user={user} 
          onNavigate={handleNavigate}
        />;
      case 'map':
        return (
          <ErrorBoundary key="map-screen">
            <MapScreen 
              key={`map-${user?.userId || 'default'}`}
              user={user} 
              onNavigate={handleNavigate}
              joinedEvents={joinedEvents}
              setJoinedEvents={setJoinedEvents}
              allEvents={allEvents}
              supabaseEvents={supabaseEvents}
            />
          </ErrorBoundary>
        );
      case 'messages':
        return <MessagesScreen 
          user={user} 
          onNavigate={handleNavigate} 
          conversations={conversations} 
          setConversations={setConversations} 
          activeConversation={activeConversation} 
          setActiveConversation={setActiveConversation}
          navigationData={navigationData}
        />;
      case 'tickets':
        return <TicketsScreen 
          user={user} 
          onNavigate={handleNavigate} 
          joinedEvents={joinedEvents}
          allEvents={allEvents}
          supabaseEvents={supabaseEvents}
        />;
      case 'profile':
        return <ProfileScreen 
          user={user} 
          onNavigate={handleNavigate} 
          joinedEvents={joinedEvents} 
          setJoinedEvents={setJoinedEvents}
          followedOrganizations={followedOrganizations}
          setFollowedOrganizations={setFollowedOrganizations}
          allEvents={allEvents}
          setAllEvents={setAllEvents}
          supabaseEvents={supabaseEvents}
          mergeUserFromSupabaseOrg={mergeUserFromSupabaseOrg}
          onEventsRefresh={refreshSupabaseEvents}
          refreshFollowedOrganizations={refreshFollowedOrganizations}
        />;
      case 'settings':
        return (
          <SettingsScreen
            user={user}
            navigationData={navigationData}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onProfileUpdate={(updatedProfile) => setUser((prev) => ({ ...prev, ...updatedProfile }))}
          />
        );
      case 'help':
        return <HelpScreen user={user} onNavigate={handleNavigate} />;
      case 'lab':
        return <LabScreen onNavigate={handleNavigate} />;
      case 'search':
        return (
          <SearchScreen
            user={user}
            onNavigate={handleNavigate}
            joinedEvents={joinedEvents}
            setJoinedEvents={setJoinedEvents}
            allEvents={allEvents}
            setAllEvents={setAllEvents}
            supabaseEvents={supabaseEvents}
            joinRequestStatusByEventId={joinRequestStatusByEventId}
            onJoinRequestMapRefresh={refreshJoinRequestMap}
          />
        );
      default:
        return (
          <DashboardScreen
            user={user}
            onNavigate={handleNavigate}
            joinedEvents={joinedEvents}
            setJoinedEvents={setJoinedEvents}
            allEvents={allEvents}
            setAllEvents={setAllEvents}
            supabaseEvents={supabaseEvents}
            joinRequestStatusByEventId={joinRequestStatusByEventId}
            onJoinRequestMapRefresh={refreshJoinRequestMap}
            homeNavigationData={navigationData}
            onConsumeHomeNavigation={() => navigateTo('home', null)}
          />
        );
    }
  };

  // Show navigation for all authenticated screens except onboarding screens
  const showNavigation = isAuthenticated && 
    !['welcome', 'user-info', 'organization-signup', 'login', 'reset-password', 'university', 'greek-question', 'clubs'].includes(currentScreen);

  return (
    <ErrorBoundary>
      <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
        
        <main className="main-content">
          <div className="main-route">{renderScreen()}</div>
        </main>

        {/* After main so the fixed bar stacks above content without competing layers */}
        {showNavigation && (
          <Navigation
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
        )}

        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={handleCloseWelcomeModal}
          user={user}
        />

        {paymentToast && (
          <div style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: paymentToast.includes('successful')
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #dc2626, #ef4444)',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '0.95rem',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease',
          }}>
            {paymentToast}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;