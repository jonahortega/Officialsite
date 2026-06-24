import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Calendar,
  Users,
  MapPin,
  X,
  Clock,
  DollarSign,
  Share2,
  Filter,
} from 'lucide-react';
import './SearchScreen.css';
import { getGreekOrganizations } from '../data/greekLifeData';
import { remainingGreekLifeData } from '../data/remainingGreekLifeData';
import { supabase, tryParseUuidString } from '../utils/supabaseClient';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import { mapDbEventRowsToAppEventsWithLiveCounts } from '../utils/supabaseJoinedEventsHydration';
import { isEventAtCapacity } from '../utils/eventCapacity';
import { isEventAtCapacityFromServer, isRegistrationCapacityError } from '../utils/eventRegistrationCapacity';
import { isSupabaseUuid, coerceToUuidString } from '../utils/isSupabaseUuid';
import { openOrganizationProfileFromOrgEvent } from '../utils/openOrganizationProfileFromOrgEvent';
import { isEventPastBySchoolClock } from '../utils/eventSchoolTime';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';
import {
  alertIfProductionMissingApiBase,
  getApiUrl,
  checkoutFetchFailedMessage,
  responseLooksLikeHtml,
} from '../utils/apiUrl';
import { generateTicketCode } from '../utils/ticketCode';
import { reservePaidCheckoutRegistration } from '../utils/reservePaidCheckoutRegistration';
import {
  joinRequestStatusForSupabaseEvent,
  requestEventJoinRpc,
  performSupabaseFreeEventRegistration,
} from '../utils/eventJoinRequestSupabase';

/** Wildcards for PostgREST ilike — strip user `%` / `_` to avoid breaking patterns. */
function sanitizeIlikeTerm(raw) {
  return String(raw || '')
    .trim()
    .slice(0, 80)
    .replace(/%/g, '')
    .replace(/_/g, '');
}

/** Non-org accounts in public.users (RLS may still hide some rows). */
function isStudentLikeUserRow(r) {
  if (!r) return false;
  if (r.is_organization === true) return false;
  return r.is_organization === false || r.is_organization == null;
}

function mergeEventsById(lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const ev of list || []) {
      if (!ev) continue;
      const key = ev.id != null ? String(ev.id) : ev.supabaseId != null ? `supabase-${ev.supabaseId}` : null;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(ev);
    }
  }
  return out;
}

// Custom hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

function mapDirectoryOrgRowToSearchCard(row, avatarByUserId = {}) {
  const name = (row.name && String(row.name).trim()) || 'Organization';
  const handle = row.username ? String(row.username).replace(/^@/, '') : '';
  const uid =
    coerceToUuidString(row?.user_id) ||
    coerceToUuidString(row?.id) ||
    '';
  const seed = encodeURIComponent(name + (uid || ''));
  const fromDb =
    uid && avatarByUserId[uid] && String(avatarByUserId[uid]).trim()
      ? String(avatarByUserId[uid]).trim()
      : null;
  const orgTableId = coerceToUuidString(row?.id);
  return {
    id: uid ? `supabase-org-${uid}` : `supabase-org-row-${String(row?.id ?? 'unknown')}`,
    name,
    members: 0,
    image: fromDb || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
    description: handle
      ? `@${handle} · ${row.university || 'Campus organization'}`
      : `Registered organization at ${row.university || 'your university'}`,
    category: 'Organization',
    isSupabaseOrganization: true,
    supabaseUserId: uid || null,
    user_id: uid || null,
    organizationTableId: orgTableId,
    email: row.email,
    username: row.username,
    university: row.university,
    orgType: row.type,
  };
}

/** Regular accounts (non-org) for Search → OrganizationProfileScreen member view. */
function mapUserRowToSearchCard(row) {
  const handle = row.username ? String(row.username).replace(/^@/, '') : '';
  const fromName =
    (row.full_name && String(row.full_name).trim()) ||
    (row.display_name && String(row.display_name).trim()) ||
    '';
  const name = fromName || (handle ? `@${handle}` : 'Member');
  const seed = encodeURIComponent(String(row.id || '') + name);
  const avatar =
    row.avatar_url && String(row.avatar_url).trim() ? String(row.avatar_url).trim() : null;
  return {
    id: `supabase-user-${row.id}`,
    name,
    members: 0,
    image: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
    description: handle
      ? `@${handle} · ${row.university || 'Student'}`
      : `Student · ${row.university || 'Campus'}`,
    category: 'Organizations',
    isSupabaseStudentProfile: true,
    isSupabaseOrganization: false,
    supabaseUserId: coerceToUuidString(row.id) || row.id,
    username: row.username,
    university: row.university,
  };
}

const SearchScreen = ({ user, onNavigate, joinedEvents, setJoinedEvents, allEvents, setAllEvents, supabaseEvents, joinRequestStatusByEventId = {}, onJoinRequestMapRefresh = () => {} }) => {
  const schoolClockTick = useSchoolClockTick();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [directoryOrganizations, setDirectoryOrganizations] = useState([]);
  const [orgAvatarByUserId, setOrgAvatarByUserId] = useState({});
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showPaymentFromEvent, setShowPaymentFromEvent] = useState(false);
  const [fundraiserDonationDollars, setFundraiserDonationDollars] = useState('25');

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const inputRef = useRef(null);
  const [supabaseSearchOrgRows, setSupabaseSearchOrgRows] = useState([]);
  const [supabaseSearchEventRows, setSupabaseSearchEventRows] = useState([]);
  const [supabaseSearchUserRows, setSupabaseSearchUserRows] = useState([]);
  const [searchSupabaseEventAppsEnriched, setSearchSupabaseEventAppsEnriched] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = supabaseSearchEventRows || [];
      if (!rows.length) {
        if (!cancelled) setSearchSupabaseEventAppsEnriched([]);
        return;
      }
      try {
        const list = await mapDbEventRowsToAppEventsWithLiveCounts(supabase, rows);
        if (!cancelled) setSearchSupabaseEventAppsEnriched(list);
      } catch (_) {
        if (!cancelled) setSearchSupabaseEventAppsEnriched([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseSearchEventRows]);

  useEffect(() => {
    if (!showPaymentModal && !showPaymentFromEvent) setFundraiserDonationDollars('25');
  }, [showPaymentModal, showPaymentFromEvent]);

  const filters = ['All', 'Events', 'Organizations', 'Social', 'Service', 'Recruitment', 'Academic', 'Sports', 'Professional'];

  // Function to get university-specific Greek organizations
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

  // Filter functionality
  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  const handlePriceChange = (value) => {
    setPriceRange([value[0], value[1]]);
  };

  // Function to open Google Maps with directions
  const handleLocationClick = (locationAddress) => {
    if (locationAddress) {
      // Create Google Maps URL with directions
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationAddress)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const clearFilters = () => {
    setActiveFilter('All');
    setPriceRange([0, 100]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilter !== 'All') count += 1;
    if (priceRange[0] !== 0 || priceRange[1] !== 100) count += 1;
    return count;
  };

  // Close filter modal when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterModal && !event.target.closest('.filter-modal')) {
        setShowFilterModal(false);
      }
    };

    if (showFilterModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterModal]);

  // Function to generate university-specific events
  const generateUniversityEvents = (universityName) => {
    const greekOrgs = getUniversityGreekOrganizations(universityName);
    const events = [];
    
    // Take first 6 organizations for events
    const selectedOrgs = greekOrgs.slice(0, 6);
    
    // Event titles with corresponding images
    const eventData = [
      { title: 'Spring Formal 2025', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop' },
      { title: 'Community Service Day', image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop' },
      { title: 'Recruitment Week', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop' },
      { title: 'Sisterhood Mixer', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
      { title: 'Brotherhood Event', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop' },
      { title: 'Philanthropy Fundraiser', image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop' },
      { title: 'Social Gathering', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop' },
      { title: 'Study Night', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop' },
      { title: 'Game Night', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop' },
      { title: 'BBQ Cookout', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop' },
      { title: 'Dance Workshop', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop' },
      { title: 'Movie Night', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop' }
    ];

    // University-specific campus locations
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
        ],
        'University of Southern California': [
          { name: 'Greek Row - 28th Street', address: '28th St, Los Angeles, CA 90007' },
          { name: 'Student Activities Center', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'USC Student Center', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Greek Life Office', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Campus Recreation Center', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Doheny Memorial Library', address: '3550 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Athletic Complex', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Campus Theater', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Student Union', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Greek Village', address: '28th St, Los Angeles, CA 90007' },
          { name: 'Campus Garden', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' },
          { name: 'Outdoor Amphitheater', address: '3601 Trousdale Pkwy, Los Angeles, CA 90007' }
        ],
        'University of Florida': [
          { name: 'Greek Row - Fraternity Row', address: 'Fraternity Row, Gainesville, FL 32603' },
          { name: 'Student Activities Center', address: '655 Reitz Union Dr, Gainesville, FL 32603' },
          { name: 'UF Student Union', address: '655 Reitz Union Dr, Gainesville, FL 32603' },
          { name: 'Greek Life Office', address: '655 Reitz Union Dr, Gainesville, FL 32603' },
          { name: 'Campus Recreation Center', address: '1864 Stadium Rd, Gainesville, FL 32603' },
          { name: 'Library West', address: '1545 W University Ave, Gainesville, FL 32603' },
          { name: 'Athletic Complex', address: '157 Gale Lemerand Dr, Gainesville, FL 32603' },
          { name: 'Campus Theater', address: '655 Reitz Union Dr, Gainesville, FL 32603' },
          { name: 'Student Union', address: '655 Reitz Union Dr, Gainesville, FL 32603' },
          { name: 'Greek Village', address: 'Fraternity Row, Gainesville, FL 32603' },
          { name: 'Campus Garden', address: '1545 W University Ave, Gainesville, FL 32603' },
          { name: 'Outdoor Amphitheater', address: '655 Reitz Union Dr, Gainesville, FL 32603' }
        ],
        'University of Alabama': [
          { name: 'Greek Row - University Blvd', address: 'University Blvd, Tuscaloosa, AL 35401' },
          { name: 'Student Activities Center', address: '750 5th Ave E, Tuscaloosa, AL 35401' },
          { name: 'UA Student Center', address: '750 5th Ave E, Tuscaloosa, AL 35401' },
          { name: 'Greek Life Office', address: '750 5th Ave E, Tuscaloosa, AL 35401' },
          { name: 'Campus Recreation Center', address: '401 Peter Bryce Blvd, Tuscaloosa, AL 35401' },
          { name: 'Gorgas Library', address: '711 Capstone Dr, Tuscaloosa, AL 35401' },
          { name: 'Athletic Complex', address: '920 Paul W Bryant Dr, Tuscaloosa, AL 35401' },
          { name: 'Campus Theater', address: '750 5th Ave E, Tuscaloosa, AL 35401' },
          { name: 'Student Union', address: '750 5th Ave E, Tuscaloosa, AL 35401' },
          { name: 'Greek Village', address: 'University Blvd, Tuscaloosa, AL 35401' },
          { name: 'Campus Garden', address: '711 Capstone Dr, Tuscaloosa, AL 35401' },
          { name: 'Outdoor Amphitheater', address: '750 5th Ave E, Tuscaloosa, AL 35401' }
        ],
        'Syracuse University': [
          { name: 'Greek Row - Comstock Ave', address: 'Comstock Ave, Syracuse, NY 13210' },
          { name: 'Student Activities Center', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'SU Student Center', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Greek Life Office', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Campus Recreation Center', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Bird Library', address: '222 Waverly Ave, Syracuse, NY 13210' },
          { name: 'Athletic Complex', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Campus Theater', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Student Union', address: '900 S Crouse Ave, Syracuse, NY 13210' },
          { name: 'Greek Village', address: 'Comstock Ave, Syracuse, NY 13210' },
          { name: 'Campus Garden', address: '222 Waverly Ave, Syracuse, NY 13210' },
          { name: 'Outdoor Amphitheater', address: '900 S Crouse Ave, Syracuse, NY 13210' }
        ],
        'University of Miami (FL)': [
          { name: 'Greek Row - Stanford Dr', address: 'Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Student Activities Center', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'UM Student Center', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Greek Life Office', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Campus Recreation Center', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Otto G. Richter Library', address: '1300 Memorial Dr, Coral Gables, FL 33146' },
          { name: 'Athletic Complex', address: '5821 San Amaro Dr, Coral Gables, FL 33146' },
          { name: 'Campus Theater', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Student Union', address: '1306 Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Greek Village', address: 'Stanford Dr, Coral Gables, FL 33146' },
          { name: 'Campus Garden', address: '1300 Memorial Dr, Coral Gables, FL 33146' },
          { name: 'Outdoor Amphitheater', address: '1306 Stanford Dr, Coral Gables, FL 33146' }
        ],
        'University of Tampa': [
          { name: 'Greek Row - W Kennedy Blvd', address: 'W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Student Activities Center', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'UT Student Center', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Greek Life Office', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Campus Recreation Center', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Macdonald-Kelce Library', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Athletic Complex', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Campus Theater', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Student Union', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Greek Village', address: 'W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Campus Garden', address: '401 W Kennedy Blvd, Tampa, FL 33606' },
          { name: 'Outdoor Amphitheater', address: '401 W Kennedy Blvd, Tampa, FL 33606' }
        ],
        'University of Central Florida': [
          { name: 'Greek Row - Greek Park Dr', address: 'Greek Park Dr, Orlando, FL 32816' },
          { name: 'Student Activities Center', address: '12715 Pegasus Dr, Orlando, FL 32816' },
          { name: 'UCF Student Union', address: '12715 Pegasus Dr, Orlando, FL 32816' },
          { name: 'Greek Life Office', address: '12715 Pegasus Dr, Orlando, FL 32816' },
          { name: 'Campus Recreation Center', address: '4000 Central Florida Blvd, Orlando, FL 32816' },
          { name: 'John C. Hitt Library', address: '4000 Central Florida Blvd, Orlando, FL 32816' },
          { name: 'Athletic Complex', address: '4000 Central Florida Blvd, Orlando, FL 32816' },
          { name: 'Campus Theater', address: '12715 Pegasus Dr, Orlando, FL 32816' },
          { name: 'Student Union', address: '12715 Pegasus Dr, Orlando, FL 32816' },
          { name: 'Greek Village', address: 'Greek Park Dr, Orlando, FL 32816' },
          { name: 'Campus Garden', address: '4000 Central Florida Blvd, Orlando, FL 32816' },
          { name: 'Outdoor Amphitheater', address: '12715 Pegasus Dr, Orlando, FL 32816' }
        ],
        'University of Tennessee (Knoxville)': [
          { name: 'Greek Row - Fraternity Park', address: 'Fraternity Park, Knoxville, TN 37916' },
          { name: 'Student Activities Center', address: '1502 Cumberland Ave, Knoxville, TN 37916' },
          { name: 'UT Student Union', address: '1502 Cumberland Ave, Knoxville, TN 37916' },
          { name: 'Greek Life Office', address: '1502 Cumberland Ave, Knoxville, TN 37916' },
          { name: 'Campus Recreation Center', address: '2111 Andy Holt Ave, Knoxville, TN 37916' },
          { name: 'Hodges Library', address: '1015 Volunteer Blvd, Knoxville, TN 37916' },
          { name: 'Athletic Complex', address: '1600 Phillip Fulmer Way, Knoxville, TN 37916' },
          { name: 'Campus Theater', address: '1502 Cumberland Ave, Knoxville, TN 37916' },
          { name: 'Student Union', address: '1502 Cumberland Ave, Knoxville, TN 37916' },
          { name: 'Greek Village', address: 'Fraternity Park, Knoxville, TN 37916' },
          { name: 'Campus Garden', address: '1015 Volunteer Blvd, Knoxville, TN 37916' },
          { name: 'Outdoor Amphitheater', address: '1502 Cumberland Ave, Knoxville, TN 37916' }
        ],
        'The College of New Jersey': [
          { name: 'Greek Row - Campus Town', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Student Activities Center', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'TCNJ Student Center', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Greek Life Office', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Campus Recreation Center', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Roscoe West Library', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Athletic Complex', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Campus Theater', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Student Union', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Greek Village', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Campus Garden', address: '2000 Pennington Rd, Ewing, NJ 08628' },
          { name: 'Outdoor Amphitheater', address: '2000 Pennington Rd, Ewing, NJ 08628' }
        ]
      };
      
      return locationMaps[universityName] || locationMaps['Stockton University'];
    };
    
    const greekLocations = getUniversityLocations(universityName);
    
    selectedOrgs.forEach((org, index) => {
      const eventTypes = ['SOCIAL', 'PHILANTHROPY', 'MIXER', 'FORMAL', 'RECRUITMENT'];
      
      // Generate 2-3 events per organization
      const numEvents = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numEvents; i++) {
        const eventId = `${org.name}-${i + 1}`;
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const selectedEventData = eventData[Math.floor(Math.random() * eventData.length)];
        const locationObj = greekLocations[Math.floor(Math.random() * greekLocations.length)];
        
        events.push({
          id: eventId,
          title: selectedEventData.title,
          organization: org.name,
          date: `Dec ${15 + (index * 2) + i}`,
          time: `${7 + (i * 2)}:00 PM`,
          location: locationObj.name,
          locationAddress: locationObj.address,
          attendance: Math.floor(Math.random() * 30) + 20,
          maxAttendance: Math.floor(Math.random() * 20) + 50,
          price: Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 20) + 10,
          image: selectedEventData.image,
          category: eventType === 'PHILANTHROPY' ? 'Service' : eventType === 'RECRUITMENT' ? 'Recruitment' : 'Social',
          type: eventType,
        });
      }
    });
    
    return events;
  };

  // Memoize so Math.random() inside generateUniversityEvents does not reshuffle on every re-render (focus, filters, etc.).
  const mockEvents = useMemo(() => {
    if (user?.university) {
      return generateUniversityEvents(user.university);
    }
    return [
      {
        id: '1',
        title: 'Spring Formal 2025',
        organization: 'Alpha Beta Gamma Fraternity',
        date: 'Dec 15',
        time: '8:00 PM',
        location: 'Grand Ballroom',
        locationAddress: '101 Vera King Farris Dr, Galloway, NJ 08205',
        attendance: 150,
        maxAttendance: 200,
        price: 25,
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop',
        category: 'Social',
        type: 'FORMAL',
      },
    ];
  }, [user?.university]);

  // Generate university-specific Greek organizations
  const generateOrganizationsFromGreekLife = (universityName) => {
    const greekOrgs = getUniversityGreekOrganizations(universityName);
    return greekOrgs.map((org, index) => ({
      id: `${org.name}-${index}`,
      name: org.name,
      members: Math.floor(Math.random() * 50) + 60, // Random between 60-110
      image: org.type === 'fraternity' 
        ? 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop'
        : 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      description: `${org.letters} - ${org.type === 'fraternity' ? 'Fraternity' : 'Sorority'} at ${universityName}`,
      category: org.type === 'fraternity' ? 'Fraternity' : 'Sorority',
    }));
  };

  // Get university-specific clubs
  const getUniversityClubs = (universityName) => {
    if (universityName === 'Rutgers University') {
      return [
        { id: 'rutgers-actuarial', name: 'Actuarial Club', members: 45, image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop', description: 'Actuarial career training and exam support', category: 'Professional' },
        { id: 'rutgers-accounting', name: 'Accounting Association', members: 85, image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=400&fit=crop', description: 'Academic and professional success for accountants', category: 'Professional' },
        { id: 'rutgers-acf', name: 'Adventist Christian Fellowship', members: 30, image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=400&fit=crop', description: 'Christian fellowship and faith exploration', category: 'Religious' },
        { id: 'rutgers-asce', name: 'American Society of Civil Engineers', members: 60, image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=400&fit=crop', description: 'Professional development for civil engineers', category: 'Professional' },
        { id: 'rutgers-soccer', name: "Soccer Men's Sport Club", members: 35, image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop', description: 'Competitive soccer in NIRSA Region 1', category: 'Sports' },
        { id: 'rutgers-finance', name: 'Personal Finance Club', members: 70, image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=400&fit=crop', description: 'Financial literacy and investment management', category: 'Professional' },
        { id: 'rutgers-econ', name: 'Economics Society', members: 95, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop', description: 'Economics workshops and career panels', category: 'Academic' },
        { id: 'rutgers-bioe', name: 'Bioengineering Society', members: 55, image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=400&fit=crop', description: 'Bioengineering research and faculty talks', category: 'Academic' },
        { id: 'rutgers-datascience', name: 'Data Science Club', members: 110, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop', description: 'Data science panels and collaborative projects', category: 'Academic' },
        { id: 'rutgers-animal', name: 'Society of Animal Science', members: 40, image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=400&fit=crop', description: 'Livestock sciences and competitions', category: 'Academic' },
        { id: 'rutgers-honors', name: 'Honors College', members: 250, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=400&fit=crop', description: 'Academic and social events for honors students', category: 'Academic' },
        { id: 'rutgers-unfpa', name: 'Douglass Friends of UNFPA', members: 35, image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&h=400&fit=crop', description: 'Maternal and reproductive health advocacy', category: 'Service' }
      ];
    }
    
    if (universityName === 'Northeastern University') {
      return [
        { id: 'neu-aiche', name: 'American Institute of Chemical Engineers (AIChE)', members: 50, image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=400&fit=crop', description: 'Helping chemical engineering majors connect with professionals and explore research opportunities', category: 'Professional' },
        { id: 'neu-ai', name: 'Artificial Intelligence Club', members: 140, image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=400&fit=crop', description: 'Learning and developing AI and machine learning projects with workshops and collaboration', category: 'Academic' },
        { id: 'neu-auto', name: 'Automotive Club', members: 55, image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop', description: 'For students passionate about cars, engineering, and motorsports', category: 'Interest' },
        { id: 'neu-biochem', name: 'Biochemistry Club', members: 40, image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=400&fit=crop', description: 'Community for students interested in biochemistry and molecular biology', category: 'Academic' },
        { id: 'neu-ccf', name: 'Chinese Christian Fellowship', members: 35, image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=400&fit=crop', description: 'Welcoming group to explore faith, worship, and community with Bible studies', category: 'Religious' },
        { id: 'neu-cooking', name: 'Cooking Club', members: 30, image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop', description: 'Learn new recipes, cooking techniques, and enjoy themed dinners together', category: 'Social' },
        { id: 'neu-irc', name: 'International Relations Council', members: 70, image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=400&fit=crop', description: 'For those passionate about global politics, diplomacy, and Model UN conferences', category: 'Academic' },
        { id: 'neu-isb', name: 'International Students in Business', members: 85, image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&h=400&fit=crop', description: 'Connecting international students interested in business and entrepreneurship', category: 'Professional' },
        { id: 'neu-intervarsity', name: 'Intervarsity Multiethnic Christian Fellowship', members: 45, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', description: 'Christian fellowship focused on faith, community, and cultural inclusivity', category: 'Religious' },
        { id: 'neu-irish', name: 'Irish Dance Club of Northeastern University', members: 25, image: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&h=400&fit=crop', description: 'Learning and performing traditional and modern Irish dance styles', category: 'Cultural' },
        { id: 'neu-islamic', name: 'Islamic Society of Northeastern University', members: 95, image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&h=400&fit=crop', description: 'Faith-based community providing spiritual and cultural programming for Muslim students', category: 'Religious' },
        { id: 'neu-italian', name: 'Italian Club', members: 40, image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=400&fit=crop', description: 'Celebrating Italian language, culture, and traditions through social events', category: 'Cultural' },
        { id: 'neu-jcc', name: 'Japanese Culture Club', members: 60, image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=400&fit=crop', description: 'Promoting Japanese culture through movie nights, calligraphy, and food experiences', category: 'Cultural' },
        { id: 'neu-jnhs', name: 'Japanese National Honor Society', members: 28, image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=400&fit=crop', description: 'Recognizing students who excel in Japanese language and culture studies', category: 'Academic' },
        { id: 'neu-jsa', name: 'Japanese Student Association', members: 50, image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop', description: 'Connecting Japanese and non-Japanese students interested in Japan', category: 'Cultural' },
        { id: 'neu-jewish', name: 'Jewish Student Union', members: 65, image: 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=400&h=400&fit=crop', description: 'Community for Jewish students to connect and celebrate holidays', category: 'Religious' },
        { id: 'neu-kada', name: 'KADA K-Pop Dance Team', members: 35, image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=400&fit=crop', description: 'Student-run dance team performing and teaching K-pop choreography', category: 'Performance' },
        { id: 'neu-kaliente', name: 'Kaliente Dance Group', members: 30, image: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400&h=400&fit=crop', description: "Northeastern's Latin dance team specializing in salsa and bachata", category: 'Performance' }
      ];
    }
    
    if (universityName === 'University of Southern California') {
      return [
        { id: 'usc-aerospace', name: 'Aerospace Medicine Interest Group', members: 45, image: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8e0?w=400&h=400&fit=crop', description: 'Pre-professional group exploring careers in aerospace medicine and aviation health', category: 'Professional' },
        { id: 'usc-buslaw', name: 'Business Law Society', members: 80, image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=400&fit=crop', description: 'Connecting students interested in business law, corporate governance, and legal careers', category: 'Professional' },
        { id: 'usc-entertainment', name: 'Business of Entertainment Association', members: 120, image: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=400&fit=crop', description: 'Exploring the business side of entertainment, film, music, and media industries', category: 'Professional' },
        { id: 'usc-medstudents', name: 'Associated Students of the School of Medicine', members: 95, image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop', description: 'Academic and career support for medical students with networking and professional development', category: 'Academic' },
        { id: 'usc-track', name: 'Club Track', members: 60, image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=400&fit=crop', description: 'Competitive track and field club for runners and athletes of all levels', category: 'Sports' },
        { id: 'usc-softball', name: 'Club Softball', members: 35, image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop', description: 'Recreational and competitive softball team building skills and team spirit', category: 'Sports' },
        { id: 'usc-bustech', name: 'Business Tech Group', members: 110, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop', description: 'Bridging business and technology through workshops, hackathons, and industry connections', category: 'Professional' },
        { id: 'usc-investment', name: 'Global Investment Society', members: 90, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=400&fit=crop', description: 'Learning investment strategies, portfolio management, and global financial markets', category: 'Professional' },
        { id: 'usc-gymnastics', name: 'Gymnastics at USC', members: 40, image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=400&fit=crop', description: 'Club gymnastics team for athletes passionate about tumbling, bars, and floor routines', category: 'Sports' },
        { id: 'usc-design', name: 'Innovative Design at USC', members: 75, image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop', description: 'Student design team creating innovative solutions through UX/UI, product design, and service projects', category: 'Design' },
        { id: 'usc-literary', name: 'Literary Society', members: 50, image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop', description: 'Celebrating literature, creative writing, and publishing through workshops and readings', category: 'Academic' }
      ];
    }
    
    // Default clubs for other universities
    return [
      { id: '5', name: 'Computer Science Club', members: 120, image: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=400&fit=crop', description: 'Building the future through code and innovation', category: 'Academic' },
      { id: '6', name: 'Soccer Club', members: 65, image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop', description: 'Passion, teamwork, and the beautiful game', category: 'Sports' },
      { id: '7', name: 'Breast Cancer Awareness Club', members: 45, image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop', description: 'Supporting survivors and spreading hope', category: 'Service' }
    ];
  };

  const mockOrganizations = [
    ...(user?.university ? generateOrganizationsFromGreekLife(user.university) : []),
    ...getUniversityClubs(user?.university)
  ];

  useEffect(() => {
    const uni = typeof user?.university === 'string' ? user.university.trim() : '';
    if (!uni) {
      setDirectoryOrganizations([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const term = sanitizeIlikeTerm(uni);
      if (!term) {
        if (!cancelled) setDirectoryOrganizations([]);
        return;
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('id, user_id, name, username, email, university, type')
        .ilike('university', `%${term}%`)
        .order('name', { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('SearchScreen directory organizations:', error.message);
        }
        setDirectoryOrganizations([]);
        return;
      }
      setDirectoryOrganizations(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.university]);

  // Debounced Supabase search: orgs + events + people (users + optional profiles).
  // Uses auth.getSession() so search runs whenever a Supabase session exists (not only when `user` has UUID fields).
  useEffect(() => {
    const q = sanitizeIlikeTerm(searchQuery);
    if (q.length < 2) {
      setSupabaseSearchOrgRows([]);
      setSupabaseSearchEventRows([]);
      setSupabaseSearchUserRows([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.user?.id) {
          if (!cancelled) {
            setSupabaseSearchOrgRows([]);
            setSupabaseSearchEventRows([]);
            setSupabaseSearchUserRows([]);
          }
          return;
        }
        const myUidRaw = String(session.user.id).trim();
        const myUid = isSupabaseUuid(myUidRaw) ? myUidRaw : '';

        const pat = `%${q}%`;
        const userCols = 'id, username, full_name, avatar_url, university, is_organization';
        const [
          nameRes,
          userRes,
          emailRes,
          titleRes,
          orgNameRes,
          descRes,
          memberUserRes,
          memberFullRes,
          profUserRes,
          profFullRes,
        ] = await Promise.all([
          supabase
            .from('organizations')
            .select('id, user_id, name, username, email, university, type')
            .ilike('name', pat)
            .order('name', { ascending: true })
            .limit(40),
          supabase
            .from('organizations')
            .select('id, user_id, name, username, email, university, type')
            .ilike('username', pat)
            .order('name', { ascending: true })
            .limit(40),
          supabase
            .from('organizations')
            .select('id, user_id, name, username, email, university, type')
            .ilike('email', pat)
            .order('name', { ascending: true })
            .limit(40),
          supabase
            .from('events')
            .select('*')
            .ilike('title', pat)
            .order('created_at', { ascending: false })
            .limit(40),
          supabase
            .from('events')
            .select('*')
            .ilike('organization_name', pat)
            .order('created_at', { ascending: false })
            .limit(40),
          supabase
            .from('events')
            .select('*')
            .ilike('description', pat)
            .order('created_at', { ascending: false })
            .limit(40),
          supabase
            .from('users')
            .select(userCols)
            .ilike('username', pat)
            .order('username', { ascending: true })
            .limit(40),
          supabase
            .from('users')
            .select(userCols)
            .ilike('full_name', pat)
            .order('full_name', { ascending: true })
            .limit(40),
          supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .ilike('username', pat)
            .limit(40),
          supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .ilike('full_name', pat)
            .limit(40),
        ]);
        if (cancelled) return;
        const orgErr =
          nameRes.error?.message || userRes.error?.message || emailRes.error?.message;
        if (orgErr && process.env.NODE_ENV === 'development') {
          console.warn('SearchScreen supabase org search:', orgErr);
        }
        const evErr =
          titleRes.error?.message || orgNameRes.error?.message || descRes.error?.message;
        if (evErr && process.env.NODE_ENV === 'development') {
          console.warn('SearchScreen supabase event search:', evErr);
        }
        const memberErr = memberUserRes.error?.message || memberFullRes.error?.message;
        if (memberErr && process.env.NODE_ENV === 'development') {
          console.warn('SearchScreen supabase users table search:', memberErr);
        }
        const orgByUser = new Map();
        for (const row of [...(nameRes.data || []), ...(userRes.data || []), ...(emailRes.data || [])]) {
          if (row?.user_id) orgByUser.set(String(row.user_id), row);
        }
        setSupabaseSearchOrgRows([...orgByUser.values()]);
        const evById = new Map();
        for (const row of [...(titleRes.data || []), ...(orgNameRes.data || []), ...(descRes.data || [])]) {
          if (row?.id != null) evById.set(String(row.id), row);
        }
        setSupabaseSearchEventRows([...evById.values()]);

        const userById = new Map();
        const addStudentRow = (row) => {
          if (!row?.id) return;
          if (myUid && String(row.id) === myUid) return;
          if (!isStudentLikeUserRow(row)) return;
          userById.set(String(row.id), row);
        };
        for (const row of [...(memberUserRes.data || []), ...(memberFullRes.data || [])]) {
          addStudentRow(row);
        }

        if (
          (profUserRes.error || profFullRes.error) &&
          process.env.NODE_ENV === 'development'
        ) {
          console.warn(
            'SearchScreen profiles search (ignored if table/columns differ):',
            profUserRes.error?.message || profFullRes.error?.message
          );
        }
        if (!profUserRes.error) {
          for (const row of profUserRes.data || []) {
            if (!row?.id || (myUid && String(row.id) === myUid)) continue;
            if (userById.has(String(row.id))) continue;
            userById.set(String(row.id), { ...row, is_organization: false });
          }
        }
        if (!profFullRes.error) {
          for (const row of profFullRes.data || []) {
            if (!row?.id || (myUid && String(row.id) === myUid)) continue;
            if (userById.has(String(row.id))) continue;
            userById.set(String(row.id), { ...row, is_organization: false });
          }
        }

        setSupabaseSearchUserRows([...userById.values()]);
      })();
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

  const orgRowsForAvatars = useMemo(() => {
    const byUid = new Map();
    for (const r of [...(directoryOrganizations || []), ...(supabaseSearchOrgRows || [])]) {
      if (r?.user_id) byUid.set(String(r.user_id), r);
    }
    return [...byUid.values()];
  }, [directoryOrganizations, supabaseSearchOrgRows]);

  useEffect(() => {
    const rows = orgRowsForAvatars;
    if (!rows?.length) {
      setOrgAvatarByUserId({});
      return undefined;
    }
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    if (!ids.length) {
      setOrgAvatarByUserId({});
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, avatar_url')
        .in('id', ids);
      if (cancelled) return;
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('SearchScreen org avatars:', error.message);
        }
        setOrgAvatarByUserId({});
        return;
      }
      const map = {};
      (data || []).forEach((u) => {
        if (u?.id && u?.avatar_url) map[u.id] = u.avatar_url;
      });
      setOrgAvatarByUserId(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgRowsForAvatars]);

  const fromDirectory = (directoryOrganizations || []).map((row) =>
    mapDirectoryOrgRowToSearchCard(row, orgAvatarByUserId)
  );
  const dirUserIds = new Set(fromDirectory.map((o) => o.supabaseUserId).filter(Boolean));
  const fromSearchOrgsOnly = (supabaseSearchOrgRows || [])
    .filter((row) => row?.user_id && !dirUserIds.has(String(row.user_id)))
    .map((row) => mapDirectoryOrgRowToSearchCard(row, orgAvatarByUserId));
  const directoryNames = new Set(fromDirectory.map((o) => (o.name || '').trim().toLowerCase()));
  const searchStudentCards = (supabaseSearchUserRows || []).map((row) => mapUserRowToSearchCard(row));
  const allOrganizations = [
    ...fromDirectory,
    ...fromSearchOrgsOnly,
    ...searchStudentCards,
    ...mockOrganizations.filter((o) => !directoryNames.has((o.name || '').trim().toLowerCase())),
  ];

  // Mock + app state + feed + debounced search hits; dedupe by event id.
  const allAvailableEvents = mergeEventsById([
    mockEvents,
    allEvents || [],
    supabaseEvents || [],
    searchSupabaseEventAppsEnriched,
  ]);

  const qLower = (searchQuery || '').trim().toLowerCase();

  const searchUserUni = (user?.university || '').trim().toLowerCase();

  const filteredEvents = allAvailableEvents.filter((event) => {
    void schoolClockTick;
    if (isEventPastBySchoolClock(event, user?.university)) return false;
    const eventUni = (event.university || '').trim().toLowerCase();
    if (eventUni && searchUserUni && eventUni !== searchUserUni) return false;
    const eventCategory = event.category || event.type;
    const normalizedCategory = eventCategory ? String(eventCategory).toLowerCase() : '';
    const normalizedFilter = activeFilter.toLowerCase();
    const titleMatch = (event.title || '').toLowerCase().includes(qLower);
    const orgMatch = (event.organization || '').toLowerCase().includes(qLower);
    const descMatch = (event.description || '').toLowerCase().includes(qLower);
    const textMatch = qLower.length === 0 || titleMatch || orgMatch || descMatch;

    return (
      (activeFilter === 'All' || activeFilter === 'Events' || normalizedCategory === normalizedFilter) &&
      textMatch
    );
  });

  const filteredOrganizations = allOrganizations.filter((org) => {
    const orgUni = (org.university || '').trim().toLowerCase();
    if (orgUni && searchUserUni && orgUni !== searchUserUni) return false;
    const name = (org.name || '').toLowerCase();
    const desc = (org.description || '').toLowerCase();
    const handle = (org.username || '').toLowerCase();
    const uni = (org.university || '').toLowerCase();
    const textMatch =
      qLower.length === 0 || name.includes(qLower) || desc.includes(qLower) || handle.includes(qLower) || uni.includes(qLower);
    const qLen = (searchQuery || '').trim().length;
    const filterOk =
      activeFilter === 'All' ||
      activeFilter === 'Organizations' ||
      ['Sorority', 'Fraternity'].includes(activeFilter) ||
      (Boolean(org.isSupabaseStudentProfile) && qLen >= 2);
    return filterOk && textMatch;
  });

  const handleRequestJoin = async (eventId) => {
    const event = allAvailableEvents.find((e) => e.id === eventId);
    if (!event?.supabaseId) {
      alert('This event is not available for requests yet.');
      return;
    }
    const res = await requestEventJoinRpc(String(event.supabaseId));
    if (!res.ok) {
      alert(res.error || 'Could not submit request.');
      return;
    }
    await onJoinRequestMapRefresh();
    if (res.status === 'accepted') {
      alert('You are already approved — you can join this event.');
    } else {
      alert('Request sent. The host will review it soon.');
    }
  };

  const handleJoin = async (eventId) => {
    const event = allAvailableEvents.find(e => e.id === eventId);
    if (!event) return;

    const isAlreadyJoined = joinedEvents && joinedEvents.some(e => e.id === eventId);
    const jrForGate = joinRequestStatusForSupabaseEvent(joinRequestStatusByEventId, event);
    if (
      !isAlreadyJoined &&
      event.requiresJoinRequest &&
      jrForGate !== 'accepted'
    ) {
      alert('This event requires host approval before you can join. Open the event and tap Request.');
      return;
    }
    if (!isAlreadyJoined) {
      const full = await isEventAtCapacityFromServer(supabase, event);
      if (full) {
        alert('This event is full — no more spots available.');
        return;
      }
    }

    if (isAlreadyJoined) {
      if (event.price && event.price > 0) return;
      // Decrement attendance when leaving
      const updatedEvent = { ...event, attendance: Math.max(0, event.attendance - 1) };
      
      // Update in allEvents
      setAllEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      
      // Remove from joined events
      setJoinedEvents(prev => prev.filter(e => e.id !== eventId));
      
      // Update selectedEventDetails if modal is open
      if (selectedEventDetails && selectedEventDetails.id === eventId) {
        setSelectedEventDetails(updatedEvent);
      }
      
      console.log("Left event:", event.title);
    } else {
      // Check if it's a paid event
      if (event.price && event.price > 0) {
        setSelectedEvent(event);
        setShowPaymentModal(true);
      } else if (event.isFundraiser) {
        setSelectedEvent(event);
        setShowPaymentModal(true);
      } else if (event.supabaseId) {
        const res = await performSupabaseFreeEventRegistration({
          event,
          eventId,
          setAllEvents,
          setGeneratedEvents: undefined,
          setJoinedEvents,
          setSelectedEventDetails,
          selectedEventDetails,
        });
        if (!res.ok) {
          if (res.error === 'not_signed_in') {
            alert('Please log in with a real account to join events.');
          } else if (res.error === 'full') {
            alert('This event is full — no more spots available.');
          } else if (res.error === 'missing_event_id') {
            alert('Could not save ticket: missing event id. Try refreshing.');
          } else {
            alert(`Could not save ticket: ${res.error}`);
          }
          return;
        }
        console.log('Joined event:', event.title);
      } else {
        // Increment attendance when joining
        const updatedEvent = { ...event, attendance: event.attendance + 1 };
        
        // Update in allEvents
        setAllEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
        
        // Add to joined events for free events
        setJoinedEvents(prev => [...prev, updatedEvent]);
        
        // Update selectedEventDetails if modal is open
        if (selectedEventDetails && selectedEventDetails.id === eventId) {
          setSelectedEventDetails(updatedEvent);
        }
        
        console.log("Joined event:", event.title);
      }
    }
  };

  const handleShare = (eventId) => {
    const event = allAvailableEvents.find(e => e.id === eventId);
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `Check out this event: ${event.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(err => {
        console.log('Error sharing:', err);
        navigator.clipboard.writeText(`${event.title} - ${window.location.href}`).then(() => {
          // Event link copied to clipboard - silent success
        });
      });
    } else {
      navigator.clipboard.writeText(`${event.title} - ${window.location.href}`).then(() => {
        // Event link copied to clipboard - silent success
      }).catch(() => {
        // Share functionality not available - silent failure
      });
    }
  };

  const handleEventClick = (eventId) => {
    const event = allAvailableEvents.find(e => e.id === eventId);
    if (event) {
      setSelectedEventDetails(event);
      setShowEventDetails(true);
    }
  };

  return (
    <div
      className="search-modern"
      style={{
        padding: isMobile ? '16px' : '24px',
      }}
    >
      <div
        className="search-modern__inner"
        style={{ gap: isMobile ? '20px' : '32px' }}
      >
        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto', width: '100%' }}
        >
          <div className="search-modern__search-row">
            <div className="search-modern__field">
              <div className="search-modern__field-inner">
                <Search
                  className="search-modern__field-icon"
                  style={{
                    width: isMobile ? 18 : 20,
                    height: isMobile ? 18 : 20,
                    marginLeft: isMobile ? 8 : 10,
                  }}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    isMobile
                      ? 'Search…'
                      : 'Search events, organizations, and people…'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: isMobile ? '10px 0' : '12px 0',
                    fontWeight: 400,
                  }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="search-modern__clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    style={{ marginRight: isMobile ? 6 : 8 }}
                  >
                    <X style={{ width: isMobile ? 14 : 16, height: isMobile ? 14 : 16 }} />
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ position: 'relative', alignSelf: 'stretch' }}>
              <button
                type="button"
                className="search-modern__filter-btn"
                onClick={() => setShowFilterModal(!showFilterModal)}
                style={{
                  height: '100%',
                  minHeight: isMobile ? 44 : 48,
                  padding: isMobile ? '10px 12px' : '12px 16px',
                }}
              >
                <Filter style={{ width: isMobile ? 18 : 20, height: isMobile ? 18 : 20 }} />
                {!isMobile && <span style={{ fontSize: '14px', fontWeight: 500 }}>Filters</span>}
                {getActiveFilterCount() > 0 && (
                  <span className="search-modern__filter-count">{getActiveFilterCount()}</span>
                )}
              </button>

              {/* Filter Modal */}
              {showFilterModal && (
                <div
                  className="filter-modal search-modern__filter-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '320px',
                    marginTop: '8px',
                    zIndex: 1000,
                  }}
                >
                  <div style={{ padding: '20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Filters</h3>
                      {getActiveFilterCount() > 0 && (
                        <button
                          onClick={clearFilters}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#7c3aed',
                            fontSize: '14px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(124, 58, 237, 0.1)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Categories */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '12px', display: 'block' }}>Categories</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {filters.map((filter) => {
                          const isActive = activeFilter === filter;
                          return (
                            <button
                              key={filter}
                              onClick={() => handleFilterSelect(filter)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                background: isActive ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#f3f4f6',
                                color: isActive ? 'white' : '#374151',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: isActive ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.target.style.background = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.target.style.background = '#f3f4f6';
                                }
                              }}
                            >
                              {filter}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>Price Range</label>
                        <div style={{
                          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                        }}>
                          ${priceRange[0]} - ${priceRange[1]}
                        </div>
                      </div>
                      
                      {/* Custom Slider Container */}
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        {/* Track Background */}
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          position: 'relative'
                        }}>
                          {/* Active Range Fill */}
                          <div style={{
                            position: 'absolute',
                            left: `${(priceRange[0] / 100) * 100}%`,
                            width: `${((priceRange[1] - priceRange[0]) / 100) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)'
                          }} />
                        </div>
                        
                        {/* Custom Thumbs */}
                        <div style={{
                          position: 'absolute',
                          left: `${(priceRange[0] / 100) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '20px',
                          height: '20px',
                          background: 'white',
                          border: '3px solid #7c3aed',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
                          transition: 'all 0.2s ease'
                        }} 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const slider = e.target.parentElement;
                          const rect = slider.getBoundingClientRect();
                          const handleMove = (moveEvent) => {
                            const x = moveEvent.clientX - rect.left;
                            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                            const newValue = Math.round(percentage / 5) * 5; // Snap to 5s
                            if (newValue < priceRange[1]) {
                              setPriceRange([newValue, priceRange[1]]);
                            }
                          };
                          const handleUp = () => {
                            document.removeEventListener('mousemove', handleMove);
                            document.removeEventListener('mouseup', handleUp);
                          };
                          document.addEventListener('mousemove', handleMove);
                          document.addEventListener('mouseup', handleUp);
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1.2)';
                          e.target.style.borderColor = '#a855f7';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                          e.target.style.borderColor = '#7c3aed';
                        }}
                        />
                        
                        <div style={{
                          position: 'absolute',
                          left: `${(priceRange[1] / 100) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '20px',
                          height: '20px',
                          background: 'white',
                          border: '3px solid #7c3aed',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const slider = e.target.parentElement;
                          const rect = slider.getBoundingClientRect();
                          const handleMove = (moveEvent) => {
                            const x = moveEvent.clientX - rect.left;
                            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                            const newValue = Math.round(percentage / 5) * 5; // Snap to 5s
                            if (newValue > priceRange[0]) {
                              setPriceRange([priceRange[0], newValue]);
                            }
                          };
                          const handleUp = () => {
                            document.removeEventListener('mousemove', handleMove);
                            document.removeEventListener('mouseup', handleUp);
                          };
                          document.addEventListener('mousemove', handleMove);
                          document.addEventListener('mouseup', handleUp);
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1.2)';
                          e.target.style.borderColor = '#a855f7';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                          e.target.style.borderColor = '#7c3aed';
                        }}
                        />
                      </div>
                      
                      {/* Price Labels */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '12px', 
                        color: '#6b7280',
                        marginTop: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: '#e5e7eb',
                            borderRadius: '50%'
                          }} />
                          <span>$0</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: '#7c3aed',
                            borderRadius: '50%',
                            boxShadow: '0 0 4px rgba(124, 58, 237, 0.5)'
                          }} />
                          <span style={{ color: '#7c3aed', fontWeight: '500' }}>Selected Range</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: '#e5e7eb',
                            borderRadius: '50%'
                          }} />
                          <span>$100</span>
                        </div>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => setShowFilterModal(false)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        border: 'none',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #6d28d9, #9333ea)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #7c3aed, #a855f7)';
                      }}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Events Section */}
        {(activeFilter === 'All' || activeFilter === 'Events' || ['Social', 'Service', 'Recruitment'].includes(activeFilter)) && filteredEvents.length > 0 && (
          <motion.div
            className="search-modern__section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ gap: '24px' }}
          >
            <h2 className="search-modern__section-title" style={{ fontSize: isMobile ? '22px' : undefined }}>
              <Calendar style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px' }} />
              Upcoming Events
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '16px' : '24px' }}>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={
                    event.id != null
                      ? String(event.id)
                      : event.supabaseId != null
                        ? `supabase-${event.supabaseId}`
                        : `ev-${index}`
                  }
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                >
                  <div
                    className="search-modern__event-surface"
                    onClick={() => handleEventClick(event.id)}
                    style={{
                      borderRadius: isMobile ? '14px' : '18px',
                      overflow: 'hidden',
                      height: '100%',
                    }}
                  >
                    <div style={{ position: 'relative', height: isMobile ? '160px' : '192px', overflow: 'hidden' }}>
                      <img
                        src={event.image}
                        alt={event.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: isMobile ? '10px' : '12px',
                        right: isMobile ? '10px' : '12px',
                        background: '#7c3aed',
                        color: 'white',
                        padding: isMobile ? '4px 8px' : '6px 10px',
                        borderRadius: isMobile ? '6px' : '8px',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: '600'
                      }}>
                        {(event.category || event.type || '').charAt(0).toUpperCase() + (event.category || event.type || '').slice(1).toLowerCase()}
                      </div>
                    </div>
                    <div style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                      <h3 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', color: 'white', margin: 0, lineHeight: '1.3' }}>{event.title}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px', color: '#e0e7ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
                          <Calendar style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
                          <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            {(() => {
                              let displayDate = event.date;
                              if (typeof displayDate === 'string' && displayDate.includes('T')) {
                                const dateObj = new Date(displayDate);
                                displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              }
                              return displayDate;
                            })()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
                          <MapPin style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
                          <span 
                            style={{ 
                              fontSize: isMobile ? '12px' : '14px', 
                              cursor: 'pointer',
                              textDecoration: 'none',
                              transition: 'color 0.2s ease',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: isMobile ? 'nowrap' : 'normal',
                              maxWidth: '100%'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocationClick(event.locationAddress);
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#60a5fa'}
                            onMouseLeave={(e) => e.target.style.color = '#e0e7ff'}
                            title="Click for directions"
                          >
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Organizations Section (also shows people hits while searching, even on Events/Social filters) */}
        {(activeFilter === 'All' ||
          activeFilter === 'Organizations' ||
          ['Sorority', 'Fraternity'].includes(activeFilter) ||
          ((searchQuery || '').trim().length >= 2 && (supabaseSearchUserRows || []).length > 0)) &&
          filteredOrganizations.length > 0 && (
          <motion.div
            className="search-modern__section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ gap: '24px' }}
          >
            <h2 className="search-modern__section-title" style={{ fontSize: isMobile ? '22px' : undefined }}>
              <Users style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px' }} />
              {filteredOrganizations.some((o) => o.isSupabaseStudentProfile)
                ? 'Organizations & people'
                : 'Organizations'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '12px' : '24px' }}>
              {filteredOrganizations.map((org, index) => (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <div 
                    onClick={() => {
                      // Create detailed organization profile based on which organization is clicked
                      let organizationProfile;

                      const ORG_CARD_PREFIX = 'supabase-org-';
                      const USER_CARD_PREFIX = 'supabase-user-';
                      const idStr = typeof org.id === 'string' ? org.id : '';
                      const uidFromCardId = idStr.startsWith(ORG_CARD_PREFIX)
                        ? coerceToUuidString(idStr.slice(ORG_CARD_PREFIX.length))
                        : idStr.startsWith(USER_CARD_PREFIX)
                          ? coerceToUuidString(idStr.slice(USER_CARD_PREFIX.length))
                          : null;
                      const effectiveProfileUid = [
                        org.supabaseUserId,
                        org.user_id,
                        uidFromCardId,
                      ]
                        .map((x) => coerceToUuidString(x))
                        .find(Boolean) || null;

                      if (org.isSupabaseOrganization) {
                        const handle = org.username ? String(org.username).replace(/^@/, '') : '';
                        organizationProfile = {
                          id: org.id,
                          name: org.name,
                          type: org.orgType || 'Organization',
                          description: handle
                            ? `${org.name} (@${handle}) — registered group at ${org.university || user?.university || 'campus'}.`
                            : `${org.name} — registered group at ${org.university || user?.university || 'campus'}.`,
                          members: org.members ?? 0,
                          image: org.image,
                          email: org.email,
                          university: org.university || user?.university,
                          username: handle,
                          supabaseUserId: effectiveProfileUid || org.supabaseUserId,
                          organizationTableId: org.organizationTableId || null,
                          isSupabaseOrganization: true,
                        };
                        onNavigate('organization-profile', { organization: organizationProfile });
                        return;
                      }

                      if (org.isSupabaseStudentProfile) {
                        const handle = org.username ? String(org.username).replace(/^@/, '') : '';
                        onNavigate('organization-profile', {
                          organization: {
                            id: org.id,
                            name: org.name,
                            type: 'Member',
                            description:
                              org.description ||
                              (handle
                                ? `Student profile (@${handle}).`
                                : 'Student profile.'),
                            members: 0,
                            image: org.image,
                            university: org.university || user?.university,
                            username: handle,
                            supabaseUserId: effectiveProfileUid || org.supabaseUserId,
                            isSupabaseOrganization: false,
                          },
                        });
                        return;
                      }

                      // Directory-style card: prefixed id carries auth uid even if flags were lost in merge.
                      if (
                        !org.isSupabaseStudentProfile &&
                        effectiveProfileUid &&
                        idStr.startsWith(ORG_CARD_PREFIX)
                      ) {
                        const handle = org.username ? String(org.username).replace(/^@/, '') : '';
                        organizationProfile = {
                          id: org.id,
                          name: org.name,
                          type: org.orgType || 'Organization',
                          description: handle
                            ? `${org.name} (@${handle}) — registered group at ${org.university || user?.university || 'campus'}.`
                            : `${org.name} — registered group at ${org.university || user?.university || 'campus'}.`,
                          members: org.members ?? 0,
                          image: org.image,
                          email: org.email,
                          university: org.university || user?.university,
                          username: handle,
                          supabaseUserId: effectiveProfileUid,
                          organizationTableId: org.organizationTableId || null,
                          isSupabaseOrganization: true,
                        };
                        onNavigate('organization-profile', { organization: organizationProfile });
                        return;
                      }
                      
                      // Check if it's a Greek organization (Fraternity or Sorority)
                      if (org.category === 'Fraternity' || org.category === 'Sorority') {
                        // Find the organization in the Greek life data
                        const greekOrgs = user?.university ? getUniversityGreekOrganizations(user.university) : [];
                        const foundOrg = greekOrgs.find(gOrg => gOrg.name === org.name);
                        
                        if (foundOrg) {
                        organizationProfile = {
                            name: foundOrg.name,
                            type: foundOrg.type === 'fraternity' ? 'Fraternity' : 'Sorority',
                            description: foundOrg.type === 'fraternity' 
                              ? `${foundOrg.name} (${foundOrg.letters}) - Building better men through brotherhood, scholarship, and service at ${user?.university || 'this university'}.`
                              : `${foundOrg.name} (${foundOrg.letters}) - Empowering women through sisterhood, scholarship, and service at ${user?.university || 'this university'}.`,
                            members: org.members,
                            image: org.image
                          };
                        }
                      } 
                      // Rutgers-specific clubs
                      else if (org.name === 'Actuarial Club') {
                        organizationProfile = {
                          name: 'Actuarial Club',
                          type: 'Professional Club',
                          description: 'Guides students toward actuarial careers by offering technical and soft-skill training, networking, and exam support. Focuses on risk management, finance, and lifelong learning. Meetings: Thursdays, 8:00 PM – 9:00 PM at Livingston Student Center, Board Room 203.',
                          members: 45,
                          image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Accounting Association') {
                        organizationProfile = {
                          name: 'Accounting Association',
                          type: 'Professional Club',
                          description: 'Provides accounting students with resources for academic and professional success through meetings, panels, and networking. Open to all majors. Meetings: Tuesdays, 7:30 PM – 8:30 PM at Rutgers Business School.',
                          members: 85,
                          image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=400&fit=crop',
                          email: 'rutgersacct@gmail.com',
                          university: user?.university
                        };
                      } else if (org.name === 'Adventist Christian Fellowship') {
                        organizationProfile = {
                          name: 'Adventist Christian Fellowship',
                          type: 'Religious Club',
                          description: 'A Bible-based ministry fostering Christian fellowship, faith exploration, and service in the Rutgers community. Meetings: Tuesdays, 7:00 PM at Busch Student Center 115.',
                          members: 30,
                          image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=400&fit=crop',
                          email: 'acf.rutgers@gmail.com',
                          university: user?.university
                        };
                      } else if (org.name === 'American Society of Civil Engineers') {
                        organizationProfile = {
                          name: 'American Society of Civil Engineers',
                          type: 'Professional Club',
                          description: 'Supports civil engineering students through professional development, networking, and connections with industry leaders.',
                          members: 60,
                          image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=400&fit=crop',
                          email: 'rutgersasce@gmail.com',
                          university: user?.university
                        };
                      } else if (org.name === "Soccer Men's Sport Club") {
                        organizationProfile = {
                          name: "Soccer Men's Sport Club",
                          type: 'Sports Club',
                          description: 'Competitive men\'s soccer club competing in NIRSA Region 1. Offers two teams, regular practices, and travel competitions. Promotes teamwork and sportsmanship. Practices twice weekly at Rutgers Recreation fields.',
                          members: 35,
                          image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Personal Finance Club') {
                        organizationProfile = {
                          name: 'Personal Finance Club',
                          type: 'Professional Club',
                          description: 'Promotes financial literacy and career readiness in investment management and financial planning. Hosts workshops and professional events.',
                          members: 70,
                          image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=400&fit=crop',
                          email: 'pfcrutgers@gmail.com',
                          university: user?.university
                        };
                      } else if (org.name === 'Economics Society') {
                        organizationProfile = {
                          name: 'Economics Society',
                          type: 'Academic Club',
                          description: 'Empowers economics students with workshops, case competitions, firm visits, and career panels to explore professional opportunities. Open to all majors.',
                          members: 95,
                          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
                          email: 'economicsrutgers@gmail.com',
                          university: user?.university
                        };
                      } else if (org.name === 'Bioengineering Society') {
                        organizationProfile = {
                          name: 'Bioengineering Society',
                          type: 'Academic Club',
                          description: 'Encourages exploration across bioengineering disciplines through faculty talks, literature discussions, and research exposure.',
                          members: 55,
                          image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Data Science Club') {
                        organizationProfile = {
                          name: 'Data Science Club',
                          type: 'Academic Club',
                          description: 'Community for students passionate about data science. Hosts panels, collaborative AMAs, and course information sessions.',
                          members: 110,
                          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Society of Animal Science') {
                        organizationProfile = {
                          name: 'Society of Animal Science',
                          type: 'Academic Club',
                          description: 'Connects students interested in livestock and animal sciences. Prepares members for competitions like NESA and hosts farm trips and guest speakers.',
                          members: 40,
                          image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Honors College') {
                        organizationProfile = {
                          name: 'Honors College',
                          type: 'Academic Honor Society',
                          description: 'Hosts academic, social, wellness, DEI, and community service events for Honors College students at Rutgers.',
                          members: 250,
                          image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Douglass Friends of UNFPA') {
                        organizationProfile = {
                          name: 'Douglass Friends of UNFPA',
                          type: 'Service & Advocacy Club',
                          description: 'Advocates for maternal and reproductive health in marginalized communities through education, advocacy, and service projects. Meetings: Every other Wednesday, 7:30 PM – 8:30 PM at Kathleen Ludwig Global Village Living Learning Center.',
                          members: 35,
                          image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&h=400&fit=crop',
                          university: user?.university
                        };
                      } else if (org.name === 'Computer Science Club') {
                        organizationProfile = {
                          name: 'Computer Science Club',
                          type: 'Academic Club',
                          description: 'Fostering innovation and technical excellence through coding competitions, hackathons, and collaborative projects. We build the future through code, creativity, and community.',
                          members: 120,
                          image: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=400&fit=crop'
                        };
                      } else if (org.name === 'Soccer Club') {
                        organizationProfile = {
                          name: 'Soccer Club',
                          type: 'Sports Club',
                          description: 'Promoting fitness, teamwork, and the beautiful game through competitive play, training sessions, and community outreach. We believe in the power of sport to bring people together.',
                          members: 65,
                          image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop'
                        };
                      } else if (org.name === 'Breast Cancer Awareness Club') {
                        organizationProfile = {
                          name: 'Breast Cancer Awareness Club',
                          type: 'Service Club',
                          description: 'Supporting survivors, raising awareness, and funding research through educational events, fundraising campaigns, and community support. Together we fight for a cure.',
                          members: 45,
                          image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop'
                        };
                      } else if (org.name === 'Founders Club') {
                        organizationProfile = {
                          name: 'Founders Club',
                          type: 'Professional Club',
                          description: 'Connecting aspiring entrepreneurs with mentors, resources, and opportunities. We foster innovation, business development, and the entrepreneurial spirit on campus.',
                          members: 30,
                          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'
                        };
                      }
                      
                      onNavigate('organization-profile', { organization: organizationProfile });
                    }}
                    className="search-modern__org-surface"
                    style={{
                      borderRadius: isMobile ? '14px' : '18px',
                      padding: isMobile ? '16px' : '24px',
                      gap: isMobile ? '12px' : '16px',
                    }}
                  >
                    <motion.div
                      style={{ position: 'relative', margin: '0 auto' }}
                      whileHover={isMobile ? {} : { rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
                    >
                      <div style={{
                        width: isMobile ? '80px' : '128px',
                        height: isMobile ? '80px' : '128px',
                        margin: '0 auto',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: isMobile ? '3px solid rgba(255, 255, 255, 0.3)' : '4px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)'
                      }}>
                        <img
                          src={org.image}
                          alt={org.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease'
                          }}
                        />
                      </div>
                    </motion.div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px' }}>
                      <h3 style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 'bold', color: 'white', margin: 0, lineHeight: '1.3' }}>{org.name}</h3>
                      <p style={{ fontSize: isMobile ? '11px' : '14px', color: '#e0e7ff', margin: 0, lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: isMobile ? '2' : '3', WebkitBoxOrient: 'vertical' }}>{org.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {filteredEvents.length === 0 && filteredOrganizations.length === 0 && (
          <motion.div
            className="search-modern__empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="search-modern__empty-card">
              <Search style={{ width: '64px', height: '64px', color: '#c4b5fd', margin: '0 auto 16px' }} />
              <h3>No results found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          </motion.div>
        )}
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
        }} onClick={() => setShowEventDetails(false)}>
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
            }} onClick={() => setShowEventDetails(false)}>
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
                background: selectedEventDetails.type === 'SOCIAL' ? '#7c3aed' :
                          selectedEventDetails.type === 'PHILANTHROPY' ? '#10b981' :
                          selectedEventDetails.type === 'MIXER' ? '#ec4899' : '#f59e0b',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {selectedEventDetails.type}
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
                      onClick={async () => {
                        const handled = await openOrganizationProfileFromOrgEvent(selectedEventDetails, {
                          userUniversity: user?.university,
                          onNavigate,
                        });
                        if (handled) return;
                        const organizationProfile = {
                          name: selectedEventDetails.organization,
                          type: 'Organization',
                          description: `${selectedEventDetails.organization} - A Greek organization at ${user?.university || 'this university'}.`,
                          members: Math.floor(Math.random() * 50) + 60,
                          image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop',
                          ...(selectedEventDetails.createdByUserId
                            ? { supabaseUserId: selectedEventDetails.createdByUserId, isSupabaseOrganization: true }
                            : {}),
                          ...(selectedEventDetails.organizationId
                            ? { organizationTableId: selectedEventDetails.organizationId }
                            : {}),
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
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>
                      {(() => {
                        let displayDate = selectedEventDetails.date;
                        if (typeof displayDate === 'string' && displayDate.includes('T')) {
                          const dateObj = new Date(displayDate);
                          displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return displayDate;
                      })()}
                    </p>
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
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>
                      {(() => {
                        let displayTime = selectedEventDetails.time;
                        if (typeof displayTime === 'string' && displayTime.includes(':') && !displayTime.includes('M')) {
                          const [hours, minutes] = displayTime.split(':');
                          const hour = parseInt(hours);
                          const period = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                          displayTime = `${displayHour}:${minutes} ${period}`;
                        }
                        return displayTime;
                      })()}
                    </p>
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
                        cursor: selectedEventDetails.locationAddress ? 'pointer' : 'default',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease'
                      }}
                      onClick={() => {
                        if (selectedEventDetails.locationAddress) {
                          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEventDetails.locationAddress)}`;
                          window.open(mapsUrl, '_blank');
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (selectedEventDetails.locationAddress) {
                          e.target.style.color = '#60a5fa';
                        }
                      }}
                      onMouseLeave={(e) => e.target.style.color = 'white'}
                      title={selectedEventDetails.locationAddress ? "Click for directions" : ""}
                    >
                      {selectedEventDetails.location}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={async () => {
                    const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                    const mj = joinRequestStatusForSupabaseEvent(
                      joinRequestStatusByEventId,
                      selectedEventDetails
                    );
                    const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                    if (needReq && !inJ && mj !== 'accepted') {
                      await handleRequestJoin(selectedEventDetails.id);
                      setShowEventDetails(false);
                      return;
                    }
                    if (inJ) {
                      handleJoin(selectedEventDetails.id);
                      setShowEventDetails(false);
                      return;
                    }
                    const fullDetail = await isEventAtCapacityFromServer(supabase, selectedEventDetails);
                    if (fullDetail) {
                      alert('This event is full — no more spots available.');
                      return;
                    }
                    if (selectedEventDetails.price > 0 || selectedEventDetails.isFundraiser) {
                      setSelectedEvent(selectedEventDetails);
                      setShowEventDetails(false);
                      setShowPaymentFromEvent(true);
                    } else {
                      handleJoin(selectedEventDetails.id);
                      setShowEventDetails(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: (() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                      if (inJ) return 'linear-gradient(135deg, #059669, #10b981)';
                      if (!inJ && needReq && mj === 'pending') {
                        return 'linear-gradient(135deg, #d97706, #ea580c)';
                      }
                      if (isEventAtCapacity(selectedEventDetails)) {
                        return 'linear-gradient(135deg, #d97706, #ea580c)';
                      }
                      return 'linear-gradient(135deg, #7c3aed, #a855f7)';
                    })(),
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                      if (inJ && selectedEventDetails.price > 0) return 'default';
                      if (!inJ && needReq && mj === 'pending') return 'default';
                      if (!inJ && isEventAtCapacity(selectedEventDetails)) return 'default';
                      return 'pointer';
                    })(),
                    opacity: (() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                      if (inJ && selectedEventDetails.price > 0) return 0.95;
                      if (!inJ && needReq && mj === 'pending') return 0.95;
                      if (!inJ && isEventAtCapacity(selectedEventDetails)) return 0.95;
                      return 1;
                    })(),
                    transition: 'all 0.3s ease'
                  }}
                  title={
                    (() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                      if (!inJ && needReq && mj === 'pending') return 'Waiting for host approval.';
                      if (!inJ && isEventAtCapacity(selectedEventDetails)) {
                        return 'This event has reached its attendee limit.';
                      }
                      return undefined;
                    })()
                  }
                >
                  {(() => {
                    const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEventDetails.id);
                    const mj = joinRequestStatusForSupabaseEvent(
                      joinRequestStatusByEventId,
                      selectedEventDetails
                    );
                    const needReq = Boolean(selectedEventDetails.requiresJoinRequest);
                    if (inJ) return 'Joined';
                    if (!inJ && needReq && mj === 'pending') return 'Pending';
                    if (!inJ && needReq && mj !== 'accepted') return 'Request';
                    if (isEventAtCapacity(selectedEventDetails)) return 'Full';
                    if (selectedEventDetails.isFundraiser) return 'Donate';
                    if (selectedEventDetails.price > 0) return `Register ($${selectedEventDetails.price})`;
                    return 'Join Event';
                  })()}
                </button>
                
                <button 
                  onClick={() => handleShare(selectedEventDetails.id)}
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

      {/* Payment Modal — redirects to Stripe Checkout */}
      {(showPaymentModal || showPaymentFromEvent) && selectedEvent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: isMobile ? '10px' : '20px',
        }} onClick={() => { setShowPaymentModal(false); setShowPaymentFromEvent(false); }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: isMobile ? '16px' : '20px',
            maxWidth: isMobile ? '95%' : '500px', width: '100%',
            maxHeight: isMobile ? '85vh' : '90vh', overflow: 'auto',
            position: 'relative', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              position: 'absolute', top: '15px', right: '15px',
              background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white', fontSize: '20px', zIndex: 10,
            }} onClick={() => { setShowPaymentModal(false); setShowPaymentFromEvent(false); }}>
              ×
            </div>
            
            <div style={{ padding: isMobile ? '16px' : '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
                <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: 'white', margin: '0 0 8px' }}>
                  {selectedEvent.isFundraiser ? 'Donate' : 'Complete Payment'}
                </h2>
                <p style={{ color: '#c4b5fd', margin: 0, fontSize: isMobile ? '13px' : '14px' }}>
                  {selectedEvent.isFundraiser
                    ? 'Enter your donation (min. $0.50). No ticket — thank you for your support.'
                    : "You'll be redirected to our secure payment page"}
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px',
                padding: isMobile ? '12px' : '16px', marginBottom: isMobile ? '16px' : '24px',
                display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px',
              }}>
                <img src={selectedEvent.image} alt={selectedEvent.title}
                  style={{ width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: 'white', fontSize: isMobile ? '14px' : '16px', margin: '0 0 4px' }}>{selectedEvent.title}</h3>
                  <p style={{ color: '#c4b5fd', fontSize: isMobile ? '12px' : '14px', margin: 0 }}>{selectedEvent.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {selectedEvent.isFundraiser ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>USD</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.01}
                        value={fundraiserDonationDollars}
                        onChange={(e) => setFundraiserDonationDollars(e.target.value)}
                        style={{
                          width: 88,
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.25)',
                          background: 'rgba(0,0,0,0.35)',
                          color: 'white',
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'white', fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', margin: 0 }}>
                      ${Number(selectedEvent.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <button
                style={{
                  width: 'auto', minWidth: isMobile ? '140px' : '160px', display: 'block',
                  margin: `0 auto ${isMobile ? '12px' : '16px'}`,
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', border: 'none',
                  borderRadius: '10px', padding: isMobile ? '11px 28px' : '12px 32px',
                  fontSize: isMobile ? '14px' : '0.9rem', fontWeight: '600',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                }}
                onClick={async () => {
                  const payAuthUid = await getSupabaseAuthUid();
                  if (!payAuthUid) {
                    alert('Please log in to purchase tickets.');
                    return;
                  }
                  const fullPay = await isEventAtCapacityFromServer(supabase, selectedEvent);
                  if (fullPay) {
                    alert('This event is full — no more tickets available.');
                    return;
                  }
                  const checkoutEventUuid = tryParseUuidString(
                    selectedEvent.supabaseId ?? selectedEvent.id
                  );
                  if (!checkoutEventUuid) {
                    alert(
                      'This event does not have a valid ID for checkout. Refresh the page or open the event again.'
                    );
                    return;
                  }
                  const isFund = Boolean(selectedEvent.isFundraiser);
                  let priceInCents;
                  if (isFund) {
                    const dollars = parseFloat(String(fundraiserDonationDollars || '').replace(/,/g, ''));
                    if (!Number.isFinite(dollars) || dollars < 0.5) {
                      alert('Please enter a donation of at least $0.50.');
                      return;
                    }
                    priceInCents = Math.round(dollars * 100);
                  } else {
                    try {
                      const { error: payRegErr } = await reservePaidCheckoutRegistration(supabase, {
                        userId: payAuthUid,
                        eventId: checkoutEventUuid,
                        ticketCode: generateTicketCode(),
                      });
                      if (payRegErr) {
                        if (payRegErr.code === 'ALREADY_PAID') {
                          alert(payRegErr.message);
                          return;
                        }
                        if (isRegistrationCapacityError(payRegErr)) {
                          alert('This event is full — no more tickets available.');
                          return;
                        }
                        alert(`Could not reserve ticket: ${payRegErr.message}`);
                        return;
                      }
                    } catch (e) {
                      alert('Could not reserve ticket. Please try again.');
                      return;
                    }
                    priceInCents = Math.round((selectedEvent.price || 0) * 100);
                  }
                  try {
                    if (alertIfProductionMissingApiBase()) return;

                    const resp = await fetch(getApiUrl('/api/create-checkout-session'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        eventTitle: selectedEvent.title,
                        priceInCents,
                        supabaseEventId: checkoutEventUuid,
                        supabaseUserId: payAuthUid,
                        userEmail: user?.email || undefined,
                        checkoutKind: isFund ? 'fundraiser' : 'ticket',
                      }),
                    });
                    const raw = await resp.text();
                    if (responseLooksLikeHtml(raw)) {
                      alert(
                        'The payment server returned a web page instead of JSON. Usually:\n\n' +
                          '• Vercel is missing REACT_APP_API_URL (set it to your Render API URL, redeploy), or\n' +
                          '• The browser is blocked by CORS — on Render set CORS_ORIGIN to your Vercel URL (https://…), redeploy API.'
                      );
                      return;
                    }
                    let body = {};
                    try {
                      body = raw ? JSON.parse(raw) : {};
                    } catch (_) {}
                    if (!resp.ok) {
                      const msg =
                        [body.message, body.error, body.code].filter(Boolean).join(' — ') ||
                        (raw && raw.trim().slice(0, 240)) ||
                        `Payment failed (HTTP ${resp.status}).`;
                      alert(msg);
                      return;
                    }
                    const { url } = body;
                    if (url) window.location.href = url;
                    else alert('Could not start checkout. Please try again.');
                  } catch (err) {
                    console.error('Stripe checkout error:', err);
                    alert(checkoutFetchFailedMessage());
                  }
                }}
              >
                {selectedEvent.isFundraiser
                  ? `Donate $${Number.isFinite(parseFloat(String(fundraiserDonationDollars))) ? parseFloat(String(fundraiserDonationDollars)).toFixed(2) : '0.00'}`
                  : `Pay $${Number(selectedEvent.price).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchScreen;