import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Ticket,
  QrCode,
  Loader2,
  Inbox,
} from 'lucide-react';
import QRScanner from '../components/QRScanner';
import { supabase, getSupabaseAuthCreatorUserId, tryParseUuidString } from '../utils/supabaseClient';
import { registrationQualifiesForJoinedList } from '../utils/supabaseJoinedEventsHydration';
import { isSupabaseUuid } from '../utils/isSupabaseUuid';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import {
  listEventJoinRequestsForHostRpc,
  respondEventJoinRequestRpc,
} from '../utils/eventJoinRequestSupabase';
import { isEventPastBySchoolClock } from '../utils/eventSchoolTime';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';

function universityStringForSchoolClock(user, event) {
  const ev = event?.university;
  if (ev != null && String(ev).trim()) return String(ev).trim();
  const u = user?.university;
  if (u == null) return '';
  return typeof u === 'object' && u?.name != null ? String(u.name).trim() : String(u).trim();
}

/** Shown while joinedEvents fallback is used before registrations load — do not encode as QR. */
const PENDING_TICKET_QR = '__PENDING_SYNC__';

/**
 * Host id for querying `events.created_by`. Live session can lag briefly after
 * navigating back to this screen (remount) while React `user` already has ids.
 */
async function resolveHostUidForOrgEvents(user) {
  const creator = getSupabaseAuthCreatorUserId(user);
  const fromUser =
    (isSupabaseUuid(user?.supabaseUserId) ? user.supabaseUserId : null) ||
    (isSupabaseUuid(user?.userId) ? user.userId : null) ||
    (isSupabaseUuid(creator) ? creator : null);

  for (let attempt = 0; attempt < 3; attempt++) {
    const live = await getSupabaseAuthUid();
    if (live) return live;
    if (fromUser) return fromUser;
    await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
  }
  return fromUser;
}

/** One round-trip when FK exists; falls back to two queries if embed fails. */
async function fetchStudentRegistrationsWithEvents(uid) {
  const { data: rows, error } = await supabase
    .from('registrations')
    .select(
      `*,
      events (
        id,
        title,
        description,
        date,
        time,
        location,
        image,
        price,
        organization_name
      )`
    )
    .eq('user_id', uid)
    .order('registered_at', { ascending: false });

  if (!error && rows) {
    return rows.map((reg) => {
      const ev = reg.events;
      const eventRow = Array.isArray(ev) ? ev[0] : ev;
      const { events: _drop, ...rest } = reg;
      return { ...rest, events: eventRow || null };
    });
  }

  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('*')
    .eq('user_id', uid)
    .order('registered_at', { ascending: false });

  if (regError || !registrations?.length) {
    return registrations || [];
  }

  const eventIds = [...new Set(registrations.map((r) => r.event_id))];
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, description, date, time, location, image, price, organization_name')
    .in('id', eventIds);

  if (eventsError) {
    return registrations.map((reg) => ({ ...reg, events: null }));
  }

  return registrations.map((reg) => ({
    ...reg,
    events: events?.find((e) => e.id === reg.event_id) || null,
  }));
}

/** Real RSVP count from `registrations` (event.attendance in DB is often stale). */
async function fetchRegistrationCountsByEventId(supabaseClient, eventIds) {
  if (!eventIds?.length) return {};
  const { data, error } = await supabaseClient
    .from('registrations')
    .select('event_id')
    .in('event_id', eventIds);
  if (error) {
    console.warn('fetchRegistrationCountsByEventId:', error.message);
    return null;
  }
  const counts = {};
  for (const id of eventIds) counts[id] = 0;
  for (const row of data || []) {
    const eid = row.event_id;
    if (eid != null) counts[eid] = (counts[eid] || 0) + 1;
  }
  return counts;
}

/** Map App.js `supabaseEvents` row into the same shape as mapSupabaseRowsToHostedEvents. */
function mapAppEventToHosted(e, registrationCounts) {
  const sid = e.supabaseId;
  const registered =
    registrationCounts &&
    sid != null &&
    Object.prototype.hasOwnProperty.call(registrationCounts, sid)
      ? registrationCounts[sid]
      : null;
  return {
    id: sid,
    supabaseId: sid,
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    location: e.location,
    locationAddress: e.locationAddress,
    coordinates: e.coordinates,
    image: e.image,
    price: e.price || 0,
    category: e.category,
    attendance:
      typeof registered === 'number' ? registered : Number(e.attendance) || 0,
    maxAttendance: e.maxAttendance ?? null,
    organization: e.organization,
    createdBy: e.createdBy,
    createdByUserId: e.createdByUserId,
    university: e.university,
    requiresJoinRequest: Boolean(e.requires_join_request ?? e.requiresJoinRequest),
  };
}

/**
 * Merge DB rows for chapter-hosted events with App-wide `supabaseEvents` (creator or organization_id).
 * Fills hosted tools when RLS returns no rows for the direct query but home feed still has the event.
 */
async function mergeHostedOrganizationEvents(
  supabaseClient,
  data,
  hostUid,
  supabaseEventsCentral,
  hostOrgIdsLower = []
) {
  const hostNorm = hostUid ? String(hostUid).toLowerCase() : '';
  const orgSet = new Set(
    (hostOrgIdsLower || []).map((id) => String(id).toLowerCase()).filter(Boolean)
  );
  const centralCandidates = (supabaseEventsCentral || []).filter((e) => {
    if (hostNorm && String(e.createdByUserId || '').toLowerCase() === hostNorm) return true;
    const oid = e.organizationId ?? e.organization_id;
    return oid != null && orgSet.has(String(oid).toLowerCase());
  });
  const allIds = [
    ...new Set([
      ...(data || []).map((e) => e.id),
      ...centralCandidates.map((e) => e.supabaseId),
    ]),
  ].filter(Boolean);
  const counts =
    allIds.length > 0
      ? await fetchRegistrationCountsByEventId(supabaseClient, allIds)
      : {};
  const fromDb = mapSupabaseRowsToHostedEvents(data || [], counts);
  const fromCentral = centralCandidates.map((e) => mapAppEventToHosted(e, counts));
  const merged = [...fromDb];
  const seen = new Set(fromDb.map((r) => String(r.supabaseId)));
  for (const row of fromCentral) {
    if (row.supabaseId && !seen.has(String(row.supabaseId))) {
      merged.push(row);
      seen.add(String(row.supabaseId));
    }
  }
  return merged;
}

function mapSupabaseRowsToHostedEvents(data, registrationCounts) {
  if (!data?.length) return [];
  return data.map((event) => {
    const registered =
      registrationCounts && Object.prototype.hasOwnProperty.call(registrationCounts, event.id)
        ? registrationCounts[event.id]
        : null;
    return {
      id: event.id,
      supabaseId: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      locationAddress: event.location_address,
      coordinates: event.coordinates,
      image: event.image || event.image_url,
      price: event.price || 0,
      category: event.category,
      attendance:
        typeof registered === 'number' ? registered : Number(event.attendance) || 0,
      maxAttendance: event.max_attendance ?? event.max_attendees ?? null,
      organization: event.organization_name,
      createdBy: event.organization_name,
      createdByUserId: event.created_by,
      university: event.university,
      requiresJoinRequest: Boolean(event.requires_join_request),
      isFundraiser: Boolean(event.is_fundraiser),
    };
  });
}

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

// Helper function to format date from YYYY-MM-DD to "Oct 25"
const formatDate = (date) => {
  if (!date) return '';
  // If already formatted (contains letters), return as-is
  if (/[a-zA-Z]/.test(date)) return date;
  
  // Convert YYYY-MM-DD to "Oct 25"
  const dateObj = new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Convert Supabase registrations to tickets format
const convertRegistrationsToTickets = (registrations) => {
  if (!registrations || registrations.length === 0) {
    console.log('ℹ️ No registrations to convert');
    return [];
  }
  
  console.log('🎫 Converting registrations to tickets. Count:', registrations.length);
  
  const tickets = registrations.map(reg => {
    console.log('🎫 Converting registration:', {
      registration_id: reg.id,
      event_id: reg.event_id,
      user_id: reg.user_id,
      ticket_code: reg.ticket_code,
      has_event_data: !!reg.events,
      event_title: reg.events?.title
    });
    
    // Warning if ticket_code is missing
    if (!reg.ticket_code) {
      console.error('❌ WARNING: Registration has NO ticket_code! This will cause scanner to fail.', reg);
    }
    
    // Warning if event data is missing
    if (!reg.events) {
      console.warn('⚠️ WARNING: Registration missing event data from join:', reg);
    }
    
    return {
      id: reg.id,
      eventName: reg.events?.title || 'Event',
      eventDate: reg.events?.date || '',
      eventTime: reg.events?.time || '',
      location: reg.events?.location || '',
      ticketType: (reg.events?.price || 0) > 0 ? 'Premium Access' : 'General Admission',
      attendees: Math.floor(Math.random() * 200) + 50,
      qrData: reg.ticket_code || `ERROR-NO-TICKET-CODE-${reg.id}`, // Use the STORED ticket code from Supabase
      organizerLogo: reg.events?.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop",
      scanned: reg.scanned || false,
      paymentStatus: reg.payment_status
    };
  });
  
  console.log('✅ Converted tickets:', tickets.length);
  console.log('📋 Sample ticket (first one):', tickets[0]);
  return tickets;
};

// Legacy function - kept for backward compatibility with joinedEvents
const convertToTickets = (joinedEvents, user) => {
  return (joinedEvents || []).map((event) => ({
    id: `ticket_${event.id}`,
    eventName: event.title,
    eventDate: event.date,
    eventTime: event.time,
    location: event.location,
    ticketType: event.price > 0 ? 'Premium Access' : 'General Admission',
    attendees: event.attendance || event.attendees || Math.floor(Math.random() * 200) + 50,
    // Real tickets use `ticket_code` from Supabase (TKT-...). Never encode a fake TICKET-... for DB-backed events.
    qrData: event.supabaseId ? PENDING_TICKET_QR : `TICKET-${event.id}-${user?.id || 'user'}-${Date.now()}`,
    organizerLogo: event.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop",
    scanned: Boolean(event.ticketScanned),
  }));
};

const TicketCard = ({ ticket, index, onTicketClick, loadingTickets }) => {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      setMousePosition({ x, y });

      const rotateX = -(y / rect.height) * 8;
      const rotateY = (x / rect.width) * 8;

      setRotation({ x: rotateX, y: rotateY });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{ 
        position: 'relative',
        perspective: "1500px",
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={() => onTicketClick && onTicketClick(ticket)}
    >
      <motion.div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(59, 130, 246, 0.9) 50%, rgba(147, 51, 234, 0.8) 100%)',
          opacity: 0.95
        }} />

        {/* Glass overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(20px)',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }} />

        {/* Animated particles */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: isHovered ? 0.6 : 0.3,
                transition: 'opacity 0.5s ease-out',
              }}
            />
          ))}
        </div>

        {/* Shine effect */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isHovered ? 1 : 0,
            pointerEvents: 'none',
            background: isHovered
              ? `radial-gradient(circle at ${mousePosition.x + (cardRef.current?.getBoundingClientRect().width || 0) / 2}px ${
                  mousePosition.y + (cardRef.current?.getBoundingClientRect().height || 0) / 2
                }px, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)`
              : "",
            transition: 'opacity 0.3s ease-out',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', padding: '24px', zIndex: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: '0 0 4px', lineHeight: '1.2' }}>
                {ticket.eventName}
              </h3>
            </div>
            {ticket.organizerLogo && (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <img src={ticket.organizerLogo} alt="Organizer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Event Details */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '12px', 
            marginBottom: '24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <Calendar style={{ width: '16px', height: '16px', color: 'rgba(196, 181, 253, 1)' }} />
              <span style={{ fontSize: '14px' }}>{formatDate(ticket.eventDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <Clock style={{ width: '16px', height: '16px', color: 'rgba(196, 181, 253, 1)' }} />
              <span style={{ fontSize: '14px' }}>{formatTime(ticket.eventTime)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <MapPin style={{ width: '16px', height: '16px', color: 'rgba(196, 181, 253, 1)' }} />
              <span style={{ fontSize: '14px' }}>{ticket.location}</span>
            </div>
          </div>

          {/* QR Code Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <div id={`qr-${ticket.id}`} style={{ background: 'white', padding: '12px', borderRadius: '8px', minHeight: 184, minWidth: 184, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ticket.qrData === PENDING_TICKET_QR ? (
                  <p style={{ color: '#374151', fontSize: '13px', textAlign: 'center', padding: '12px', margin: 0, maxWidth: 160 }}>
                    {loadingTickets
                      ? 'Loading your ticket code from the server…'
                      : 'Syncing your ticket. Pull down or reopen this tab in a moment.'}
                  </p>
                ) : (
                <QRCodeSVG
                  value={ticket.qrData}
                  size={160}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
                )}
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
              {ticket.qrData === PENDING_TICKET_QR ? 'Valid QR appears after sync' : 'Scan at event entrance'}
            </p>
            {/* Debug: Show QR data */}
          </div>
        </div>

        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />
      </motion.div>

      {/* Card shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: '90%',
          height: '10px',
          borderRadius: '50%',
          background: 'rgba(147, 51, 234, 0.4)',
          filter: 'blur(20px)',
          transform: isHovered ? "translate(-50%, 15px) scale(0.95)" : "translate(-50%, 10px) scale(0.85)",
          opacity: isHovered ? 0.6 : 0.4,
          transition: "transform 0.5s ease-out, opacity 0.5s ease-out",
        }}
      />
    </motion.div>
  );
};

const TicketsScreen = ({ user, onNavigate, joinedEvents, allEvents, supabaseEvents = [] }) => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedTickets, setScannedTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [eventAttendees, setEventAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [joinRequestsRows, setJoinRequestsRows] = useState([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState('');
  const [hostedOrganizationEvents, setHostedOrganizationEvents] = useState([]);
  /** Lowercase org UUIDs where user is org_admin or can_scan_tickets. */
  const [chapterCheckInOrgIds, setChapterCheckInOrgIds] = useState([]);
  const schoolClockTick = useSchoolClockTick();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = await getSupabaseAuthUid();
      const uid =
        (live && isSupabaseUuid(String(live)) ? String(live).trim() : null) ||
        (isSupabaseUuid(user?.supabaseUserId) ? String(user.supabaseUserId).trim() : null) ||
        (isSupabaseUuid(user?.userId) ? String(user.userId).trim() : null);
      if (!uid) {
        if (!cancelled) setChapterCheckInOrgIds([]);
        return;
      }
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', uid)
        .or('is_org_admin.eq.true,can_scan_tickets.eq.true');
      if (cancelled) return;
      if (error) {
        console.warn('TicketsScreen chapter check-in orgs:', error.message);
        setChapterCheckInOrgIds([]);
        return;
      }
      const ids = [
        ...new Set(
          (data || [])
            .map((r) => r.organization_id)
            .filter((id) => id != null && String(id).trim() !== '')
            .map((id) => String(id).toLowerCase())
        ),
      ];
      setChapterCheckInOrgIds(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId, user?.supabaseUserId]);

  const isDedicatedOrgLogin = Boolean(user?.isOrganization && user?.supabaseIsOrganization);
  const canUseEventCheckIn = isDedicatedOrgLogin || chapterCheckInOrgIds.length > 0;

  // Seed scan-attendees list from home-feed cache before async host query + events SELECT.
  useLayoutEffect(() => {
    if (!canUseEventCheckIn) return;
    const creator = getSupabaseAuthCreatorUserId(user);
    const hostUid =
      (creator && isSupabaseUuid(String(creator)) ? creator : null) ||
      (isSupabaseUuid(user?.supabaseUserId) ? user.supabaseUserId : null) ||
      (isSupabaseUuid(user?.userId) ? user.userId : null);
    const hostNorm = hostUid ? String(hostUid).toLowerCase() : '';
    const orgSet = new Set(chapterCheckInOrgIds);
    const centralCandidates = (supabaseEvents || []).filter((e) => {
      if (hostNorm && String(e.createdByUserId || '').toLowerCase() === hostNorm) return true;
      const oid = e.organizationId ?? e.organization_id;
      return oid != null && orgSet.has(String(oid).toLowerCase());
    });
    if (!centralCandidates.length) return;
    setHostedOrganizationEvents((prev) => {
      const merged = [...prev];
      const seen = new Set(merged.map((r) => String(r.supabaseId)));
      for (const e of centralCandidates) {
        const row = mapAppEventToHosted(e, {});
        if (row.supabaseId && !seen.has(String(row.supabaseId))) {
          merged.push(row);
          seen.add(String(row.supabaseId));
        }
      }
      return merged;
    });
  }, [canUseEventCheckIn, user, supabaseEvents, chapterCheckInOrgIds]);

  // Load user's own RSVPs/tickets for any Supabase user (including chapter scanners/admins).
  const loadStudentRegistrations = useCallback(async () => {
    const uid = user?.supabaseUserId || user?.userId;
    if (!uid || !isSupabaseUuid(uid)) {
      setUserRegistrations([]);
      setLoadingTickets(false);
      return;
    }

    setLoadingTickets(true);
    try {
      const merged = await fetchStudentRegistrationsWithEvents(uid);
      setUserRegistrations(
        merged.filter((reg) => registrationQualifiesForJoinedList(reg, reg.events))
      );
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      setUserRegistrations([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [user?.userId, user?.supabaseUserId]);

  useEffect(() => {
    loadStudentRegistrations();
  }, [loadStudentRegistrations]);

  // Refresh personal tickets when returning to the tab (check-in hosts need this too after paying).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadStudentRegistrations();
    };
    const onFocus = () => loadStudentRegistrations();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadStudentRegistrations]);

  // Load events from Supabase for chapter admins/scanners and dedicated org logins
  useEffect(() => {
    let cancelled = false;
    let requestSeq = 0;

    const loadOrganizationEvents = async () => {
      if (!canUseEventCheckIn) {
        setHostedOrganizationEvents([]);
        return;
      }

      const seq = ++requestSeq;
      setLoading(true);
      try {
        const hostUid = await resolveHostUidForOrgEvents(user);
        if (cancelled || seq !== requestSeq) return;

        const byId = new Map();
        const orgIdsForQuery = chapterCheckInOrgIds.filter((id) => isSupabaseUuid(id));

        if (orgIdsForQuery.length > 0) {
          const { data: orgRows, error: orgErr } = await supabase
            .from('events')
            .select('*')
            .in('organization_id', orgIdsForQuery)
            .order('created_at', { ascending: false });
          if (!orgErr && orgRows) {
            for (const row of orgRows) byId.set(row.id, row);
          } else if (orgErr) {
            console.error('Error loading chapter organization events:', orgErr);
          }
        }

        if (hostUid) {
          const { data: creatorRows, error: crErr } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', hostUid)
            .order('created_at', { ascending: false });
          if (!crErr && creatorRows) {
            for (const row of creatorRows) byId.set(row.id, row);
          } else if (crErr) {
            console.error('Error loading events by creator:', crErr);
          }
        }

        const combined = [...byId.values()].sort((a, b) => {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          return tb - ta;
        });

        if (cancelled || seq !== requestSeq) return;

        const merged = await mergeHostedOrganizationEvents(
          supabase,
          combined,
          hostUid || '',
          supabaseEvents,
          chapterCheckInOrgIds
        );
        if (cancelled || seq !== requestSeq) return;
        setHostedOrganizationEvents(merged);
      } catch (error) {
        console.error('Error loading events:', error);
        if (!cancelled && seq === requestSeq) {
          try {
            const hostUid = await resolveHostUidForOrgEvents(user);
            const merged = await mergeHostedOrganizationEvents(
              supabase,
              null,
              hostUid || '',
              supabaseEvents,
              chapterCheckInOrgIds
            );
            setHostedOrganizationEvents(merged);
          } catch (_) {
            setHostedOrganizationEvents([]);
          }
        }
      } finally {
        if (!cancelled && seq === requestSeq) setLoading(false);
      }
    };

    loadOrganizationEvents();

    return () => {
      cancelled = true;
    };
  }, [
    canUseEventCheckIn,
    user?.userId,
    user?.supabaseUserId,
    user?.isOrganization,
    user?.supabaseIsOrganization,
    supabaseEvents,
    chapterCheckInOrgIds,
  ]);

  // Browser tab focus: session refresh can complete after hidden; refetch hosted events
  useEffect(() => {
    if (!canUseEventCheckIn) return undefined;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;

      (async () => {
        const hostUid = await resolveHostUidForOrgEvents(user);
        const byId = new Map();
        const orgIdsForQuery = chapterCheckInOrgIds.filter((id) => isSupabaseUuid(id));
        if (orgIdsForQuery.length > 0) {
          const { data: orgRows, error: orgErr } = await supabase
            .from('events')
            .select('*')
            .in('organization_id', orgIdsForQuery)
            .order('created_at', { ascending: false });
          if (!orgErr && orgRows) {
            for (const row of orgRows) byId.set(row.id, row);
          }
        }
        if (hostUid) {
          const { data: creatorRows, error: crErr } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', hostUid)
            .order('created_at', { ascending: false });
          if (!crErr && creatorRows) {
            for (const row of creatorRows) byId.set(row.id, row);
          }
        }
        const combined = [...byId.values()].sort((a, b) => {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          return tb - ta;
        });
        const merged = await mergeHostedOrganizationEvents(
          supabase,
          combined,
          hostUid || '',
          supabaseEvents,
          chapterCheckInOrgIds
        );
        setHostedOrganizationEvents(merged);
      })();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [canUseEventCheckIn, user?.userId, user?.supabaseUserId, supabaseEvents, chapterCheckInOrgIds]);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Add keyboard support for closing modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showQRModal) {
        handleCloseQRModal();
      }
    };

    if (showQRModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showQRModal]);

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  };

  const resolveCanonicalEventId = (event) => {
    const tryIds = [event?.resolvedEventId, event?.supabaseId, event?.id, event?.event_id, event?.eventId];
    for (const raw of tryIds) {
      const parsed = tryParseUuidString(raw);
      if (parsed) return parsed;
    }

    // Fallback: match by key fields from hosted cache and use that row's UUID.
    const match = hostedOrganizationEvents.find((e) => {
      if (!event?.title || !e?.title || event.title !== e.title) return false;
      const sameDate = String(e.date || '') === String(event.date || '');
      const sameTime = String(e.time || '') === String(event.time || '');
      return sameDate || sameTime;
    });
    if (match) {
      return tryParseUuidString(match.supabaseId || match.id);
    }
    return null;
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedTicket(null);
  };

  // Close large QR modal if this registration was checked in (e.g. after refetch)
  useEffect(() => {
    if (!showQRModal || !selectedTicket) return;
    const reg = userRegistrations.find((r) => String(r.id) === String(selectedTicket.id));
    if (reg && Boolean(reg.scanned)) {
      setShowQRModal(false);
      setSelectedTicket(null);
    }
  }, [showQRModal, selectedTicket, userRegistrations]);

  // Handle QR scanner
  const handleOpenQRScanner = (event = null) => {
    if (event) {
      const resolvedEventId = resolveCanonicalEventId(event);
      setSelectedEvent({ ...event, resolvedEventId });
    }
    setShowQRScanner(true);
  };

  const handleCloseQRScanner = () => {
    setShowQRScanner(false);
    setSelectedEvent(null);
  };

  // Load attendees for a specific event
  const handleViewAttendees = async (event) => {
    const resolvedEventId = resolveCanonicalEventId(event);
    setSelectedEvent({ ...event, resolvedEventId });
    setShowAttendeesModal(true);
    setLoadingAttendees(true);
    
    try {
      const eventId = resolvedEventId;
      if (!eventId) {
        console.warn('Could not resolve UUID for attendee query', event);
        setEventAttendees([]);
        setLoadingAttendees(false);
        return;
      }
      const liveUid = await getSupabaseAuthUid();
      const hostId = String(
        liveUid ||
          (isSupabaseUuid(user?.supabaseUserId) ? user.supabaseUserId : '') ||
          user?.userId ||
          ''
      );
      const eventHostId = String(event?.createdByUserId || '');
      // Avoid false negatives from session hydration timing/casing; RLS still enforces access.
      if (hostId && eventHostId && hostId.toLowerCase() !== eventHostId.toLowerCase()) {
        console.warn('Attendee view host mismatch, continuing and letting RLS enforce access', {
          hostId,
          eventHostId,
          eventId,
        });
      }
      console.log('📋 Loading attendees for event:', eventId);
      
      let registrations = null;

      const { data: rpcRows, error: rpcErr } = await supabase.rpc(
        'list_registrations_for_host_event',
        { p_event_id: eventId }
      );
      if (!rpcErr && Array.isArray(rpcRows)) {
        registrations = rpcRows;
        console.log('✅ Loaded registrations via RPC:', rpcRows.length);
      } else if (rpcErr) {
        console.warn('list_registrations_for_host_event', rpcErr?.message || rpcErr);
      }

      if (!registrations) {
        const { data: regRows, error: regError } = await supabase
        .from('registrations')
          .select(
            'id, user_id, event_id, registered_at, scanned, scanned_at, payment_status, ticket_code'
          )
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });
      
      if (regError) {
        console.error('❌ Error loading registrations:', regError);
          const isPolicyError =
            regError.code === '42501' ||
            String(regError.message || '').toLowerCase().includes('permission');
          if (isPolicyError) {
            console.warn(
              'Attendees blocked by RLS. Run SUPABASE_RPC_HOST_TICKET_OPS.sql or SUPABASE_REGISTRATIONS_HOST_POLICIES.sql in Supabase.'
            );
          }
        setEventAttendees([]);
        setLoadingAttendees(false);
        return;
        }
        registrations = regRows;
      }

      const eventRowForQualify = { price: Number(event?.price ?? 0) || 0 };
      registrations = (registrations || []).filter((r) =>
        registrationQualifiesForJoinedList(r, eventRowForQualify)
      );

      console.log('✅ Loaded registrations:', registrations);
      
      if (!registrations || registrations.length === 0) {
        console.log('ℹ️ No attendees registered for this event');
        setEventAttendees([]);
        setLoadingAttendees(false);
        return;
      }
      
      // Now fetch user details for each registration from the users table
      const userIds = registrations.map(reg => reg.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, full_name, email')
        .in('id', userIds);
      
      if (usersError) {
        console.error('⚠️ Error loading user details:', usersError);
        // Still show registrations even without user details
      }
      
      console.log('✅ Loaded user details:', users);
      
      // Merge registration data with user data
      const attendeesWithUserInfo = registrations.map(reg => {
        const userInfo = users?.find(u => u.id === reg.user_id);
        const fallbackName = userInfo?.email
          ? userInfo.email.split('@')[0]
          : `User ${String(reg.user_id || '').slice(0, 8)}`;
        return {
          ...reg,
          users: userInfo || { 
            id: reg.user_id, 
            username: fallbackName,
            full_name: fallbackName,
            email: 'N/A'
          }
        };
      });
      
      console.log('✅ Final attendees list:', attendeesWithUserInfo);
      console.log('   Total attendees:', attendeesWithUserInfo.length);
      
      setEventAttendees(attendeesWithUserInfo);
    } catch (error) {
      console.error('❌ Error fetching attendees:', error);
      setEventAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleCloseAttendeesModal = () => {
    setShowAttendeesModal(false);
    setSelectedEvent(null);
    setEventAttendees([]);
  };

  const fetchJoinRequestsIntoState = async (eventUuid) => {
    if (!eventUuid) {
      setJoinRequestsError('This event is not linked to Supabase yet.');
      setJoinRequestsRows([]);
      setJoinRequestsLoading(false);
      return;
    }
    setJoinRequestsLoading(true);
    setJoinRequestsError('');
    const { rows, error } = await listEventJoinRequestsForHostRpc(eventUuid);
    if (error) {
      setJoinRequestsError(
        /does not exist|schema cache|42883/i.test(String(error))
          ? 'Run SUPABASE_EVENT_JOIN_REQUESTS.sql in the Supabase SQL Editor, then try again.'
          : error
      );
      setJoinRequestsRows([]);
    } else {
      setJoinRequestsRows(rows);
    }
    setJoinRequestsLoading(false);
  };

  const handleOpenJoinRequests = async (event) => {
    setShowAttendeesModal(false);
    const resolvedEventId = resolveCanonicalEventId(event);
    setSelectedEvent({ ...event, resolvedEventId });
    setShowJoinRequestsModal(true);
    setJoinRequestsRows([]);
    await fetchJoinRequestsIntoState(resolvedEventId);
  };

  const handleCloseJoinRequestsModal = () => {
    setShowJoinRequestsModal(false);
    setJoinRequestsRows([]);
    setJoinRequestsError('');
    setSelectedEvent(null);
  };

  const handleQRScan = (ticketInfo) => {
    // Add the scanned ticket to the list
    const newScannedTicket = {
      ...ticketInfo,
      scannedAt: new Date().toISOString(),
      eventTitle: ticketInfo.eventName || 'Scanned Event'
    };
    
    setScannedTickets(prev => [...prev, newScannedTicket]);
    
    console.log('✅ Ticket scanned successfully! Showing result for 3 seconds...');
    
    // Close scanner after 3 seconds to allow user to see the success message
    setTimeout(() => {
      setShowQRScanner(false);
      console.log('🔒 Scanner closed after showing success');
    }, 3000);
  };

  // Chapter admin/scanner/dedicated org: show Event Check-In list (events by org + creator).
  // Same “past” rule as home feed: hidden only after start + grace (see eventSchoolTime).
  void schoolClockTick;
  const organizationEvents = canUseEventCheckIn
    ? hostedOrganizationEvents.filter(
        (e) => !isEventPastBySchoolClock(e, universityStringForSchoolClock(user, e))
      )
    : [];

  console.log('🔍 TicketsScreen Debug:', {
    canUseEventCheckIn,
    userId: user?.userId,
    supabaseEventsCount: supabaseEvents.length,
    organizationEventsCount: organizationEvents.length,
    organizationEvents,
  });

  // Prefer Supabase rows (real ticket_code). While fetching, show a skeleton — not joinedEvents + PENDING QR (slow UX).
  const studentSupabaseUid =
    isSupabaseUuid(user?.supabaseUserId) ? user.supabaseUserId : isSupabaseUuid(user?.userId) ? user.userId : null;
  const showTicketsLoading = Boolean(studentSupabaseUid) && loadingTickets && userRegistrations.length === 0;
  const ticketsRaw = studentSupabaseUid
    ? userRegistrations.length > 0
      ? convertRegistrationsToTickets(userRegistrations)
      : !loadingTickets
        ? []
        : []
    : !canUseEventCheckIn
      ? !loadingTickets
        ? convertToTickets(joinedEvents, user)
        : []
      : [];
  /** Hide from My Tickets once checked in at the event (QR no longer needed). */
  const tickets = ticketsRaw.filter((t) => !t.scanned);
  const allTicketsCheckedIn =
    userRegistrations.length > 0 &&
    tickets.length === 0 &&
    userRegistrations.every((r) => Boolean(r.scanned));
  const showPersonalTicketsSection =
    Boolean(studentSupabaseUid) &&
    (showTicketsLoading || tickets.length > 0 || allTicketsCheckedIn);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030712 0%, #581c87 50%, #1e3a8a 100%)',
      padding: '48px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: 'rgba(147, 51, 234, 0.1)',
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              boxShadow: "0 0 20px 4px rgba(168, 85, 247, 0.1)",
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
        </div>
        
      {/* Header */}
      <div style={{
        maxWidth: '1536px',
        margin: '0 auto 48px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Ticket style={{ width: '40px', height: '40px', color: '#a855f7' }} />
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, rgba(196, 181, 253, 1), rgba(147, 197, 253, 1), rgba(196, 181, 253, 1))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              margin: 0
            }}>
              {canUseEventCheckIn ? 'Event Check-In' : 'My Tickets'}
            </h1>
        </div>
        </motion.div>
      </div>

      {canUseEventCheckIn && loading && organizationEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            maxWidth: '1536px',
            margin: '0 auto 32px',
            position: 'relative',
            zIndex: 10,
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            style={{ display: 'flex' }}
          >
            <Loader2 style={{ width: 44, height: 44, color: '#a855f7' }} aria-hidden />
          </motion.div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
              fontWeight: 700,
              background:
                'linear-gradient(to right, rgba(196, 181, 253, 1), rgba(147, 197, 253, 1), rgba(196, 181, 253, 1))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Loading
          </h2>
          <p
            style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.9375rem',
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            Fetching your hosted events…
          </p>
        </motion.div>
      )}

      {/* Organization Events - Show hosted events with scan buttons */}
      {canUseEventCheckIn && organizationEvents.length > 0 && (
        <div style={{
          maxWidth: '1536px',
          margin: '0 auto',
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          position: 'relative',
          zIndex: 10,
          marginBottom: '32px'
        }}>
          {organizationEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0'
                }}>
                  {event.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar style={{ width: '18px', height: '18px', color: '#a855f7' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                      {formatDate(event.date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock style={{ width: '18px', height: '18px', color: '#a855f7' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                      {formatTime(event.time)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin style={{ width: '18px', height: '18px', color: '#a855f7' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
              
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleViewAttendees(event)}
                  style={{
                    flex: '1 1 140px',
                    minWidth: 0,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <Users size={18} />
                  View Attendees
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenQRScanner(event)}
                  style={{
                    flex: '1 1 140px',
                    minWidth: 0,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <QrCode size={18} />
                  Scan QR
                </motion.button>

                {event.requiresJoinRequest ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenJoinRequests(event)}
                    style={{
                      flex: '1 1 140px',
                      minWidth: 0,
                      background: 'linear-gradient(135deg, #db2777, #be185d)',
                      color: 'white',
                      border: 'none',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(219, 39, 119, 0.35)',
                    }}
                  >
                    <Inbox size={18} />
                    Requests
                  </motion.button>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(!canUseEventCheckIn || showPersonalTicketsSection) && (
      <>
      {canUseEventCheckIn && showPersonalTicketsSection ? (
        <div
          style={{
            maxWidth: '1536px',
            margin: '0 auto 20px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.15rem, 2.5vw, 1.35rem)',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.92)',
              letterSpacing: '0.02em',
            }}
          >
            My tickets
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.55)' }}>
            Events you registered or paid for
          </p>
        </div>
      ) : null}

      {/* Tickets Grid (personal RSVPs; scanners/admins see this below Event Check-In when they have tickets) */}
      <div
        style={{
          maxWidth: '1536px',
          margin: '0 auto',
          display: 'grid',
          gap: '32px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Only show "No tickets found" for attendees without check-in tools (not hosts/scanners with zero RSVPs). */}
        {showTicketsLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{ display: 'flex' }}
            >
              <Loader2 style={{ width: 44, height: 44, color: '#a855f7' }} aria-hidden />
            </motion.div>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '1.05rem', margin: 0 }}>
              Loading your tickets…
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.875rem', margin: 0, maxWidth: 320 }}>
              Pulling your registrations from the server.
            </p>
          </motion.div>
        ) : allTicketsCheckedIn ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '0.5rem',
              }}
            >
              You're checked in
            </h3>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.5rem',
                fontSize: '1rem',
                maxWidth: 420,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Your tickets for these events were scanned at the door, so they no longer appear here.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('home')}
              style={{
                background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              Browse events
            </motion.button>
          </motion.div>
        ) : !canUseEventCheckIn && tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              No tickets found
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '2rem',
              fontSize: '1rem'
            }}>
              You haven't RSVP'd to any events yet. Check out the events page to get started!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('home')}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Browse Events
              </motion.button>
            </div>
          </motion.div>
        ) : (
          tickets.map((ticket, index) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={index}
              onTicketClick={handleViewTicket}
              loadingTickets={loadingTickets}
            />
          ))
        )}
      </div>
      </>
      )}

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          maxWidth: '1536px',
          margin: '48px auto 0',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10
        }}
      >
      </motion.div>

      {/* QR Code Modal */}
      {showQRModal && selectedTicket && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={handleCloseQRModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseQRModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
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
                zIndex: 10,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              ×
              </button>

            {/* Modal Header */}
            <div style={{
              padding: '40px 40px 20px',
              textAlign: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                marginBottom: '20px'
              }}>
                <Ticket style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                  Event Ticket
                </span>
              </div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                margin: '0',
                lineHeight: '1.2'
              }}>
                {selectedTicket.eventName}
              </h2>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '40px 40px 48px' }}>
              {/* Event Details */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>Date</p>
                      <p style={{ color: 'white', fontSize: '16px', margin: 0, fontWeight: '500' }}>{formatDate(selectedTicket.eventDate)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>Time</p>
                      <p style={{ color: 'white', fontSize: '16px', margin: 0, fontWeight: '500' }}>{formatTime(selectedTicket.eventTime)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MapPin style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>Location</p>
                      <p style={{ color: 'white', fontSize: '16px', margin: 0, fontWeight: '500' }}>{selectedTicket.location}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Large QR Code */}
              <div style={{
                textAlign: 'center',
                background: 'white',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
              }}>
                  {selectedTicket.qrData === PENDING_TICKET_QR ? (
                    <p style={{ color: 'rgba(0, 0, 0, 0.75)', fontSize: '15px', margin: 0, padding: '24px', textAlign: 'center' }}>
                      Your ticket code is still loading. Close and reopen the Tickets tab, or wait a few seconds and try again.
                    </p>
                  ) : (
                  <QRCodeSVG 
                  value={selectedTicket.qrData}
                  size={280}
                    level="H"
                    includeMargin={true}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                  )}
                <p style={{
                  color: 'rgba(0, 0, 0, 0.7)',
                  fontSize: '16px',
                  margin: '20px 0 0',
                  fontWeight: '600'
                }}>
                  {selectedTicket.qrData === PENDING_TICKET_QR ? '' : 'Scan this QR code at the event entrance'}
                </p>
                </div>

              {/* Ticket ID */}
            </div>
            
          </motion.div>
        </motion.div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={handleCloseQRScanner}
        onScan={handleQRScan}
        eventTitle={selectedEvent ? selectedEvent.title : "Event Check-in"}
        eventId={selectedEvent ? selectedEvent.resolvedEventId || selectedEvent.supabaseId || selectedEvent.id : null}
        hostUserId={getSupabaseAuthCreatorUserId(user)}
      />

      {/* Attendees Modal */}
      {showAttendeesModal && selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseAttendeesModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
              borderRadius: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0 0 4px'
                }}>
                  Event Attendees
                </h2>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '14px',
                  margin: 0
                }}>
                  {selectedEvent.title}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCloseAttendeesModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </motion.button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              maxHeight: 'calc(80vh - 140px)',
              overflowY: 'auto'
            }}>
              {loadingAttendees ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Loading attendees...
                </div>
              ) : eventAttendees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  No attendees yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Summary Stats */}
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: '0 0 4px' }}>
                        Total Registered
                      </p>
                      <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        {eventAttendees.length}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: '0 0 4px' }}>
                        Checked In
                      </p>
                      <p style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        {eventAttendees.filter(a => a.scanned).length}
                      </p>
                    </div>
                    {selectedEvent?.maxAttendance != null && selectedEvent.maxAttendance !== '' ? (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', margin: '0 0 4px' }}>
                          Capacity (max)
                        </p>
                        <p style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                          {selectedEvent.maxAttendance}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Attendees List */}
                  {eventAttendees.map((attendee, index) => (
                    <motion.div
                      key={attendee.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <p style={{
                          color: 'white',
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 4px'
                        }}>
                          {attendee.users?.full_name || attendee.users?.username || 'Anonymous'}
                        </p>
                        <p style={{
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '12px',
                          margin: 0
                        }}>
                          Registered {new Date(attendee.registered_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {attendee.scanned ? (
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.5)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ✓ Checked In
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#a855f7'
                          }}>
                            Registered
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {showJoinRequestsModal && selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseJoinRequestsModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 100%)',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: 'min(80vh, 520px)',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px 22px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                >
                  Join requests
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontSize: '13px',
                  }}
                >
                  {selectedEvent.title}
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCloseJoinRequestsModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '20px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                ✕
              </motion.button>
            </div>
            <div
              style={{
                padding: '18px 22px 22px',
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {joinRequestsLoading ? (
                <p style={{ color: '#c4b5fd', fontSize: '14px', margin: 0 }}>Loading…</p>
              ) : joinRequestsError ? (
                <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                  {joinRequestsError}
                </p>
              ) : joinRequestsRows.length === 0 ? (
                <p style={{ color: '#c4b5fd', fontSize: '14px', margin: 0 }}>No pending requests.</p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {joinRequestsRows.map((row) => (
                    <li
                      key={String(row.request_id)}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: '1 1 140px' }}>
                        <p style={{ color: 'white', fontWeight: 600, margin: 0, fontSize: '14px' }}>
                          {row.full_name || 'Member'}
                        </p>
                        {row.username ? (
                          <p style={{ color: '#a78bfa', fontSize: '12px', margin: '4px 0 0' }}>
                            @{String(row.username).replace(/^@/, '')}
                          </p>
                        ) : null}
                        <p style={{ color: '#9ca3af', fontSize: '11px', margin: '6px 0 0' }}>
                          {String(row.status || '').toUpperCase()}
                        </p>
                      </div>
                      {row.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await respondEventJoinRequestRpc(row.request_id, true);
                              if (!r.ok) {
                                alert(r.error || 'Could not accept.');
                                return;
                              }
                              const evId = resolveCanonicalEventId(selectedEvent);
                              await fetchJoinRequestsIntoState(evId);
                            }}
                            style={{
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: 'linear-gradient(135deg, #059669, #10b981)',
                              color: 'white',
                              fontSize: '12px',
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await respondEventJoinRequestRpc(row.request_id, false);
                              if (!r.ok) {
                                alert(r.error || 'Could not decline.');
                                return;
                              }
                              const evId = resolveCanonicalEventId(selectedEvent);
                              await fetchJoinRequestsIntoState(evId);
                            }}
                            style={{
                              border: '1px solid rgba(248, 113, 113, 0.5)',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: 'rgba(248, 113, 113, 0.15)',
                              color: '#fecaca',
                              fontSize: '12px',
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TicketsScreen; 