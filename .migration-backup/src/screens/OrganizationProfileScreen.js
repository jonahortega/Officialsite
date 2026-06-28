import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Heart, MapPin, Mail, Globe, Clock, Zap } from 'lucide-react';
import { getGreekOrganizations } from '../data/greekLifeData';
import { remainingGreekLifeData } from '../data/remainingGreekLifeData';
import { supabase } from '../utils/supabaseClient';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import {
  mapDbEventRowsToAppEventsWithLiveCounts,
  buildJoinedEventsFromRegistrationsForViewer,
} from '../utils/supabaseJoinedEventsHydration';
import { isSupabaseUuid, coerceToUuidString } from '../utils/isSupabaseUuid';
import { fetchFollowGraphCountsForAccount } from '../utils/followGraphSupabase';
import { isEventPastBySchoolClock } from '../utils/eventSchoolTime';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';
import { isEventAtCapacity } from '../utils/eventCapacity';
import ProfileEventCard from '../components/ProfileEventCard';

function stripAtHandle(s) {
  return String(s || '')
    .replace(/^@/, '')
    .trim();
}

/** Auth user id for this profile — some navigations set `userId` instead of `supabaseUserId`. */
function resolveOrganizationProfileUserId(org) {
  if (!org || typeof org !== 'object') return null;
  const fromFields = coerceToUuidString(
    org.supabaseUserId ?? org.userId ?? org.user_id ?? org.createdByUserId
  );
  if (fromFields) return fromFields;
  const idStr = typeof org.id === 'string' ? org.id : '';
  const orgPrefix = 'supabase-org-';
  const userPrefix = 'supabase-user-';
  if (idStr.startsWith(orgPrefix)) {
    const u = coerceToUuidString(idStr.slice(orgPrefix.length));
    if (u) return u;
  }
  if (idStr.startsWith(userPrefix)) {
    const u = coerceToUuidString(idStr.slice(userPrefix.length));
    if (u) return u;
  }
  return null;
}

function eventBelongsToOrganization(event, org) {
  if (!org) return false;
  const orgPk =
    coerceToUuidString(org.organizationTableId) || coerceToUuidString(org.id);
  const evOrgId =
    event?.organizationId != null
      ? coerceToUuidString(event.organizationId)
      : event?.organization_id != null
        ? coerceToUuidString(event.organization_id)
        : null;
  if (orgPk && evOrgId && orgPk === evOrgId) return true;
  const uid = resolveOrganizationProfileUserId(org) || org.supabaseUserId;
  if (
    uid != null &&
    String(uid).length > 0 &&
    event?.createdByUserId != null &&
    String(event.createdByUserId) === String(uid)
  ) {
    return true;
  }
  const oname = (org.name || '').trim().toLowerCase();
  const eorg = (event?.organization || '').trim().toLowerCase();
  const created = (event?.createdBy || '').trim().toLowerCase();
  if (oname && eorg && oname === eorg) return true;
  if (oname && created && oname === created) return true;
  return false;
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Prefer Supabase `dateISO`; avoid hardcoding 2025 for short display dates like "Mar 27". */
function parseEventStartDay(event) {
  if (event?.dateISO != null && event.dateISO !== '') {
    const d = new Date(event.dateISO);
    if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
  }
  const s = event?.date;
  if (s == null || typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
  }
  if (trimmed.includes(',')) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
  }
  const y = new Date().getFullYear();
  const d = new Date(`${trimmed}, ${y}`);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
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

const OrganizationProfileScreen = ({ 
  organization, 
  user, 
  onNavigate, 
  onStartConversation,
  joinedEvents,
  setJoinedEvents,
  followedOrganizations,
  setFollowedOrganizations,
  allEvents,
  setAllEvents,
  supabaseEvents = [],
  onFollowsChanged,
}) => {
  const schoolClockTick = useSchoolClockTick();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [publicOrgProfile, setPublicOrgProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  /** Fetched by `created_by` so profile shows real events even when App feed is empty. */
  const [dbOrgEvents, setDbOrgEvents] = useState([]);
  /** Member (non-org) profiles: events from registrations, visible to visitors via RPC. */
  const [memberJoinedEvents, setMemberJoinedEvents] = useState([]);
  /** Real follower/following counts for this profile (navigation props are stale for visitors). */
  const [viewedFollowCounts, setViewedFollowCounts] = useState({
    followers: null,
    following: null,
  });
  /** When navigation omits UUID, resolve `organizations.user_id` by username (Search-only gap). */
  const [fallbackOrgProfileUserId, setFallbackOrgProfileUserId] = useState(null);

  const orgProfileUserIdFromNav = useMemo(
    () => resolveOrganizationProfileUserId(organization),
    [
      organization?.supabaseUserId,
      organization?.userId,
      organization?.user_id,
      organization?.createdByUserId,
      organization?.id,
      organization?.username,
      organization?.name,
      organization?.isSupabaseOrganization,
    ]
  );

  useEffect(() => {
    setFallbackOrgProfileUserId(null);
  }, [
    organization?.supabaseUserId,
    organization?.userId,
    organization?.user_id,
    organization?.id,
    organization?.username,
  ]);

  useEffect(() => {
    if (orgProfileUserIdFromNav) return;
    if (organization?.isSupabaseOrganization !== true) return;
    const handle = stripAtHandle(organization?.username);
    if (!handle) return;
    let cancelled = false;
    (async () => {
      const candidates = [handle, `@${handle}`];
      let row = null;
      for (const un of candidates) {
        const { data, error } = await supabase
          .from('organizations')
          .select('user_id, username')
          .eq('username', un)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data?.user_id) {
          row = data;
          break;
        }
      }
      if (!row) {
        const { data: rows, error: err2 } = await supabase
          .from('organizations')
          .select('user_id, username')
          .ilike('username', `%${handle}%`)
          .limit(15);
        if (cancelled) return;
        if (!err2 && rows?.length) {
          row =
            rows.find((r) => stripAtHandle(r?.username).toLowerCase() === handle.toLowerCase()) ||
            (rows.length === 1 ? rows[0] : null);
        }
      }
      if (cancelled || !row?.user_id) return;
      const uid = coerceToUuidString(row.user_id);
      if (uid) setFallbackOrgProfileUserId(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserIdFromNav, organization?.isSupabaseOrganization, organization?.username]);

  const orgProfileUserId = orgProfileUserIdFromNav || fallbackOrgProfileUserId;

  /**
   * DB `events.organization_id` references `organizations.id` (chapter row), not the synthetic
   * `supabase-org-{founderUserId}` card id. Resolve from nav hint or `organizations.user_id`.
   */
  const [organizationRowId, setOrganizationRowId] = useState(null);

  useEffect(() => {
    setOrganizationRowId(null);
    if (organization?.isSupabaseOrganization === false) return undefined;
    const passed = coerceToUuidString(organization?.organizationTableId);
    if (passed) {
      setOrganizationRowId(passed);
      return undefined;
    }
    const founderUid = orgProfileUserId;
    if (!founderUid) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', founderUid)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data?.id) return;
      const pk = coerceToUuidString(data.id);
      if (pk) setOrganizationRowId(pk);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    organization?.isSupabaseOrganization,
    organization?.organizationTableId,
    orgProfileUserId,
  ]);

  // Event generation functions (same as DashboardScreen)
  const getUniversityGreekOrganizations = (universityName) => {
    const greekOrgs = getGreekOrganizations(universityName);
    const remainingOrgs = remainingGreekLifeData[universityName];
    
    // Combine both data sources
    const allFraternities = [
      ...(greekOrgs.fraternities || []),
      ...(remainingOrgs?.fraternities || [])
    ];
    
    const allSororities = [
      ...(greekOrgs.sororities || []),
      ...(remainingOrgs?.sororities || [])
    ];

    return [...allFraternities, ...allSororities];
  };

  // Simple seeded random number generator for consistent results
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const generateUniversityEvents = (universityName) => {
    const greekOrgs = getUniversityGreekOrganizations(universityName);
    const events = [];
    
    // Generate events for the first few organizations (to keep it manageable)
    const selectedOrgs = greekOrgs.slice(0, 6); // Take first 6 organizations
    
    // Event titles with corresponding images (matching DashboardScreen)
    const eventData = [
      { title: 'Sisterhood Mixer', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&auto=format' },
      { title: 'Brotherhood Event', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop&auto=format' },
      { title: 'Philanthropy Fundraiser', image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&auto=format' },
      { title: 'Social Gathering', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop&auto=format' },
      { title: 'Recruitment Event', image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&auto=format' },
      { title: 'Community Service', image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=600&fit=crop&auto=format' },
      { title: 'Spring Formal', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=600&fit=crop&auto=format' },
      { title: 'Study Night', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&auto=format' },
      { title: 'Game Night', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&auto=format' },
      { title: 'BBQ Cookout', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&auto=format' },
      { title: 'Dance Workshop', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=600&fit=crop&auto=format' },
      { title: 'Movie Night', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop&auto=format' }
    ];

    // University-specific campus locations for Greek organizations (matching DashboardScreen)
    const getUniversityLocations = (universityName) => {
      const locationMaps = {
        'Stockton University': [
          { name: 'Greek Row - Main House', address: '101 Greek Row, Galloway, NJ 08205' },
          { name: 'Campus Recreation Center', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Student Union Ballroom', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Greek Life Center', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Campus Quad', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Library Study Rooms', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Athletic Complex', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Campus Theater', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Student Center', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Greek Village', address: '102 Greek Row, Galloway, NJ 08205' },
          { name: 'Campus Garden', address: '101 Vera King Farris Dr, Galloway, NJ 08205' },
          { name: 'Outdoor Amphitheater', address: '101 Vera King Farris Dr, Galloway, NJ 08205' }
        ],
        'Rutgers University': [
          { name: 'Greek Row - College Ave', address: '126 College Ave, New Brunswick, NJ 08901' },
          { name: 'Student Activities Center', address: '613 George St, New Brunswick, NJ 08901' },
          { name: 'Rutgers Student Center', address: '126 College Ave, New Brunswick, NJ 08901' },
          { name: 'Greek Life Office', address: '126 College Ave, New Brunswick, NJ 08901' },
          { name: 'Campus Recreation Center', address: '70 Lipman Dr, New Brunswick, NJ 08901' },
          { name: 'Alexander Library', address: '169 College Ave, New Brunswick, NJ 08901' },
          { name: 'Athletic Complex', address: '83 Rockafeller Rd, Piscataway, NJ 08854' },
          { name: 'Campus Theater', address: '85 George St, New Brunswick, NJ 08901' },
          { name: 'Student Union', address: '126 College Ave, New Brunswick, NJ 08901' },
          { name: 'Greek Village', address: '130 College Ave, New Brunswick, NJ 08901' },
          { name: 'Campus Garden', address: '59 Dudley Rd, New Brunswick, NJ 08901' },
          { name: 'Outdoor Amphitheater', address: '126 College Ave, New Brunswick, NJ 08901' }
        ],
        'Northeastern University': [
          { name: 'Greek Row - Huntington Ave', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Student Activities Center', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Northeastern Student Center', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Greek Life Office', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Campus Recreation Center', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Snell Library', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Athletic Complex', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Campus Theater', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Student Union', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Greek Village', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Campus Garden', address: '360 Huntington Ave, Boston, MA 02115' },
          { name: 'Outdoor Amphitheater', address: '360 Huntington Ave, Boston, MA 02115' }
        ]
      };
      
      return locationMaps[universityName] || locationMaps['Stockton University'];
    };
    
    const greekLocations = getUniversityLocations(universityName);

    // Generate events for each organization using seeded random for consistency
    selectedOrgs.forEach((org, index) => {
      // Create a seed based on organization name and university for consistency
      const orgSeed = org.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + universityName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      
      const orgColor = org.type === 'fraternity' ? '#7c3aed' : '#ec4899';
      const eventTypes = ['SOCIAL', 'PHILANTHROPY', 'MIXER'];
      
      // Generate 2-3 events per organization using seeded random
      const numEvents = Math.floor(seededRandom(orgSeed) * 2) + 2;
      
      for (let i = 0; i < numEvents; i++) {
        const eventId = `event-${org.name.replace(/\s+/g, '-').toLowerCase()}-${i}`;
        const eventType = eventTypes[Math.floor(seededRandom(orgSeed + i) * eventTypes.length)];
        const selectedEventData = eventData[Math.floor(seededRandom(orgSeed + i + 100) * eventData.length)];
        const locationObj = greekLocations[Math.floor(seededRandom(orgSeed + i + 200) * greekLocations.length)];
        
        // Generate future dates using seeded random
        const daysFromNow = Math.floor(seededRandom(orgSeed + i + 300) * 30) + 1; // 1-30 days from now
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysFromNow);
        
        // Format date as "Nov 15" style
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        // Generate time using seeded random
        const hours = Math.floor(seededRandom(orgSeed + i + 400) * 8) + 16; // 4 PM to 11 PM
        const minutes = seededRandom(orgSeed + i + 500) < 0.5 ? '00' : '30';
        const time = `${hours > 12 ? hours - 12 : hours}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
        
        events.push({
          id: eventId,
          title: selectedEventData.title,
          organization: org.name,
          orgColor: orgColor,
          date: formattedDate,
          dateISO: eventDate.toISOString().split('T')[0],
          time: time,
          location: locationObj.name,
          locationAddress: locationObj.address,
          attendance: Math.floor(seededRandom(orgSeed + i + 600) * 30) + 20,
          maxAttendance: Math.floor(seededRandom(orgSeed + i + 700) * 20) + 50,
          price: seededRandom(orgSeed + i + 800) > 0.5 ? 0 : Math.floor(seededRandom(orgSeed + i + 900) * 20) + 10,
          image: selectedEventData.image,
          type: eventType,
          description: `Join us for an amazing ${eventType.toLowerCase()} event hosted by ${org.name}!`,
          createdBy: org.name,
          isOrganizationEvent: false
        });
      }
    });
    
    return events;
  };

  useEffect(() => {
    const uid = orgProfileUserId;
    const orgPk = organizationRowId;
    if (!uid && !orgPk) {
      setDbOrgEvents([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      let q = supabase.from('events').select('*');
      if (uid && orgPk) {
        q = q.or(`created_by.eq.${uid},organization_id.eq.${orgPk}`);
      } else if (orgPk) {
        q = q.eq('organization_id', orgPk);
      } else {
        q = q.eq('created_by', uid);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('OrganizationProfileScreen events:', error.message);
        }
        setDbOrgEvents([]);
        return;
      }
      const mapped = await mapDbEventRowsToAppEventsWithLiveCounts(supabase, data || []);
      setDbOrgEvents(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserId, organizationRowId]);

  const mergedOrgEvents = useMemo(() => {
    const org = organization;
    const orgForFilter =
      organizationRowId && org && typeof org === 'object'
        ? { ...org, organizationTableId: organizationRowId }
        : org;
    if (!org?.name && !orgProfileUserId) return [];

    const merged = [...(dbOrgEvents || []), ...(supabaseEvents || []), ...(allEvents || [])];
    const seen = new Set();
    const out = [];
    for (const event of merged) {
      if (!eventBelongsToOrganization(event, orgForFilter)) continue;
      const id = event.id != null ? String(event.id) : null;
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      out.push(event);
    }
    if (out.length > 0) return out;

    if (!user?.university || !org?.name) return [];
    const universityEvents = generateUniversityEvents(user.university);
    return universityEvents.filter((event) => eventBelongsToOrganization(event, orgForFilter));
  }, [organization, orgProfileUserId, organizationRowId, allEvents, supabaseEvents, dbOrgEvents, user?.university]);

  const isMemberProfile = organization?.isSupabaseOrganization === false;

  useEffect(() => {
    if (!isMemberProfile || !orgProfileUserId) {
      setMemberJoinedEvents([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const list = await buildJoinedEventsFromRegistrationsForViewer(orgProfileUserId);
      if (!cancelled) setMemberJoinedEvents(Array.isArray(list) ? list : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMemberProfile, orgProfileUserId]);

  useEffect(() => {
    const uid = orgProfileUserId;
    if (!uid) {
      setPublicOrgProfile(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, bio, username')
        .eq('id', uid)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        if (process.env.NODE_ENV === 'development' && error) {
          console.warn('OrganizationProfileScreen public users row:', error.message);
        }
        setPublicOrgProfile(null);
        return;
      }
      setPublicOrgProfile(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserId]);

  const events = isMemberProfile ? memberJoinedEvents : mergedOrgEvents;

  // Add default values for missing organization fields (now with accurate event count)
  const organizationWithDefaults = {
    name: organization?.name || "Unknown Organization",
    type: organization?.type || "Organization",
    description: organization?.description || "No description available",
    bio: organization?.bio || organization?.description || "No bio available",
    members: organization?.members || 0,
    events: events.length, // Use actual event count
    followers: organization?.followers || 0,
    image: organization?.image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
    coverImage: organization?.coverImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit:crop",
    location: organization?.location || "Location not specified",
    email: organization?.email || null,
    website: organization?.website || null,
    ...organization
  };

  const dbBio =
    publicOrgProfile?.bio != null && String(publicOrgProfile.bio).trim()
      ? String(publicOrgProfile.bio).trim()
      : '';
  const dbName =
    publicOrgProfile?.full_name != null && String(publicOrgProfile.full_name).trim()
      ? String(publicOrgProfile.full_name).trim()
      : '';
  const dbAvatar =
    publicOrgProfile?.avatar_url != null && String(publicOrgProfile.avatar_url).trim()
      ? String(publicOrgProfile.avatar_url).trim()
      : '';
  const handleRaw = stripAtHandle(publicOrgProfile?.username || organization?.username);
  const fallbackHandle = stripAtHandle(organizationWithDefaults.name.toLowerCase().replace(/\s+/g, ''));
  const displayOrg = {
    ...organizationWithDefaults,
    name: dbName || organizationWithDefaults.name,
    image: dbAvatar || organizationWithDefaults.image,
    bio: dbBio || organizationWithDefaults.bio,
    description: dbBio || organizationWithDefaults.description,
    profileHandle: handleRaw || fallbackHandle || 'organization',
  };

  useEffect(() => {
    const targetId = orgProfileUserId;
    if (!targetId) {
      setIsOwnProfile(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const myUid = await getSupabaseAuthUid();
      if (cancelled) return;
      setIsOwnProfile(Boolean(myUid && String(myUid) === String(targetId)));
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserId]);

  useEffect(() => {
    const targetId = orgProfileUserId;
    if (!targetId) {
      setIsFollowing(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const myUid = await getSupabaseAuthUid();
      if (!myUid || String(targetId) === String(myUid)) {
        if (!cancelled) setIsFollowing(false);
        return;
      }
      const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', myUid)
        .eq('following_id', targetId)
        .maybeSingle();
      if (cancelled) return;
      setIsFollowing(Boolean(data && !error));
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserId]);

  useEffect(() => {
    const id = orgProfileUserId;
    if (!id) {
      setViewedFollowCounts({ followers: 0, following: 0 });
      return undefined;
    }
    let cancelled = false;
    setViewedFollowCounts({ followers: null, following: null });
    (async () => {
      const counts = await fetchFollowGraphCountsForAccount(id);
      if (!cancelled) setViewedFollowCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgProfileUserId]);

  const handleFollow = async () => {
    const targetFollowingId =
      resolveOrganizationProfileUserId(organization) ||
      resolveOrganizationProfileUserId(displayOrg);
    const myUid = await getSupabaseAuthUid();
    const canSyncSupabase = Boolean(targetFollowingId && myUid && String(targetFollowingId) !== String(myUid));

    if (isFollowing) {
      if (canSyncSupabase) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', myUid)
          .eq('following_id', targetFollowingId);
        if (typeof onFollowsChanged === 'function') {
          await onFollowsChanged();
        }
        const c = await fetchFollowGraphCountsForAccount(targetFollowingId);
        setViewedFollowCounts(c);
      } else {
        setFollowedOrganizations((prev) => prev.filter((org) => org.name !== displayOrg.name));
      }
      setIsFollowing(false);
      return;
    }

    if (canSyncSupabase) {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: myUid,
        following_id: targetFollowingId,
      });
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('user_follows insert:', error.message);
        }
        return;
      }
      if (typeof onFollowsChanged === 'function') {
        await onFollowsChanged();
      }
      setIsFollowing(true);
      const c = await fetchFollowGraphCountsForAccount(targetFollowingId);
      setViewedFollowCounts(c);
      return;
    }

    const entry = {
      ...displayOrg,
      supabaseUserId: targetFollowingId || displayOrg.supabaseUserId,
    };
    setFollowedOrganizations((prev) => [...prev, entry]);
    setIsFollowing(true);
  };
  const formatEventListDate = (event) => {
    const day = parseEventStartDay(event);
    if (day && !Number.isNaN(day.getTime())) {
      return day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const s = event?.date;
    if (typeof s === 'string' && s.includes(',')) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    return typeof s === 'string' ? s : '';
  };

  const eventSchoolU =
    (organization?.university != null && String(organization.university).trim()) ||
    (typeof user?.university === 'object' ? user?.university?.name : user?.university);

  const defaultEventImage =
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop';

  const upcomingEvents = events
    .filter((event) => {
      void schoolClockTick;
      if (isMemberProfile && Boolean(event.ticketScanned)) return false;
      return !isEventPastBySchoolClock(event, eventSchoolU);
    })
    .map((event) => ({
      ...event,
      date: formatEventListDate(event),
      time: event.time || '7:00 PM',
      location: event.location,
      locationAddress: event.locationAddress,
      attendees: event.attendance || event.attendees || 0,
      image: event.image || defaultEventImage,
    }));

  const pastEvents = events
    .filter((event) => {
      void schoolClockTick;
      if (isMemberProfile && Boolean(event.ticketScanned)) return true;
      return isEventPastBySchoolClock(event, eventSchoolU);
    })
    .map((event) => ({
      ...event,
      date: formatEventListDate(event),
      time: event.time || '7:00 PM',
      location: event.location,
      locationAddress: event.locationAddress,
      attendees: event.attendance || event.attendees || 0,
      image: event.image || defaultEventImage,
    }));

  const displayEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  // Handle event click
  const handleEventClick = (event) => {
    setSelectedEventDetails(event);
    setShowEventDetails(true);
  };

  const handleLocationClick = (locationAddress) => {
    if (locationAddress) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationAddress)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  // Handle close event details
  const handleCloseEventDetails = () => {
    setShowEventDetails(false);
    setSelectedEventDetails(null);
  };


  // Tabs Component (matching personal profile)
  const eventTabLabels = isMemberProfile
    ? { upcoming: 'Upcoming Events', past: 'Attended Events' }
    : { upcoming: 'Upcoming events', past: 'Previous Events' };

  const TabsComponent = ({ activeTab, setActiveTab }) => {
    const tabs = [
      { id: 'upcoming', label: eventTabLabels.upcoming },
      { id: 'past', label: eventTabLabels.past },
    ];

  return (
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
        {tabs.map((tab) => (
                <button 
            key={tab.id}
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

  const eventStatusPill =
    activeTab === 'upcoming' ? 'Upcoming' : isMemberProfile ? 'Attended' : 'Previous';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(to bottom right, #581c87, #7c3aed, #4f46e5)',
      padding: isMobile ? '0.75rem' : '1rem 2rem',
      paddingBottom: isMobile ? '80px' : '1rem'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')`,
        opacity: 0.3
      }} />
      
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
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8rem',
              background: 'linear-gradient(to right, rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))'
            }} />
            
            <div style={{ padding: isMobile ? '1rem' : '1.5rem 2rem', position: 'relative' }}>
              {/* Follow Button - Top Right on Mobile */}
              {isMobile && !isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollow}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isFollowing 
                      ? 'linear-gradient(to right, #10b981, #059669)' 
                      : 'linear-gradient(to right, #9333ea, #ec4899)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px 0 rgba(147, 51, 234, 0.39)',
                    zIndex: 10
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </motion.button>
              )}
              
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '1rem' : '1.5rem',
                alignItems: isMobile ? 'center' : 'flex-end',
                marginBottom: isMobile ? '1.5rem' : '2rem',
                textAlign: isMobile ? 'center' : 'left'
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
                    width: isMobile ? '5rem' : '8rem',
                    height: isMobile ? '5rem' : '8rem',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(to bottom right, #9333ea, #ec4899)'
                  }}>
                    <img
                      src={displayOrg.image}
                      alt={displayOrg.name}
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
                      fontSize: isMobile ? '1.65rem' : '2.25rem',
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: '0.25rem',
                      lineHeight: '1.2',
                      wordBreak: 'break-word'
                    }}>
                      {displayOrg.name}
                    </h1>
                    <p style={{ color: '#c4b5fd', fontSize: isMobile ? '0.9rem' : '1.125rem' }}>@{displayOrg.profileHandle}</p>
                          </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.875rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{ color: 'white' }}>
                        {(organizationWithDefaults?.university &&
                          String(organizationWithDefaults.university).trim()) ||
                          (typeof user?.university === 'object'
                            ? user?.university?.name
                            : user?.university) ||
                          'Your University'}
                      </span>
                        </div>
                      </div>
                      
                  <div
                    style={{
                      display: 'flex',
                      gap: isMobile ? '1rem' : '1.5rem',
                      color: 'white',
                      justifyContent: isMobile ? 'space-around' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    {!isMemberProfile && (
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: isMobile ? '1.25rem' : '1.5rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {displayOrg.events}
                        </div>
                        <div
                          style={{
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                          }}
                        >
                          Events
                        </div>
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: isMobile ? '1.25rem' : '1.5rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {orgProfileUserId
                          ? viewedFollowCounts.followers === null
                            ? '…'
                            : viewedFollowCounts.followers.toLocaleString()
                          : (displayOrg.members ?? 0).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        Followers
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: isMobile ? '1.25rem' : '1.5rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {orgProfileUserId
                          ? viewedFollowCounts.following === null
                            ? '…'
                            : viewedFollowCounts.following.toLocaleString()
                          : (displayOrg.followers ?? 0).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        Following
                      </div>
                    </div>
                  </div>
                        </div>
                        
                {!isMobile && !isOwnProfile && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                          <button 
                    onClick={handleFollow}
                    style={{
                      borderRadius: '0.75rem',
                      padding: '0.75rem 2rem',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isFollowing 
                        ? 'linear-gradient(to right, #10b981, #059669)' 
                        : 'linear-gradient(to right, #9333ea, #ec4899)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px 0 rgba(147, 51, 234, 0.39)'
                    }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                          </button>
                </motion.div>
                )}
                        </div>
              
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
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: isMobile ? '0.875rem' : '1rem' }}>{displayOrg.bio}</p>
              </motion.div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
                <TabsComponent activeTab={activeTab} setActiveTab={setActiveTab} />

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
                      justifyContent: 'center',
                    }}
                  >
                    {displayEvents.map((event) => (
                      <ProfileEventCard
                        key={event.id}
                        event={event}
                        statusPill={eventStatusPill}
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

                {displayEvents.length === 0 && (
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
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: (selectedEventDetails.type || 'SOCIAL') === 'SOCIAL' ? '#7c3aed' :
                          (selectedEventDetails.type || 'SOCIAL') === 'PHILANTHROPY' ? '#10b981' :
                          (selectedEventDetails.type || 'SOCIAL') === 'MIXER' ? '#ec4899' : '#f59e0b',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {selectedEventDetails.type || 'SOCIAL'}
              </div>
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
                    Join us for an unforgettable {(selectedEventDetails.type || 'SOCIAL').toLowerCase()} event hosted by{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const hostUid = selectedEventDetails?.createdByUserId;
                        if (hostUid != null && isSupabaseUuid(String(hostUid))) {
                          onNavigate('organization-profile', {
                            organization: {
                              name: selectedEventDetails.organization || 'Organization',
                              type: 'Organization',
                              description: '',
                              supabaseUserId: String(hostUid),
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
                          image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop'
                        };
                        onNavigate('organization-profile', { organization: organizationProfile });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60a5fa',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        padding: 0,
                        margin: 0
                      }}
                      onMouseEnter={(e) => { e.target.style.color = '#93c5fd'; }}
                      onMouseLeave={(e) => { e.target.style.color = '#60a5fa'; }}
                    >
                      {selectedEventDetails.organization}
                    </button>
                    . This exclusive gathering brings together the best of Greek life for an evening you won&apos;t forget.
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
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Location</p>
                    <p 
                      style={{ 
                        color: 'white', 
                        fontSize: '14px', 
                        margin: 0, 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        transition: 'color 0.2s ease'
                      }}
                      onClick={() => {
                        if (selectedEventDetails.locationAddress) {
                          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEventDetails.locationAddress)}`;
                          window.open(mapsUrl, '_blank');
                        }
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#60a5fa'}
                      onMouseLeave={(e) => e.target.style.color = 'white'}
                      title="Click for directions"
                    >
                      {selectedEventDetails.location}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    if (isEventAtCapacity(selectedEventDetails)) return;
                    if ((selectedEventDetails.price || 0) > 0) {
                      // Payment integration would go here - silent
                    } else {
                      // You have joined this event - silent
                    }
                    handleCloseEventDetails();
                  }}
                  style={{
                    flex: 1,
                    background: isEventAtCapacity(selectedEventDetails)
                      ? 'linear-gradient(135deg, #d97706, #ea580c)'
                      : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isEventAtCapacity(selectedEventDetails) ? 'default' : 'pointer',
                    opacity: isEventAtCapacity(selectedEventDetails) ? 0.95 : 1,
                    transition: 'all 0.3s ease'
                  }}
                  title={
                    isEventAtCapacity(selectedEventDetails)
                      ? 'This event has reached its attendee limit.'
                      : undefined
                  }
                >
                  {isEventAtCapacity(selectedEventDetails)
                    ? 'Full'
                    : (selectedEventDetails.price || 0) > 0
                      ? `Register ($${selectedEventDetails.price})`
                      : 'Join Event'}
                </button>
                
                  <button 
                  onClick={() => {
                    // Handle share functionality
                    if (navigator.share) {
                      navigator.share({
                        title: selectedEventDetails.title,
                        text: `Check out this event: ${selectedEventDetails.title}`,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(`${selectedEventDetails.title} - ${selectedEventDetails.date} at ${selectedEventDetails.location}`);
                      // Event details copied to clipboard - silent
                    }
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

    </div>
  );
};

export default OrganizationProfileScreen; 