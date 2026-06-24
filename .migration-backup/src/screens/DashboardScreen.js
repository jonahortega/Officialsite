import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import './DashboardScreen.css';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Share2,
  Clock,
  Settings,
  X,
} from 'lucide-react';
import { getGreekOrganizations } from '../data/greekLifeData';
import { remainingGreekLifeData } from '../data/remainingGreekLifeData';
import { supabase, tryParseUuidString, getSupabaseAuthCreatorUserId } from '../utils/supabaseClient';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';
import { mapSupabaseEventDbRowToAppEvent, registrationQualifiesForJoinedList } from '../utils/supabaseJoinedEventsHydration';
import { isSupabaseUuid } from '../utils/isSupabaseUuid';
import { openOrganizationProfileFromOrgEvent } from '../utils/openOrganizationProfileFromOrgEvent';
import { generateTicketCode } from '../utils/ticketCode';
import {
  getEventStartInstantMs,
  getSchoolTimeZoneForUniversity,
  isEventPastBySchoolClock,
} from '../utils/eventSchoolTime';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';
import {
  alertIfProductionMissingApiBase,
  getApiUrl,
  checkoutFetchFailedMessage,
  responseLooksLikeHtml,
} from '../utils/apiUrl';
import { isEventAtCapacity } from '../utils/eventCapacity';
import { isEventAtCapacityFromServer, isRegistrationCapacityError } from '../utils/eventRegistrationCapacity';
import { reservePaidCheckoutRegistration } from '../utils/reservePaidCheckoutRegistration';
import { fetchEventAttendeesPublic, getSupabaseEventUuidFromAppEvent } from '../utils/fetchEventAttendeesPublic';
import {
  joinRequestStatusForSupabaseEvent,
  requestEventJoinRpc,
  performSupabaseFreeEventRegistration,
} from '../utils/eventJoinRequestSupabase';

/** Stable merge key: one card per DB event even when `id` vs `supabaseId` or UUID casing differs. */
function canonicalHomeFeedEventKey(event) {
  if (!event || typeof event !== 'object') return '';
  const rawSid = event.supabaseId ?? event.supabase_id;
  if (rawSid != null && String(rawSid).trim()) {
    return `sb:${String(rawSid).trim().toLowerCase()}`;
  }
  const idStr = String(event.id || '').trim();
  const m = idStr.match(/^supabase-(.+)$/i);
  if (m?.[1] && String(m[1]).trim()) {
    return `sb:${String(m[1]).trim().toLowerCase()}`;
  }
  return `id:${idStr}`;
}

/** Org accounts: events you created should never show "Join" on your own home feed. */
function isOrgHostingOwnEvent(user, event) {
  if (!user || !event) return false;
  if (!(user.isOrganization || user.supabaseIsOrganization)) return false;
  const uid = String(getSupabaseAuthCreatorUserId(user) || user.supabaseUserId || user.userId || '')
    .trim()
    .toLowerCase();
  const creator = String(event.createdByUserId || '').trim().toLowerCase();
  return Boolean(uid && creator && uid === creator);
}

/** Feed card price label: no $ (Stripe shows currency). FREE for 0. */
function eventCardPriceText(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'FREE';
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
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

const DashboardScreen = ({
  user,
  onNavigate,
  joinedEvents,
  setJoinedEvents,
  allEvents,
  setAllEvents,
  supabaseEvents,
  joinRequestStatusByEventId = {},
  onJoinRequestMapRefresh = () => {},
  homeNavigationData = null,
  onConsumeHomeNavigation,
}) => {
  console.log('🔍 DashboardScreen - Received supabaseEvents:', supabaseEvents?.length || 0);
  const schoolClockTick = useSchoolClockTick();
  const isMobile = useIsMobile();
  const scrollRef = useRef(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

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

  // Simple seeded random number generator for consistent results
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Function to generate events for university-specific Greek organizations
  const generateUniversityEvents = (universityName) => {
    const greekOrgs = getUniversityGreekOrganizations(universityName);
    const events = [];
    
    // Generate events for the first few organizations (to keep it manageable)
    const selectedOrgs = greekOrgs.slice(0, 6); // Take first 6 organizations
    
    // Event titles with corresponding images (using reliable Unsplash URLs)
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

    // University-specific campus locations for Greek organizations
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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showPaymentFromEvent, setShowPaymentFromEvent] = useState(false);
  const [fundraiserDonationDollars, setFundraiserDonationDollars] = useState('25');
  const [showAttendeesPopup, setShowAttendeesPopup] = useState(false);

  useEffect(() => {
    if (!showPaymentModal && !showPaymentFromEvent) setFundraiserDonationDollars('25');
  }, [showPaymentModal, showPaymentFromEvent]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesRows, setAttendeesRows] = useState([]);
  const [attendeesFetchError, setAttendeesFetchError] = useState('');

  // Store generated events separately to track which are mock vs user-created
  const [generatedEvents, setGeneratedEvents] = useState([]);
  

  
  // Generate university-specific Greek events once when university changes
  useEffect(() => {
    if (user?.university) {
      const universityEvents = generateUniversityEvents(user.university);
      setGeneratedEvents(universityEvents);
    }
  }, [user?.university]);

  useEffect(() => {
    if (!showEventDetails || !selectedEventDetails) {
      setShowAttendeesPopup(false);
      setAttendeesRows([]);
      setAttendeesFetchError('');
      setAttendeesLoading(false);
      return;
    }
    setShowAttendeesPopup(false);
    setAttendeesRows([]);
    setAttendeesFetchError('');
    setAttendeesLoading(false);
  }, [showEventDetails, selectedEventDetails?.id, selectedEventDetails?.supabaseId]);

  useEffect(() => {
    if (!showAttendeesPopup) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowAttendeesPopup(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAttendeesPopup]);

  // Load user's registrations from Supabase on mount
  useEffect(() => {
    const loadUserRegistrations = async () => {
      const uid =
        (user?.supabaseUserId && String(user.supabaseUserId)) ||
        (user?.userId && String(user.userId)) ||
        (await getSupabaseAuthUid());
      if (!uid) return;

      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('event_id, scanned, payment_status')
          .eq('user_id', uid);

        if (error) {
          console.error('❌ Error loading user registrations:', error);
        } else if (data && data.length > 0) {
          console.log('✅ Loaded user registrations:', data.length);

          const scanByEventId = {};
          const regsByEventId = {};
          for (const reg of data) {
            if (reg?.event_id == null) continue;
            const key = String(reg.event_id);
            scanByEventId[key] = Boolean(reg.scanned);
            regsByEventId[key] = reg;
          }

          const registeredEventIds = data.map((reg) => reg.event_id).filter(Boolean);
          let registeredEvents = [];

          if (registeredEventIds.length > 0) {
            const { data: evRows, error: evErr } = await supabase
              .from('events')
              .select('*')
              .in('id', registeredEventIds);
            if (!evErr && evRows?.length) {
              registeredEvents = evRows
                .filter((row) =>
                  registrationQualifiesForJoinedList(regsByEventId[String(row.id)], row)
                )
                .map((row) => {
                  const app = mapSupabaseEventDbRowToAppEvent(row);
                  if (!app) return null;
                  return {
                    ...app,
                    ticketScanned: scanByEventId[String(row.id)] ?? false,
                  };
                })
                .filter(Boolean);
            }
          }

          setJoinedEvents((prev) => {
            const applyScan = (e) => {
              const sid = e.supabaseId ?? (String(e.id || '').match(/^supabase-(.+)$/i)?.[1]);
              if (sid != null && Object.prototype.hasOwnProperty.call(scanByEventId, String(sid))) {
                return { ...e, ticketScanned: scanByEventId[String(sid)] };
              }
              return e;
            };
            const updated = prev.map(applyScan);
            const existingIds = updated.map((e) => e.supabaseId).filter(Boolean);
            const newEvents = registeredEvents.filter((e) => !existingIds.includes(e.supabaseId));
            return [...updated, ...newEvents];
          });
        }
      } catch (error) {
        console.error('❌ Error fetching user registrations:', error);
      }
    };

    loadUserRegistrations();
  }, [user?.supabaseUserId, user?.userId, setJoinedEvents]);

  // Merge and maintain all events with updates (dedupe by canonical Supabase id when present)
  const events = useMemo(() => {
    const eventMap = new Map();

    const userUni = (user?.university || '').trim().toLowerCase();
    const matchesUserUni = (e) => {
      const eventUni = (e.university || '').trim().toLowerCase();
      return !eventUni || !userUni || eventUni === userUni;
    };

    const put = (event) => {
      const k = canonicalHomeFeedEventKey(event);
      if (!k) return;
      eventMap.set(k, event);
    };

    generatedEvents.forEach((event) => put(event));

    console.log('📊 DashboardScreen - Generated Greek events:', generatedEvents.length);

    (allEvents || []).forEach((event) => {
      if (matchesUserUni(event)) put(event);
    });

    console.log('📊 DashboardScreen - Club events from allEvents:', (allEvents || []).length);

    (supabaseEvents || []).forEach((event) => {
      if (matchesUserUni(event)) put(event);
    });

    console.log('📊 DashboardScreen - Supabase events:', (supabaseEvents || []).length);
    console.log('📊 DashboardScreen - Total merged events:', eventMap.size);

    return Array.from(eventMap.values());
  }, [generatedEvents, allEvents, supabaseEvents, user?.university]);

  const eventsForHome = useMemo(() => {
    void schoolClockTick;
    const tz = getSchoolTimeZoneForUniversity(user?.university);
    const upcoming = (events || []).filter((e) => !isEventPastBySchoolClock(e, user?.university));
    const keyed = upcoming.map((e) => {
      const ms = getEventStartInstantMs(e, tz);
      return { e, ms: ms != null ? ms : Number.POSITIVE_INFINITY };
    });
    keyed.sort((a, b) => {
      if (a.ms !== b.ms) return a.ms - b.ms;
      const t = String(a.e.title || '').localeCompare(String(b.e.title || ''));
      if (t !== 0) return t;
      return String(a.e.id || '').localeCompare(String(b.e.id || ''));
    });
    return keyed.map(({ e }) => e);
  }, [events, user?.university, schoolClockTick]);

  useEffect(() => {
    const fid = homeNavigationData?.focusEventId;
    if (!fid) return undefined;
    const idStr = String(fid);
    const t = requestAnimationFrame(() => {
      const el = [...document.querySelectorAll('[data-event-card-id]')].find(
        (node) => node.getAttribute('data-event-card-id') === idStr
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('dashboard-event-card-highlight');
        window.setTimeout(() => el.classList.remove('dashboard-event-card-highlight'), 2200);
      }
      if (typeof onConsumeHomeNavigation === 'function') onConsumeHomeNavigation();
    });
    return () => cancelAnimationFrame(t);
  }, [homeNavigationData, events, onConsumeHomeNavigation]);

  const handleRequestJoin = async (eventId) => {
    const event = events.find((e) => e.id === eventId);
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
    } else if (res.status === 'pending') {
      alert('Request sent. The host will review it soon.');
    } else {
      alert('Updated.');
    }
  };

  const handleJoin = async (eventId) => {
    console.log("🔍 handleJoin called with eventId:", eventId);
    
    const event = events.find(e => e.id === eventId);
    console.log("🔍 Found event:", event);
    if (!event) {
      console.log("❌ Event not found!");
      return;
    }

    if (isOrgHostingOwnEvent(user, event)) return;

    const isAlreadyJoined = joinedEvents && joinedEvents.some(e => e.id === eventId);
    const jrForGate = joinRequestStatusForSupabaseEvent(joinRequestStatusByEventId, event);
    if (
      !isAlreadyJoined &&
      event.requiresJoinRequest &&
      jrForGate !== 'accepted'
    ) {
      alert('This event requires host approval before you can join. Tap Request on the event card first.');
      return;
    }
    if (!isAlreadyJoined) {
      const full = await isEventAtCapacityFromServer(supabase, event);
      if (full) {
        alert('This event is full — no more spots available.');
        return;
      }
    }
    console.log("🔍 Is already joined:", isAlreadyJoined);
    
    if (isAlreadyJoined) {
      if (event.price && event.price > 0) return;
      // Decrement attendance when leaving
      const newAttendance = Math.max(0, event.attendance - 1);
      const updatedEvent = { ...event, attendance: newAttendance };
      
      // Update Supabase if this is a Supabase event
      if (event.supabaseId) {
        try {
          // Update event attendance
          const { error } = await supabase
            .from('events')
            .update({ attendance: newAttendance })
            .eq('id', event.supabaseId);
          
          if (error) {
            console.error('❌ Error updating attendance in Supabase:', error);
          } else {
            console.log('✅ Attendance decremented in Supabase:', newAttendance);
            
            // Supabase events are now managed by App.js
          }

          // Delete user's registration (must use JWT uid for RLS: auth.uid() = user_id)
          const leaveAuthUid = await getSupabaseAuthUid();
          if (leaveAuthUid) {
            const eventIdToDelete = event.supabaseId || eventId;
            console.log('🗑️ Deleting registration for event:', eventIdToDelete);
            console.log('🗑️ User ID:', leaveAuthUid);
            console.log('🗑️ Event ID to delete:', eventIdToDelete);
            
            // First, check what registrations exist for this user
            const { data: existingRegistrations, error: checkError } = await supabase
              .from('registrations')
              .select('*')
              .eq('user_id', leaveAuthUid);
            
            console.log('🔍 Existing registrations for user:', existingRegistrations);
            console.log('🔍 Check error:', checkError);
            
            const { data: deleteData, error: regError } = await supabase
              .from('registrations')
              .delete()
              .eq('user_id', leaveAuthUid)
              .eq('event_id', eventIdToDelete)
              .select();
            
            if (regError) {
              console.error('❌ Error deleting registration:', regError);
              console.error('❌ Full error details:', JSON.stringify(regError, null, 2));
            } else {
              console.log('✅ Registration deleted from Supabase:', deleteData);
            }
          }
        } catch (error) {
          console.error('❌ Error updating Supabase:', error);
        }
      }
      
      // Update in both allEvents and generatedEvents
      setAllEvents(prev => {
        const exists = prev.some(e => e.id === eventId);
        if (exists) {
          return prev.map(e => e.id === eventId ? updatedEvent : e);
        }
        return prev;
      });
      
      setGeneratedEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      
      // Remove from joined events
      setJoinedEvents(prev => {
        const filtered = prev.filter(e => e.id !== eventId);
        console.log('🗑️ Removed from joinedEvents:', eventId);
        console.log('🗑️ New joinedEvents count:', filtered.length);
        return filtered;
      });
      
      // Update selectedEventDetails if modal is open
      if (selectedEventDetails && selectedEventDetails.id === eventId) {
        setSelectedEventDetails(updatedEvent);
      }
      
      console.log("✅ Left event:", event.title);
    } else {
      // Check if it's a paid event or fundraiser (donation checkout)
      if (event.price && event.price > 0) {
        setSelectedEvent(event);
        setShowPaymentModal(true);
      } else if (event.isFundraiser) {
        setSelectedEvent(event);
        setShowPaymentModal(true);
      } else {
        const res = await performSupabaseFreeEventRegistration({
          event,
          eventId,
          setAllEvents,
          setGeneratedEvents,
          setJoinedEvents,
          setSelectedEventDetails,
          selectedEventDetails,
        });
        if (!res.ok) {
          if (res.error === 'not_signed_in') {
            alert('Please log in with a real account to join events. Demo logins cannot be tracked in attendee lists.');
          } else if (res.error === 'full') {
            alert('This event is full — no more spots available.');
          } else if (res.error === 'missing_event_id') {
            alert('Could not save ticket: missing event id. Try refreshing the feed.');
          } else {
            alert(`Could not save ticket: ${res.error}`);
          }
          return;
        }
        console.log('✅ Joined event:', event.title);
      }
    }
  };

  const handleShare = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (navigator.share) {
      // Use native share API if available
      navigator.share({
        title: event.title,
        text: `Check out this event: ${event.title} by ${event.organization}`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      const shareText = `Check out this event: ${event.title} by ${event.organization} on ${event.date} at ${event.location}`;
      navigator.clipboard.writeText(shareText).then(() => {
        // Event details copied to clipboard - silent success
      }).catch(err => {
        console.log('Error copying to clipboard:', err);
        // Share functionality not available - silent failure
      });
    }
  };

  const handleEventClick = (eventId) => {
    const event = [...events, ...allEvents].find(
      (e) => String(e.id) === String(eventId)
    );
    if (event) {
      setSelectedEventDetails(event);
      setShowEventDetails(true);
    }
  };

  const closeAttendeesPopup = () => {
    setShowAttendeesPopup(false);
  };

  const openAttendeesPopup = async () => {
    if (!selectedEventDetails) return;
    if (!getSupabaseEventUuidFromAppEvent(selectedEventDetails)) {
      setAttendeesFetchError('This event is not linked to the ticket system yet.');
      setAttendeesRows([]);
      setShowAttendeesPopup(true);
      setAttendeesLoading(false);
      return;
    }
    setShowAttendeesPopup(true);
    setAttendeesLoading(true);
    setAttendeesFetchError('');
    const { rows, error } = await fetchEventAttendeesPublic(selectedEventDetails);
    if (error) {
      const raw = [error.message, error.details, error.hint].filter(Boolean).join(' ');
      let msg = raw;
      if (/Must join the event to view attendees/i.test(raw)) {
        msg = 'Must join the event to view attendees.';
      } else if (/does not exist|schema cache|42883/i.test(raw)) {
        msg =
          'Run the latest SUPABASE_RPC_LIST_EVENT_ATTENDEES_PUBLIC.sql in the Supabase SQL Editor, then try again.';
      }
      setAttendeesFetchError(msg);
      setAttendeesRows([]);
    } else {
      setAttendeesRows(rows);
    }
    setAttendeesLoading(false);
  };

  const handleOrganizationClick = async (organizationName, hostEvent = null) => {
    const fromChapter = await openOrganizationProfileFromOrgEvent(hostEvent, {
      userUniversity: user?.university,
      onNavigate,
    });
    if (fromChapter) return;

    const hostUid = hostEvent?.createdByUserId;
    if (hostUid != null && isSupabaseUuid(String(hostUid))) {
      const label = (organizationName && String(organizationName).trim()) || 'Organization';
      onNavigate('organization-profile', {
        organization: {
          name: label,
          type: 'Organization',
          description: '',
          supabaseUserId: String(hostUid),
          university: user?.university,
          isSupabaseOrganization: true,
        },
      });
      return;
    }

    // Get university-specific Greek organizations to find the organization data
    const greekOrgs = user?.university ? getUniversityGreekOrganizations(user.university) : [];
    const foundOrg = greekOrgs.find(org => org.name === organizationName);
    
    let organizationProfile;
    
    if (foundOrg) {
      organizationProfile = {
        name: foundOrg.name,
        type: foundOrg.type === 'fraternity' ? 'Fraternity' : 'Sorority',
        description: foundOrg.type === 'fraternity' 
          ? `${foundOrg.name} (${foundOrg.letters}) - Building better men through brotherhood, scholarship, and service at ${user?.university || 'this university'}.`
          : `${foundOrg.name} (${foundOrg.letters}) - Empowering women through sisterhood, scholarship, and service at ${user?.university || 'this university'}.`,
        members: Math.floor(Math.random() * 50) + 60, // Random between 60-110
        image: foundOrg.type === 'fraternity' 
          ? 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop'
          : 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop'
      };
    } 
    // Check for Rutgers-specific clubs
    else if (organizationName === 'Actuarial Club') {
      organizationProfile = {
        name: 'Actuarial Club',
        type: 'Professional Club',
        description: 'Guides students toward actuarial careers by offering technical and soft-skill training, networking, and exam support. Focuses on risk management, finance, and lifelong learning. Meetings: Thursdays, 8:00 PM – 9:00 PM at Livingston Student Center, Board Room 203.',
        members: 45,
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
        university: user?.university
      };
    } else if (organizationName === 'Accounting Association') {
      organizationProfile = {
        name: 'Accounting Association',
        type: 'Professional Club',
        description: 'Provides accounting students with resources for academic and professional success through meetings, panels, and networking. Open to all majors. Meetings: Tuesdays, 7:30 PM – 8:30 PM at Rutgers Business School.',
        members: 85,
        image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=400&fit=crop',
        email: 'rutgersacct@gmail.com',
        university: user?.university
      };
    } else if (organizationName === 'Data Science Club') {
      organizationProfile = {
        name: 'Data Science Club',
        type: 'Academic Club',
        description: 'Community for students passionate about data science. Hosts panels, collaborative AMAs, and course information sessions.',
        members: 110,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
        university: user?.university
      };
    } else if (organizationName === 'Personal Finance Club') {
      organizationProfile = {
        name: 'Personal Finance Club',
        type: 'Professional Club',
        description: 'Promotes financial literacy and career readiness in investment management and financial planning. Hosts workshops and professional events.',
        members: 70,
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=400&fit=crop',
        email: 'pfcrutgers@gmail.com',
        university: user?.university
      };
    }
    
    if (organizationProfile) {
      // Navigate to organization profile with the organization data
      onNavigate('organization-profile', { organization: organizationProfile });
    }
  };


  // Function to open Google Maps with directions
  const handleLocationClick = (locationAddress) => {
    if (locationAddress) {
      // Create Google Maps URL with directions
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationAddress)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  // Glass Card Component
  const GlassCard = ({ className, children, ...props }) => {
  return (
      <div
        className={`glass-card ${className || ''}`}
        {...props}
      >
        {children}
        </div>
    );
  };

  // Event Card Component - Exact from provided code
  const EventCard = ({
    event,
    onJoin,
    onShare,
    onEventClick,
    onOrganizationClick,
    isJoined,
    isOwnOrgHosted,
    onRequestJoin,
  }) => {
    const showJoined = Boolean(isOwnOrgHosted || isJoined);
    const atCapacity = isEventAtCapacity(event);
    const showFull = Boolean(!showJoined && atCapacity);
    const jr = joinRequestStatusForSupabaseEvent(joinRequestStatusByEventId, event);
    const needsRequest = Boolean(event.requiresJoinRequest) && !isOwnOrgHosted;
    const requestPending = Boolean(needsRequest && !showJoined && jr === 'pending');
    const requestAccepted = Boolean(needsRequest && !showJoined && jr === 'accepted');
    const joinLocked = Boolean(
      isOwnOrgHosted ||
        (isJoined && event.price > 0) ||
        showFull ||
        requestPending
    );

    let primaryActionLabel = 'Join Event';
    if (showJoined) {
      primaryActionLabel = isOwnOrgHosted || event.price > 0 ? 'Joined' : 'Leave Event';
    } else if (showFull) {
      primaryActionLabel = 'Full';
    } else if (needsRequest) {
      if (jr === 'pending') primaryActionLabel = 'Pending';
      else if (jr === 'accepted')
        primaryActionLabel = event.isFundraiser
          ? 'Donate'
          : event.price > 0
            ? 'Register'
            : 'Join Event';
      else primaryActionLabel = 'Request';
    } else if (event.isFundraiser) {
      primaryActionLabel = 'Donate';
    } else if (event.price > 0) {
      primaryActionLabel = 'Register';
    }

    console.log(`🔍 EventCard for ${event.title}: isJoined = ${showJoined}`);

    const typeColors = {
      SOCIAL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      PHILANTHROPY: "bg-green-500/20 text-green-300 border-green-500/30",
      FORMAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      MIXER: "bg-pink-500/20 text-pink-300 border-pink-500/30",
      RUSH: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      RECRUITMENT: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      ACADEMIC: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      PROFESSIONAL: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      FUNDRAISER: "bg-green-500/20 text-green-300 border-green-500/30",
      SPORTS: "bg-red-500/20 text-red-300 border-red-500/30",
    };

    return (
      <div className="w-full" data-event-card-id={event.id}>
        <GlassCard className="overflow-hidden group cursor-pointer" onClick={() => onEventClick(event.id)}>
          {/* Square Image */}
          <div className="relative w-full aspect-square overflow-hidden" style={{ aspectRatio: isMobile ? '1.1' : '1' }}>
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                e.target.onerror = null; // Prevent infinite loop
                e.target.src = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&auto=format';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Type Badge */}
            <div className={isMobile ? "absolute top-2 left-2" : "absolute top-3 left-3"}>
              <span
                className={`rounded-full font-bold border backdrop-blur-sm ${typeColors[event.type]}`}
                style={{ 
                  padding: isMobile ? '4px 10px' : '6px 12px',
                  fontSize: isMobile ? '10px' : '12px'
                }}
              >
                {event.type}
              </span>
            </div>

            {/* Organization Badge */}
            <div className={isMobile ? "absolute bottom-2 left-2 right-2" : "absolute bottom-3 left-3 right-3"}>
              <div
                className="rounded-lg backdrop-blur-md border border-white/20 cursor-pointer hover:bg-white/10 transition-all duration-200"
                style={{ 
                  backgroundColor: `${event.orgColor}40`,
                  padding: isMobile ? '6px 10px' : '8px 12px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOrganizationClick(event.organization, event);
                }}
              >
                <p className="text-white font-bold" style={{ fontSize: isMobile ? '12px' : '14px' }}>{event.organization}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={isMobile ? "p-3 space-y-2" : "p-4 space-y-3"}>
            <h3 className="font-bold text-white line-clamp-2" style={{ fontSize: isMobile ? '16px' : '20px', lineHeight: '1.3' }}>{event.title}</h3>

            {/* Date & Time */}
            <div className="flex items-center gap-2 text-gray-300" style={{ fontSize: isMobile ? '12px' : '14px' }}>
              <Clock className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span>
                {(() => {
                  // Format date if it's ISO string
                  let displayDate = event.date;
                  if (typeof displayDate === 'string' && displayDate.includes('T')) {
                    const dateObj = new Date(displayDate);
                    displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                  
                  // Format time if it's in 24h format
                  let displayTime = event.time;
                  if (typeof displayTime === 'string' && displayTime.includes(':') && !displayTime.includes('M')) {
                    const [hours, minutes] = displayTime.split(':');
                    const hour = parseInt(hours);
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                    displayTime = `${displayHour}:${minutes} ${period}`;
                  }
                  
                  return `${displayDate} • ${displayTime}`;
                })()}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-300" style={{ fontSize: isMobile ? '12px' : '14px' }}>
              <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span 
                className="line-clamp-1 cursor-pointer no-underline hover:text-blue-400 transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocationClick(event.locationAddress);
                }}
                title="Click for directions"
              >
                {event.location}
              </span>
            </div>

            {/* Price & Actions */}
            <div className={`flex items-center justify-between ${isMobile ? 'pt-1.5' : 'pt-2'}`}>
              <div className="flex items-center gap-2">
                <DollarSign className={isMobile ? "w-4 h-4 text-green-400" : "w-5 h-5 text-green-400"} />
                <span className="font-bold text-white" style={{ fontSize: isMobile ? '18px' : '24px' }}>
                  {eventCardPriceText(event.price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
            <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(event.id);
                  }}
                  className={`rounded-xl bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 ${isMobile ? 'p-2' : 'p-2.5'}`}
            >
                  <Share2 className={isMobile ? "w-3.5 h-3.5 text-white" : "w-4 h-4 text-white"} />
            </button>
            <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (joinLocked) return;
                    if (needsRequest && !showJoined && !requestAccepted) {
                      onRequestJoin(event.id);
                      return;
                    }
                    onJoin(event.id);
                  }}
                  className={`rounded-xl font-bold transition-all shadow-lg ${
                    showFull || requestPending
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                      : showJoined
                        ? isOwnOrgHosted || event.price > 0
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white'
                          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white hover:shadow-purple-500/50'
                  }`}
                  style={{
                    padding: isMobile ? '8px 16px' : '10px 24px',
                    fontSize: isMobile ? '13px' : '14px',
                    cursor: joinLocked ? 'default' : 'pointer',
                    opacity: joinLocked ? 0.9 : 1,
                  }}
                  title={
                    showFull
                      ? 'This event has reached its attendee limit.'
                      : requestPending
                        ? 'Waiting for host approval.'
                        : undefined
                  }
                >
                  {primaryActionLabel}
            </button>
          </div>
        </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  return (
    <div className="greek-life-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-container">
          <div className="dashboard-header-content">
            <div>
              <h1 className="dashboard-welcome-title">
                Upcoming Events at {user?.university || 'Your University'}
              </h1>
            </div>
                </div>
              </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content-container">

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={scrollRef}>
            {eventsForHome.map((event) => {
              const ownHost = isOrgHostingOwnEvent(user, event);
              return (
              <EventCard
                key={event.id}
                event={event}
                onJoin={handleJoin}
                onRequestJoin={handleRequestJoin}
                onShare={handleShare}
                onEventClick={handleEventClick}
                onOrganizationClick={handleOrganizationClick}
                isOwnOrgHosted={ownHost}
                isJoined={ownHost || (joinedEvents && joinedEvents.some(e => e.id === event.id))}
              />
              );
            })}
          </div>
        </div>
      </main>

      {/* Payment Modal — redirects to Stripe Checkout */}
      {(showPaymentModal || showPaymentFromEvent) && selectedEvent && (
        <div className="modern-modal-overlay" onClick={() => {
          setShowPaymentModal(false);
          setShowPaymentFromEvent(false);
        }}>
          <div className="modern-modal-content modern-payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modern-modal-close" onClick={() => {
              setShowPaymentModal(false);
              setShowPaymentFromEvent(false);
            }}>
              ×
            </div>
            
            <div className="modern-payment-header">
              <h2 className="modern-payment-title">
                {selectedEvent.isFundraiser ? 'Donate' : 'Complete Payment'}
              </h2>
              <p className="modern-payment-subtitle">
                {selectedEvent.isFundraiser
                  ? 'Enter your donation (min. $0.50). No ticket is issued — thank you for supporting this fundraiser.'
                  : "You'll be redirected to our secure payment page"}
              </p>
            </div>

            <div className="modern-payment-event-info">
              <div className="modern-payment-event-card">
                <img src={selectedEvent.image} alt={selectedEvent.title} className="modern-payment-event-image" />
                <div className="modern-payment-event-details">
                  <h3 className="modern-payment-event-title">{selectedEvent.title}</h3>
                  <p className="modern-payment-event-date">{selectedEvent.date}</p>
                </div>
                <div className="modern-payment-event-price">
                  {selectedEvent.isFundraiser ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Amount (USD)</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.01}
                        value={fundraiserDonationDollars}
                        onChange={(e) => setFundraiserDonationDollars(e.target.value)}
                        className="modern-payment-price"
                        style={{
                          width: '6.5rem',
                          padding: '0.45rem 0.5rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.25)',
                          background: 'rgba(0,0,0,0.35)',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  ) : (
                    <p className="modern-payment-price">
                      ${Number(selectedEvent.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button 
              className="modern-pay-button"
              onClick={async () => {
                const payAuthUid = await getSupabaseAuthUid();
                if (!payAuthUid) {
                  alert('Please log in to purchase tickets.');
                  return;
                }
                const full = await isEventAtCapacityFromServer(supabase, selectedEvent);
                if (full) {
                  alert('This event is full — no more tickets available.');
                  return;
                }

                const checkoutEventUuid = tryParseUuidString(
                  selectedEvent.supabaseId ?? selectedEvent.id
                );
                if (!checkoutEventUuid) {
                  alert(
                    'This event does not have a valid ID for checkout. Refresh the page or pick the event again from the feed.'
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
                  const ticketCode = generateTicketCode();
                  try {
                    const { error: regError } = await reservePaidCheckoutRegistration(supabase, {
                      userId: payAuthUid,
                      eventId: checkoutEventUuid,
                      ticketCode,
                    });

                    if (regError) {
                      console.error('Registration reserve error:', regError);
                      if (regError.code === 'ALREADY_PAID') {
                        alert(regError.message);
                        return;
                      }
                      if (isRegistrationCapacityError(regError)) {
                        alert('This event is full — no more tickets available.');
                        return;
                      }
                      alert(`Could not reserve ticket: ${regError.message}`);
                      return;
                    }
                  } catch (err) {
                    console.error('Registration pre-checkout error:', err);
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
                  } catch (_) {
                    /* non-JSON error page */
                  }

                  if (!resp.ok) {
                    const msg =
                      [body.message, body.error, body.code].filter(Boolean).join(' — ') ||
                      (raw && raw.trim().slice(0, 240)) ||
                      `Payment failed (HTTP ${resp.status}).`;
                    alert(msg);
                    return;
                  }

                  const { url } = body;
                  if (url) {
                    window.location.href = url;
                  } else {
                    alert('Could not start checkout. Please try again.');
                  }
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
      )}

      {showEventDetails && selectedEventDetails && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm"
            onClick={() => setShowEventDetails(false)}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-event-detail-title"
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-[1001] max-h-[85vh] overflow-hidden rounded-t-3xl shadow-2xl'
                : 'fixed inset-8 z-[1001] mx-auto flex max-h-[min(88vh,calc(100vh-4rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl md:inset-12 lg:inset-20'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center bg-gradient-to-br from-[#1e1b4b] to-[#312e81] pb-2 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-white/30" />
              </div>
            )}
            <div className="relative flex max-h-[min(85vh,calc(100vh-3rem))] flex-col overflow-y-auto bg-gradient-to-br from-[#1e1b4b] to-[#312e81]">
              <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-56">
                <img
                  src={selectedEventDetails.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b] via-[#1e1b4b]/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => setShowEventDetails(false)}
                  className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="absolute left-4 top-4 z-10 flex max-w-[85%] flex-wrap gap-2">
                  <span
                    className="rounded-full border-0 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
                    style={{
                      background:
                        selectedEventDetails.type === 'SOCIAL'
                          ? 'rgba(124, 58, 237, 0.92)'
                          : selectedEventDetails.type === 'PHILANTHROPY'
                            ? 'rgba(16, 185, 129, 0.92)'
                            : selectedEventDetails.type === 'MIXER'
                              ? 'rgba(236, 72, 153, 0.92)'
                              : 'rgba(245, 158, 11, 0.92)',
                    }}
                  >
                    {selectedEventDetails.type}
                  </span>
                  {selectedEventDetails.isFundraiser ? (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
                      Fundraiser
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-5 p-5 md:space-y-6 md:p-6">
                <h1
                  id="dash-event-detail-title"
                  className="text-xl font-bold leading-tight text-white md:text-2xl"
                >
                  {selectedEventDetails.title}
                </h1>

                {(() => {
                  const desc =
                    selectedEventDetails.description != null
                      ? String(selectedEventDetails.description).trim()
                      : '';
                  if (desc) {
                    return (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#c4b5fd] md:text-base">
                        {desc}
                      </p>
                    );
                  }
                  return (
                    <p className="text-sm leading-relaxed text-[#c4b5fd] md:text-base">
                      Join us for an unforgettable{' '}
                      {String(selectedEventDetails.type || 'event').toLowerCase()} event hosted by{' '}
                      <button
                        type="button"
                        onClick={() =>
                          handleOrganizationClick(
                            selectedEventDetails.organization,
                            selectedEventDetails
                          )
                        }
                        className="border-0 bg-transparent p-0 font-inherit text-[#60a5fa] hover:text-[#93c5fd]"
                      >
                        {selectedEventDetails.organization}
                      </button>
                      {
                        ". This exclusive gathering brings together the best of Greek life for an evening you won't forget."
                      }
                    </p>
                  );
                })()}

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600/20">
                      <Calendar className="h-5 w-5 text-purple-400" aria-hidden />
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-[#c4b5fd]/70">
                        Date
                      </p>
                      <p className="font-medium text-white">
                        {(() => {
                          let displayDate = selectedEventDetails.date;
                          if (
                            typeof displayDate === 'string' &&
                            displayDate.includes('T')
                          ) {
                            const dateObj = new Date(displayDate);
                            displayDate = dateObj.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            });
                          }
                          return displayDate;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600/20">
                      <Clock className="h-5 w-5 text-purple-400" aria-hidden />
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-[#c4b5fd]/70">
                        Time
                      </p>
                      <p className="font-medium text-white">
                        {(() => {
                          let displayTime = selectedEventDetails.time;
                          if (
                            typeof displayTime === 'string' &&
                            displayTime.includes(':') &&
                            !displayTime.includes('M')
                          ) {
                            const [hours, minutes] = displayTime.split(':');
                            const hour = parseInt(hours, 10);
                            const period = hour >= 12 ? 'PM' : 'AM';
                            const displayHour =
                              hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                            displayTime = `${displayHour}:${minutes} ${period}`;
                          }
                          return displayTime;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600/20">
                      <MapPin className="h-5 w-5 text-purple-400" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs uppercase tracking-wide text-[#c4b5fd]/70">
                        Location
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleLocationClick(selectedEventDetails.locationAddress)
                        }
                        className="text-left font-medium text-white hover:text-purple-300"
                        title="Click for directions"
                      >
                        {selectedEventDetails.location}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600/20">
                      <Users className="h-5 w-5 text-purple-400" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs uppercase tracking-wide text-[#c4b5fd]/70">
                        Host
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleOrganizationClick(
                            selectedEventDetails.organization,
                            selectedEventDetails
                          )
                        }
                        className="max-w-full text-left font-medium text-white hover:text-purple-300"
                      >
                        {selectedEventDetails.organization || 'Organization'}
                      </button>
                    </div>
                  </div>
                </div>

                {getSupabaseEventUuidFromAppEvent(selectedEventDetails) ? (
                  <button
                    type="button"
                    onClick={openAttendeesPopup}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-purple-500/50 bg-transparent px-4 py-2.5 text-sm font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-purple-600/20 hover:text-white"
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    View attendees
                  </button>
                ) : null}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (isOrgHostingOwnEvent(user, selectedEventDetails)) return;
                      const inJoined =
                        joinedEvents &&
                        joinedEvents.some((e) => e.id === selectedEventDetails.id);
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(
                        selectedEventDetails.requiresJoinRequest
                      );
                      if (needReq && !inJoined && mj !== 'accepted') {
                        await handleRequestJoin(selectedEventDetails.id);
                        setShowEventDetails(false);
                        return;
                      }
                      if (inJoined) {
                        if (selectedEventDetails.price <= 0) {
                          handleJoin(selectedEventDetails.id);
                          setShowEventDetails(false);
                        }
                        return;
                      }
                      const fullModal = await isEventAtCapacityFromServer(
                        supabase,
                        selectedEventDetails
                      );
                      if (fullModal) {
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
                        const own = isOrgHostingOwnEvent(
                          user,
                          selectedEventDetails
                        );
                        const j =
                          own ||
                          (joinedEvents &&
                            joinedEvents.some(
                              (e) => e.id === selectedEventDetails.id
                            ));
                        const mj = joinRequestStatusForSupabaseEvent(
                          joinRequestStatusByEventId,
                          selectedEventDetails
                        );
                        const needReq = Boolean(
                          selectedEventDetails.requiresJoinRequest
                        );
                        if (j && (own || selectedEventDetails.price > 0)) {
                          return 'linear-gradient(135deg, #059669, #10b981)';
                        }
                        if (!j && needReq && mj === 'pending') {
                          return 'linear-gradient(135deg, #d97706, #ea580c)';
                        }
                        if (!j && isEventAtCapacity(selectedEventDetails)) {
                          return 'linear-gradient(135deg, #d97706, #ea580c)';
                        }
                        return 'linear-gradient(135deg, #7c3aed, #a855f7)';
                      })(),
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: isMobile ? '12px 18px' : '14px 22px',
                      fontSize: isMobile ? '14px' : '16px',
                      fontWeight: '600',
                      cursor: (() => {
                        const own = isOrgHostingOwnEvent(
                          user,
                          selectedEventDetails
                        );
                        const j =
                          own ||
                          (joinedEvents &&
                            joinedEvents.some(
                              (e) => e.id === selectedEventDetails.id
                            ));
                        const mj = joinRequestStatusForSupabaseEvent(
                          joinRequestStatusByEventId,
                          selectedEventDetails
                        );
                        const needReq = Boolean(
                          selectedEventDetails.requiresJoinRequest
                        );
                        if (own || (j && selectedEventDetails.price > 0))
                          return 'default';
                        if (!j && needReq && mj === 'pending') return 'default';
                        if (!j && isEventAtCapacity(selectedEventDetails))
                          return 'default';
                        return 'pointer';
                      })(),
                      opacity: (() => {
                        const own = isOrgHostingOwnEvent(
                          user,
                          selectedEventDetails
                        );
                        const j =
                          own ||
                          (joinedEvents &&
                            joinedEvents.some(
                              (e) => e.id === selectedEventDetails.id
                            ));
                        const mj = joinRequestStatusForSupabaseEvent(
                          joinRequestStatusByEventId,
                          selectedEventDetails
                        );
                        const needReq = Boolean(
                          selectedEventDetails.requiresJoinRequest
                        );
                        if (own || (j && selectedEventDetails.price > 0))
                          return 0.95;
                        if (!j && needReq && mj === 'pending') return 0.95;
                        if (!j && isEventAtCapacity(selectedEventDetails))
                          return 0.95;
                        return 1;
                      })(),
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                    }}
                    title={(() => {
                      const j =
                        joinedEvents &&
                        joinedEvents.some(
                          (e) => e.id === selectedEventDetails.id
                        );
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(
                        selectedEventDetails.requiresJoinRequest
                      );
                      if (!j && needReq && mj === 'pending')
                        return 'Waiting for host approval.';
                      if (
                        !isOrgHostingOwnEvent(user, selectedEventDetails) &&
                        !j &&
                        isEventAtCapacity(selectedEventDetails)
                      ) {
                        return 'This event has reached its attendee limit.';
                      }
                      return undefined;
                    })()}
                  >
                    {(() => {
                      const own = isOrgHostingOwnEvent(
                        user,
                        selectedEventDetails
                      );
                      const j =
                        own ||
                        (joinedEvents &&
                          joinedEvents.some(
                            (e) => e.id === selectedEventDetails.id
                          ));
                      const mj = joinRequestStatusForSupabaseEvent(
                        joinRequestStatusByEventId,
                        selectedEventDetails
                      );
                      const needReq = Boolean(
                        selectedEventDetails.requiresJoinRequest
                      );
                      if (own || j) return 'Joined';
                      if (!j && needReq && mj === 'pending') return 'Pending';
                      if (!j && needReq && mj !== 'accepted') return 'Request';
                      if (isEventAtCapacity(selectedEventDetails)) return 'Full';
                      if (selectedEventDetails.isFundraiser) return 'Donate';
                      if (selectedEventDetails.price > 0) {
                        return 'Register';
                      }
                      return 'Join Event';
                    })()}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(selectedEventDetails.id)}
                    className="flex shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/20"
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        {showAttendeesPopup ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '14px' : '24px',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
            }}
            onClick={closeAttendeesPopup}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Event attendees"
              style={{
                width: '100%',
                maxWidth: '380px',
                maxHeight: 'min(72vh, 440px)',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '12px 14px' : '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: isMobile ? '16px' : '17px',
                    fontWeight: 700,
                  }}
                >
                  Attendees
                </h3>
                <button
                  type="button"
                  aria-label="Close attendees"
                  onClick={closeAttendeesPopup}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.12)',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    fontSize: '22px',
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: isMobile ? '12px 14px 16px' : '14px 16px 18px',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {attendeesLoading ? (
                  <p style={{ color: '#c4b5fd', fontSize: '14px', margin: 0 }}>Loading attendees…</p>
                ) : attendeesFetchError ? (
                  <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>{attendeesFetchError}</p>
                ) : attendeesRows.length === 0 ? (
                  <p style={{ color: '#c4b5fd', fontSize: '14px', margin: 0 }}>
                    No one has joined yet — be the first.
                  </p>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {attendeesRows.map((row) => {
                      const src =
                        row.avatar_url && String(row.avatar_url).trim()
                          ? String(row.avatar_url).trim()
                          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              String(row.user_id || row.full_name || 'guest')
                            )}`;
                      const isLikelySvg =
                        typeof src === 'string' &&
                        (/\.svg(\?|$)/i.test(src) ||
                          src.includes('dicebear.com') ||
                          src.includes('avataaars'));
                      return (
                        <li
                          key={String(row.user_id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              flex: '0 0 40px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: 'rgba(0,0,0,0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={src}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: isLikelySvg ? 'contain' : 'cover',
                                objectPosition: 'center',
                                display: 'block',
                                flexShrink: 0,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              minWidth: 0,
                              flex: '1 1 auto',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'flex-start',
                            }}
                          >
                            <p
                              style={{
                                color: 'white',
                                fontSize: isMobile ? '14px' : '15px',
                                fontWeight: 600,
                                margin: 0,
                                lineHeight: 1.35,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontStretch: 'normal',
                              }}
                            >
                              {row.full_name || row.username || 'Member'}
                            </p>
                            {row.username ? (
                              <p
                                style={{
                                  color: '#a78bfa',
                                  fontSize: '12px',
                                  margin: '2px 0 0',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.35,
                                  fontStretch: 'normal',
                                }}
                              >
                                @{String(row.username).replace(/^@/, '')}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
        </>
      )}

    </div>
  );
};

export default DashboardScreen;
