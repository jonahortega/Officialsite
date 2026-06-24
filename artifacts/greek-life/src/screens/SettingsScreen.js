import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  Bell,
  Shield,
  ChevronRight,
  Camera,
  Mail,
  Lock,
  Check,
  Banknote,
  HelpCircle,
} from 'lucide-react';

const SUPPORT_EMAIL = 'support@greeklifeofficial.com';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  'Greek Life support request'
)}&body=${encodeURIComponent(
  'Please describe your issue. If this is about a ticket, include the event name, date, and the email you used to pay.\n'
)}`;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '../utils/supabaseClient';
import { getApiUrl } from '../utils/apiUrl';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import { isSupabaseUuid, coerceToUuidString } from '../utils/isSupabaseUuid';

function stripAt(s) {
  return String(s || '')
    .replace(/^@/, '')
    .trim();
}

/** Escape `%`, `_`, `\` for use in PostgREST `.ilike()` filter (exact match, case-insensitive). */
function escapeIlikeExact(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/** Lowercase handle: letters, numbers, dot, underscore */
function normalizeUsernameHandle(s) {
  const raw = stripAt(s).toLowerCase().replace(/[^a-z0-9._]/g, '');
  return raw || null;
}

/**
 * When public.users has no row yet, UPDATE … eq(id) affects 0 rows. Build a full row for upsert.
 */
function buildUsersUpsertRowFromSession(uid, patch, sessionUser) {
  if (!sessionUser?.id || sessionUser.id !== uid) return null;
  const meta = sessionUser.user_metadata || {};
  const email = (sessionUser.email || '').trim();
  const acct = String(meta.account_type || '').toLowerCase();
  const isOrg =
    meta.org_signup === true ||
    meta.org_signup === 'true' ||
    acct === 'organization' ||
    acct === 'org' ||
    meta.is_organization === true ||
    meta.is_organization === 'true' ||
    Boolean(
      typeof meta.organization_name === 'string' ? meta.organization_name.trim() : meta.organization_name
    );
  const fallbackName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.organization_name === 'string' && meta.organization_name.trim()) ||
    (email.includes('@') ? email.split('@')[0] : 'User');
  const fallbackHandle =
    (typeof meta.username === 'string' && meta.username.replace(/^@/, '').trim()) ||
    (email.includes('@') ? email.split('@')[0] : 'user');
  return {
    id: uid,
    email: email || `${uid}@users.placeholder.local`,
    username: patch.username != null && String(patch.username).trim() ? patch.username : fallbackHandle,
    full_name:
      patch.full_name != null && String(patch.full_name).trim() ? patch.full_name : fallbackName,
    university: (typeof meta.university === 'string' && meta.university.trim()) || 'Rutgers University',
    is_organization: isOrg,
    ...patch,
  };
}

/**
 * Updates public.users; retries without columns missing from DB (PostgREST schema cache errors).
 * Uses return=representation so we can detect zero-row UPDATE; then upserts if the row is missing.
 */
async function patchPublicUsersRow(uid, payload) {
  let toSend = { ...payload };
  const skipped = [];

  for (let i = 0; i < 6; i += 1) {
    const attemptedBio = Object.prototype.hasOwnProperty.call(toSend, 'bio') ? toSend.bio : undefined;

    const { data, error } = await supabase
      .from('users')
      .update(toSend)
      .eq('id', uid)
      .select('id');

    if (!error) {
      if (!Array.isArray(data) || data.length === 0) {
        const { data: sess } = await supabase.auth.getSession();
        const su = sess?.session?.user;
        const insertRow = buildUsersUpsertRowFromSession(uid, toSend, su);
        if (!insertRow) {
          return {
            error: new Error(
              'No public.users row and session is missing. Sign out and back in, then try Save again.'
            ),
            skipped,
          };
        }
        const { data: upData, error: upErr } = await supabase
          .from('users')
          .upsert(insertRow, { onConflict: 'id' })
          .select('id');
        if (upErr) return { error: upErr, skipped };
        if (!Array.isArray(upData) || upData.length === 0) {
          return {
            error: new Error(
              'Could not create your profile row. Re-run SUPABASE_USERS_BIO_SELF_UPDATE_FIX.sql (needs INSERT policy) or add a public.users row for your user id in the Table Editor.'
            ),
            skipped,
          };
        }
      }
      if (attemptedBio !== undefined) {
        const want = attemptedBio == null ? '' : String(attemptedBio).trim();
        if (want !== '') {
          const { data: reread, error: reErr } = await supabase
            .from('users')
            .select('bio')
            .eq('id', uid)
            .maybeSingle();
          const reMsg = reErr?.message || '';
          const bioColMissing = /column.*bio|does not exist|schema cache/i.test(reMsg);
          if (!reErr && reread) {
            const got = reread.bio == null ? '' : String(reread.bio).trim();
            if (got !== want) {
              return {
                error: new Error(
                  'Bio was sent but is still not stored in public.users. Check for a BEFORE/AFTER UPDATE trigger clearing bio, or run SUPABASE_USERS_BIO_SELF_UPDATE_FIX.sql in the SQL Editor.'
                ),
                skipped,
              };
            }
          } else if (reErr && !bioColMissing) {
            return { error: reErr, skipped };
          }
        }
      }
      return { error: null, skipped };
    }

    const msg = error.message || '';
    const schemaMismatch =
      /schema cache|could not find|column.*does not exist|undefined column/i.test(msg);
    if (!schemaMismatch) return { error, skipped };

    let stripped = false;
    for (const col of ['avatar_url', 'bio']) {
      if (new RegExp(col, 'i').test(msg) && Object.prototype.hasOwnProperty.call(toSend, col)) {
        delete toSend[col];
        skipped.push(col);
        stripped = true;
        break;
      }
    }
    if (!stripped) return { error, skipped };
  }
  return { error: new Error('Could not update profile (too many schema retries)'), skipped };
}

const GreekLifeSettingsPage = ({ user, navigationData, onNavigate, onLogout, onProfileUpdate }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saveMessage, setSaveMessage] = useState('');
  /** Inline feedback for "Email me a reset link" (no browser alert). */
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [resetLinkErr, setResetLinkErr] = useState('');
  
  // Initialize form data from user prop or defaults
  const [profileImage, setProfileImage] = useState(
    user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=greek'
  );
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.name?.split(' ')[0] || 'Alexander',
    lastName: user?.lastName || user?.name?.split(' ')[1] || 'Thompson',
    organizationName: user?.organizationName || user?.organization?.name || user?.name || '',
    usernameHandle: stripAt(user?.username),
    email: user?.email || 'alex.thompson@university.edu',
    bio: user?.bio || ''
  });

  // Re-sync form only when login identity changes — not on every parent merge (avoids wiping "Saved").
  const userIdentityKey = user?.supabaseUserId || user?.userId || user?.email || '';
  useEffect(() => {
    if (!user) return;
    setFormData({
      firstName: user.firstName || user.name?.split(' ')[0] || 'Alexander',
      lastName: user.lastName || user.name?.split(' ')[1] || 'Thompson',
      organizationName: user.organizationName || user.organization?.name || user.name || '',
      usernameHandle: stripAt(user.username),
      email: user.email || 'alex.thompson@university.edu',
      bio: user.bio || ''
    });
    setProfileImage(user.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=greek');
  }, [userIdentityKey]);

  // When App state updates image/bio/name (save or merge after auth refresh), reflect it in the form.
  useEffect(() => {
    if (!user) return;
    if (user.image) {
      setProfileImage(user.image);
    }
    setFormData((f) => ({
      ...f,
      bio: user.bio !== undefined && user.bio !== null ? user.bio : f.bio,
      organizationName:
        user.organizationName || user.organization?.name || user.name || f.organizationName,
      usernameHandle: stripAt(user.username) || f.usernameHandle,
      firstName: user.firstName || user.name?.split(' ')[0] || f.firstName,
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || f.lastName,
      email: user.email || f.email,
    }));
  }, [
    user?.image,
    user?.bio,
    user?.organizationName,
    user?.username,
    user?.name,
    user?.email,
    user?.firstName,
    user?.lastName,
  ]);

  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Event Reminders', description: 'Get notified about upcoming events', enabled: true },
    { id: '2', title: 'New Messages', description: 'Receive notifications for new messages', enabled: true },
    { id: '4', title: 'Payment Reminders', description: 'Reminders for dues and payments', enabled: true },
  ]);

  const isOrgAccount = Boolean(user?.isOrganization || user?.supabaseIsOrganization);

  /** All `organization_members` rows for the signed-in user (chapter roles). */
  const [chapterMemberships, setChapterMemberships] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamActionMsg, setTeamActionMsg] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');

  const loadChapterMemberships = useCallback(async () => {
    const uid = await getSupabaseAuthUid();
    if (!uid) {
      setChapterMemberships([]);
      setSelectedChapterId(null);
      return;
    }
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        'organization_id, is_org_admin, can_scan_tickets, organizations ( id, name, username, university, user_id )'
      )
      .eq('user_id', uid);
    let rows = !error && Array.isArray(data) ? data : [];
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('Settings chapter memberships:', error.message);
    }
    if (rows.length === 0 && isOrgAccount) {
      const { data: orgOnly, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, username, university, user_id')
        .eq('user_id', uid)
        .maybeSingle();
      if (!orgErr && orgOnly?.id) {
        rows = [
          {
            organization_id: orgOnly.id,
            is_org_admin: true,
            can_scan_tickets: true,
            organizations: orgOnly,
          },
        ];
      }
    }
    setChapterMemberships(rows);
    setSelectedChapterId((prev) => {
      if (prev && rows.some((r) => String(r.organization_id) === String(prev))) return prev;
      const adminFirst = rows.find((r) => r.is_org_admin);
      const pick = adminFirst || rows[0];
      return pick?.organization_id ?? null;
    });
  }, [isOrgAccount]);

  const selectedMembership = useMemo(
    () => chapterMemberships.find((r) => String(r.organization_id) === String(selectedChapterId)),
    [chapterMemberships, selectedChapterId]
  );

  const teamOrganizationId = selectedChapterId;
  const orgMayEditTeam = Boolean(selectedMembership?.is_org_admin);
  const stripePayoutOwnerUserId = useMemo(() => {
    const u = selectedMembership?.organizations?.user_id;
    return coerceToUuidString(u);
  }, [selectedMembership]);

  /** Chapters where this login is chapter admin (each has its own Stripe Connect via founder `user_id`). */
  const adminChapters = useMemo(
    () =>
      chapterMemberships.filter(
        (m) => m.is_org_admin && coerceToUuidString(m.organizations?.user_id)
      ),
    [chapterMemberships]
  );

  const hasChapterTeam = chapterMemberships.length > 0;
  const hasChapterPayouts = adminChapters.length > 0;

  const foundingUserIdForSelectedChapter = useMemo(
    () => coerceToUuidString(selectedMembership?.organizations?.user_id),
    [selectedMembership]
  );

  /** Stripe Connect status keyed by `organization_id` (one entry per chapter you admin). */
  const [payoutConnectByOrgId, setPayoutConnectByOrgId] = useState({});
  const [connectStatusLoading, setConnectStatusLoading] = useState(false);
  const [connectActionLoading, setConnectActionLoading] = useState(false);
  const [connectPayoutEditLoading, setConnectPayoutEditLoading] = useState(false);
  const [connectActionMsg, setConnectActionMsg] = useState('');
  const [connectFixUrl, setConnectFixUrl] = useState('');

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('section') === 'payouts') setActiveSection('payouts');
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (navigationData?.settingsSection === 'payouts') {
      setActiveSection('payouts');
    }
  }, [navigationData]);

  const fetchAllPayoutConnectStatuses = useCallback(async () => {
    if (adminChapters.length === 0) {
      setPayoutConnectByOrgId({});
      return;
    }
    setConnectStatusLoading(true);
    setConnectActionMsg('');
    setConnectFixUrl('');
    try {
      const next = {};
      await Promise.all(
        adminChapters.map(async (m) => {
          const oid = String(m.organization_id);
          const fid = coerceToUuidString(m.organizations?.user_id);
          if (!fid) return;
          try {
            const r = await fetch(
              `${getApiUrl('/api/stripe-connect-status')}?supabaseUserId=${encodeURIComponent(fid)}`
            );
            const text = await r.text();
            let j = null;
            try {
              j = text ? JSON.parse(text) : null;
            } catch (_) {
              j = null;
            }
            next[oid] = r.ok && j ? j : null;
          } catch (_) {
            next[oid] = null;
          }
        })
      );
      setPayoutConnectByOrgId(next);
    } catch (_) {
      setPayoutConnectByOrgId({});
    }
    setConnectStatusLoading(false);
  }, [adminChapters]);

  useEffect(() => {
    if (activeSection === 'payouts' && hasChapterPayouts) fetchAllPayoutConnectStatuses();
  }, [activeSection, hasChapterPayouts, fetchAllPayoutConnectStatuses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadChapterMemberships();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [userIdentityKey, loadChapterMemberships]);

  useEffect(() => {
    if (!hasChapterTeam) setTeamMembers([]);
  }, [hasChapterTeam]);

  useEffect(() => {
    if ((activeSection === 'team' || activeSection === 'payouts') && !hasChapterTeam) {
      setActiveSection('profile');
    }
    if (activeSection === 'payouts' && !hasChapterPayouts) {
      setActiveSection('profile');
    }
  }, [activeSection, hasChapterTeam, hasChapterPayouts]);

  const loadTeamMembers = useCallback(async () => {
    const oid =
      teamOrganizationId || coerceToUuidString(user?.organization?.id) || null;
    if (!oid || !isSupabaseUuid(String(oid))) {
      setTeamMembers([]);
      return;
    }
    setTeamLoading(true);
    setTeamActionMsg('');
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          'user_id, is_org_admin, can_scan_tickets, users ( email, full_name, username )'
        )
        .eq('organization_id', oid)
        .order('is_org_admin', { ascending: false });
      if (error) throw error;
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      setTeamMembers([]);
      setTeamActionMsg(e?.message || 'Could not load team.');
    } finally {
      setTeamLoading(false);
    }
  }, [teamOrganizationId, user?.organization?.id]);

  useEffect(() => {
    if (activeSection !== 'team' || !hasChapterTeam) return undefined;
    loadTeamMembers();
    return undefined;
  }, [activeSection, hasChapterTeam, loadTeamMembers, teamOrganizationId]);

  useEffect(() => {
    if (!hasChapterPayouts) return;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('stripe_payout_return') === '1' || q.get('stripe_payout_refresh') === '1') {
        fetchAllPayoutConnectStatuses();
        const u = new URL(window.location.href);
        u.searchParams.delete('stripe_payout_return');
        u.searchParams.delete('stripe_payout_refresh');
        u.searchParams.delete('section');
        window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
      }
    } catch (_) {
      /* ignore */
    }
  }, [hasChapterPayouts, fetchAllPayoutConnectStatuses]);

  const handleStripeConnect = async (founderUserIdOverride) => {
    setConnectActionLoading(true);
    setConnectActionMsg('');
    setConnectFixUrl('');
    if (!hasChapterPayouts) {
      setConnectActionMsg('Only chapter admins can set up Stripe payouts.');
      setConnectActionLoading(false);
      return;
    }
    const payoutUid =
      coerceToUuidString(founderUserIdOverride) ||
      stripePayoutOwnerUserId ||
      (await getSupabaseAuthUid());
    if (!payoutUid) {
      setConnectActionMsg('Please log in again.');
      setConnectActionLoading(false);
      return;
    }
    try {
      const resp = await fetch(getApiUrl('/api/stripe-connect-onboarding'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUserId: payoutUid,
          userEmail: user?.email || undefined,
        }),
      });
      const text = await resp.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = {};
      }
      if (!resp.ok) {
        if (resp.status === 404 || /Route not found/i.test(text)) {
          setConnectActionMsg(
            'The API server does not have the Stripe Connect route yet. Stop and restart the backend (npm run server), then try again.'
          );
        } else if (data.code === 'STRIPE_CONNECT_PLATFORM_DISABLED' && data.openStripeConnect) {
          setConnectFixUrl(data.openStripeConnect);
          setConnectActionMsg(
            data.message ||
              'Stripe Connect must be enabled on your Stripe account first. If a new tab did not open, use the link below (allow popups). Then try this button again.'
          );
          try {
            window.open(data.openStripeConnect, '_blank', 'noopener,noreferrer');
          } catch (_) {
            /* ignore */
          }
        } else {
          setConnectActionMsg(data.message || data.error || text.slice(0, 180) || 'Could not start Stripe setup.');
        }
        setConnectActionLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setConnectActionMsg('Stripe did not return a link. Try again.');
    } catch (e) {
      setConnectActionMsg(e?.message || 'Network error.');
    }
    setConnectActionLoading(false);
  };

  const handleStripePayoutEdit = async (founderUserIdOverride) => {
    setConnectPayoutEditLoading(true);
    setConnectActionMsg('');
    setConnectFixUrl('');
    if (!hasChapterPayouts) {
      setConnectActionMsg('Only chapter admins can open Stripe payout settings.');
      setConnectPayoutEditLoading(false);
      return;
    }
    const payoutUid =
      coerceToUuidString(founderUserIdOverride) ||
      stripePayoutOwnerUserId ||
      (await getSupabaseAuthUid());
    if (!payoutUid) {
      setConnectActionMsg('Please log in again.');
      setConnectPayoutEditLoading(false);
      return;
    }
    try {
      const resp = await fetch(getApiUrl('/api/stripe-connect-login-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUserId: payoutUid }),
      });
      const text = await resp.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = {};
      }
      if (!resp.ok) {
        setConnectActionMsg(
          data.message || data.error || text.slice(0, 180) || 'Could not open Stripe. Try again.'
        );
        setConnectPayoutEditLoading(false);
        return;
      }
      if (data.url) {
        const w = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!w) window.location.href = data.url;
        setConnectPayoutEditLoading(false);
        return;
      }
      setConnectActionMsg('Stripe did not return a link. Try again.');
    } catch (e) {
      setConnectActionMsg(e?.message || 'Network error.');
    }
    setConnectPayoutEditLoading(false);
  };

  const handleInviteMember = async () => {
    setTeamActionMsg('');
    if (!orgMayEditTeam) {
      setTeamActionMsg('Only the organization admin can invite members.');
      return;
    }
    const oid = teamOrganizationId || coerceToUuidString(user?.organization?.id);
    if (!oid || !isSupabaseUuid(oid)) {
      setTeamActionMsg('Missing organization scope. Refresh and try again.');
      return;
    }

    const rawInput = String(inviteUserId || '').trim();
    let id = coerceToUuidString(rawInput);

    if (!id) {
      const handle = stripAt(rawInput);
      if (!handle) {
        setTeamActionMsg('Enter the member’s username (with or without @).');
        return;
      }
      const literal = escapeIlikeExact(handle);
      const { data: rows, error: lookupErr } = await supabase
        .from('users')
        .select('id, username')
        .ilike('username', literal)
        .limit(2);

      if (lookupErr) {
        setTeamActionMsg(lookupErr.message || 'Could not look up that username.');
        return;
      }
      if (!rows?.length) {
        setTeamActionMsg(
          `No account found for “${handle}”. Check spelling — they must have signed up so a profile exists.`
        );
        return;
      }
      if (rows.length > 1) {
        setTeamActionMsg('More than one account matched. Use the exact username from their profile.');
        return;
      }
      id = coerceToUuidString(rows[0].id);
    }

    if (!id || !isSupabaseUuid(id)) {
      setTeamActionMsg('Could not resolve that to a user id.');
      return;
    }

    const self = await getSupabaseAuthUid();
    if (id === self) {
      setTeamActionMsg('You are already on the team.');
      return;
    }
    setTeamLoading(true);
    try {
      const { error } = await supabase.from('organization_members').insert({
        organization_id: oid,
        user_id: id,
        is_org_admin: false,
        can_scan_tickets: false,
      });
      if (error) throw error;
      setInviteUserId('');
      setTeamActionMsg('Member added.');
      await loadTeamMembers();
    } catch (e) {
      setTeamActionMsg(e?.message || 'Invite failed (they may already be a member, or have no users row yet).');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleRemoveMember = async (memberUid) => {
    setTeamActionMsg('');
    if (!orgMayEditTeam) return;
    const oid = teamOrganizationId || coerceToUuidString(user?.organization?.id);
    if (!oid) return;
    const founderUid = foundingUserIdForSelectedChapter;
    if (founderUid && String(memberUid) === String(founderUid)) {
      setTeamActionMsg('The official organization login cannot be removed from the roster.');
      return;
    }
    if (!window.confirm('Remove this member from the organization? They will lose posting access for this chapter.')) {
      return;
    }
    setTeamLoading(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .match({ organization_id: oid, user_id: memberUid });
      if (error) throw error;
      setTeamActionMsg('Member removed.');
      await loadTeamMembers();
    } catch (e) {
      setTeamActionMsg(e?.message || 'Could not remove member.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleMakeAdmin = async (memberUid) => {
    setTeamActionMsg('');
    if (!orgMayEditTeam) return;
    const oid = teamOrganizationId || coerceToUuidString(user?.organization?.id);
    const self = await getSupabaseAuthUid();
    if (!oid || !self || memberUid === self) return;
    if (
      !window.confirm(
        'Make this person the chapter admin? You will lose admin powers (you can stay as a member if you are re-invited).'
      )
    ) {
      return;
    }
    setTeamLoading(true);
    try {
      const { error: rpcErr } = await supabase.rpc('transfer_organization_admin', {
        p_organization_id: oid,
        p_new_admin_user_id: memberUid,
      });
      if (rpcErr) {
        const detail = [rpcErr.message, rpcErr.details, rpcErr.hint].filter(Boolean).join(' — ');
        throw new Error(detail || rpcErr.code || 'transfer_organization_admin failed');
      }
      setTeamActionMsg('Admin role transferred.');
      await loadChapterMemberships();
      await loadTeamMembers();
    } catch (e) {
      setTeamActionMsg(
        e?.message ||
          'Could not transfer admin. Confirm Phase 3B RPC exists and you are still the chapter admin in the database.'
      );
    } finally {
      setTeamLoading(false);
    }
  };

  const handleToggleScanner = async (memberRow) => {
    setTeamActionMsg('');
    if (!orgMayEditTeam || memberRow.is_org_admin) return;
    const oid = teamOrganizationId || coerceToUuidString(user?.organization?.id);
    if (!oid) return;
    const next = !memberRow.can_scan_tickets;
    if (next) {
      const otherScanners = teamMembers.filter(
        (m) => !m.is_org_admin && m.can_scan_tickets && m.user_id !== memberRow.user_id
      );
      if (otherScanners.length >= 2) {
        setTeamActionMsg('Maximum two ticket scanners (plus the admin). Turn off another scanner first.');
        return;
      }
    }
    setTeamLoading(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ can_scan_tickets: next })
        .match({ organization_id: oid, user_id: memberRow.user_id });
      if (error) throw error;
      setTeamActionMsg(next ? 'Scanner enabled.' : 'Scanner disabled.');
      await loadTeamMembers();
    } catch (e) {
      setTeamActionMsg(e?.message || 'Could not update scanner.');
    } finally {
      setTeamLoading(false);
    }
  };

  const sections = [
    { id: 'profile', title: 'Profile Settings', icon: <User className="w-5 h-5" />, description: 'Manage your personal information' },
    ...(hasChapterPayouts
      ? [
          {
            id: 'payouts',
            title: 'Payout Information',
            icon: <Banknote className="w-5 h-5" />,
            description: 'Where to receive event revenue',
          },
        ]
      : []),
    ...(hasChapterTeam
      ? [
          {
            id: 'team',
            title: 'Team & roles',
            icon: <Users className="w-5 h-5" />,
            description: 'Organizations you belong to, roles, and roster',
          },
        ]
      : []),
    { id: 'notifications', title: 'Notifications', icon: <Bell className="w-5 h-5" />, description: 'Configure notification preferences' },
    { id: 'security', title: 'Privacy & Security', icon: <Shield className="w-5 h-5" />, description: 'Security and privacy settings' },
    { id: 'help', title: 'Help', icon: <HelpCircle className="w-5 h-5" />, description: 'Contact support' },
  ];

  useEffect(() => {
    if (activeSection === 'payment') setActiveSection('profile');
  }, [activeSection]);

  const toggleNotification = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        try {
          const max = 512;
          let w = img.width;
          let h = img.height;
          if (w > max || h > max) {
            if (w > h) {
              h = Math.round((h * max) / w);
              w = max;
            } else {
              w = Math.round((w * max) / h);
              h = max;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          setProfileImage(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          setProfileImage(dataUrl);
        }
      };
      img.onerror = () => setProfileImage(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    const isOrg = Boolean(user?.isOrganization || user?.supabaseIsOrganization);
    let updatedUserData;
    let syncError = null;
    let skippedColumns = [];

    const uid = await getSupabaseAuthUid();
    const handleNorm =
      normalizeUsernameHandle(formData.usernameHandle) ||
      normalizeUsernameHandle(user?.username);
    const usernameDisplay = handleNorm ? `@${handleNorm}` : user?.username || '@user';
    const bioVal = (formData.bio || '').trim() || null;
    const avatarUrl =
      typeof profileImage === 'string' && profileImage.length > 0 ? profileImage : null;

    if (isOrg) {
      if (!orgMayEditTeam) {
        setSaveMessage(
          'Only the chapter admin can change the public organization profile. Ask the current admin to transfer the role in Team & roles.'
        );
        setTimeout(() => setSaveMessage(''), 5000);
        return;
      }
      const newName =
        (formData.organizationName || '').trim() ||
        user.organizationName ||
        user.organization?.name ||
        user.name ||
        'Organization';

      if (uid) {
        const userRow = { full_name: newName, bio: bioVal, avatar_url: avatarUrl };
        if (handleNorm) userRow.username = handleNorm;

        const orgPayload = { name: newName };
        if (handleNorm) orgPayload.username = handleNorm;

        const orgPk = coerceToUuidString(user?.organization?.id);
        const orgUpdateQuery = orgPk
          ? supabase.from('organizations').update(orgPayload).eq('id', orgPk)
          : supabase.from('organizations').update(orgPayload).eq('user_id', uid);

        const [uRes, oRes] = await Promise.all([
          patchPublicUsersRow(uid, userRow),
          orgUpdateQuery,
        ]);
        if (uRes.error) syncError = uRes.error.message || String(uRes.error);
        else if (oRes.error) syncError = oRes.error.message;
        if (uRes.skipped?.length) skippedColumns = [...skippedColumns, ...uRes.skipped];

        const { error: authMetaErr } = await supabase.auth.updateUser({
          data: {
            organization_name: newName,
            full_name: newName,
            ...(handleNorm ? { username: handleNorm } : {}),
          },
        });
        if (authMetaErr && !syncError) syncError = authMetaErr.message;
      }

      updatedUserData = {
        ...user,
        ...formData,
        image: profileImage,
        name: newName,
        organizationName: newName,
        organization: {
          ...(user.organization || {}),
          name: newName,
          email: formData.email || user.email,
          university: user.university,
          type: user.organization?.type || 'Organization',
        },
        firstName: newName.split(/\s+/)[0] || 'Organization',
        lastName: 'Admin',
        username: usernameDisplay,
        bio: formData.bio,
      };
    } else {
      const fn = (formData.firstName || '').trim();
      const ln = (formData.lastName || '').trim();
      const studentHandle =
        handleNorm ||
        normalizeUsernameHandle(`${fn}.${ln}`.replace(/\s+/g, '')) ||
        normalizeUsernameHandle(user?.username);

      if (uid) {
        const fullName = `${fn} ${ln}`.trim() || user.name;
        const userRow = { full_name: fullName, bio: bioVal, avatar_url: avatarUrl };
        if (studentHandle) userRow.username = studentHandle;

        const uRes = await patchPublicUsersRow(uid, userRow);
        if (uRes.error) syncError = uRes.error.message || String(uRes.error);
        if (uRes.skipped?.length) skippedColumns = [...skippedColumns, ...uRes.skipped];

        const { error: authMetaErr } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            ...(studentHandle ? { username: studentHandle } : {}),
          },
        });
        if (authMetaErr && !syncError) syncError = authMetaErr.message;
      }

      const studentUsername =
        studentHandle != null
          ? `@${studentHandle}`
          : fn && ln
            ? `@${fn.toLowerCase()}.${ln.toLowerCase()}`
            : user.username || '@user';

      updatedUserData = {
        ...user,
        ...formData,
        image: profileImage,
        name: `${fn} ${ln}`.trim(),
        username: studentUsername,
        bio: formData.bio,
      };
    }

    sessionStorage.setItem('user', JSON.stringify(updatedUserData));
    if (onProfileUpdate) {
      onProfileUpdate(updatedUserData);
    }

    let msg = 'Saved';
    if (syncError) {
      msg = `Saved on this device — could not sync: ${syncError.slice(0, 120)}`;
    } else if (skippedColumns.length) {
      msg = `Saved — ${skippedColumns.join(', ')} not in DB (run SUPABASE_USERS_ADD_AVATAR_BIO.sql); photo/bio stay on this device until then.`;
    }
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button 
            onClick={() => onNavigate('home')}
            className="text-white/80 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-purple-200">Manage your Greek Life account preferences</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-1/4"
          >
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {sections.map((section, index) => (
                    <motion.button
                      key={section.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {section.icon}
                        <span className="font-medium">{section.title}</span>
        </div>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="w-full lg:w-3/4">
            <AnimatePresence mode="wait">
              {activeSection === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Profile Settings</CardTitle>
                      <CardDescription className="text-purple-200">
                        {user?.isOrganization || user?.supabaseIsOrganization
                          ? 'Update your organization name and profile details'
                          : 'Update your personal information and profile picture'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Profile Picture */}
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <Avatar className="w-24 h-24 border-4 border-white/20">
                            <AvatarImage src={profileImage} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-2xl">
                              GL
                            </AvatarFallback>
                          </Avatar>
                          <motion.label
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-full shadow-lg cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-white" />
                    <input 
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </motion.label>
                  </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Profile Photo</h3>
                          <p className="text-purple-200 text-sm">Click the camera icon to upload a new profile picture</p>
                  </div>
                </div>

                      <Separator className="bg-white/20" />

                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user?.isOrganization || user?.supabaseIsOrganization ? (
                          <>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-white">Organization name</Label>
                              <Input
                                value={formData.organizationName}
                                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                                placeholder="Your organization name"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-white">Username</Label>
                              <Input
                                value={formData.usernameHandle}
                                onChange={(e) => handleInputChange('usernameHandle', e.target.value)}
                                placeholder="your_handle"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400"
                              />
                              <p className="text-purple-300/80 text-xs">
                                Public handle (letters, numbers, dot, underscore). Shown as @{formData.usernameHandle ? formData.usernameHandle.replace(/^@/, '') : 'handle'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label className="text-white">First Name</Label>
                              <Input
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white">Last Name</Label>
                              <Input
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </Label>
                        <Input
                          type="email"
                          readOnly
                          aria-readonly="true"
                          tabIndex={0}
                          value={formData.email || user?.email || ''}
                          className="bg-white/5 border-white/15 text-white/95 cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <p className="text-purple-300/80 text-xs">
                          This is your login email and cannot be changed here.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">About</Label>
                  <textarea 
                          value={formData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          placeholder={
                            user?.isOrganization || user?.supabaseIsOrganization
                              ? 'Tell students about your organization…'
                              : 'Tell us about yourself...'
                          }
                    rows="4"
                          className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                        />
                      </div>

                      {saveMessage ? (
                        <p
                          className="text-emerald-300 text-sm font-medium"
                          role="status"
                          aria-live="polite"
                        >
                          {saveMessage}
                        </p>
                      ) : null}

                      {(user?.isOrganization || user?.supabaseIsOrganization) && !orgMayEditTeam ? (
                        <p className="text-amber-200/95 text-sm rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                          Only the <strong className="text-white">chapter admin</strong> can save public org profile
                          changes here. Ask them to use <strong className="text-white">Team &amp; roles</strong> if you
                          need admin access.
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button 
                          type="button"
                          onClick={() => {
                            setFormData({
                              firstName: user?.firstName || user?.name?.split(' ')[0] || 'Alexander',
                              lastName: user?.lastName || user?.name?.split(' ')[1] || 'Thompson',
                              organizationName:
                                user?.organizationName || user?.organization?.name || user?.name || '',
                              usernameHandle: stripAt(user?.username),
                              email: user?.email || 'alex.thompson@university.edu',
                              bio: user?.bio || ''
                            });
                            setProfileImage(user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=greek');
                            setSaveMessage('');
                          }}
                          className="bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-lg"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleSaveChanges}
                          disabled={
                            Boolean(user?.isOrganization || user?.supabaseIsOrganization) && !orgMayEditTeam
                          }
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeSection === 'payouts' && hasChapterPayouts && (
                <motion.div
                  key="payouts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Payout Information</CardTitle>
                      <CardDescription className="text-purple-200">
                        <span className="block">
                          <strong className="text-white/90">How ticket money is split:</strong> You set the ticket
                          price — that full amount is what buyers pay for the ticket line item, and it routes to your
                          organization through Stripe Connect. Buyers also pay <strong>5% of that price</strong> to the
                          platform plus a separate <strong>estimated card-processing</strong> line (based on typical US
                          Stripe pricing on the total). Stripe&apos;s actual processing fee is settled by Stripe and
                          may differ slightly from the estimate; your Dashboard shows exact cents per sale. Payouts to
                          your bank follow Stripe&apos;s schedule. Set up automatic payouts below.
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <p className="text-sm text-purple-200/90">
                        Each chapter you administer has its own Stripe Connect account (tied to that chapter&apos;s
                        official org login). Set up or edit payouts per chapter below.
                      </p>
                      {adminChapters.map((m) => {
                        const oid = String(m.organization_id);
                        const founder = coerceToUuidString(m.organizations?.user_id);
                        const title =
                          (m.organizations?.name && String(m.organizations.name).trim()) ||
                          `Chapter ${oid.slice(0, 8)}…`;
                        const cs = payoutConnectByOrgId[oid] || null;
                        return (
                          <div
                            key={oid}
                            className="rounded-xl border border-purple-400/30 bg-white/5 p-4 space-y-3"
                          >
                            <div>
                              <h3 className="text-white text-lg font-semibold">Payouts — {title}</h3>
                              <Label className="text-white text-base mt-2 block">Automatic payouts (Stripe)</Label>
                              <p className="text-sm text-purple-200/90 mt-1">
                                You&apos;ll confirm your details on Stripe&apos;s secure page (test mode uses fake bank
                                numbers). Ticket revenue for this chapter routes through that chapter&apos;s Connect
                                account.
                              </p>
                            </div>
                            {connectStatusLoading ? (
                              <p className="text-sm text-white/70">Checking payout status…</p>
                            ) : cs?.charges_enabled ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                                  <Check className="w-4 h-4 shrink-0" />
                                  Ready — Stripe is connected for this chapter.
                                </div>
                                <p className="text-xs text-purple-200/80">
                                  Bank and payout details are managed on Stripe&apos;s site — not stored in this app.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleStripePayoutEdit(founder)}
                                  disabled={!founder || connectPayoutEditLoading || connectActionLoading}
                                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                >
                                  {connectPayoutEditLoading ? 'Opening Stripe…' : 'Edit payout information'}
                                </Button>
                              </div>
                            ) : cs?.hasConnectAccount ? (
                              <div className="space-y-2">
                                <p className="text-sm text-amber-200">
                                  Stripe still needs more information before paid tickets can run for this chapter.
                                </p>
                                <Button
                                  type="button"
                                  onClick={() => handleStripeConnect(founder)}
                                  disabled={!founder || connectActionLoading}
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                                >
                                  {connectActionLoading ? 'Opening Stripe…' : 'Continue Stripe setup'}
                                </Button>
                                <div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleStripePayoutEdit(founder)}
                                    disabled={!founder || connectPayoutEditLoading || connectActionLoading}
                                    className="mt-1 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                  >
                                    {connectPayoutEditLoading ? 'Opening Stripe…' : 'Edit payout information'}
                                  </Button>
                                  <p className="text-xs text-purple-200/70 mt-2">
                                    Opens Stripe to add a bank account or update payout details for this chapter.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-white/80">Automatic payouts are not set up yet for this chapter.</p>
                                <Button
                                  type="button"
                                  onClick={() => handleStripeConnect(founder)}
                                  disabled={!founder || connectActionLoading}
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                                >
                                  {connectActionLoading ? 'Opening Stripe…' : 'Set up automatic payouts'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {connectActionMsg ? (
                        <p
                          className={`text-sm font-medium ${
                            connectFixUrl
                              ? 'text-amber-200'
                              : connectActionMsg.startsWith('Please')
                                ? 'text-white/80'
                                : 'text-red-300'
                          }`}
                        >
                          {connectActionMsg}
                        </p>
                      ) : null}
                      {connectFixUrl ? (
                        <a
                          href={connectFixUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-medium text-purple-200 underline hover:text-white"
                        >
                          Open Stripe Connect settings
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeSection === 'team' && hasChapterTeam && (
                <motion.div
                  key="team"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Team &amp; roles</CardTitle>
                      <CardDescription className="text-purple-200">
                        Organizations you belong to appear here. Admins can invite members, set scanners, and transfer
                        admin. Everyone can see the roster. Admins invite by{' '}
                        <strong className="text-white">username</strong>.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {chapterMemberships.length > 1 ? (
                        <div className="space-y-2">
                          <Label className="text-white">Organization</Label>
                          <select
                            value={selectedChapterId || ''}
                            onChange={(e) => setSelectedChapterId(e.target.value || null)}
                            className="w-full max-w-md rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                          >
                            {chapterMemberships.map((m) => (
                              <option key={String(m.organization_id)} value={String(m.organization_id)}>
                                {(m.organizations?.name && String(m.organizations.name).trim()) ||
                                  `Organization ${String(m.organization_id).slice(0, 8)}…`}
                                {m.is_org_admin ? ' — admin' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : selectedMembership?.organizations?.name ? (
                        <p className="text-sm text-white/85">
                          <span className="text-white/60">Organization: </span>
                          <strong className="text-white">{String(selectedMembership.organizations.name).trim()}</strong>
                        </p>
                      ) : null}

                      {!orgMayEditTeam ? (
                        <p className="text-sm text-amber-200/95 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                          You can view this roster. Only the <strong className="text-white">organization admin</strong>{' '}
                          can invite, remove, change scanners, or transfer admin.
                        </p>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-white">Invite member (username)</Label>
                            <p className="text-xs text-purple-200/80">
                              Enter their app username (same as on their profile), with or without{' '}
                              <code className="text-white/90">@</code>.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                value={inviteUserId}
                                onChange={(e) => setInviteUserId(e.target.value)}
                                placeholder="@jane.doe or jane.doe"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 text-sm"
                              />
                              <Button
                                type="button"
                                onClick={handleInviteMember}
                                disabled={teamLoading}
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shrink-0"
                              >
                                {teamLoading ? 'Working…' : 'Add member'}
                              </Button>
                            </div>
                          </div>

                          <Separator className="bg-white/20" />
                        </>
                      )}

                      <div>
                        <h3 className="text-white font-semibold mb-2">Members</h3>
                        {teamLoading ? (
                          <p className="text-sm text-white/70">Loading…</p>
                        ) : teamMembers.length === 0 ? (
                          <p className="text-sm text-white/70">No rows yet.</p>
                        ) : (
                          <ul className="space-y-3">
                            {teamMembers.map((row) => {
                              const umeta = row.users || {};
                              const founderUid = foundingUserIdForSelectedChapter;
                              const isFoundingOrgRow =
                                Boolean(founderUid) && String(row.user_id) === String(founderUid);
                              const label =
                                (umeta.full_name && String(umeta.full_name).trim()) ||
                                (umeta.email && String(umeta.email).trim()) ||
                                (umeta.username && String(umeta.username).trim()) ||
                                String(row.user_id).slice(0, 8) + '…';
                              return (
                                <li
                                  key={row.user_id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-3"
                                >
                                  <div>
                                    <p className="text-white font-medium">{label}</p>
                                    <p className="text-xs text-purple-200 mt-1">
                                      {row.is_org_admin ? (
                                        <span className="text-emerald-300">Admin</span>
                                      ) : (
                                        <span>Member</span>
                                      )}
                                      {row.can_scan_tickets ? (
                                        <span className="text-white/60"> · ticket scanner</span>
                                      ) : null}
                                      {isFoundingOrgRow ? (
                                        <span className="text-white/60"> · official org login</span>
                                      ) : null}
                                    </p>
                                  </div>
                                  {orgMayEditTeam ? (
                                    <div className="flex flex-wrap gap-2">
                                      {!row.is_org_admin ? (
                                        <>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                                            onClick={() => handleToggleScanner(row)}
                                            disabled={teamLoading}
                                          >
                                            {row.can_scan_tickets ? 'Remove scanner' : 'Make scanner'}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                                            onClick={() => handleMakeAdmin(row.user_id)}
                                            disabled={teamLoading}
                                          >
                                            Make admin
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                                            onClick={() => handleRemoveMember(row.user_id)}
                                            disabled={teamLoading || isFoundingOrgRow}
                                            title={
                                              isFoundingOrgRow
                                                ? 'Official organization account stays on the roster'
                                                : undefined
                                            }
                                          >
                                            Remove
                                          </Button>
                                        </>
                                      ) : (
                                        <span className="text-xs text-white/50">Admin row</span>
                                      )}
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {teamActionMsg ? (
                        <p className="text-sm text-purple-100/90" role="status">
                          {teamActionMsg}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeSection === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Notification Preferences</CardTitle>
                      <CardDescription className="text-purple-200">
                        Choose what notifications you want to receive
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {notifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{notification.title}</h4>
                            <p className="text-purple-200 text-sm">{notification.description}</p>
              </div>
                          <Switch
                            checked={notification.enabled}
                            onCheckedChange={() => toggleNotification(notification.id)}
                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-indigo-500"
                          />
                        </motion.div>
                      ))}

                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeSection === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Privacy & Security</CardTitle>
                      <CardDescription className="text-purple-200">
                        Manage your account security and privacy settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          <Lock className="w-5 h-5" />
                          Password
                        </h4>
                        <div className="space-y-3">
                          <p className="text-purple-200 text-sm">
                            We&apos;ll email a secure link to{' '}
                            <span className="text-white/90 font-medium">
                              {user?.email ? String(user.email) : 'your account email'}
                            </span>
                            . Open it to choose a new password.
                          </p>
                          <Button
                            type="button"
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                            onClick={async () => {
                              setResetLinkSent(false);
                              setResetLinkErr('');
                              const email = user?.email && String(user.email).trim();
                              if (!email) {
                                setResetLinkErr('No email on this account — contact support.');
                                return;
                              }
                              try {
                                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                  redirectTo: `${window.location.origin}/reset-password`,
                                });
                                if (error) {
                                  setResetLinkErr(error.message || 'Could not send reset email.');
                                  return;
                                }
                                setResetLinkSent(true);
                              } catch (e) {
                                setResetLinkErr(e?.message || 'Could not send reset email.');
                              }
                            }}
                          >
                            Email me a reset link
                          </Button>
                          {resetLinkSent ? (
                            <p className="text-sm font-medium text-emerald-400 mt-3">
                              Reset link sent
                            </p>
                          ) : null}
                          {resetLinkErr ? (
                            <p className="text-sm font-medium text-red-300 mt-3">{resetLinkErr}</p>
                          ) : null}
                        </div>
                      </div>
            

                      <Separator className="bg-white/20" />

                      <div className="space-y-4">
                        <h4 className="text-white font-semibold text-orange-300">Account Actions</h4>
                        <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg">
                          <h4 className="text-orange-300 font-medium mb-2">Logout</h4>
                          <p className="text-orange-200/80 text-sm mb-4">
                            Sign out of your account and return to the welcome screen.
                          </p>
                          <Button 
                            onClick={onLogout}
                            className="bg-orange-500/10 backdrop-blur-sm border border-orange-400/20 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400/30 transition-all duration-200 shadow-lg"
                          >
                            Logout
                          </Button>
                </div>
                </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeSection === 'help' && (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Help & support</CardTitle>
                      <CardDescription className="text-purple-200">
                        Email us for questions, account issues, or refund requests when an event is cancelled (see
                        Terms of Service).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-purple-100/90">
                        Refunds for paid tickets are only considered when the event is{' '}
                        <strong className="text-white">cancelled</strong>. We review each message manually. If a
                        refund is approved, we process it through Stripe to your original payment method (timing
                        depends on your bank).
                      </p>
                      <Button
                        asChild
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg w-full sm:w-auto"
                      >
                        <a href={SUPPORT_MAILTO} target="_blank" rel="noopener noreferrer">
                          <Mail className="w-4 h-4 mr-2 inline-block align-text-bottom" />
                          Email {SUPPORT_EMAIL}
                        </a>
                      </Button>
                      <p className="text-xs text-purple-200/80">
                        If your mail app does not open, copy this address:{' '}
                        <span className="text-white font-mono">{SUPPORT_EMAIL}</span>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreekLifeSettingsPage;