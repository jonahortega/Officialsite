import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Map as MapboxMap, Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Clock, DollarSign, Navigation as NavigationIcon, X, Search, SlidersHorizontal } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { collegesData } from '../data/collegesData';
import { getGreekOrganizations } from '../data/greekLifeData';
import { supabase } from '../utils/supabaseClient';
import { isEventAtCapacity } from '../utils/eventCapacity';
import { isEventPastBySchoolClock } from '../utils/eventSchoolTime';
import { useSchoolClockTick } from '../hooks/useSchoolClockTick';

const MapScreen = ({ user, onNavigate, joinedEvents = [], setJoinedEvents, allEvents = [], supabaseEvents = [] }) => {
  const schoolClockTick = useSchoolClockTick();
  const mapRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(50);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  
  // Set map center based on user's university
  const getUniversityCoordinates = (universityName) => {
    const coordinates = {
      'Rutgers University': { longitude: -74.4478, latitude: 40.5008, zoom: 14.5 },
      'Northeastern University': { longitude: -71.0893, latitude: 42.3398, zoom: 15 },
      'University of Southern California': { longitude: -118.2851, latitude: 34.0224, zoom: 15 },
      'Stockton University': { longitude: -74.4678, latitude: 39.4789, zoom: 14.5 },
      'Syracuse University': { longitude: -76.1352, latitude: 43.0391, zoom: 15 }
    };
    return coordinates[universityName] || coordinates['Rutgers University'];
  };

  const [viewState, setViewState] = useState(getUniversityCoordinates(user?.university || 'Rutgers University'));

  // Check if Mapbox token is available
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  
  useEffect(() => {
    console.log('🗺️ Mapbox Token Available:', !!mapboxToken);
    console.log('🗺️ Token (first 20 chars):', mapboxToken?.substring(0, 20));
  }, []);

  // Cleanup map on unmount and handle errors
  useEffect(() => {
    // Set up global error handler for Mapbox
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Suppress specific Mapbox error
      if (args[0]?.toString().includes('errorCb') || 
          args[0]?.toString().includes('mapbox')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      // Restore original error handler
      console.error = originalConsoleError;
      
      // Clean up map reference when component unmounts
      if (mapRef.current) {
        try {
          const map = mapRef.current.getMap();
          if (map && map.remove) {
            map.remove();
          }
        } catch (error) {
          // Silently catch cleanup errors
        }
      }
    };
  }, []);

  // Update map view when user's university changes
  useEffect(() => {
    if (user?.university) {
      const newCoords = getUniversityCoordinates(user.university);
      setViewState(newCoords);
    }
  }, [user?.university]);

  if (!mapboxToken) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <MapPin size={64} style={{ color: '#7c3aed' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#c4b5fd' }}>
          Map Not Available
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', maxWidth: '400px' }}>
          Mapbox access token is not configured. Please add REACT_APP_MAPBOX_TOKEN to your environment variables.
        </p>
        <button
          onClick={() => onNavigate('home')}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Event generation logic (matching DashboardScreen)
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const generateUniversityEvents = (universityName) => {
    // Map university names to match data
    const universityMap = {
      'Rutgers University': 'Rutgers University New Brunswick',
      'Stockton University': 'Stockton University',
      'Northeastern University': 'Northeastern University',
      'University of Southern California': 'University of Southern California',
      'Syracuse University': 'Syracuse University'
    };
    
    const mappedName = universityMap[universityName] || universityName;
    console.log('🎓 Mapped university name:', universityName, '->', mappedName);
    
    // Try to find in collegesData first
    const college = collegesData.find(c => c.name === mappedName);
    
    let fraternities = [];
    let sororities = [];
    
    if (college) {
      console.log('📚 College found in collegesData:', college.name);
      // Get fraternities and sororities, convert strings to objects
      fraternities = (college.fraternities || []).map(name => ({
        name: typeof name === 'string' ? name : name,
        type: 'fraternity'
      }));
      sororities = (college.sororities || []).map(name => ({
        name: typeof name === 'string' ? name : name,
        type: 'sorority'
      }));
    } else {
      // Try greekLifeData
      console.log('📚 Trying greekLifeData for:', universityName);
      const greekData = getGreekOrganizations(universityName);
      if (greekData && (greekData.fraternities?.length > 0 || greekData.sororities?.length > 0)) {
        console.log('📚 Found in greekLifeData:', universityName);
        fraternities = greekData.fraternities || [];
        sororities = greekData.sororities || [];
      } else {
        console.warn('⚠️ No data found for:', universityName);
        return [];
      }
    }
    
    console.log('🏛️ Fraternities count:', fraternities.length);
    console.log('👗 Sororities count:', sororities.length);
    
    const selectedOrgs = [...fraternities, ...sororities];
    console.log('👥 Selected orgs count:', selectedOrgs.length);
    console.log('👥 First 3 orgs:', selectedOrgs.slice(0, 3));
    const events = [];
    
    // Event titles with corresponding images
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

    // University-specific campus locations with coordinates
    const getUniversityLocations = (universityName) => {
      const rutgersLocations = [
        { name: 'Greek Row - College Ave', address: '126 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4490, 40.5000] },
        { name: 'Student Activities Center', address: '613 George St, New Brunswick, NJ 08901', coordinates: [-74.4470, 40.5010] },
        { name: 'Rutgers Student Center', address: '126 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4478, 40.5008] },
        { name: 'Greek Life Office', address: '126 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4475, 40.5005] },
        { name: 'Campus Recreation Center', address: '70 Lipman Dr, New Brunswick, NJ 08901', coordinates: [-74.4435, 40.5235] },
        { name: 'Alexander Library', address: '169 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4495, 40.4995] },
        { name: 'Athletic Complex', address: '83 Rockafeller Rd, Piscataway, NJ 08854', coordinates: [-74.4625, 40.5145] },
        { name: 'Campus Theater', address: '85 George St, New Brunswick, NJ 08901', coordinates: [-74.4465, 40.5015] },
        { name: 'Student Union', address: '126 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4485, 40.5015] },
        { name: 'Greek Village', address: '130 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4492, 40.4998] },
        { name: 'Campus Garden', address: '59 Dudley Rd, New Brunswick, NJ 08901', coordinates: [-74.4450, 40.5020] },
        { name: 'Outdoor Amphitheater', address: '126 College Ave, New Brunswick, NJ 08901', coordinates: [-74.4480, 40.5012] }
      ];

      const northeasternLocations = [
        { name: 'Curry Student Center', address: '346 Huntington Ave, Boston, MA 02115', coordinates: [-71.0877, 42.3398] },
        { name: 'Greek Life Office - West Village', address: '291 St Botolph St, Boston, MA 02115', coordinates: [-71.0895, 42.3385] },
        { name: 'Cabot Center', address: '430 Huntington Ave, Boston, MA 02115', coordinates: [-71.0903, 42.3405] },
        { name: 'Snell Library Plaza', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0893, 42.3398] },
        { name: 'Centennial Common', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0890, 42.3390] },
        { name: 'Blackman Auditorium', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0885, 42.3400] },
        { name: 'Marino Recreation Center', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0910, 42.3410] },
        { name: 'Matthews Arena', address: '238 St Botolph St, Boston, MA 02115', coordinates: [-71.0870, 42.3395] },
        { name: 'West Village Quad', address: '319 Huntington Ave, Boston, MA 02115', coordinates: [-71.0900, 42.3380] },
        { name: 'Ell Hall', address: '346 Huntington Ave, Boston, MA 02115', coordinates: [-71.0880, 42.3392] },
        { name: 'Krentzman Quad', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0888, 42.3408] },
        { name: 'Stearns Center', address: '360 Huntington Ave, Boston, MA 02115', coordinates: [-71.0895, 42.3403] }
      ];

      const uscLocations = [
        { name: 'Greek Row - 28th Street', address: '649 W 28th St, Los Angeles, CA 90007', coordinates: [-118.2870, 34.0235] },
        { name: 'Leavey Library', address: '650 Childs Way, Los Angeles, CA 90089', coordinates: [-118.2830, 34.0215] },
        { name: 'USC Village', address: '3335 S Hoover St, Los Angeles, CA 90089', coordinates: [-118.2851, 34.0224] },
        { name: 'Lyon Center', address: '1100 W Childs Way, Los Angeles, CA 90089', coordinates: [-118.2890, 34.0210] },
        { name: 'Bovard Auditorium', address: '3551 Trousdale Pkwy, Los Angeles, CA 90089', coordinates: [-118.2845, 34.0205] },
        { name: 'Tommy Trojan', address: 'Trousdale Pkwy, Los Angeles, CA 90089', coordinates: [-118.2851, 34.0205] },
        { name: 'Alumni Park', address: '3607 Trousdale Pkwy, Los Angeles, CA 90089', coordinates: [-118.2855, 34.0200] },
        { name: 'McCarthy Quad', address: '3601 Watt Way, Los Angeles, CA 90089', coordinates: [-118.2840, 34.0220] },
        { name: 'Tutor Campus Center', address: '3607 Trousdale Pkwy, Los Angeles, CA 90089', coordinates: [-118.2848, 34.0218] },
        { name: 'Galen Center', address: '3400 S Figueroa St, Los Angeles, CA 90089', coordinates: [-118.2860, 34.0190] },
        { name: 'Heritage Hall', address: '3501 Watt Way, Los Angeles, CA 90089', coordinates: [-118.2865, 34.0228] },
        { name: 'Parkside Campus', address: '2880 S Hoover St, Los Angeles, CA 90089', coordinates: [-118.2875, 34.0240] }
      ];
      
      const locationMaps = {
        'Rutgers University': rutgersLocations,
        'Rutgers University New Brunswick': rutgersLocations,
        'Northeastern University': northeasternLocations,
        'University of Southern California': uscLocations
      };
      
      return locationMaps[universityName] || rutgersLocations;
    };
    
    const greekLocations = getUniversityLocations(universityName);
    
    selectedOrgs.forEach((org, index) => {
      // Handle both string and object organization formats
      const orgName = typeof org === 'string' ? org : org.name;
      const orgType = typeof org === 'string' ? (index % 2 === 0 ? 'fraternity' : 'sorority') : org.type;
      
      // Only generate 1 event per organization to match home page display
      if (index >= 20) return; // Limit to first 20 organizations
      
      const orgSeed = orgName.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + universityName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const orgColor = orgType === 'fraternity' ? '#7c3aed' : '#ec4899';
      const eventTypes = ['SOCIAL', 'PHILANTHROPY', 'MIXER'];
      
      // Generate 1 event per organization
      const numEvents = 1;
      
      for (let i = 0; i < numEvents; i++) {
        const eventId = `event-${orgName.replace(/\s+/g, '-').toLowerCase()}-${i}`;
        const eventType = eventTypes[Math.floor(seededRandom(orgSeed + i) * eventTypes.length)];
        const selectedEventData = eventData[Math.floor(seededRandom(orgSeed + i + 100) * eventData.length)];
        const locationObj = greekLocations[Math.floor(seededRandom(orgSeed + i + 200) * greekLocations.length)];
        
        // Generate future dates
        const daysFromNow = Math.floor(seededRandom(orgSeed + i + 300) * 30) + 1;
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysFromNow);
        
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        const hours = Math.floor(seededRandom(orgSeed + i + 400) * 8) + 16;
        const minutes = seededRandom(orgSeed + i + 500) < 0.5 ? '00' : '30';
        const time = `${hours > 12 ? hours - 12 : hours}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
        
        events.push({
          id: eventId,
          title: selectedEventData.title,
          organization: orgName,
          orgColor: orgColor,
          date: formattedDate,
          dateISO: eventDate.toISOString().split('T')[0],
          time: time,
          location: locationObj.name,
          locationAddress: locationObj.address,
          coordinates: locationObj.coordinates,
          attendance: Math.floor(seededRandom(orgSeed + i + 600) * 30) + 20,
          maxAttendance: Math.floor(seededRandom(orgSeed + i + 700) * 20) + 50,
          price: seededRandom(orgSeed + i + 800) > 0.5 ? 0 : Math.floor(seededRandom(orgSeed + i + 900) * 20) + 10,
          image: selectedEventData.image,
          type: eventType,
          description: `Join us for an amazing ${eventType.toLowerCase()} event hosted by ${orgName}!`,
          createdBy: orgName,
          isOrganizationEvent: false
        });
      }
    });
    
    return events;
  };

  // Generate university-specific events
  const campusEvents = useMemo(() => {
    const university = user?.university || 'Rutgers University'; // Default to Rutgers
    console.log('🎓 MapScreen - User university:', university);
    const events = generateUniversityEvents(university);
    console.log('🎉 MapScreen - Generated events:', events.length);
    return events;
  }, [user?.university]);

  const getEventTypeColor = (type) => {
    const colors = {
      SOCIAL: '#7c3aed',
      PHILANTHROPY: '#10b981',
      SPORTS: '#f59e0b',
      RECRUITMENT: '#ec4899',
      FORMAL: '#8b5cf6',
      MIXER: '#06b6d4',
      FUNDRAISER: '#ef4444'
    };
    return colors[type] || '#7c3aed';
  };

  const handleJoinEvent = async (event) => {
    const isAlreadyJoined = joinedEvents.some(e => e.id === event.id);
    if (!isAlreadyJoined && isEventAtCapacity(event)) return;

    if (isAlreadyJoined) {
      // Decrement attendance when leaving
      const newAttendance = Math.max(0, event.attendance - 1);
      const updatedEvent = { ...event, attendance: newAttendance };
      
      // Update Supabase if this is a Supabase event
      if (event.supabaseId) {
        try {
          const { error } = await supabase
            .from('events')
            .update({ attendance: newAttendance })
            .eq('id', event.supabaseId);
          
          if (error) {
            console.error('❌ MapScreen - Error updating attendance:', error);
          } else {
            console.log('✅ MapScreen - Attendance decremented:', newAttendance);
            
            // Supabase events are now managed centrally in App.js
          }
        } catch (error) {
          console.error('❌ MapScreen - Error updating Supabase:', error);
        }
      }
      
      setJoinedEvents(prev => prev.filter(e => e.id !== event.id));
    } else {
      // Increment attendance when joining
      const newAttendance = event.attendance + 1;
      const updatedEvent = { ...event, attendance: newAttendance };
      
      // Update Supabase if this is a Supabase event
      if (event.supabaseId) {
        try {
          const { error } = await supabase
            .from('events')
            .update({ attendance: newAttendance })
            .eq('id', event.supabaseId);
          
          if (error) {
            console.error('❌ MapScreen - Error updating attendance:', error);
          } else {
            console.log('✅ MapScreen - Attendance incremented:', newAttendance);
            
            // Supabase events are now managed centrally in App.js
          }
        } catch (error) {
          console.error('❌ MapScreen - Error updating Supabase:', error);
        }
      }
      
      if (event.price > 0) {
        // Handle paid event - for now just add it
        setJoinedEvents(prev => [...prev, updatedEvent]);
      } else {
        setJoinedEvents(prev => [...prev, updatedEvent]);
      }
    }
    setSelectedEvent(null);
  };

  const isEventJoined = (eventId) => {
    return joinedEvents.some(e => e.id === eventId);
  };

  // Combine campus events with organization-created events (only from current university) - deduplicated
  const allCampusEvents = useMemo(() => {
    const currentUniversity = user?.university || 'Rutgers University';
    const universityEvents = allEvents.filter(event => 
      event.university === currentUniversity || event.createdBy?.university === currentUniversity
    );
    
    const defaultCoords = getUniversityCoordinates(currentUniversity);
    
    // Use Map to deduplicate by event ID
    const eventMap = new Map();
    
    // Add campus events first
    campusEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Add universityEvents (overwrites if same id)
    universityEvents.forEach(event => {
      eventMap.set(event.id, {
        ...event,
        coordinates: event.coordinates || [defaultCoords.longitude, defaultCoords.latitude]
      });
    });
    
    // Add supabaseEvents (overwrites if same id)
    supabaseEvents.forEach(event => {
      eventMap.set(event.id, {
        ...event,
        coordinates: event.coordinates || [defaultCoords.longitude, defaultCoords.latitude]
      });
    });
    
    return Array.from(eventMap.values());
  }, [campusEvents, allEvents, supabaseEvents, user?.university]);

  // Filter events based on search query and filters
  const filteredEvents = allCampusEvents.filter(event => {
    void schoolClockTick;
    if (isEventPastBySchoolClock(event, user?.university)) return false;
    // Only show events with valid coordinates - enhanced validation
    if (!event.coordinates || 
        !Array.isArray(event.coordinates) || 
        event.coordinates.length !== 2 ||
        isNaN(event.coordinates[0]) || 
        isNaN(event.coordinates[1]) ||
        event.coordinates[0] < -180 || event.coordinates[0] > 180 ||
        event.coordinates[1] < -90 || event.coordinates[1] > 90) {
      console.warn('⚠️ Filtering out event with invalid coordinates:', event.title, event.coordinates);
      return false;
    }
    
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = activeFilter === 'All' || event.type === activeFilter;
    
    const matchesPrice = event.price <= maxPrice;
    
    // Date filter - if a date is selected, only show events on that date
    let matchesDate = true;
    if (selectedDate) {
      // Compare just the date part (ignore time)
      const eventDateStr = event.date; // "Nov 15" format
      const selectedDateObj = new Date(selectedDate);
      const selectedDateStr = selectedDateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      matchesDate = eventDateStr === selectedDateStr;
    }
    
    return matchesSearch && matchesType && matchesPrice && matchesDate;
  });

  // Debug logging
  useEffect(() => {
    console.log('🗺️ MapScreen - Total campus events:', campusEvents.length);
    console.log('🗺️ MapScreen - Filtered events:', filteredEvents.length);
    if (filteredEvents.length > 0) {
      console.log('🗺️ MapScreen - Sample event:', filteredEvents[0]);
      console.log('🗺️ MapScreen - Sample coordinates:', filteredEvents[0].coordinates);
    }
  }, [campusEvents.length, filteredEvents.length]);

  // Focus map on searched event
  const handleSearchResultClick = (event) => {
    setViewState({
      longitude: event.coordinates[0],
      latitude: event.coordinates[1],
      zoom: 17
    });
    setSelectedEvent(event);
    setSearchQuery(''); // Clear search query
    setShowFilters(false); // Close filters if open
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(15, 15, 35, 0.98) 0%, rgba(15, 15, 35, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        padding: '1rem',
        borderBottom: '1px solid rgba(124, 58, 237, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin style={{ width: '28px', height: '28px', color: '#7c3aed' }} />
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #c4b5fd, #93c5fd)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                margin: 0
              }}>
                Campus Events Map
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                margin: 0
              }}>
                {user?.university || 'Rutgers University'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div 
        style={{
          position: 'absolute',
          top: '80px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
        onClick={() => setShowFilters(false)}
      >
        {mapboxToken ? (
          <MapboxMap
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onLoad={() => console.log('Map loaded successfully')}
            onError={(e) => {
              // Silently handle all map errors to prevent crashes
            }}
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            attributionControl={false}
            reuseMaps={true}
          >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" style={{ marginTop: '80px' }} />
        <GeolocateControl position="top-right" style={{ marginTop: '140px' }} />

        {/* Event Markers - Only show filtered events */}
        {filteredEvents.length > 0 && console.log('📍 Rendering', filteredEvents.length, 'markers')}
        {filteredEvents.map((event, idx) => {
          // Enhanced coordinate validation
          if (!event.coordinates || 
              !Array.isArray(event.coordinates) || 
              event.coordinates.length !== 2 ||
              isNaN(event.coordinates[0]) || 
              isNaN(event.coordinates[1]) ||
              event.coordinates[0] < -180 || event.coordinates[0] > 180 ||
              event.coordinates[1] < -90 || event.coordinates[1] > 90) {
            console.warn('⚠️ Event has invalid coordinates:', event.title, event.coordinates);
            return null;
          }
          
          if (idx < 3) {
            console.log(`📍 Marker ${idx}:`, event.title, event.coordinates);
            console.log(`📍 Address:`, event.locationAddress);
          }
          
          return (
            <Marker
              key={event.id}
              longitude={event.coordinates[0]}
              latitude={event.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedEvent(event);
                setShowFilters(false);
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: getEventTypeColor(event.type),
                  border: '3px solid white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${getEventTypeColor(event.type)}80`,
                  transition: 'all 0.3s ease'
                }}
              >
                <MapPin size={20} color="white" />
              </motion.div>
            </Marker>
          );
        })}

        {/* Event Popup */}
        <AnimatePresence>
          {selectedEvent && (
            <Popup
              longitude={selectedEvent.coordinates[0]}
              latitude={selectedEvent.coordinates[1]}
              anchor="right"
              onClose={() => setSelectedEvent(null)}
              closeButton={false}
              offset={15}
              className="map-event-popup"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => setShowEventDetails(true)}
                style={{
                  width: '240px',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                  cursor: 'pointer'
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.5)'}
                >
                  <X size={18} color="white" />
                </button>

                {/* Event Image */}
                <div style={{ position: 'relative', height: '100px', overflow: 'hidden' }}>
                  <img
                    src={selectedEvent.image}
                    alt={selectedEvent.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: getEventTypeColor(selectedEvent.type),
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedEvent.type}
                  </div>
                </div>

                {/* Event Details */}
                <div style={{ padding: '12px' }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    margin: '0 0 4px 0'
                  }}>
                    {selectedEvent.title}
                  </h3>

                  <p style={{
                    color: '#a78bfa',
                    fontSize: '12px',
                    fontWeight: '600',
                    margin: '0 0 10px 0'
                  }}>
                    {selectedEvent.organization}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#c4b5fd" />
                      <span style={{ color: '#e0e7ff', fontSize: '12px' }}>
                        {(() => {
                          let displayDate = selectedEvent.date;
                          if (typeof displayDate === 'string' && displayDate.includes('T')) {
                            const dateObj = new Date(displayDate);
                            displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }
                          
                          let displayTime = selectedEvent.time;
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#c4b5fd" />
                      <span style={{ color: '#e0e7ff', fontSize: '12px' }}>
                        {selectedEvent.location}
                      </span>
                    </div>
                    {selectedEvent.price > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={14} color="#c4b5fd" />
                        <span style={{ color: '#e0e7ff', fontSize: '12px' }}>
                          ${selectedEvent.price}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleJoinEvent(selectedEvent)}
                      style={{
                        flex: 1,
                        background: (() => {
                          if (isEventJoined(selectedEvent.id)) {
                            return 'linear-gradient(135deg, #10b981, #059669)';
                          }
                          if (isEventAtCapacity(selectedEvent)) {
                            return 'linear-gradient(135deg, #d97706, #ea580c)';
                          }
                          return 'linear-gradient(135deg, #7c3aed, #a855f7)';
                        })(),
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor:
                          isEventJoined(selectedEvent.id) ||
                          (!isEventJoined(selectedEvent.id) && isEventAtCapacity(selectedEvent))
                            ? 'default'
                            : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      title={
                        !isEventJoined(selectedEvent.id) && isEventAtCapacity(selectedEvent)
                          ? 'This event has reached its attendee limit.'
                          : undefined
                      }
                    >
                      {isEventJoined(selectedEvent.id)
                        ? '✓ Joined'
                        : isEventAtCapacity(selectedEvent)
                          ? 'Full'
                          : selectedEvent.price > 0
                            ? `$${selectedEvent.price}`
                            : 'Join'}
                    </button>
                    <button
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.coordinates[1]},${selectedEvent.coordinates[0]}`;
                        window.open(mapsUrl, '_blank');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                      <NavigationIcon size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </Popup>
          )}
        </AnimatePresence>
      </MapboxMap>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            fontSize: '18px'
          }}>
            Map loading...
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div 
        style={{
          position: 'absolute',
          top: '110px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: 'calc(100% - 40px)',
          maxWidth: '600px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'rgba(15, 15, 35, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '12px',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Search Input */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: showFilters ? '12px' : '0' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a78bfa',
                width: '20px',
                height: '20px'
              }} />
              <input
                type="text"
                placeholder="Search events, organizations, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '12px',
                  padding: '14px 16px 14px 48px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.borderColor = '#7c3aed';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                }}
              />
            </div>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: showFilters ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${showFilters ? '#7c3aed' : 'rgba(124, 58, 237, 0.3)'}`,
                borderRadius: '12px',
                padding: '14px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(124, 58, 237, 0.2)'
                }}>
                  {/* Event Type Filter */}
                  <div>
                    <label style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Event Type
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['All', 'SOCIAL', 'PHILANTHROPY', 'SPORTS', 'RECRUITMENT', 'FUNDRAISER', 'FORMAL'].map(type => (
                        <button
                          key={type}
                          onClick={() => setActiveFilter(type)}
                          style={{
                            background: activeFilter === type 
                              ? 'linear-gradient(135deg, #7c3aed, #a855f7)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${activeFilter === type ? '#7c3aed' : 'rgba(255, 255, 255, 0.2)'}`,
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: '600' }}>
                        Max Price
                      </label>
                      <span style={{ color: '#7c3aed', fontSize: '14px', fontWeight: '700' }}>
                        {maxPrice === 0 ? 'Free' : maxPrice === 50 ? 'Any' : `$${maxPrice}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        outline: 'none',
                        background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(maxPrice / 50) * 100}%, rgba(255, 255, 255, 0.2) ${(maxPrice / 50) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        cursor: 'pointer'
                      }}
                      className="price-slider"
                    />
                  </div>

                  {/* Date Filter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: '600' }}>
                        Filter by Date
                      </label>
                      {selectedDate && (
                        <button
                          onClick={() => setSelectedDate('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#fca5a5',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        colorScheme: 'dark',
                        cursor: 'pointer'
                      }}
                    />
                    {selectedDate && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: 'rgba(124, 58, 237, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(124, 58, 237, 0.2)',
                        color: '#c4b5fd',
                        fontSize: '11px'
                      }}>
                        📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Filters Count */}
                  {(activeFilter !== 'All' || maxPrice !== 50 || selectedDate) && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(124, 58, 237, 0.2)'
                    }}>
                      <span style={{ color: '#e0e7ff', fontSize: '11px' }}>
                        {filteredEvents.length} events found
                      </span>
                      <button
                        onClick={() => {
                          setActiveFilter('All');
                          setMaxPrice(50);
                          setSelectedDate('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#a78bfa',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Results */}
          {searchQuery && filteredEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSearchResultClick(event)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                    <h4 style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      {event.title}
                    </h4>
                    <div style={{
                      background: getEventTypeColor(event.type),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {event.type}
                    </div>
                  </div>
                  <p style={{
                    color: '#a78bfa',
                    fontSize: '12px',
                    margin: '0 0 4px 0'
                  }}>
                    {event.organization}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#c4b5fd" />
                    <span style={{ color: '#e0e7ff', fontSize: '12px' }}>
                      {event.location}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* No Results */}
          {searchQuery && filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '12px',
                padding: '20px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}
            >
              No events found for "{searchQuery}"
            </motion.div>
          )}
        </div>
      </div>

      {/* Full Event Details Modal */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: '20px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
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
                  src={selectedEvent.image} 
                  alt={selectedEvent.title} 
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
                  right: '60px',
                  background: getEventTypeColor(selectedEvent.type),
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedEvent.type}
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: '0 0 12px' }}>
                  {selectedEvent.title}
                </h2>
                {(() => {
                  const desc =
                    selectedEvent.description != null
                      ? String(selectedEvent.description).trim()
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
                      Join us for an unforgettable {(selectedEvent.type || 'SOCIAL').toLowerCase()} event hosted by{' '}
                      <button
                        type="button"
                        onClick={() => {
                          const organizationProfile = {
                            name: selectedEvent.organization,
                            type: 'Organization',
                            description: `${selectedEvent.organization} - A Greek organization at ${user?.university || 'Rutgers University'}.`,
                            members: Math.floor(Math.random() * 50) + 60,
                            image: selectedEvent.image
                          };
                          setShowEventDetails(false);
                          setSelectedEvent(null);
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
                        {selectedEvent.organization}
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
                      <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{selectedEvent.date}</p>
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
                      <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{selectedEvent.time}</p>
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
                          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.coordinates[1]},${selectedEvent.coordinates[0]}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#60a5fa'}
                        onMouseLeave={(e) => e.target.style.color = 'white'}
                        title="Click for directions"
                      >
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEvent.id);
                      if (inJ) {
                        handleJoinEvent(selectedEvent);
                        setShowEventDetails(false);
                        return;
                      }
                      if (isEventAtCapacity(selectedEvent)) return;
                      handleJoinEvent(selectedEvent);
                      setShowEventDetails(false);
                    }}
                    style={{
                      flex: 1,
                      background: (() => {
                        const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEvent.id);
                        if (inJ) return 'linear-gradient(135deg, #059669, #10b981)';
                        if (isEventAtCapacity(selectedEvent)) {
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
                        const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEvent.id);
                        if (inJ && selectedEvent.price > 0) return 'default';
                        if (!inJ && isEventAtCapacity(selectedEvent)) return 'default';
                        return 'pointer';
                      })(),
                      transition: 'all 0.3s ease'
                    }}
                    title={
                      !(joinedEvents && joinedEvents.some((e) => e.id === selectedEvent.id)) &&
                      isEventAtCapacity(selectedEvent)
                        ? 'This event has reached its attendee limit.'
                        : undefined
                    }
                  >
                    {(() => {
                      const inJ = joinedEvents && joinedEvents.some((e) => e.id === selectedEvent.id);
                      if (inJ) return 'Joined';
                      if (isEventAtCapacity(selectedEvent)) return 'Full';
                      if (selectedEvent.price > 0) return `Register ($${selectedEvent.price})`;
                      return 'Join Event';
                    })()}
                  </button>
                  
                  <button 
                    onClick={() => {
                      // Share functionality
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapScreen;

