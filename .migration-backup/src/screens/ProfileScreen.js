import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, UserPlus, Clock, Zap, Plus, X, DollarSign, Image as ImageIcon } from 'lucide-react';
import './ProfileScreen.css';
import ProfileEventCard from '../components/ProfileEventCard';
import { supabase, getSupabaseAuthCreatorUserId } from '../utils/supabaseClient';
import { checkSupabaseOrganizationAccess, getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import { isSupabaseUuid } from '../utils/isSupabaseUuid';
import { openOrganizationProfileFromOrgEvent } from '../utils/openOrganizationProfileFromOrgEvent';
import {
  fetchFollowersForProfile,
  fetchFollowGraphCountsForAccount,
} from '../utils/followGraphSupabase';
import {
  buildJoinedEventsFromRegistrations,
  mapSupabaseEventDbRowToAppEvent,
} from '../utils/supabaseJoinedEventsHydration';
import {
  ensureEventCoverPublicUrl,
  eventImageOrFallback,
  resolveEventImageFromRow,
} from '../utils/supabaseEventImage';
import { isEventPastBySchoolClock } from '../utils/eventSchoolTime';
import { isEventAtCapacity } from '../utils/eventCapacity';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';
import { getApiUrl } from '../utils/apiUrl';

const ORG_PAYOUT_REQUIRED_ALERT =
  'Please fill out payout information in settings before you can post an event.';

/** Category dropdown value that enables fundraiser checkout (donation flow, no tickets). */
const FUNDRAISER_CATEGORY = 'Fundraiser';

function eventFormIsFundraiser(form) {
  return String(form?.category || '').trim() === FUNDRAISER_CATEGORY;
}

/** Map a joined/editing event to the Category select value (handles legacy `is_fundraiser` + checkbox-only rows). */
function categorySelectValueForEdit(event) {
  if (!event) return 'Social';
  if (event.isFundraiser) return FUNDRAISER_CATEGORY;
  const c = event.category;
  if (c != null && String(c).trim() !== '') return String(c).trim();
  const t = event.type;
  if (t != null && String(t).trim() !== '') {
    const s = String(t).trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  return 'Social';
}

/** Paid org events need the chapter founder’s Stripe Connect account ready (`charges_enabled`). */
async function assertOrganizationStripeChargesEnabled(supabaseClient, organizationId) {
  if (!organizationId) return false;
  const { data: orgRow, error } = await supabaseClient
    .from('organizations')
    .select('user_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (error || !orgRow?.user_id) return false;
  const founderUid = String(orgRow.user_id).trim();
  try {
    const r = await fetch(
      `${getApiUrl('/api/stripe-connect-status')}?supabaseUserId=${encodeURIComponent(founderUid)}`
    );
    const text = await r.text();
    let j = null;
    try {
      j = text ? JSON.parse(text) : null;
    } catch (_) {
      j = null;
    }
    if (!r.ok || !j) return false;
    return Boolean(j.charges_enabled);
  } catch (_) {
    return false;
  }
}

/**
 * Events that belong on the org “own profile” list: created by the chapter founder account, or
 * created by a delegated member with `events.organization_id` pointing at this chapter.
 * Same idea as OrganizationProfileScreen’s `created_by` OR `organization_id` query.
 */
async function fetchSupabaseEventsForChapterHostProfile(supabaseClient, founderUserId, organizationTableIdHint) {
  let orgPk =
    organizationTableIdHint != null &&
    String(organizationTableIdHint).trim() !== '' &&
    isSupabaseUuid(String(organizationTableIdHint).trim())
      ? String(organizationTableIdHint).trim()
      : null;
  const founder =
    founderUserId != null &&
    String(founderUserId).trim() !== '' &&
    isSupabaseUuid(String(founderUserId).trim())
      ? String(founderUserId).trim()
      : null;

  if (!orgPk && founder) {
    const { data } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('user_id', founder)
      .maybeSingle();
    if (data?.id != null && isSupabaseUuid(String(data.id))) {
      orgPk = String(data.id).trim();
    }
  }

  let q = supabaseClient.from('events').select('*').order('created_at', { ascending: false });
  if (founder && orgPk) {
    q = q.or(`created_by.eq.${founder},organization_id.eq.${orgPk}`);
  } else if (orgPk) {
    q = q.eq('organization_id', orgPk);
  } else if (founder) {
    q = q.eq('created_by', founder);
  } else {
    return { data: [], error: null };
  }
  return q;
}

/** Maps joined event → Supabase `events.id` for registration rows (scanned / check-in). */
function getRegistrationEventIdKey(event) {
  if (!event) return null;
  if (event.supabaseId != null && String(event.supabaseId).trim() !== '') {
    return String(event.supabaseId);
  }
  const id = String(event.id || '');
  const m = id.match(/^supabase-(.+)$/i);
  return m ? m[1] : null;
}

// Custom hook for responsive design
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};

const ProfileScreen = ({
  user,
  onNavigate,
  joinedEvents,
  setJoinedEvents,
  followedOrganizations,
  setFollowedOrganizations,
  allEvents,
  setAllEvents,
  supabaseEvents = [],
  mergeUserFromSupabaseOrg,
  onEventsRefresh,
  refreshFollowedOrganizations,
}) => {
  const schoolClockTick = useSchoolClockTick();
  const isMobile = useIsMobile();
  /** DB is source of truth when logged in with Supabase (local user blob often wrong). */
  const [supabaseOrgVerified, setSupabaseOrgVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await checkSupabaseOrganizationAccess({ email: user?.email });
      if (cancelled) return;
      if (result.syncPatch && mergeUserFromSupabaseOrg) {
        mergeUserFromSupabaseOrg(result.syncPatch);
      } else if (
        mergeUserFromSupabaseOrg &&
        (result.reason === 'not_organization' || result.reason === 'no_session')
      ) {
        mergeUserFromSupabaseOrg({ orgMemberPosting: false });
      }
      setSupabaseOrgVerified(Boolean(result.isOrg));
      if (process.env.NODE_ENV === 'development') {
        console.log('🏢 Profile org capability check:', result.reason, 'isOrg:', result.isOrg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    user?.email,
    user?.userId,
    user?.isOrganization,
    user?.supabaseIsOrganization,
    mergeUserFromSupabaseOrg,
  ]);

  /** Org-only: DB/JWT verification, or app user already has real UUID + org flags from login. */
  const canUseOrgTools =
    supabaseOrgVerified === true ||
    Boolean(user?.orgMemberPosting) ||
    (Boolean(user?.isOrganization) &&
      Boolean(user?.supabaseIsOrganization) &&
      Boolean(user?.supabaseUserId) &&
      isSupabaseUuid(String(user.supabaseUserId)));

  const [activeTab, setActiveTab] = useState('upcoming');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followGraphLoading, setFollowGraphLoading] = useState(false);
  /** null = counts not loaded yet (avoid showing 0 from empty list before RPC returns). */
  const [followStats, setFollowStats] = useState(null);

  const loadFollowersFromSupabase = useCallback(async () => {
    const hasUid = user?.supabaseUserId || (user?.userId && isSupabaseUuid(String(user.userId)));
    if (!hasUid) {
      setFollowersList([]);
      return;
    }
    setFollowGraphLoading(true);
    try {
      const list = await fetchFollowersForProfile();
      setFollowersList(list);
    } catch (_) {
      setFollowersList([]);
    } finally {
      setFollowGraphLoading(false);
    }
  }, [user?.supabaseUserId, user?.userId]);

  useEffect(() => {
    const raw = user?.supabaseUserId || user?.userId;
    const uid = raw && isSupabaseUuid(String(raw)) ? String(raw).trim() : null;
    if (!uid) {
      setFollowStats({ followers: 0, following: 0 });
      return undefined;
    }
    let cancelled = false;
    setFollowStats(null);
    (async () => {
      const c = await fetchFollowGraphCountsForAccount(uid);
      if (!cancelled) setFollowStats(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.supabaseUserId, user?.userId]);

  useEffect(() => {
    loadFollowersFromSupabase();
  }, [loadFollowersFromSupabase]);

  useEffect(() => {
    if (showFollowersModal) loadFollowersFromSupabase();
  }, [showFollowersModal, loadFollowersFromSupabase]);

  useEffect(() => {
    if (showFollowingModal && typeof refreshFollowedOrganizations === 'function') {
      refreshFollowedOrganizations();
    }
  }, [showFollowingModal, refreshFollowedOrganizations]);
  const [showEventCreationModal, setShowEventCreationModal] = useState(false);
  const [showEventEditModal, setShowEventEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  /** Multi-org: rows from organization_members when creating an event (Phase 2). */
  const [postingOrgChoices, setPostingOrgChoices] = useState([]);
  const [postingOrganizationId, setPostingOrganizationId] = useState(null);
  /** event_id → ticket was scanned at check-in (student profile tabs). */
  const [registrationScannedByEventId, setRegistrationScannedByEventId] = useState({});

  /** Create Event is available only for Supabase-verified organization accounts. */
  const handleOpenCreateEvent = useCallback(() => {
    if (!canUseOrgTools) return;
    setShowEventCreationModal(true);
  }, [canUseOrgTools]);

  useEffect(() => {
    if (!showEventCreationModal || !canUseOrgTools) {
      setPostingOrgChoices([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const uid = await getSupabaseAuthUid();
      if (!uid || cancelled) return;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, is_org_admin, organizations ( id, name, username )')
        .eq('user_id', uid);
      if (cancelled) return;
      if (error) {
        console.warn('organization_members load:', error.message);
        setPostingOrgChoices([]);
        return;
      }
      const rows = data || [];
      setPostingOrgChoices(rows);
      if (rows.length === 1) {
        setPostingOrganizationId(rows[0].organization_id);
      } else if (rows.length > 1) {
        const adminFirst = [...rows].sort(
          (a, b) => Number(Boolean(b.is_org_admin)) - Number(Boolean(a.is_org_admin))
        );
        setPostingOrganizationId((prev) => prev || adminFirst[0].organization_id);
      } else {
        const { data: soleOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle();
        if (!cancelled && soleOrg?.id) setPostingOrganizationId(soleOrg.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEventCreationModal, canUseOrgTools]);

  // Load check-in state so scanned tickets move from Upcoming → Attended (refetch when tab visible).
  useEffect(() => {
    const isStudent = !user?.isOrganization && !user?.supabaseIsOrganization;
    if (!isStudent) {
      setRegistrationScannedByEventId({});
      return undefined;
    }

    let cancelled = false;
    const loadScans = async () => {
      const uid = await getSupabaseAuthUid();
      if (!uid || cancelled) return;
      const { data, error } = await supabase
        .from('registrations')
        .select('event_id, scanned')
        .eq('user_id', uid);
      if (cancelled || error) return;
      const next = {};
      for (const row of data || []) {
        if (row?.event_id != null) next[String(row.event_id)] = Boolean(row.scanned);
      }
      setRegistrationScannedByEventId(next);
    };

    loadScans();
    const onVis = () => {
      if (document.visibilityState === 'visible') loadScans();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.isOrganization, user?.supabaseIsOrganization, user?.userId, user?.supabaseUserId]);

  // Helper function to format time from 24h to 12h format
  const formatTime = (time) => {
    if (!time) return '';
    // If already in 12h format (contains AM/PM), return as-is
    if (time.includes('AM') || time.includes('PM')) return time;
    
    // Convert 24h format (e.g., "16:00") to 12h format (e.g., "4:00 PM")
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatEventDisplayDate = (dateValue) => {
    if (!dateValue) return '';
    const raw = String(dateValue).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(`${raw}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    if (raw.includes(',')) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    return raw;
  };
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    locationAddress: '',
    price: '',
    maxAttendees: '',
    category: 'Social',
    image: '',
    requiresJoinRequest: false,
  });

  // Org: show hosted events from App feed immediately (before events SELECT returns).
  useLayoutEffect(() => {
    if (!canUseOrgTools) return;
    let uid = getSupabaseAuthCreatorUserId(user);
    if (!uid || !isSupabaseUuid(String(uid))) uid = user?.supabaseUserId;
    if (!uid || !isSupabaseUuid(String(uid))) return;
    const hostNorm = String(uid).toLowerCase();
    const orgPkHint =
      user?.organization?.id != null && isSupabaseUuid(String(user.organization.id).trim())
        ? String(user.organization.id).trim()
        : '';
    const mine = (supabaseEvents || []).filter((e) => {
      if (String(e.createdByUserId || '').toLowerCase() === hostNorm) return true;
      const evOid =
        e.organizationId != null
          ? String(e.organizationId).trim()
          : e.organization_id != null
            ? String(e.organization_id).trim()
            : '';
      if (orgPkHint && evOid && evOid === orgPkHint) return true;
      return false;
    });
    if (mine.length === 0) return;

    const mergeHostedFromFeed = (setter) => {
      setter((prev) => {
        const existingIds = new Set(
          prev
            .map((e) => (e.supabaseId ? String(e.supabaseId).toLowerCase() : null))
            .filter(Boolean)
        );
        const newEvents = mine.filter(
          (e) =>
            e.supabaseId && !existingIds.has(String(e.supabaseId).toLowerCase())
        );
        if (newEvents.length === 0) return prev;
        return [...prev, ...newEvents];
      });
    };
    mergeHostedFromFeed(setJoinedEvents);
    mergeHostedFromFeed(setAllEvents);
  }, [canUseOrgTools, user, user?.organization?.id, supabaseEvents, setJoinedEvents, setAllEvents]);

  // Organization: load hosted events directly from Supabase (does not depend on App supabaseEvents).
  useEffect(() => {
    if (!canUseOrgTools) return undefined;

    let cancelled = false;
    (async () => {
      let creatorUid = getSupabaseAuthCreatorUserId(user);
      if (!creatorUid || !isSupabaseUuid(String(creatorUid))) {
        creatorUid = await getSupabaseAuthUid();
      }
      if (!creatorUid || !isSupabaseUuid(String(creatorUid))) return;

      const { data, error } = await fetchSupabaseEventsForChapterHostProfile(
        supabase,
        creatorUid,
        user?.organization?.id
      );

      if (cancelled || error) {
        if (process.env.NODE_ENV === 'development' && error) {
          console.warn('ProfileScreen org events:', error.message);
        }
        return;
      }
      const organizationEvents = (data || [])
        .map((row) => mapSupabaseEventDbRowToAppEvent(row))
        .filter(Boolean);
      if (organizationEvents.length === 0) return;

      setJoinedEvents((prev) => {
        const existingIds = new Set(
          prev
            .map((e) => (e.supabaseId ? String(e.supabaseId).toLowerCase() : null))
            .filter(Boolean)
        );
        const newEvents = organizationEvents.filter(
          (e) =>
            e.supabaseId && !existingIds.has(String(e.supabaseId).toLowerCase())
        );
        if (newEvents.length === 0) return prev;
        return [...prev, ...newEvents];
      });

      setAllEvents((prev) => {
        const existingIds = new Set(
          prev
            .map((e) => (e.supabaseId ? String(e.supabaseId).toLowerCase() : null))
            .filter(Boolean)
        );
        const newEvents = organizationEvents.filter(
          (e) =>
            e.supabaseId && !existingIds.has(String(e.supabaseId).toLowerCase())
        );
        if (newEvents.length === 0) return prev;
        return [...prev, ...newEvents];
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    canUseOrgTools,
    user?.userId,
    user?.supabaseUserId,
    user?.isOrganization,
    user?.supabaseIsOrganization,
    user?.organization?.id,
  ]);

  // Student: load tickets / joined events from registrations (does not depend on App feed).
  useEffect(() => {
    if (canUseOrgTools) return;
    const uid = user?.supabaseUserId || user?.userId;
    if (!uid || !isSupabaseUuid(String(uid))) return;

    let cancelled = false;
    (async () => {
      const evs = await buildJoinedEventsFromRegistrations(String(uid));
      if (cancelled || !evs?.length) return;
      setJoinedEvents(evs);
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseOrgTools, user?.supabaseUserId, user?.userId]);

  // Clean up duplicates when component mounts
  useEffect(() => {
    if (joinedEvents.length > 0) {
      const uniqueEvents = [];
      const seenIds = new Set();
      
      joinedEvents.forEach(event => {
        if (event.supabaseId && !seenIds.has(event.supabaseId)) {
          seenIds.add(event.supabaseId);
          uniqueEvents.push(event);
        } else if (!event.supabaseId) {
          // Keep events without supabaseId (legacy events)
          uniqueEvents.push(event);
        }
      });
      
      if (uniqueEvents.length !== joinedEvents.length) {
        console.log('🧹 Cleaning up duplicates:', joinedEvents.length, '->', uniqueEvents.length);
        setJoinedEvents(uniqueEvents);
      }
    }
  }, []); // Run once on mount

  const followingModalItems =
    (followedOrganizations || []).map((org, index) => ({
      id: org.id || `following-${org.supabaseUserId || index}`,
      name: org.name || 'Organization',
      username: org.username
        ? `@${String(org.username).replace(/^@/, '')}`
        : `@${String(org.name || 'org')
            .replace(/\s+/g, '')
            .toLowerCase()}`,
      handleRaw: org.username
        ? String(org.username).replace(/^@/, '')
        : String(org.name || 'org')
            .replace(/\s+/g, '')
            .toLowerCase(),
      avatar:
        org.image ||
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&h=100&fit=crop',
      university: org.university || user?.university || '',
      type: org.type || 'Organization',
      supabaseUserId: org.supabaseUserId,
      email: org.email,
      isSupabaseOrganization: org.isSupabaseOrganization !== false,
    })) || [];

  const openProfileFromFollowModal = useCallback(
    (row) => {
      const supabaseUserId = row.supabaseUserId || row.id;
      if (!supabaseUserId) return;
      const isOrg =
        row.isOrganization === true || row.isSupabaseOrganization !== false;
      setShowFollowersModal(false);
      setShowFollowingModal(false);
      onNavigate('organization-profile', {
        organization: {
          name: row.name,
          username: row.handleRaw || String(row.username || '').replace(/^@/, ''),
          image: row.avatar,
          supabaseUserId,
          university: row.university || '',
          email: row.email || null,
          isSupabaseOrganization: isOrg,
          type: row.type || (isOrg ? 'Organization' : 'Member'),
        },
      });
    },
    [onNavigate]
  );

  // Debug joinedEvents
  console.log('🔍 ProfileScreen - joinedEvents:', joinedEvents);
  console.log('🔍 ProfileScreen - joinedEvents length:', joinedEvents?.length);

  // Create profile data from user props (orgs: show signup org name + handle, not email local part)
  const orgProfileName =
    user?.organizationName ||
    user?.organization?.name ||
    user?.name ||
    `${user?.firstName || 'Organization'} ${user?.lastName || ''}`.trim();
  const orgProfileHandle =
    user?.username ||
    `@${String(user?.organizationName || user?.organization?.name || 'org')
      .replace(/\s+/g, '')
      .toLowerCase()}`;

  const isTicketScannedForProfile = (event) => {
    const key = getRegistrationEventIdKey(event);
    if (key != null && Object.prototype.hasOwnProperty.call(registrationScannedByEventId, key)) {
      return registrationScannedByEventId[key];
    }
    return Boolean(event.ticketScanned);
  };

  const profileData = {
    name: user?.isOrganization
      ? orgProfileName
      : user?.name || `${user?.firstName || 'Alex'} ${user?.lastName || 'Johnson'}`,
    username: user?.isOrganization ? orgProfileHandle : user?.username || `@${(user?.firstName || 'alex').toLowerCase()}.${(user?.lastName || 'johnson').toLowerCase()}`,
    university: user?.university?.name || user?.university || "Your University",
    chapter: user?.chapter || user?.organization?.name || user?.greekOrganization?.name || "Alpha Delta Pi",
    bio:
      user?.bio != null && String(user.bio).trim() !== ''
        ? String(user.bio).trim()
        : '',
    avatarUrl: user?.image || user?.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    followers: followStats == null ? null : followStats.followers,
    following: followStats == null ? null : followStats.following,
    upcomingEvents: (joinedEvents || [])
      .filter((event) => {
        void schoolClockTick;
        if (isTicketScannedForProfile(event)) return false;
        return !isEventPastBySchoolClock(event, user?.university);
      }).map(event => ({
      ...event,
      id: event.id,
      title: event.title,
      date: formatEventDisplayDate(event.date),
      time: event.time || "7:00 PM",
      location: event.location,
      locationAddress: event.locationAddress,
      attendees: event.attendees || event.attendance || 0,
      image: eventImageOrFallback({
        image: event.image,
        image_url: event.image_url,
      }),
    })) || [],
    attendedEvents: (joinedEvents || [])
      .filter((event) => {
        void schoolClockTick;
        if (isTicketScannedForProfile(event)) return true;
        return isEventPastBySchoolClock(event, user?.university);
    }).map(event => ({
      ...event,
      id: event.id,
      title: event.title,
      date: formatEventDisplayDate(event.date),
      time: event.time || "7:00 PM",
      location: event.location,
      locationAddress: event.locationAddress,
      attendees: event.attendees || event.attendance || 0,
      image: eventImageOrFallback({
        image: event.image,
        image_url: event.image_url,
      }),
    })) || []
  };

  const events = activeTab === 'upcoming' ? profileData.upcomingEvents : profileData.attendedEvents;

  const fundraiserForm = eventFormIsFundraiser(eventFormData);
  
  // Debug events
  console.log('🔍 ProfileScreen - activeTab:', activeTab);
  console.log('🔍 ProfileScreen - upcomingEvents:', profileData.upcomingEvents);
  console.log('🔍 ProfileScreen - upcomingEvents length:', profileData.upcomingEvents?.length);
  console.log('🔍 ProfileScreen - final events:', events);
  console.log('🔍 ProfileScreen - final events length:', events?.length);

  // Handle event click
  const handleEventClick = (event) => {
    // Always show event details modal first
    setSelectedEventDetails(event);
    setShowEventDetails(true);
  };

  // Handle close event details
  const handleCloseEventDetails = () => {
    setShowEventDetails(false);
    setSelectedEventDetails(null);
  };

  const handleLocationClick = (locationAddress) => {
    if (locationAddress) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationAddress)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  /** True when this event is in `joinedEvents` (same logic as Home/Search; keys off registration event id). */
  const isSelectedProfileEventJoined =
    Boolean(selectedEventDetails) &&
    Array.isArray(joinedEvents) &&
    joinedEvents.some((e) => {
      const ka = getRegistrationEventIdKey(selectedEventDetails);
      const kb = getRegistrationEventIdKey(e);
      if (ka && kb && ka === kb) return true;
      return String(e?.id ?? '') === String(selectedEventDetails?.id ?? '');
    });

  const isSelectedProfileEventFull =
    Boolean(selectedEventDetails) &&
    !isSelectedProfileEventJoined &&
    isEventAtCapacity(selectedEventDetails);

  // Handle edit event from details modal
  const handleEditEventFromDetails = (event) => {
    setEditingEvent(event);
      const rawD = String(event.date || '');
      const dateForForm = /^\d{4}-\d{2}-\d{2}$/.test(rawD)
        ? rawD
        : rawD.includes(',')
          ? new Date(rawD).toISOString().split('T')[0]
          : new Date(`${rawD}, ${new Date().getFullYear()}`).toISOString().split('T')[0];
      setEventFormData({
        title: event.title,
        description: event.description || '',
        date: dateForForm,
        time: event.time || '',
        location: event.location || '',
        locationAddress: event.locationAddress || '',
        price: event.isFundraiser ? 'Free' : event.price > 0 ? `$${event.price}` : 'Free',
        maxAttendees: event.maxAttendance || '',
        category: categorySelectValueForEdit(event),
        image: event.image || '',
        requiresJoinRequest: Boolean(event.requiresJoinRequest),
      });
    setShowEventDetails(false); // Close details modal
    setShowEventEditModal(true); // Open edit modal
  };

  // Event Creation Functions
  const handleEventFormChange = (field, value) => {
    setEventFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEventCategoryChange = (value) => {
    setEventFormData((prev) => ({
      ...prev,
      category: value,
      ...(String(value).trim() === FUNDRAISER_CATEGORY ? { price: '' } : {}),
    }));
  };

  const handleCreateEvent = async () => {
    // Prevent duplicate submissions
    if (isCreatingEvent) {
      console.log('⚠️ Event creation already in progress, ignoring duplicate click');
      return;
    }

    if (!eventFormData.title || !eventFormData.date || !eventFormData.time || !eventFormData.location || !eventFormData.locationAddress) {
      console.log('Missing required fields');
      return;
    }

    const liveAuthUid = await getSupabaseAuthUid();
    const creatorUid = liveAuthUid || getSupabaseAuthCreatorUserId(user);
    if (!creatorUid) {
      alert('Could not verify your account id. Please sign out and sign in again.');
      return;
    }
    if (
      liveAuthUid &&
      getSupabaseAuthCreatorUserId(user) &&
      String(liveAuthUid).toLowerCase() !==
        String(getSupabaseAuthCreatorUserId(user)).toLowerCase()
    ) {
      console.warn('Using live auth uid for created_by (state uid mismatch)', {
        liveAuthUid,
        stateUid: getSupabaseAuthCreatorUserId(user),
      });
    }

    // Set loading state immediately
    setIsCreatingEvent(true);
    console.log('🚀 Starting event creation...');
    
    // Create a unique submission ID to prevent duplicates
    const submissionId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Submission ID:', submissionId);
    
    // Set a timeout to automatically reset loading state if something goes wrong
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Event creation timeout - resetting loading state');
      setIsCreatingEvent(false);
    }, 30000); // 30 second timeout

    // Format date before duplicate check (was referenced before init → silent crash)
    const eventDate = new Date(eventFormData.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = eventFormData.time;

    // Check for potential duplicate events (same title and date within last 5 minutes)
    const recentEvents = joinedEvents.filter((event) => {
      const eventTime = new Date(event.date);
      const now = new Date();
      const timeDiff = now - eventTime;
      return timeDiff < 5 * 60 * 1000; // 5 minutes
    });

    const potentialDuplicate = recentEvents.find((event) => {
      if (event.title.toLowerCase() !== eventFormData.title.toLowerCase()) return false;
      const d = String(event.date || '');
      return d === eventFormData.date || d === formattedDate;
    });

    if (potentialDuplicate) {
      console.warn('⚠️ Potential duplicate event detected:', potentialDuplicate);
      alert('A similar event was created recently. Please wait a moment before creating another event.');
      clearTimeout(timeoutId);
      setIsCreatingEvent(false);
      return;
    }

    // Resolve organization for RLS (Phase 2 — events.organization_id required on insert)
    let resolvedOrganizationId =
      postingOrganizationId ||
      (user?.organization?.id ? String(user.organization.id).trim() : null) ||
      null;
    let resolvedOrgName = user?.organization?.name || user?.name;
    if (resolvedOrganizationId && postingOrgChoices.length) {
      const hit = postingOrgChoices.find(
        (r) => String(r.organization_id) === String(resolvedOrganizationId)
      );
      const ob = hit?.organizations;
      if (ob?.name) resolvedOrgName = String(ob.name);
    }
    if (!resolvedOrganizationId) {
      const { data: sole } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('user_id', creatorUid)
        .maybeSingle();
      if (sole?.id) {
        resolvedOrganizationId = sole.id;
        if (sole.name) resolvedOrgName = sole.name;
      }
    }
    if (!resolvedOrganizationId) {
      alert(
        'Could not determine which organization this event is for. Open Create Event again, pick an organization if shown, or refresh and try again.'
      );
      clearTimeout(timeoutId);
      setIsCreatingEvent(false);
      return;
    }

    // Convert price to number or 0 for free (fundraisers always store 0 — donors choose at checkout)
    const isFund = eventFormIsFundraiser(eventFormData);
    let priceValue =
      eventFormData.price && eventFormData.price !== 'Free'
        ? parseInt(eventFormData.price.replace('$', ''), 10) || 0
        : 0;
    if (isFund) priceValue = 0;

    if (isFund || priceValue > 0) {
      const stripeOk = await assertOrganizationStripeChargesEnabled(
        supabase,
        resolvedOrganizationId
      );
      if (!stripeOk) {
        alert(ORG_PAYOUT_REQUIRED_ALERT);
        clearTimeout(timeoutId);
        setIsCreatingEvent(false);
        return;
      }
    }

    // Convert category to uppercase type
    const eventType = eventFormData.category ? eventFormData.category.toUpperCase() : 'SOCIAL';

    // Get coordinates for the event location address using real geocoding
    const getEventCoordinates = async (address) => {
      try {
        console.log('🗺️ Geocoding address:', address);
        
        // Check if we have cached coordinates for this address
        const cacheKey = `geocoding_${address.toLowerCase()}`;
        const cachedCoords = localStorage.getItem(cacheKey);
        if (cachedCoords) {
          const coords = JSON.parse(cachedCoords);
          console.log('✅ Using cached coordinates for:', address, coords);
          return coords;
        }
        
        // Use Nominatim (OpenStreetMap) free geocoding API
        const encodedAddress = encodeURIComponent(address);
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
        
        try {
          // Reduced delay for faster loading (200ms instead of 500ms)
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(geocodingUrl, {
            headers: {
              'User-Agent': 'GreekLifeApp/1.0' // Required by Nominatim
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const data = await response.json();
          
          if (data && data.length > 0) {
            const result = data[0];
            const coords = [parseFloat(result.lon), parseFloat(result.lat)];
            console.log('✅ Real geocoding successful:', address, coords);
            console.log('📍 Geocoded location:', result.display_name);
            
            // Cache the coordinates for future use
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            console.log('💾 Cached coordinates for:', address);
            
            return coords;
          } else {
            console.warn('⚠️ No geocoding results found for:', address);
          }
        } catch (apiError) {
          console.error('❌ Geocoding API error:', apiError);
        }
        
        // Fallback to enhanced local mapping if API fails
        console.log('🔄 Falling back to local geocoding...');
        const commonLocations = {
          // Rutgers University area - more specific locations
          'Rutgers University': [-74.4478, 40.5008],
          'New Brunswick, NJ': [-74.4478, 40.5008],
          'College Ave, New Brunswick': [-74.4478, 40.5008],
          'George St, New Brunswick': [-74.4478, 40.5008],
          'Easton Ave, New Brunswick': [-74.4478, 40.5008],
          'Livingston Campus': [-74.4478, 40.5008],
          'Busch Campus': [-74.4478, 40.5008],
          'Cook Campus': [-74.4478, 40.5008],
          'Douglass Campus': [-74.4478, 40.5008],
          
          // More specific Rutgers locations
          'College Avenue Campus': [-74.4478, 40.5008],
          'Livingston Student Center': [-74.4478, 40.5008],
          'Busch Student Center': [-74.4478, 40.5008],
          'Cook Student Center': [-74.4478, 40.5008],
          'Douglass Student Center': [-74.4478, 40.5008],
          'Rutgers Student Center': [-74.4478, 40.5008],
          'Alexander Library': [-74.4478, 40.5008],
          'Rutgers Gym': [-74.4478, 40.5008],
          'Rutgers Recreation Center': [-74.4478, 40.5008],
          'Rutgers Athletic Center': [-74.4478, 40.5008],
          'Rutgers Theater': [-74.4478, 40.5008],
          'Rutgers Auditorium': [-74.4478, 40.5008],
          'Rutgers Dining Hall': [-74.4478, 40.5008],
          'Rutgers Cafeteria': [-74.4478, 40.5008],
          
          // Northeastern University area
          'Northeastern University': [-71.0893, 42.3398],
          'Boston, MA': [-71.0598, 42.3584],
          'Huntington Ave, Boston': [-71.0893, 42.3398],
          'Fenway, Boston': [-71.0893, 42.3398],
          'Back Bay, Boston': [-71.0598, 42.3584],
          'Downtown Boston': [-71.0598, 42.3584],
          
          // USC area
          'University of Southern California': [-118.2851, 34.0224],
          'Los Angeles, CA': [-118.2437, 34.0522],
          'University Park, Los Angeles': [-118.2851, 34.0224],
          'Downtown LA': [-118.2437, 34.0522],
          'Hollywood': [-118.3287, 34.0928],
          'Santa Monica': [-118.4912, 34.0195],
          
          // Stockton University area
          'Stockton University': [-74.4678, 39.4789],
          'Galloway, NJ': [-74.4678, 39.4789],
          'Atlantic City, NJ': [-74.4227, 39.3643],
          
          // Syracuse University area
          'Syracuse University': [-76.1352, 43.0391],
          'Syracuse, NY': [-76.1474, 43.0481],
          'Downtown Syracuse': [-76.1474, 43.0481],
          'Armory Square': [-76.1474, 43.0481],
          
          // Common event venues
          'Student Center': [-74.4478, 40.5008], // Default to Rutgers
          'Campus Center': [-74.4478, 40.5008],
          'Student Union': [-74.4478, 40.5008],
          'Library': [-74.4478, 40.5008],
          'Gymnasium': [-74.4478, 40.5008],
          'Auditorium': [-74.4478, 40.5008],
          'Theater': [-74.4478, 40.5008],
          'Cafeteria': [-74.4478, 40.5008],
          'Dining Hall': [-74.4478, 40.5008],
        };
        
        // Check if we have a direct match
        console.log('🔍 Searching for address match:', address);
        for (const [location, coords] of Object.entries(commonLocations)) {
          if (address.toLowerCase().includes(location.toLowerCase())) {
            console.log('✅ Found coordinates for:', location, coords);
            return coords;
          }
        }
        
        // Try partial matches for more flexibility
        console.log('🔍 No exact match found, trying partial matches...');
        const addressLower = address.toLowerCase();
        
        // Check for street names, building names, etc.
        if (addressLower.includes('street') || addressLower.includes('st')) {
          console.log('📍 Found street reference, using university center');
          return getUniversityCoordinates(user?.university);
        }
        
        if (addressLower.includes('avenue') || addressLower.includes('ave')) {
          console.log('📍 Found avenue reference, using university center');
          return getUniversityCoordinates(user?.university);
        }
        
        if (addressLower.includes('building') || addressLower.includes('hall')) {
          console.log('📍 Found building reference, using university center');
          return getUniversityCoordinates(user?.university);
        }
        
        // If no match found, try to create coordinates based on address content
    const getUniversityCoordinates = (universityName) => {
      const coords = {
        'Rutgers University': [-74.4478, 40.5008],
        'Northeastern University': [-71.0893, 42.3398],
        'University of Southern California': [-118.2851, 34.0224],
        'Stockton University': [-74.4678, 39.4789],
        'Syracuse University': [-76.1352, 43.0391]
      };
      return coords[universityName] || [-74.4478, 40.5008]; // Default to Rutgers
    };
        
        // Try to create a unique coordinate based on the address hash
        const baseCoords = getUniversityCoordinates(user?.university);
        const addressHash = address.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        // Create a small offset based on the address to make pins appear in different locations
        const offsetLat = (addressHash % 100) / 10000; // Small latitude offset
        const offsetLng = ((addressHash >> 8) % 100) / 10000; // Small longitude offset
        
        const uniqueCoords = [
          baseCoords[0] + offsetLng,
          baseCoords[1] + offsetLat
        ];
        
        console.log('📍 Generated unique coordinates for address:', address, uniqueCoords);
        return uniqueCoords;
        
      } catch (error) {
        console.error('❌ Error geocoding address:', error);
        // Fallback to university coordinates
        const getUniversityCoordinates = (universityName) => {
          const coords = {
            'Rutgers University': [-74.4478, 40.5008],
            'Northeastern University': [-71.0893, 42.3398],
            'University of Southern California': [-118.2851, 34.0224],
            'Stockton University': [-74.4678, 39.4789],
            'Syracuse University': [-76.1352, 43.0391]
          };
          return coords[universityName] || [-74.4478, 40.5008];
        };
        return getUniversityCoordinates(user?.university);
      }
    };

    // Resolve authoritative organization university from DB to avoid stale local state values.
    let resolvedUniversity = user?.university;
    try {
      const { data: orgRow } = await supabase
        .from('users')
        .select('university')
        .eq('id', creatorUid)
        .maybeSingle();
      if (orgRow?.university) {
        resolvedUniversity = orgRow.university;
      }
    } catch (e) {
      console.warn('org university lookup:', e?.message || e);
    }

    // Get coordinates for the event location
    const eventCoordinates = await getEventCoordinates(eventFormData.locationAddress);

    const FALLBACK_COVER =
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop';
    /** Data-URL uploads → Storage public URL so every user sees the same image (DB text is not truncated). */
    const coverForDb = await ensureEventCoverPublicUrl(
      supabase,
      creatorUid,
      eventFormData.image,
      FALLBACK_COVER
    );

    const newEvent = {
      id: `org-event-${Date.now()}`,
      title: eventFormData.title,
      organization: resolvedOrgName,
      orgColor: "#7c3aed", // Purple color for organization events
      // ISO date so Upcoming/Attended parsing matches auth-hosted events from Supabase
      date: eventFormData.date,
      time: formattedTime,
      location: eventFormData.location,
      locationAddress: eventFormData.locationAddress,
      coordinates: eventCoordinates,
      attendance: 0,
      maxAttendance: parseInt(eventFormData.maxAttendees) || 100,
      price: priceValue,
      image: coverForDb,
      type: eventType,
      description: eventFormData.description || 'Join us for this amazing event!',
      createdBy: resolvedOrgName,
      createdByUserId: creatorUid,
      isOrganizationEvent: true,
      university: resolvedUniversity,
      requiresJoinRequest: Boolean(eventFormData.requiresJoinRequest),
      isFundraiser: isFund,
    };

    console.log('Creating new event:', {
      newEvent,
      userIsOrg: user?.isOrganization,
      userName: user?.name,
      eventCreatedBy: newEvent.createdBy,
      eventIsOrgEvent: newEvent.isOrganizationEvent
    });

    // Save event to Supabase with duplicate prevention
    try {
      // First check if a similar event already exists in the database
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, title, date, created_at')
        .eq('created_by', creatorUid)
        .eq('title', eventFormData.title)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes
      
      if (checkError) {
        console.error('❌ Error checking for duplicates:', checkError);
      } else if (existingEvents && existingEvents.length > 0) {
        console.warn('⚠️ Duplicate event found in database:', existingEvents[0]);
        alert('A similar event was created recently. Please wait a moment before creating another event.');
        clearTimeout(timeoutId);
        setIsCreatingEvent(false);
        return;
      }
      
      const { data: supabaseEvent, error } = await supabase
        .from('events')
        .insert([
          {
            title: eventFormData.title,
            description: eventFormData.description || 'Join us for this amazing event!',
            date: eventFormData.date, // Send actual date (e.g., "2025-10-15")
            time: formattedTime,
            location: eventFormData.location,
            location_address: eventFormData.locationAddress,
            coordinates: JSON.stringify(eventCoordinates),
            image: coverForDb,
            price: priceValue,
            category: eventFormData.category || 'Social',
            attendance: 0,
            max_attendance: parseInt(eventFormData.maxAttendees) || 100,
            organization_name: resolvedOrgName,
            organization_id: resolvedOrganizationId,
            university: resolvedUniversity,
            created_by: creatorUid,
            requires_join_request: Boolean(eventFormData.requiresJoinRequest),
            is_fundraiser: isFund,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving event to Supabase:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        alert(`Failed to create event: ${error.message}`);
        clearTimeout(timeoutId);
        setIsCreatingEvent(false);
        return;
      } else {
        console.log('✅ Event saved to Supabase:', supabaseEvent);
        // Update the local event with the Supabase ID
        newEvent.supabaseId = supabaseEvent.id;
        // Match App.js / Dashboard merge key so home does not show the same event twice
        newEvent.id = `supabase-${supabaseEvent.id}`;
        newEvent.image = resolveEventImageFromRow(supabaseEvent) || coverForDb;
        // Push into local lists before onEventsRefresh so feed-merge effects see this id
        // and we never briefly double-list the same row (title/date shapes can differ).
        const sidNorm = String(supabaseEvent.id).toLowerCase();
        setJoinedEvents((prev) => {
          const base = prev.filter(
            (e) => String(e.supabaseId || '').toLowerCase() !== sidNorm
          );
          return [newEvent, ...base];
        });
        setAllEvents((prev) => {
          const base = prev.filter(
            (e) => String(e.supabaseId || '').toLowerCase() !== sidNorm
          );
          return [newEvent, ...base];
        });
        try {
          await onEventsRefresh?.();
        } catch (e) {
          console.warn('onEventsRefresh:', e?.message || e);
        }
      }
    } catch (error) {
      console.error('❌ Error creating event:', error);
      alert(`Failed to create event: ${error.message}`);
      clearTimeout(timeoutId);
      setIsCreatingEvent(false);
      return;
    }

    // Reset form and close modal
    setEventFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      locationAddress: '',
      price: '',
      maxAttendees: '',
      category: 'Social',
      image: '',
      requiresJoinRequest: false,
    });
    setShowEventCreationModal(false);
    
    // Reset loading state
    clearTimeout(timeoutId);
    setIsCreatingEvent(false);
    console.log('✅ Event creation completed successfully');

      // Event created successfully - silent success
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEventFormData(prev => ({
          ...prev,
          image: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle event edit
  const handleUpdateEvent = async () => {
    if (!eventFormData.title || !eventFormData.date || !eventFormData.time || !eventFormData.location) {
      console.log('Missing required fields');
      return;
    }

    // Format date to match existing events (e.g., "Nov 15")
    const eventDate = new Date(eventFormData.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });

    // Format time to match existing events (e.g., "7:00 PM")
    const formattedTime = eventFormData.time;

    // Convert price to number or 0 for free
    const isFund = eventFormIsFundraiser(eventFormData);
    let priceValue =
      eventFormData.price && eventFormData.price !== 'Free'
        ? parseInt(eventFormData.price.replace('$', ''), 10) || 0
        : 0;
    if (isFund) priceValue = 0;

    if ((priceValue > 0 || isFund) && editingEvent?.isOrganizationEvent) {
      let orgId = editingEvent.organizationId || null;
      if (!orgId && editingEvent.supabaseId) {
        const { data: evRow } = await supabase
          .from('events')
          .select('organization_id')
          .eq('id', editingEvent.supabaseId)
          .maybeSingle();
        if (evRow?.organization_id != null) orgId = String(evRow.organization_id);
      }
      if (!orgId || !(await assertOrganizationStripeChargesEnabled(supabase, orgId))) {
        alert(ORG_PAYOUT_REQUIRED_ALERT);
        return;
      }
    }

    // Convert category to uppercase type
    const eventType = eventFormData.category ? eventFormData.category.toUpperCase() : 'SOCIAL';

    const FALLBACK_COVER_EDIT =
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop';
    let hostUidForImage =
      editingEvent?.createdByUserId ||
      user?.supabaseUserId ||
      user?.userId ||
      null;
    if (!hostUidForImage || !isSupabaseUuid(String(hostUidForImage))) {
      hostUidForImage = await getSupabaseAuthUid();
    }
    const rawCover = eventFormData.image || editingEvent.image || FALLBACK_COVER_EDIT;
    const coverForDbEdit = await ensureEventCoverPublicUrl(
      supabase,
      hostUidForImage,
      rawCover,
      FALLBACK_COVER_EDIT
    );

    const updatedEvent = {
      ...editingEvent,
      title: eventFormData.title,
      description: eventFormData.description || 'Join us for this amazing event!',
      date: formattedDate,
      time: formattedTime,
      location: eventFormData.location,
      locationAddress: eventFormData.locationAddress,
      price: priceValue,
      maxAttendance: parseInt(eventFormData.maxAttendees) || 100,
      image: coverForDbEdit,
      type: eventType,
      category: eventFormData.category,
      requiresJoinRequest: Boolean(eventFormData.requiresJoinRequest),
      isFundraiser: isFund,
    };

    // Update in Supabase if this is a Supabase event
    if (editingEvent.supabaseId) {
      try {
        const { error } = await supabase
          .from('events')
          .update({
            title: eventFormData.title,
            description: eventFormData.description || 'Join us for this amazing event!',
            date: eventFormData.date, // Store raw date
            time: formattedTime,
            location: eventFormData.location,
            location_address: eventFormData.locationAddress,
            price: priceValue,
            max_attendance: parseInt(eventFormData.maxAttendees) || 100,
            image: coverForDbEdit,
            category: eventFormData.category,
            requires_join_request: Boolean(eventFormData.requiresJoinRequest),
            is_fundraiser: isFund,
          })
          .eq('id', editingEvent.supabaseId);

        if (error) {
          console.error('❌ Error updating event in Supabase:', error);
          alert('Failed to update event. Please try again.');
          return;
        } else {
          console.log('✅ Event updated in Supabase');
        }
      } catch (error) {
        console.error('❌ Error updating event:', error);
        alert('Failed to update event. Please try again.');
        return;
      }
    }

    // Update the event in both joinedEvents and allEvents
    setJoinedEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));
    setAllEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));

    // Reset form and close modal
    setEventFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      locationAddress: '',
      price: '',
      maxAttendees: '',
      category: 'Social',
      image: '',
      requiresJoinRequest: false,
    });
    setEditingEvent(null);
    setShowEventEditModal(false);
    console.log('✅ Event updated successfully');
  };

  // Handle event delete
  const handleDeleteEvent = async () => {
    console.log('🗑️ DELETE EVENT CLICKED');
    console.log('🗑️ Editing event:', editingEvent);
    
    if (window.confirm(`Are you sure you want to delete "${editingEvent.title}"? This action cannot be undone.`)) {
      console.log('🗑️ User confirmed deletion');
      
      // Delete from Supabase if this is a Supabase event
      if (editingEvent.supabaseId) {
        console.log('🗑️ Event has supabaseId, proceeding with deletion:', editingEvent.supabaseId);
        
        try {
          console.log('🗑️ Deleting event and all related data:', {
            eventId: editingEvent.supabaseId,
            eventTitle: editingEvent.title,
            userIsOrganization: user?.isOrganization,
            userId: user?.userId
          });

          // First, delete all user registrations/tickets for this event
          console.log('🗑️ Step 1: Deleting all user registrations for this event...');
          const { data: regData, error: regError } = await supabase
            .from('registrations')
            .delete()
            .eq('event_id', editingEvent.supabaseId)
            .select();

          if (regError) {
            console.error('❌ Error deleting registrations:', regError);
            console.error('❌ Registration error details:', JSON.stringify(regError, null, 2));
            // Continue with event deletion even if registrations fail
          } else {
            console.log('✅ All user registrations deleted:', regData);
          }

          // Then delete the event itself
          console.log('🗑️ Step 2: Deleting event from Supabase...');
          const { data: eventData, error } = await supabase
            .from('events')
            .delete()
            .eq('id', editingEvent.supabaseId)
            .select();

          if (error) {
            console.error('❌ Error deleting event from Supabase:', error);
            console.error('❌ Event deletion error details:', JSON.stringify(error, null, 2));
            alert(`Failed to delete event: ${error.message}`);
            return;
          } else {
            console.log('✅ Event deleted from Supabase:', eventData);
            console.log('✅ All user tickets for this event have been removed');
          }
        } catch (error) {
          console.error('❌ Error deleting event:', error);
          console.error('❌ Full error details:', JSON.stringify(error, null, 2));
          alert(`Failed to delete event: ${error.message}`);
          return;
        }
      } else {
        console.warn('⚠️ Event does NOT have supabaseId - cannot delete from database');
        console.warn('⚠️ Event details:', editingEvent);
      }
      
      // Remove the event from both joinedEvents and allEvents
      // Need to check both id and supabaseId because events can have different id formats
      setJoinedEvents(prev => prev.filter(e => 
        e.id !== editingEvent.id && 
        e.supabaseId !== editingEvent.supabaseId &&
        e.id !== `supabase-${editingEvent.supabaseId}`
      ));
      setAllEvents(prev => prev.filter(e => 
        e.id !== editingEvent.id && 
        e.supabaseId !== editingEvent.supabaseId &&
        e.id !== `supabase-${editingEvent.supabaseId}`
      ));
      
      console.log('✅ Event removed from all local state arrays');
      
      // Refresh organization events from Supabase to ensure UI is updated
      if (canUseOrgTools) {
        let refreshUid = getSupabaseAuthCreatorUserId(user);
        if (!refreshUid || !isSupabaseUuid(String(refreshUid))) {
          refreshUid = await getSupabaseAuthUid();
        }
        if (refreshUid && isSupabaseUuid(String(refreshUid))) {
          console.log('🔄 Step 3: Refreshing organization events from Supabase...');
          console.log('🔄 User details:', { isOrganization: user.isOrganization, userId: refreshUid });

          try {
            const { data, error } = await fetchSupabaseEventsForChapterHostProfile(
              supabase,
              refreshUid,
              user?.organization?.id
            );

            if (error) {
              console.error('❌ Error fetching organization events:', error);
              console.error('❌ Fetch error details:', JSON.stringify(error, null, 2));
            } else {
              console.log('✅ Refreshed organization events from Supabase:', (data || []).length);
              console.log('✅ Events data:', data);

              const transformedEvents = (data || [])
                .map((row) => mapSupabaseEventDbRowToAppEvent(row))
                .filter(Boolean);

              console.log('✅ Transformed events:', transformedEvents);
              setJoinedEvents(transformedEvents);
              console.log('✅ Organization events updated in UI - setJoinedEvents called');
            }
          } catch (error) {
            console.error('❌ Error refreshing organization events:', error);
            console.error('❌ Refresh error details:', JSON.stringify(error, null, 2));
          }
        } else {
          console.warn('⚠️ Not refreshing events — missing auth user id');
          console.warn('⚠️ User details:', { isOrganization: user?.isOrganization, userId: user?.userId });
        }
      }
      
      // Reset form and close modal
      console.log('🔄 Step 4: Resetting form and closing modal...');
      setEventFormData({
        title: '', description: '', date: '', time: '', location: '', price: '',
        maxAttendees: '', category: 'Social', image: '', requiresJoinRequest: false,
      });
      setEditingEvent(null);
      setShowEventEditModal(false);
      console.log('✅ Event deleted successfully - modal closed');
      console.log('✅ Deletion process complete');
    } else {
      console.log('🗑️ User cancelled deletion');
    }
  };

  // Tabs Component
  const TabsComponent = ({ activeTab, setActiveTab }) => {
    const tabs = [
      { id: "upcoming", label: "Upcoming Events" },
      { id: "attended", label: "Attended Events" },
    ];

  return (
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              position: 'relative',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.5rem',
              transition: 'colors 0.3s',
              flex: 1,
              color: activeTab === tab.id ? 'white' : 'rgba(255, 255, 255, 0.6)',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '0.5rem'
                }}
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 10 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      /* Same shell gradient as My Tickets (TicketsScreen.js) */
      background: 'linear-gradient(135deg, #030712 0%, #581c87 50%, #1e3a8a 100%)',
      padding: isMobile ? '0.75rem 0.75rem 5rem' : '1rem 2rem',
      overflowX: 'hidden',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderRadius: '1.5rem',
            /* was overflow:hidden — clipped header actions (Create Event) on some viewports */
            overflow: 'visible'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8rem',
              background: 'linear-gradient(to right, rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))'
            }} />

            <div style={{ padding: isMobile ? '1rem 1rem 1.5rem' : '1.5rem 2rem', position: 'relative' }}>
              {/* Settings Button - Top Right on Mobile */}
              {isMobile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('settings')}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    borderRadius: '0.75rem',
                    padding: '0.75rem',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    zIndex: 10
                  }}
                  title="Settings"
                  type="button"
                >
                  <svg 
                    style={{ width: '1.25rem', height: '1.25rem' }} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                  </svg>
                </motion.button>
              )}
              
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '1rem' : '1.5rem',
                alignItems: isMobile ? 'center' : 'flex-end',
                marginBottom: isMobile ? '1.5rem' : '2rem'
              }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  style={{ position: 'relative' }}
                >
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to right, #9333ea, #ec4899)',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                    opacity: 0.5
                  }} />
                  <div style={{
                    width: isMobile ? '6rem' : '8rem',
                    height: isMobile ? '6rem' : '8rem',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(to bottom right, #9333ea, #ec4899)'
                  }}>
                    <img
                      src={profileData.avatarUrl}
                      alt={profileData.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
      </div>
                </motion.div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', width: isMobile ? '100%' : 'auto', textAlign: isMobile ? 'center' : 'left' }}>
                  <div>
                    <h1 style={{
                      fontSize: isMobile ? '1.75rem' : '2.25rem',
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: '0.25rem',
                      lineHeight: '1.2'
                    }}>
                      {profileData.name}
                    </h1>
                    <p style={{ color: '#c4b5fd', fontSize: isMobile ? '0.95rem' : '1.125rem' }}>{profileData.username}</p>
            </div>
            
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.875rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{ color: 'white' }}>{profileData.university}</span>
                    </div>
                </div>

                  <div style={{ display: 'flex', gap: isMobile ? '1.5rem' : '1.5rem', color: 'white', justifyContent: isMobile ? 'center' : 'flex-start', width: '100%' }}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowFollowersModal(true)}
                      style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div
                        style={{
                          fontSize: isMobile ? '1.35rem' : '1.5rem',
                          fontWeight: 'bold',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: '1.25em',
                          textAlign: 'center',
                        }}
                      >
                        {profileData.followers == null ? '…' : profileData.followers}
                      </div>
                      <div style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Followers</div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowFollowingModal(true)}
                      style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div
                        style={{
                          fontSize: isMobile ? '1.35rem' : '1.5rem',
                          fontWeight: 'bold',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: '1.25em',
                          textAlign: 'center',
                        }}
                      >
                        {profileData.following == null ? '…' : profileData.following}
                      </div>
                      <div style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Following</div>
                    </motion.div>
                  </div>
                </div>
                
                {!isMobile && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                    <button
                    type="button"
                    onClick={() => onNavigate('settings')}
                    style={{
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      fontWeight: '600',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      width: '3rem',
                      height: '3rem'
                    }}
                    title="Settings"
                  >
                    <svg 
                      style={{ width: '1.25rem', height: '1.25rem' }} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                    </button>
                </motion.div>
                )}
                </div>

              {profileData.bio ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '1rem',
                    padding: isMobile ? '1rem' : '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: isMobile ? '1.5rem' : '2rem'
                  }}
                >
                  <h2 style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Zap style={{ width: '1.25rem', height: '1.25rem', color: '#c4b5fd' }} />
                    About
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: isMobile ? '0.9rem' : '1rem' }}>{profileData.bio}</p>
                </motion.div>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '1rem', flexDirection: isMobile ? 'column' : 'row', width: '100%' }}>
                <div style={{ flex: isMobile ? 'none' : 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                <TabsComponent activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                  
                  {/* Event Creation Button for verified organizations only */}
                  {canUseOrgTools && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleOpenCreateEvent}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: isMobile ? '0.875rem 1rem' : '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontSize: isMobile ? '0.85rem' : '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                        transition: 'all 0.3s ease',
                        width: isMobile ? '100%' : 'auto',
                        flexShrink: 0,
                        alignSelf: isMobile ? 'stretch' : 'center'
                      }}
                    >
                      <Plus size={18} />
                      Create Event
                    </motion.button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: isMobile ? '16px' : '24px',
                    }}
                  >
                    {events.map((event) => (
                      <ProfileEventCard
                        key={event.id}
                        event={event}
                        statusPill={activeTab === 'upcoming' ? 'Upcoming' : 'Attended'}
                        isMobile={isMobile}
                        onCardClick={() => handleEventClick(event)}
                        onLocationClick={(e) => {
                          e.stopPropagation();
                          handleLocationClick(event.locationAddress);
                        }}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>

                {events.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      textAlign: 'center',
                      padding: '3rem 0',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    <Calendar style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.125rem' }}>No events to display</p>
                  </motion.div>
              )}
            </div>
          </div>
        </div>
        </motion.div>
            </div>
            
      {/* Event Details Modal */}
      {showEventDetails && selectedEventDetails && (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={handleCloseEventDetails}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '20px',
              zIndex: 10
            }} onClick={handleCloseEventDetails}>
              ×
            </div>
            
            <div style={{ position: 'relative', height: '200px', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
              <img 
                src={selectedEventDetails.image} 
                alt={selectedEventDetails.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.7))'
              }} />
            </div>

            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: '0 0 12px' }}>
                {selectedEventDetails.title}
              </h2>
              {(() => {
                const desc =
                  selectedEventDetails.description != null
                    ? String(selectedEventDetails.description).trim()
                    : '';
                if (desc) {
                  return (
                    <p
                      style={{
                        color: '#c4b5fd',
                        margin: '0 0 20px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {desc}
                    </p>
                  );
                }
                return (
                  <p style={{ color: '#c4b5fd', margin: '0 0 20px', lineHeight: '1.5' }}>
                    Join us for an unforgettable {(selectedEventDetails.type || 'social').toLowerCase()} event hosted by{' '}
                    <button
                      type="button"
                      onClick={async () => {
                        const handled = await openOrganizationProfileFromOrgEvent(selectedEventDetails, {
                          userUniversity: user?.university,
                          onNavigate,
                        });
                        if (handled) return;
                        const uid = selectedEventDetails?.createdByUserId;
                        if (uid != null && isSupabaseUuid(String(uid))) {
                          onNavigate('organization-profile', {
                            organization: {
                              name: selectedEventDetails.organization || 'Organization',
                              type: 'Organization',
                              description: '',
                              supabaseUserId: String(uid),
                              university: user?.university,
                              isSupabaseOrganization: true,
                            },
                          });
                          return;
                        }
                        const organizationProfile = {
                          name: selectedEventDetails.organization,
                          type: 'Organization',
                          description: `${selectedEventDetails.organization} - A Greek organization at ${user?.university || 'this university'}.`,
                          members: Math.floor(Math.random() * 50) + 60,
                          image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop',
                        };
                        onNavigate('organization-profile', { organization: organizationProfile });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60a5fa',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        padding: 0,
                        margin: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#93c5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#60a5fa';
                      }}
                    >
                      {selectedEventDetails.organization}
                    </button>
                    {". This exclusive gathering brings together the best of Greek life for an evening you won't forget."}
                  </p>
                );
              })()}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(124, 58, 237, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                  </div>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Date</p>
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{selectedEventDetails.date}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock style={{ width: '16px', height: '16px', color: '#6366f1' }} />
                  </div>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Time</p>
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{selectedEventDetails.time}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(124, 58, 237, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MapPin style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Location</p>
                    <p
                      style={{
                        color: 'white',
                        fontSize: '14px',
                        margin: 0,
                        cursor: selectedEventDetails.locationAddress ? 'pointer' : 'default',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'normal',
                      }}
                      onClick={() =>
                        selectedEventDetails.locationAddress &&
                        handleLocationClick(selectedEventDetails.locationAddress)
                      }
                      onMouseEnter={(e) => {
                        if (selectedEventDetails.locationAddress) e.target.style.color = '#60a5fa';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = 'white';
                      }}
                      title={selectedEventDetails.locationAddress ? 'Click for directions' : undefined}
                    >
                      {selectedEventDetails.location}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(168, 85, 247, 0.2)',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Host</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const handled = await openOrganizationProfileFromOrgEvent(selectedEventDetails, {
                          userUniversity: user?.university,
                          onNavigate,
                        });
                        if (handled) return;
                        const uid = selectedEventDetails?.createdByUserId;
                        if (uid != null && isSupabaseUuid(String(uid))) {
                          onNavigate('organization-profile', {
                            organization: {
                              name: selectedEventDetails.organization || 'Organization',
                              type: 'Organization',
                              description: '',
                              supabaseUserId: String(uid),
                              university: user?.university,
                              isSupabaseOrganization: true,
                            },
                          });
                          return;
                        }
                        onNavigate('organization-profile', {
                          organization: {
                            name: selectedEventDetails.organization,
                            type: 'Organization',
                            description: `${selectedEventDetails.organization} - A Greek organization at ${user?.university || 'this university'}.`,
                            members: Math.floor(Math.random() * 50) + 60,
                            image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop',
                          },
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '14px',
                        margin: 0,
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        textDecoration: 'none',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#60a5fa';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = 'white';
                      }}
                    >
                      {selectedEventDetails.organization || 'Organization'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Show Edit button for organization-created events */}
                {(() => {
                  const isOrgUser = canUseOrgTools;
                  const isCreatedByUser = selectedEventDetails.createdBy === user?.name;
                  const isOrgEvent = selectedEventDetails.isOrganizationEvent;
                  const shouldShowEdit = isOrgUser && (isCreatedByUser || isOrgEvent);
                  
                  console.log('Edit button debug:', {
                    isOrgUser,
                    isCreatedByUser,
                    isOrgEvent,
                    shouldShowEdit,
                    userIsOrg: user?.isOrganization,
                    eventCreatedBy: selectedEventDetails.createdBy,
                    userName: user?.name,
                    eventIsOrgEvent: selectedEventDetails.isOrganizationEvent
                  });
                  
                  // For testing - always show edit button for organization users
                  return isOrgUser || shouldShowEdit;
                })() ? (
                  <button 
                    onClick={() => handleEditEventFromDetails(selectedEventDetails)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      flex: 1
                    }}
                  >
                    Edit Event
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSelectedProfileEventJoined || isSelectedProfileEventFull}
                    onClick={() => {
                      if (isSelectedProfileEventJoined || isSelectedProfileEventFull) return;
                      if ((selectedEventDetails.price || 0) > 0) {
                        // Handle paid event registration - silent
                      } else {
                        // Handle free event join - silent
                      }
                      handleCloseEventDetails();
                    }}
                    style={{
                      flex: 1,
                      background: isSelectedProfileEventFull
                        ? 'linear-gradient(135deg, #d97706, #ea580c)'
                        : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor:
                        isSelectedProfileEventJoined || isSelectedProfileEventFull ? 'default' : 'pointer',
                      opacity: isSelectedProfileEventJoined || isSelectedProfileEventFull ? 0.9 : 1,
                      transition: 'all 0.3s ease',
                    }}
                    title={
                      isSelectedProfileEventFull
                        ? 'This event has reached its attendee limit.'
                        : undefined
                    }
                  >
                    {isSelectedProfileEventJoined
                      ? 'Joined'
                      : isSelectedProfileEventFull
                        ? 'Full'
                        : (selectedEventDetails.price || 0) > 0
                          ? `Register ($${selectedEventDetails.price})`
                          : 'Join Event'}
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    // Handle share functionality
                    // Share functionality - silent
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      <AnimatePresence>
        {showEventCreationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
            onClick={() => setShowEventCreationModal(false)}
        >
          <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1.5rem',
              width: '100%',
                maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  Create New Event
                </h2>
                <button 
                  onClick={() => setShowEventCreationModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '1.2rem'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.5rem', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
                {postingOrgChoices.length > 1 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label
                      style={{
                        display: 'block',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Posting as organization *
                    </label>
                    <select
                      value={postingOrganizationId || ''}
                      onChange={(e) =>
                        setPostingOrganizationId(e.target.value ? String(e.target.value) : null)
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem',
                      }}
                    >
                      {postingOrgChoices.map((row) => {
                        const oid = row.organization_id;
                        const label = row.organizations?.name || String(oid).slice(0, 8);
                        return (
                          <option key={oid} value={oid} style={{ color: '#111' }}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
            {/* Event Image */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Event Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  {eventFormData.image && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img 
                        src={eventFormData.image} 
                        alt="Preview" 
                style={{
                  width: '100%',
                          height: '200px', 
                          objectFit: 'cover', 
                          borderRadius: '0.5rem' 
                        }} 
                      />
                    </div>
                  )}
            </div>

                {/* Event Title */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                color: 'white',
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.title}
                    onChange={(e) => handleEventFormChange('title', e.target.value)}
                    placeholder="Enter event title"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                {/* Event Description */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Description
                  </label>
                  <textarea
                    value={eventFormData.description}
                    onChange={(e) => handleEventFormChange('description', e.target.value)}
                    placeholder="Enter event description"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                  </div>

                {/* Date and Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={eventFormData.date}
                      onChange={(e) => handleEventFormChange('date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Time *
                    </label>
                    <input
                      type="time"
                      value={eventFormData.time}
                      onChange={(e) => handleEventFormChange('time', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                </div>
            </div>

                {/* Location */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.location}
                    onChange={(e) => handleEventFormChange('location', e.target.value)}
                    placeholder="e.g., Campus Recreation Center"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
          </div>

                {/* Location Address */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Full Address *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.locationAddress}
                    onChange={(e) => handleEventFormChange('locationAddress', e.target.value)}
                    placeholder="e.g., 101 Vera King Farris Dr, Galloway, NJ 08205"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                {/* Category (Fundraiser option = donation flow; same as former checkbox) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={eventFormData.category}
                    onChange={(e) => handleEventCategoryChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="Social">Social</option>
                    <option value="Philanthropy">Philanthropy</option>
                    <option value="Fundraiser">Fundraiser</option>
                    <option value="Formal">Formal</option>
                    <option value="Mixer">Mixer</option>
                    <option value="Rush">Rush</option>
                  </select>
                  {fundraiserForm ? (
                    <p
                      style={{
                        margin: '0.5rem 0 0',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.4,
                      }}
                    >
                      Donors choose their amount at checkout; no tickets are issued. Stripe payouts must be set up in
                      Settings.
                    </p>
                  ) : null}
                </div>

                {/* Price and Max Attendees */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                      marginBottom: '0.5rem' 
                    }}>
                      Price
                    </label>
                    <input
                      type="text"
                      value={fundraiserForm ? '' : eventFormData.price}
                      onChange={(e) => handleEventFormChange('price', e.target.value)}
                      placeholder={fundraiserForm ? 'N/A for fundraisers' : 'Free or $25'}
                      disabled={Boolean(fundraiserForm)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem',
                        opacity: fundraiserForm ? 0.5 : 1,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Max Attendees
                    </label>
                    <input
                      type="number"
                      value={eventFormData.maxAttendees}
                      onChange={(e) => handleEventFormChange('maxAttendees', e.target.value)}
                      placeholder="100"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.875rem',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(eventFormData.requiresJoinRequest)}
                      onChange={(e) => handleEventFormChange('requiresJoinRequest', e.target.checked)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    Request-only (guests must request before they can join)
                  </label>
                </div>
            
              {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                    onClick={() => setShowEventCreationModal(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    disabled={isCreatingEvent}
                    style={{
                      flex: 1,
                      background: isCreatingEvent 
                        ? 'linear-gradient(135deg, #9ca3af, #6b7280)' 
                        : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: 'white',
                      border: 'none',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: isCreatingEvent ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isCreatingEvent 
                        ? '0 2px 6px rgba(156, 163, 175, 0.3)' 
                        : '0 4px 12px rgba(124, 58, 237, 0.3)',
                      opacity: isCreatingEvent ? 0.7 : 1
                    }}
                  >
                    {isCreatingEvent ? 'Creating...' : 'Create Event'}
                    </button>
                  </div>
                </div>
          </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Event Edit Modal */}
      <AnimatePresence>
        {showEventEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}
            onClick={() => setShowEventEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(79, 70, 229, 0.9))',
                backdropFilter: 'blur(20px)',
                borderRadius: '1.5rem',
                padding: '2rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
              }}>
                <h2 style={{ 
                  color: 'white', 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  margin: 0
                }}>
                  Edit Event
                </h2>
                <button 
                  onClick={() => setShowEventEditModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '1.25rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Event Title */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.title}
                    onChange={(e) => handleEventFormChange('title', e.target.value)}
                    placeholder="Enter event title"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
            </div>

                {/* Event Description */}
                <div>
                  <label style={{ 
                    display: 'block', 
                color: 'white',
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Description
                  </label>
                  <textarea
                    value={eventFormData.description}
                    onChange={(e) => handleEventFormChange('description', e.target.value)}
                    placeholder="Enter event description"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Date and Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={eventFormData.date}
                      onChange={(e) => handleEventFormChange('date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Time *
                    </label>
                    <input
                      type="time"
                      value={eventFormData.time}
                      onChange={(e) => handleEventFormChange('time', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Location */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.location}
                    onChange={(e) => handleEventFormChange('location', e.target.value)}
                    placeholder="e.g., Campus Recreation Center"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
            </div>

                {/* Location Address */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Full Address *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.locationAddress}
                    onChange={(e) => handleEventFormChange('locationAddress', e.target.value)}
                    placeholder="e.g., 101 Vera King Farris Dr, Galloway, NJ 08205"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
          </div>

                {/* Category (Fundraiser = donation flow) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={eventFormData.category}
                    onChange={(e) => handleEventCategoryChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="Social">Social</option>
                    <option value="Philanthropy">Philanthropy</option>
                    <option value="Fundraiser">Fundraiser</option>
                    <option value="Recruitment">Recruitment</option>
                    <option value="Sports">Sports</option>
                    <option value="Academic">Academic</option>
                  </select>
                  {fundraiserForm ? (
                    <p
                      style={{
                        margin: '0.5rem 0 0',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.4,
                      }}
                    >
                      Donors choose their amount at checkout; no tickets are issued. Stripe payouts must be set up in
                      Settings.
                    </p>
                  ) : null}
                </div>

                {/* Price and Max Attendees */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                      marginBottom: '0.5rem' 
                    }}>
                      Price
                    </label>
                    <input
                      type="text"
                      value={fundraiserForm ? '' : eventFormData.price}
                      onChange={(e) => handleEventFormChange('price', e.target.value)}
                      placeholder={fundraiserForm ? 'N/A for fundraisers' : 'Free or $25'}
                      disabled={Boolean(fundraiserForm)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem',
                        opacity: fundraiserForm ? 0.5 : 1,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.5rem' 
                    }}>
                      Max Attendees
                    </label>
                    <input
                      type="number"
                      value={eventFormData.maxAttendees}
                      onChange={(e) => handleEventFormChange('maxAttendees', e.target.value)}
                      placeholder="100"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.875rem',
                      marginBottom: '0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(eventFormData.requiresJoinRequest)}
                      onChange={(e) => handleEventFormChange('requiresJoinRequest', e.target.checked)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    Request-only (guests must request before they can join)
                  </label>
                </div>

                {/* Image Upload */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem' 
                  }}>
                    Event Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  {eventFormData.image && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img 
                        src={eventFormData.image} 
                        alt="Event preview" 
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          objectFit: 'cover', 
                          borderRadius: '0.5rem' 
                        }} 
                      />
                    </div>
                  )}
            </div>
            
              {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                    onClick={handleDeleteEvent}
                    style={{
                      flex: 1,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Delete Event
                  </button>
                  <button 
                    onClick={() => setShowEventEditModal(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateEvent}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: 'white',
                      border: 'none',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                    cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                    }}
                  >
                    Update Event
                    </button>
                  </div>
                </div>
          </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {(showFollowersModal || showFollowingModal) && (
          <motion.div
            key="follow-modals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 300,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => {
              setShowFollowersModal(false);
              setShowFollowingModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '420px',
                maxHeight: 'min(70vh, 520px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(30, 27, 75, 0.96)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '1rem',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 700 }}>
                  {showFollowersModal ? 'Followers' : 'Following'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowFollowersModal(false);
                    setShowFollowingModal(false);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#e9d5ff',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '0.75rem', flex: 1 }}>
                {showFollowersModal ? (
                  followGraphLoading ? (
                    <p style={{ color: '#c4b5fd', textAlign: 'center', padding: 24 }}>Loading…</p>
                  ) : followersList.length === 0 ? (
                    <p style={{ color: 'rgba(196, 181, 253, 0.85)', textAlign: 'center', padding: 24 }}>
                      No followers yet. When someone follows your account, they will appear here.
                    </p>
                  ) : (
                    followersList.map((f) => (
                      <div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openProfileFromFollowModal(f)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openProfileFromFollowModal(f);
                          }
                        }}
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          padding: '10px 8px',
                          borderRadius: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={f.avatar}
                          alt=""
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(168, 85, 247, 0.35)',
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>{f.name}</div>
                          <div style={{ color: '#c4b5fd', fontSize: 13 }}>{f.username}</div>
                          {f.university ? (
                            <div
                              style={{
                                color: 'rgba(196, 181, 253, 0.65)',
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {f.university}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )
                ) : followingModalItems.length === 0 ? (
                  <p style={{ color: 'rgba(196, 181, 253, 0.85)', textAlign: 'center', padding: 24 }}>
                    You are not following anyone yet. Follow organizations from Search or their profile.
                  </p>
                ) : (
                  followingModalItems.map((f) => (
                    <div
                      key={f.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openProfileFromFollowModal(f)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openProfileFromFollowModal(f);
                        }
                      }}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: '10px 8px',
                        borderRadius: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={f.avatar}
                        alt=""
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(168, 85, 247, 0.35)',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>{f.name}</div>
                        <div style={{ color: '#c4b5fd', fontSize: 13 }}>{f.username}</div>
                        <div
                          style={{
                            color: 'rgba(196, 181, 253, 0.65)',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {f.type} · {f.university || user?.university || ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileScreen; 
