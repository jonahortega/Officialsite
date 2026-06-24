import React, { useState, useEffect } from 'react';
import './HomeScreen.css';
import { isEventAtCapacity } from '../utils/eventCapacity';

const HomeScreen = ({ user, onNavigate, joinedEvents, setJoinedEvents, viewMode, setViewMode, currentMonth, setCurrentMonth }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recipientType, setRecipientType] = useState('person'); // 'person' or 'organization'
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Events data for calendar and map views
  const events = [
    {
      id: 1,
      title: "Summer Formal 2025",
      organization: "Alpha Beta Gamma Fraternity",
      date: "July 5, 2025",
      time: "8:00 PM",
      location: "Grand Ballroom",
      description: "Join us for our annual summer formal celebration with live music, dancing, and great food.",
      attendees: 127,
      maxAttendees: 200,
      image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: true,
      price: 25,
      category: "Social",
      tags: ["formal", "dancing", "music"]
    },
    {
      id: 2,
      title: "Charity Fundraiser Gala",
      organization: "Delta Epsilon Zeta Sorority",
      date: "July 12, 2025",
      time: "6:30 PM",
      location: "Delta Epsilon Zeta House",
      description: "Support breast cancer awareness with our annual philanthropy fundraiser!",
      attendees: 89,
      maxAttendees: 150,
      image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: true,
      price: 35,
      category: "Philanthropy",
      tags: ["charity", "fundraiser", "awareness"]
    },
    {
      id: 3,
      title: "Community Service Day",
      organization: "Theta Iota Kappa Fraternity",
      date: "July 15, 2025",
      time: "9:00 AM",
      location: "Local Community Center",
      description: "Make a positive impact in our community!",
      attendees: 28,
      maxAttendees: 40,
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: false,
      price: null,
      category: "Service",
      tags: ["community", "volunteer", "impact"]
    },
    {
      id: 4,
      title: "Leadership Workshop Series",
      organization: "Greek Life Council",
      date: "July 18, 2025",
      time: "2:00 PM",
      location: "Business School Auditorium",
      description: "Develop essential leadership skills with industry professionals.",
      attendees: 67,
      maxAttendees: 100,
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: true,
      price: 20,
      category: "Leadership",
      tags: ["workshop", "skills", "professional"]
    },
    {
      id: 5,
      title: "Beach Day Social",
      organization: "Alpha Beta Gamma Fraternity",
      date: "July 22, 2025",
      time: "11:00 AM",
      location: "Crystal Beach",
      description: "Fun beach day with games, food, and relaxation!",
      attendees: 45,
      maxAttendees: 60,
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: false,
      price: null,
      category: "Social",
      tags: ["beach", "games", "social"]
    },
    {
      id: 6,
      title: "Study Group - Finals Prep",
      organization: "Academic Excellence Committee",
      date: "July 25, 2025",
      time: "7:00 PM",
      location: "Library Study Room 3",
      description: "Group study session for upcoming finals with tutoring support.",
      attendees: 15,
      maxAttendees: 20,
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: false,
      price: null,
      category: "Academic",
      tags: ["study", "finals", "tutoring"]
    },
    {
      id: 7,
      title: "Greek Games Championship",
      organization: "Intramural Sports Committee",
      date: "July 28, 2025",
      time: "1:00 PM",
      location: "University Stadium",
      description: "Annual inter-fraternity and inter-sorority sports competition.",
      attendees: 180,
      maxAttendees: 250,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: false,
      price: null,
      category: "Sports",
      tags: ["competition", "sports", "greek"]
    },
    {
      id: 8,
      title: "Alumni Networking Night",
      organization: "Professional Greek Association",
      date: "July 30, 2025",
      time: "6:00 PM",
      location: "Alumni Center",
      description: "Connect with Greek alumni for professional development and networking.",
      attendees: 95,
      maxAttendees: 120,
      image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop&crop=center&q=80",
      isPaid: true,
      price: 15,
      category: "Professional",
      tags: ["networking", "career", "alumni"]
    }
  ];

  // Enhanced campus map data with real university maps and coordinates
  const getUniversityMap = (universityName) => {
    const universityMaps = {
      'University of California, Berkeley': {
        image: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "UC Berkeley Campus",
        center: { lat: 37.8716, lng: -122.2727 }
      },
      'Stanford University': {
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "Stanford Campus",
        center: { lat: 37.4275, lng: -122.1697 }
      },
      'UCLA': {
        image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "UCLA Campus",
        center: { lat: 34.0689, lng: -118.4452 }
      },
      'USC': {
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "USC Campus",
        center: { lat: 34.0224, lng: -118.2851 }
      },
      'NYU': {
        image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "NYU Campus",
        center: { lat: 40.7295, lng: -73.9965 }
      },
      'Harvard University': {
        image: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "Harvard Campus",
        center: { lat: 42.3744, lng: -71.1169 }
      },
      'MIT': {
        image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200&h=800&fit=crop&crop=center&q=80",
        name: "MIT Campus",
        center: { lat: 42.3601, lng: -71.0942 }
      }
    };
    
    return universityMaps[universityName] || universityMaps['University of California, Berkeley'];
  };

  const universityMap = getUniversityMap(user?.university);
  
  const campusMap = {
    image: universityMap.image,
    name: universityMap.name,
    center: universityMap.center,
    locations: [
      {
        id: 1,
        name: "Student Union Grand Ballroom",
        x: 65,
        y: 35,
        events: [1],
        description: "Main event venue for large gatherings and formal events",
        coordinates: { lat: universityMap.center.lat + 0.001, lng: universityMap.center.lng - 0.001 },
        address: "Student Union Building, University Ave"
      },
      {
        id: 2,
        name: "Greek Row - Delta Epsilon Zeta House",
        x: 25,
        y: 60,
        events: [2],
        description: "Sorority house and event space for sisterhood events",
        coordinates: { lat: universityMap.center.lat - 0.002, lng: universityMap.center.lng + 0.002 },
        address: "123 Greek Row, Fraternity Way"
      },
      {
        id: 3,
        name: "Community Service Center",
        x: 80,
        y: 70,
        events: [3],
        description: "Off-campus community service and volunteer location",
        coordinates: { lat: universityMap.center.lat + 0.003, lng: universityMap.center.lng + 0.003 },
        address: "456 Community St, Downtown"
      },
      {
        id: 4,
        name: "Business School Auditorium",
        x: 45,
        y: 25,
        events: [4],
        description: "Academic and professional networking events",
        coordinates: { lat: universityMap.center.lat - 0.001, lng: universityMap.center.lng - 0.002 },
        address: "Business School Building, Campus Dr"
      },
      {
        id: 5,
        name: "University Beach & Recreation Area",
        x: 90,
        y: 85,
        events: [5],
        description: "Beach location for outdoor events and recreation",
        coordinates: { lat: universityMap.center.lat + 0.004, lng: universityMap.center.lng + 0.001 },
        address: "Beach Access Rd, Coastal Blvd"
      },
      {
        id: 6,
        name: "Main Library Study Rooms",
        x: 35,
        y: 45,
        events: [6],
        description: "Academic study and tutoring space for students",
        coordinates: { lat: universityMap.center.lat + 0.0005, lng: universityMap.center.lng + 0.0005 },
        address: "Main Library, Academic Quad"
      },
      {
        id: 7,
        name: "University Stadium & Athletic Complex",
        x: 55,
        y: 75,
        events: [7],
        description: "Sports and large outdoor events venue",
        coordinates: { lat: universityMap.center.lat + 0.002, lng: universityMap.center.lng - 0.003 },
        address: "Athletic Complex, Stadium Way"
      },
      {
        id: 8,
        name: "Alumni Center & Conference Hall",
        x: 70,
        y: 20,
        events: [8],
        description: "Professional networking and alumni events",
        coordinates: { lat: universityMap.center.lat - 0.003, lng: universityMap.center.lng + 0.001 },
        address: "Alumni Center, University Blvd"
      }
    ]
  };

  // Helper functions for calendar and map
  const isUserAttending = (eventId) => {
    return joinedEvents.some(event => event.id === eventId);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEventsForDate = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentMonth.getMonth() &&
             eventDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const getMyEventsForDate = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentMonth.getMonth() &&
             eventDate.getFullYear() === currentMonth.getFullYear() &&
             isUserAttending(event.id);
    });
  };

  const getEventsForLocation = (locationId) => {
    return events.filter(event => {
      const location = campusMap.locations.find(loc => loc.id === locationId);
      return location && location.events.includes(event.id);
    });
  };

  // Enhanced map functions
  const handleLocationClick = (location) => {
    setSelectedMapLocation(location);
  };

  const handleCloseLocationModal = () => {
    setSelectedMapLocation(null);
  };

  const openInMaps = (destination) => {
    const { lat, lng } = destination.coordinates;
    const address = destination.address;
    
    // Create the Google Maps directions URL
    const mapsUrl = `https://maps.google.com/maps?daddr=${lat},${lng}&dirflg=w`;
    
    // Try to open in native maps app first (mobile)
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: `Directions to ${destination.name}`,
        text: `Get directions to ${destination.name} at ${address}`,
        url: mapsUrl
      }).catch(() => {
        // If share fails, open directly
        window.open(mapsUrl, '_blank');
      });
    } else {
      // Desktop or fallback - open directly in new tab
      window.open(mapsUrl, '_blank');
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const myEvents = getMyEventsForDate(day);
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentMonth.getMonth() &&
                     new Date().getFullYear() === currentMonth.getFullYear();

      days.push(
        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
          <div className="calendar-day-number">{day}</div>
          
          {/* Show user's RSVP'd events first with special styling */}
          {myEvents.map(event => (
            <div 
              key={`my-${event.id}`} 
              className="calendar-event my-event"
              onClick={() => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
            >
              <div className="calendar-event-title">✓ {event.title}</div>
              <div className="calendar-event-time">{event.time}</div>
            </div>
          ))}
          
          {/* Show other events */}
          {dayEvents.filter(event => !isUserAttending(event.id)).map(event => (
            <div 
              key={event.id} 
              className="calendar-event"
              onClick={() => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
            >
              <div className="calendar-event-title">{event.title}</div>
              <div className="calendar-event-time">{event.time}</div>
            </div>
          ))}
        </div>
      );
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Function to generate feed posts based on user's university
  const generateFeedPosts = (userUniversity) => {
    const university = userUniversity || 'University of California, Berkeley';
    const universityShort = university.includes('UC Berkeley') ? 'UC Berkeley' : 
                           university.includes('Stanford') ? 'Stanford' :
                           university.includes('UCLA') ? 'UCLA' :
                           university.includes('USC') ? 'USC' :
                           university.includes('NYU') ? 'NYU' :
                           university.includes('Harvard') ? 'Harvard' :
                           university.includes('MIT') ? 'MIT' :
                           university.includes('Yale') ? 'Yale' :
                           university.includes('Princeton') ? 'Princeton' :
                           university.includes('Columbia') ? 'Columbia' :
                           university.split(',')[0]; // Use first part of university name

    // Enhanced events data with more event-specific information
    const eventsData = [
      {
        id: 1,
        title: "Summer Formal 2025",
        organization: "Alpha Beta Gamma Fraternity",
        date: "July 5, 2025",
        time: "8:00 PM",
        location: "Grand Ballroom",
        description: "Join us for our annual summer formal celebration with live music, dancing, and great food. Dress to impress and enjoy an unforgettable evening with your Greek family!",
        attendees: 127,
        maxAttendees: 200,
        image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: true,
        price: 25,
        category: "Social",
        tags: ["formal", "dancing", "music"],
        status: "upcoming", // upcoming, ongoing, completed, cancelled
        rsvpDeadline: "July 3, 2025",
        dressCode: "Formal Attire",
        includes: ["Live Music", "Dinner", "Dancing", "Photo Booth"],
        contactInfo: "events@abgfraternity.com"
      },
      {
        id: 2,
        title: "Charity Fundraiser Gala",
        organization: "Delta Epsilon Zeta Sorority",
        date: "July 12, 2025",
        time: "6:30 PM",
        location: "Delta Epsilon Zeta House",
        description: "Support breast cancer awareness with our annual philanthropy fundraiser! Enjoy gourmet food, silent auctions, and inspiring speakers while making a difference.",
        attendees: 89,
        maxAttendees: 150,
        image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: true,
        price: 35,
        category: "Philanthropy",
        tags: ["charity", "fundraiser", "awareness"],
        status: "upcoming",
        rsvpDeadline: "July 10, 2025",
        dressCode: "Cocktail Attire",
        includes: ["Gourmet Dinner", "Silent Auction", "Guest Speakers", "Raffle"],
        contactInfo: "philanthropy@dezsorority.com"
      },
      {
        id: 3,
        title: "Community Service Day",
        organization: "Theta Iota Kappa Fraternity",
        date: "July 15, 2025",
        time: "9:00 AM",
        location: "Local Community Center",
        description: "Make a positive impact in our community! We'll be working on various projects including park cleanup, food bank assistance, and mentoring local youth.",
        attendees: 28,
        maxAttendees: 40,
        image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: false,
        price: null,
        category: "Service",
        tags: ["community", "volunteer", "impact"],
        status: "upcoming",
        rsvpDeadline: "July 13, 2025",
        dressCode: "Casual (Work Clothes)",
        includes: ["Lunch Provided", "Community Service Hours", "T-Shirt"],
        contactInfo: "service@tikfraternity.com"
      },
      {
        id: 4,
        title: "Leadership Workshop Series",
        organization: "Greek Life Council",
        date: "July 18, 2025",
        time: "2:00 PM",
        location: "Business School Auditorium",
        description: "Develop essential leadership skills with industry professionals and interactive workshops. Topics include public speaking, team management, and strategic planning.",
        attendees: 67,
        maxAttendees: 100,
        image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: true,
        price: 20,
        category: "Leadership",
        tags: ["workshop", "skills", "professional"],
        status: "upcoming",
        rsvpDeadline: "July 16, 2025",
        dressCode: "Business Casual",
        includes: ["Workshop Materials", "Certificate", "Networking", "Refreshments"],
        contactInfo: "leadership@greekcouncil.edu"
      },
      {
        id: 5,
        title: "Beach Day Social",
        organization: "Alpha Beta Gamma Fraternity",
        date: "July 22, 2025",
        time: "11:00 AM",
        location: "Crystal Beach",
        description: "Enjoy a perfect day at the beach with your Greek family! We'll have beach games, volleyball, and a BBQ. Don't forget your sunscreen and beach towel!",
        attendees: 156,
        maxAttendees: 200,
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: false,
        price: null,
        category: "Social",
        tags: ["beach", "outdoor", "fun"],
        status: "upcoming",
        rsvpDeadline: "July 20, 2025",
        dressCode: "Beach Casual",
        includes: ["BBQ Lunch", "Beach Games", "Volleyball", "Sunscreen Provided"],
        contactInfo: "social@abgfraternity.com"
      },
      {
        id: 6,
        title: "Study Session & Academic Support",
        organization: "Theta Iota Kappa Fraternity",
        date: "July 25, 2025",
        time: "7:00 PM",
        location: "Library Study Room 3",
        description: "Join our weekly academic support session! Bring your books and questions. We'll have tutors available for various subjects and quiet study spaces.",
        attendees: 45,
        maxAttendees: 50,
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: false,
        price: null,
        category: "Academic",
        tags: ["study", "tutoring", "academic"],
        status: "upcoming",
        rsvpDeadline: "July 23, 2025",
        dressCode: "Casual",
        includes: ["Tutoring Support", "Study Materials", "Snacks", "Quiet Space"],
        contactInfo: "academic@tikfraternity.com"
      },
      {
        id: 7,
        title: "Greek Olympics",
        organization: "Greek Life Council",
        date: "July 28, 2025",
        time: "10:00 AM",
        location: "University Stadium",
        description: "Compete in the annual Greek Olympics! Events include tug-of-war, relay races, and team challenges. Show your Greek pride and win bragging rights!",
        attendees: 234,
        maxAttendees: 300,
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: false,
        price: null,
        category: "Social",
        tags: ["competition", "sports", "team"],
        status: "upcoming",
        rsvpDeadline: "July 26, 2025",
        dressCode: "Athletic Wear",
        includes: ["Team Registration", "Trophies", "Refreshments", "Greek Pride"],
        contactInfo: "olympics@greekcouncil.edu"
      },
      {
        id: 8,
        title: "Career Networking Mixer",
        organization: "Professional Greek Association",
        date: "July 30, 2025",
        time: "6:00 PM",
        location: "Alumni Center",
        description: "Connect with Greek alumni and industry professionals! Perfect opportunity for internships, job opportunities, and professional development.",
        attendees: 78,
        maxAttendees: 120,
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&crop=center&q=80",
        isPaid: true,
        price: 15,
        category: "Professional",
        tags: ["networking", "career", "alumni"],
        status: "upcoming",
        rsvpDeadline: "July 28, 2025",
        dressCode: "Business Professional",
        includes: ["Networking Session", "Resume Review", "Alumni Panel", "Hors d'oeuvres"],
        contactInfo: "career@profgreek.org"
      }
    ];

    // Convert events to enhanced feed posts with event-specific features
    return eventsData.map((event, index) => {
      const captions = [
        `🎉 NEW EVENT: ${event.title} is coming up! ${event.description.split('.')[0]}. Don't miss out on this amazing opportunity! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `📅 EVENT ALERT: ${event.title} - ${event.date} at ${event.time}! ${event.description.split('.')[0]}. RSVP now! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `🔥 HOT EVENT: ${event.title} is happening soon! ${event.description.split('.')[0]}. Limited spots available! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `🌟 FEATURED EVENT: ${event.title} - ${event.date}! ${event.description.split('.')[0]}. Join us for an unforgettable experience! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `⚡ EVENT UPDATE: ${event.title} is approaching! ${event.description.split('.')[0]}. Get your tickets now! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `🎯 SPECIAL EVENT: ${event.title} - ${event.date}! ${event.description.split('.')[0]}. Perfect for your goals! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `🏆 PREMIUM EVENT: ${event.title} is coming! ${event.description.split('.')[0]}. Show your Greek pride! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`,
        `💼 PROFESSIONAL EVENT: ${event.title} - ${event.date}! ${event.description.split('.')[0]}. Great networking opportunity! #${event.category} #GreekLife #${universityShort.replace(/\s+/g, '')}`
      ];

      // Use the same organization profile images as shown in organization profiles
      const organizationAvatars = {
        "Alpha Beta Gamma Fraternity": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop",
        "Delta Epsilon Zeta Sorority": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        "Theta Iota Kappa Fraternity": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        "Greek Life Council": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop",
        "Professional Greek Association": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=150&h=150&fit=crop&crop=center&q=80",
        "Computer Science Club": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=400&fit=crop",
        "Mathematics Club": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=400&fit=crop"
      };

      const organizationTypes = {
        "Alpha Beta Gamma Fraternity": "Fraternity",
        "Delta Epsilon Zeta Sorority": "Sorority",
        "Theta Iota Kappa Fraternity": "Fraternity",
        "Greek Life Council": "Council",
        "Professional Greek Association": "Professional Association"
      };

      // Calculate event urgency and status
      const eventDate = new Date(event.date);
      const now = new Date();
      const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
      
      let urgencyLevel = 'normal';
      if (daysUntilEvent <= 1) urgencyLevel = 'urgent';
      else if (daysUntilEvent <= 3) urgencyLevel = 'soon';
      else if (daysUntilEvent <= 7) urgencyLevel = 'upcoming';

      // Calculate attendance percentage
      const attendancePercentage = Math.round((event.attendees / event.maxAttendees) * 100);
      let capacityStatus = 'available';
      if (attendancePercentage >= 90) capacityStatus = 'almost-full';
      else if (attendancePercentage >= 100) capacityStatus = 'full';

      return {
        id: event.id,
        type: 'event',
        author: {
          name: event.organization,
          avatar: organizationAvatars[event.organization] || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=150&h=150&fit=crop&crop=center&q=80",
          isOrganization: true,
          university: university,
          organization: organizationTypes[event.organization] || "Organization"
        },
        content: {
          caption: captions[index % captions.length],
          image: event.image,
          eventDetails: {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            description: event.description,
            isPaid: event.isPaid,
            price: event.price,
            attendees: event.attendees,
            maxAttendees: event.maxAttendees,
            category: event.category,
            // Enhanced event details
            status: event.status,
            rsvpDeadline: event.rsvpDeadline,
            dressCode: event.dressCode,
            includes: event.includes,
            contactInfo: event.contactInfo,
            tags: event.tags,
            urgencyLevel: urgencyLevel,
            capacityStatus: capacityStatus,
            attendancePercentage: attendancePercentage,
            daysUntilEvent: daysUntilEvent
          }
        },
        likes: Math.floor(Math.random() * 200) + 50,
        comments: [
          {
            id: 1,
            author: 'Sarah Johnson',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
            text: 'Can\'t wait for this! Already got my ticket!',
            timestamp: '1 hour ago'
          },
          {
            id: 2,
            author: 'Michael Chen',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            text: 'This is going to be epic! Who else is going?',
            timestamp: '30 minutes ago'
          }
        ],
        shares: Math.floor(Math.random() * 50) + 10,
        timestamp: index === 0 ? '2 hours ago' : 
                   index === 1 ? '4 hours ago' :
                   index === 2 ? '6 hours ago' :
                   index === 3 ? '8 hours ago' :
                   index === 4 ? '12 hours ago' :
                   index === 5 ? '18 hours ago' :
                   '24 hours ago',
        timestampValue: index === 0 ? 2 : 
                       index === 1 ? 4 :
                       index === 2 ? 6 :
                       index === 3 ? 8 :
                       index === 4 ? 12 :
                       index === 5 ? 18 :
                       24,
        isLiked: false,
        isSaved: false,
        // Event-specific engagement
        rsvpCount: event.attendees,
        interestedCount: Math.floor(Math.random() * 100) + 20,
        isUserRSVPd: false, // Will be updated based on user's RSVPs
        isUserInterested: false
      };
    });
  };

  const [feedPosts, setFeedPosts] = useState(() => {
    const posts = generateFeedPosts(user?.university);
    return posts.sort((a, b) => a.timestampValue - b.timestampValue); // Sort chronologically (newest first)
  });

  // Update feed when user's university changes
  useEffect(() => {
    const posts = generateFeedPosts(user?.university);
    setFeedPosts(posts.sort((a, b) => a.timestampValue - b.timestampValue)); // Sort chronologically (newest first)
  }, [user?.university]);

  // Mock data for share recipients
  const shareRecipients = {
    people: [
      { id: 1, name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', university: user?.university || 'University of California, Berkeley' },
      { id: 2, name: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', university: user?.university || 'University of California, Berkeley' },
      { id: 3, name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', university: user?.university || 'University of California, Berkeley' },
      { id: 4, name: 'Jessica Lee', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', university: user?.university || 'University of California, Berkeley' },
      { id: 5, name: 'David Rodriguez', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', university: user?.university || 'University of California, Berkeley' }
    ],
    organizations: [
      { id: 1, name: 'Alpha Beta Gamma', avatar: '🏛️', type: 'Fraternity', university: user?.university || 'University of California, Berkeley' },
      { id: 2, name: 'Delta Epsilon Zeta', avatar: '🏛️', type: 'Sorority', university: user?.university || 'University of California, Berkeley' },
      { id: 3, name: 'Theta Iota Kappa', avatar: '🏛️', type: 'Fraternity', university: user?.university || 'University of California, Berkeley' },
      { id: 4, name: 'Lambda Mu Nu', avatar: '🏛️', type: 'Sorority', university: user?.university || 'University of California, Berkeley' },
      { id: 5, name: 'Sigma Tau Upsilon', avatar: '🏛️', type: 'Fraternity', university: user?.university || 'University of California, Berkeley' }
    ]
  };

  const handleLike = (postId) => {
    // In a real app, this would update the backend
    console.log('Liked post:', postId);
    // Toggle the liked state for the specific post
    const updatedPosts = feedPosts.map(post => 
      post.id === postId ? { ...post, isLiked: !post.isLiked } : post
    );
    setFeedPosts(updatedPosts);
  };

  const handleComment = (postId) => {
    const post = feedPosts.find(p => p.id === postId);
    setSelectedPost(post);
    setShowComments(true);
  };

  const handleShare = (postId) => {
    const post = feedPosts.find(p => p.id === postId);
    setSharePost(post);
    setShowShareModal(true);
    setShareMessage('');
    setSelectedRecipient('');
    setRecipientType('person');
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSharePost(null);
    setShareMessage('');
    setSelectedRecipient('');
  };

  const handleSendShare = () => {
    if (selectedRecipient && sharePost) {
      // In a real app, this would send the share to the backend
      console.log('Sharing post:', sharePost.id, 'to:', selectedRecipient, 'type:', recipientType, 'message:', shareMessage);
      // Post shared successfully - silent
      closeShareModal();
    } else {
      console.log('Recipient required');
    }
  };

  const handleSave = (postId) => {
    // In a real app, this would update the backend
    console.log('Save post:', postId);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      // In a real app, this would add the comment to the backend
      console.log('Adding comment:', newComment);
      setNewComment('');
    }
  };

  const closeComments = () => {
    setShowComments(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const handleEventClick = (eventId) => {
    onNavigate('events');
  };

  const handleLearnMore = (eventDetails, post) => {
    setSelectedEvent({ ...eventDetails, post });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleEventRSVP = (event = null) => {
    // Use passed event or fall back to selectedEvent
    const eventToProcess = event || selectedEvent;
    
    if (!eventToProcess) {
      console.error('No event provided to handleEventRSVP');
      return;
    }

    const already = joinedEvents?.some((e) => e.id === eventToProcess.id);
    if (!already && isEventAtCapacity(eventToProcess)) return;
    
    // Handle RSVP logic here
    console.log('Join for event:', eventToProcess);
    console.log('isPaid:', eventToProcess.isPaid);
    console.log('price:', eventToProcess.price);
    
    // If it's a paid event, show payment modal
    if (eventToProcess.isPaid || eventToProcess.price) {
      console.log('Showing payment modal');
      setSelectedEvent(eventToProcess);
      setShowPaymentModal(true);
      setShowEventModal(false);
    } else {
      console.log('Closing modal - free event');
      // For free events, add to joined events and close modal
      addToJoinedEvents(eventToProcess);
      if (selectedEvent) {
        closeEventModal();
      }
    }
  };

  const addToJoinedEvents = (event) => {
    if (!event) {
      console.error('No event provided to addToJoinedEvents');
      return;
    }
    if (isEventAtCapacity(event) && !joinedEvents?.some((e) => e.id === event.id)) return;

    const eventWithId = {
      ...event,
      id: event.id || `event_${Date.now()}`,
      joinedAt: new Date().toISOString()
    };
    
    setJoinedEvents(prev => {
      // Check if event is already joined
      const isAlreadyJoined = prev.some(e => e.id === eventWithId.id);
      if (isAlreadyJoined) {
        return prev;
      }
      return [...prev, eventWithId];
    });
    
    console.log('Added to joined events:', eventWithId);
    // Successfully joined the event - silent
  };

  const handleEventShare = () => {
    // Create a post object for sharing if it doesn't exist
    const eventPost = selectedEvent.post || {
      id: selectedEvent.id,
      content: selectedEvent.image || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop',
      caption: `${selectedEvent.title} - ${selectedEvent.description}`,
      author: {
        name: selectedEvent.organization || 'Unknown Organization',
        avatar: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop'
      }
    };
    setSharePost(eventPost);
    setShowEventModal(false);
    setShowShareModal(true);
  };

  // Event-specific action handlers
  const handleRSVP = (postId) => {
    setFeedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, isUserRSVPd: !post.isUserRSVPd }
          : post
      )
    );
    console.log('RSVP toggled for post:', postId);
  };

  const handleInterested = (postId) => {
    setFeedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, isUserInterested: !post.isUserInterested }
          : post
      )
    );
    console.log('Interested toggled for post:', postId);
  };

  const handleActionClick = (action) => {
    onNavigate(action);
  };



  const renderFeedPost = (post) => (
    <div key={post.id} className="feed-post">
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author">
          <div className="author-avatar">
            {post.author.isOrganization ? (
              <>
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="org-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="avatar-fallback org-fallback" style={{ display: 'none' }}>
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
              </>
            ) : (
              <>
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="avatar-fallback" style={{ display: 'none' }}>
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
              </>
            )}
          </div>
          <div className="author-info">
            <h4 className="author-name">{post.author.name}</h4>
            <p className="author-details">
              {post.author.university}
              {post.author.organization && !post.author.isOrganization && (
                <span className="author-org"> • {post.author.organization}</span>
              )}
            </p>
          </div>
        </div>
        <div className="post-actions">
          {post.content.eventDetails ? (
            <button 
              className="event-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLearnMore(post.content.eventDetails, post);
              }}
            >
              Event
            </button>
          ) : (
            <button className="post-action-btn">⋯</button>
          )}
        </div>
      </div>

      {/* Post Image */}
      {post.content.image && (
        <div className="post-image-container">
          <img 
            src={post.content.image} 
            alt="Post content"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="image-error">Image not available</div>';
            }}
          />
        </div>
      )}

      {/* Post Content */}
      <div className="post-content">
        {/* Caption */}
        <div className="post-caption">
          <span className="caption-author">{post.author.name}</span>
          <span className="caption-text">{post.content.caption}</span>
        </div>

        {/* Simple Event Indicator */}
        {post.content.eventDetails && (
          <div className="event-indicator">
            <span className="event-icon">📅</span>
            <span className="event-text">Event: {post.content.eventDetails.title}</span>
          </div>
        )}


      </div>

      {/* Post Actions */}
      <div className="post-actions-bar">
        <div className="action-buttons">
          <button 
            className={`action-btn ${post.isLiked ? 'liked' : ''}`}
            onClick={() => handleLike(post.id)}
          >
            <span className="action-icon">{post.isLiked ? '❤️' : '🤍'}</span>
          </button>
          <button className="action-btn" onClick={() => handleComment(post.id)}>
            <span className="action-icon">💬</span>
          </button>
          <button className="action-btn" onClick={() => handleShare(post.id)}>
            <span className="action-icon">📤</span>
          </button>
          

        </div>
      </div>

      {/* Post Stats */}
      <div className="post-stats">
        <span className="likes-count">{post.likes} likes</span>
        <span className="post-time">{post.timestamp}</span>
      </div>
    </div>
  );

  return (
    <div className="home-screen">
      {/* DM Button in Top Right - Fixed Position */}
      <button 
        className="dm-button"
        onClick={() => onNavigate('messages')}
        title="Direct Messages"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#ffffff',
          border: '2px solid #667eea',
          borderRadius: '14px',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(102, 126, 234, 0.2)',
          color: '#667eea',
          padding: '0',
          transition: 'all 0.3s ease'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <div className="home-content">
        {viewMode === 'list' && (
          <div className="shotgun-events-feed">
            {feedPosts.filter(post => post.content.eventDetails).map(post => (
              <div key={post.id} className="shotgun-event-card" onClick={() => handleLearnMore(post.content.eventDetails, post)}>
                <div className="shotgun-event-image">
                  <img src={post.content.image} alt={post.content.eventDetails.title} />
                  <div className="shotgun-event-overlay">
                    <div className="shotgun-event-badges">
                      {post.content.eventDetails.isPaid && (
                        <div className="shotgun-price-badge">${post.content.eventDetails.price}</div>
                      )}
                      {isUserAttending(post.content.eventDetails.id) && (
                        <div className="shotgun-attending-badge">✓</div>
                      )}
                    </div>
                    <div className="shotgun-event-actions">
                      <button 
                        className="shotgun-share-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(post.id);
                        }}
                      >
                        📤
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="shotgun-event-content">
                  <div className="shotgun-event-header">
                    <div className="shotgun-event-org">{post.author.name}</div>
                    <div className="shotgun-event-category">{post.content.eventDetails.category}</div>
                  </div>
                  
                  <h3 className="shotgun-event-title">{post.content.eventDetails.title}</h3>
                  
                  <div className="shotgun-event-meta">
                    <div className="shotgun-event-details">
                      <span className="shotgun-event-date">{post.content.eventDetails.date}, {post.content.eventDetails.time}</span>
                      <span className="shotgun-event-location">{post.content.eventDetails.location}</span>
                    </div>
                  </div>
                  
                  <div className="shotgun-event-actions-bottom">
                    <button 
                      className={`shotgun-rsvp-btn ${isUserAttending(post.content.eventDetails.id) ? 'attending' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventRSVP(post.content.eventDetails);
                      }}
                      disabled={
                        !isUserAttending(post.content.eventDetails.id) &&
                        isEventAtCapacity(post.content.eventDetails)
                      }
                    >
                      {isUserAttending(post.content.eventDetails.id)
                        ? '✓ Attending'
                        : isEventAtCapacity(post.content.eventDetails)
                          ? 'Full'
                          : 'Join Event'}
                    </button>
                    <button 
                      className="shotgun-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLearnMore(post.content.eventDetails, post);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="events-calendar">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
              <h2>{formatDate(currentMonth)}</h2>
              <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
            </div>
            <div className="calendar-weekdays">
              <div className="weekday">Sun</div>
              <div className="weekday">Mon</div>
              <div className="weekday">Tue</div>
              <div className="weekday">Wed</div>
              <div className="weekday">Thu</div>
              <div className="weekday">Fri</div>
              <div className="weekday">Sat</div>
            </div>
            <div className="calendar-grid">
              {renderCalendar()}
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="events-map">
            <div className="map-header">
              <h2>{campusMap.name} Map</h2>
              <p>Click on locations to see events and get directions</p>
            </div>
            <div className="map-container">
              <div className="campus-map-image">
                <img src={campusMap.image} alt={campusMap.name} />
                {campusMap.locations.map(location => {
                  const locationEvents = getEventsForLocation(location.id);
                  return (
                    <div
                      key={location.id}
                      className={`map-marker ${locationEvents.length > 0 ? 'has-events' : 'no-events'}`}
                      style={{
                        left: `${location.x}%`,
                        top: `${location.y}%`
                      }}
                      onClick={() => handleLocationClick(location)}
                    >
                      <div className="marker-pin">
                        <span className="marker-icon">📍</span>
                        {locationEvents.length > 0 && (
                          <span className="event-count">{locationEvents.length}</span>
                        )}
                      </div>
                      <div className="marker-tooltip">
                        <h4>{location.name}</h4>
                        <p>{locationEvents.length} event{locationEvents.length !== 1 ? 's' : ''}</p>
                        <small>Click for details & directions</small>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      {showComments && selectedPost && (
        <div className="comments-modal-overlay" onClick={closeComments}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comments-modal-header">
              <h3>Comments</h3>
              <button className="close-btn" onClick={closeComments}>×</button>
            </div>
            
            <div className="comments-modal-content">
              <div className="post-preview">
                <div className="post-preview-header">
                  <div className="post-preview-author">
                    <div className="post-preview-avatar">
                      {selectedPost.author.isOrganization ? (
                        <span className="org-avatar">{selectedPost.author.avatar}</span>
                      ) : (
                        <img src={selectedPost.author.avatar} alt={selectedPost.author.name} />
                      )}
                    </div>
                    <div className="post-preview-info">
                      <h4>{selectedPost.author.name}</h4>
                      <p>{selectedPost.content.caption.substring(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="comments-list">
                {(selectedPost.comments || []).map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      <img src={comment.avatar} alt={comment.author} />
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{comment.author}</span>
                        <span className="comment-time">{comment.timestamp}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-comment-section">
                <div className="comment-input-container">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="comment-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button 
                    className="comment-submit-btn"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && sharePost && (
        <div className="share-modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Post</h3>
              <button className="close-btn" onClick={closeShareModal}>×</button>
            </div>
            
            <div className="share-modal-content">
              {/* Post Preview */}
              <div className="share-post-preview">
                <div className="share-post-header">
                  <div className="share-post-author">
                    <div className="share-post-avatar">
                      {sharePost.author.isOrganization ? (
                        <span className="org-avatar">{sharePost.author.avatar}</span>
                      ) : (
                        <img src={sharePost.author.avatar} alt={sharePost.author.name} />
                      )}
                    </div>
                    <div className="share-post-info">
                      <h4>{sharePost.author.name}</h4>
                      <p>{sharePost.content.caption.substring(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Type Selection */}
              <div className="share-recipient-type">
                <label>
                  <input
                    type="radio"
                    name="recipientType"
                    value="person"
                    checked={recipientType === 'person'}
                    onChange={(e) => setRecipientType(e.target.value)}
                  />
                  Share with Person
                </label>
                <label>
                  <input
                    type="radio"
                    name="recipientType"
                    value="organization"
                    checked={recipientType === 'organization'}
                    onChange={(e) => setRecipientType(e.target.value)}
                  />
                  Share with Organization
                </label>
              </div>

              {/* Recipient Selection */}
              <div className="share-recipient-selection">
                <label>Select Recipient:</label>
                <select 
                  value={selectedRecipient} 
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="share-recipient-select"
                >
                  <option value="">Choose a {recipientType}...</option>
                  {recipientType === 'person' 
                    ? shareRecipients.people.map(person => (
                        <option key={person.id} value={person.name}>
                          {person.name} - {person.university}
                        </option>
                      ))
                    : shareRecipients.organizations.map(org => (
                        <option key={org.id} value={org.name}>
                          {org.name} ({org.type}) - {org.university}
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* Message Input */}
              <div className="share-message-input">
                <label>Add a message (optional):</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  className="share-message-textarea"
                  rows="3"
                />
              </div>

              {/* Share Button */}
              <div className="share-actions">
                <button 
                  className="share-send-btn"
                  onClick={handleSendShare}
                  disabled={!selectedRecipient}
                >
                  Send Share
                </button>
                <button 
                  className="share-cancel-btn"
                  onClick={closeShareModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="event-modal-overlay" onClick={closeEventModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <h3>Event Details</h3>
              <button className="modal-close-btn" onClick={closeEventModal}>×</button>
            </div>
            
            <div className="event-modal-content">
              <div className="event-modal-top-section">
                {/* Event Image */}
                {selectedEvent.image && (
                  <div className="event-modal-image">
                    <img src={selectedEvent.image} alt={selectedEvent.title} />
                  </div>
                )}
                
                <div className="event-modal-title-section">
                  <h2 className="event-modal-title">{selectedEvent.title}</h2>
                  <div className="event-modal-description-top">
                    <p>{selectedEvent.description || 'Join us for an unforgettable experience at this exciting event!'}</p>
                  </div>
                </div>
              </div>
              
              <div className="event-modal-details">
                <div className="event-modal-details-grid">
                  <div className="event-modal-detail-item">
                    <div>
                      <label>Date & Time</label>
                      <span>{selectedEvent.date}, {selectedEvent.time}</span>
                    </div>
                  </div>
                  
                  <div className="event-modal-detail-item">
                    <div>
                      <label>Location</label>
                      <span>{selectedEvent.location}</span>
                    </div>
                  </div>
                  
                  <div className="event-modal-detail-item">
                    <div>
                      <label>Organization</label>
                      <span>{selectedEvent.post?.author?.name || selectedEvent.organization || 'Unknown Organization'}</span>
                    </div>
                  </div>
                  
                  <div className="event-modal-detail-item">
                    <div>
                      <label>Category</label>
                      <span>{selectedEvent.category || 'Social Event'}</span>
                    </div>
                  </div>
                  
                  {selectedEvent.isPaid && (
                    <div className="event-modal-detail-item">
                      <div>
                        <label>Price</label>
                        <span>${selectedEvent.price}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="event-modal-actions">
                  <button 
                    className={`event-modal-rsvp-btn ${isUserAttending(selectedEvent.id) ? 'attending' : ''}`}
                    onClick={() => handleEventRSVP(selectedEvent)}
                    disabled={
                      !isUserAttending(selectedEvent.id) && isEventAtCapacity(selectedEvent)
                    }
                  >
                    {isUserAttending(selectedEvent.id)
                      ? '✓ Joined'
                      : isEventAtCapacity(selectedEvent)
                        ? 'Full'
                        : 'RSVP'}
                  </button>
                  <button 
                    className="event-modal-share-btn"
                    onClick={handleEventShare}
                  >
                    📤 Share Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Payment Modal */}
      
      {showPaymentModal && selectedEvent && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h3>Select Payment Method</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            
            <div className="payment-modal-content">
              <div className="payment-event-info">
                <h4>Event Details</h4>
                              <p><strong>Date & Time:</strong> {selectedEvent.date}, {selectedEvent.time}</p>
                <p><strong>Location:</strong> {selectedEvent.location}</p>
              </div>
              
              <div className="payment-amount">
                <div className="amount-label">Total Amount:</div>
                <div className="amount-value">${selectedEvent.price}</div>
              </div>
              
              <div className="payment-methods">
                <div 
                  className={`payment-method-option ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  <div className="payment-method-icon">💳</div>
                  <div className="payment-method-text">Credit/Debit Card</div>
                </div>
                <div 
                  className={`payment-method-option ${selectedPaymentMethod === 'paypal' ? 'selected' : ''}`}
                  onClick={() => setSelectedPaymentMethod('paypal')}
                >
                  <div className="payment-method-icon">📱</div>
                  <div className="payment-method-text">PayPal</div>
                </div>

              </div>
              
              <div className="payment-actions">
                <button 
                  className={`pay-btn ${!selectedPaymentMethod ? 'disabled' : ''}`} 
                  onClick={() => {
                    if (selectedPaymentMethod) {
                      // Payment processed successfully - silent
                      addToJoinedEvents(selectedEvent);
                      setShowPaymentModal(false);
                      setSelectedEvent(null);
                      setSelectedPaymentMethod(null);
                    } else {
                      console.log('Payment method required');
                    }
                  }}
                  disabled={!selectedPaymentMethod}
                >
                  Pay ${selectedEvent.price}
                </button>
                <button className="cancel-btn" onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentMethod(null);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Details Modal */}
      {selectedMapLocation && (
        <div className="event-modal-overlay" onClick={handleCloseLocationModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <h3>Location Details</h3>
              <button className="modal-close-btn" onClick={handleCloseLocationModal}>×</button>
            </div>
            
            <div className="event-modal-content">
              <div className="event-modal-header-info">
                <div className="event-title-section">
                  <h2 className="event-modal-title">{selectedMapLocation.name}</h2>
                  <span className="event-modal-type-badge">📍 Location</span>
                </div>
              </div>
              
              <div className="event-modal-grid">
                <div className="event-modal-info-item">
                  <div className="event-modal-info-content">
                    <span className="event-modal-label">Address</span>
                    <span className="event-modal-value">{selectedMapLocation.address}</span>
                  </div>
                </div>
                
                <div className="event-modal-info-item">
                  <div className="event-modal-info-content">
                    <span className="event-modal-label">Description</span>
                    <span className="event-modal-value">{selectedMapLocation.description}</span>
                  </div>
                </div>
                
                <div className="event-modal-info-item">
                  <div className="event-modal-info-content">
                    <span className="event-modal-label">Events</span>
                    <span className="event-modal-value">
                      {getEventsForLocation(selectedMapLocation.id).length} upcoming event{getEventsForLocation(selectedMapLocation.id).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="event-modal-info-item">
                  <div className="event-modal-info-content">
                    <span className="event-modal-label">Coordinates</span>
                    <span className="event-modal-value">
                      {selectedMapLocation.coordinates.lat.toFixed(6)}, {selectedMapLocation.coordinates.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="event-modal-description">
                <h4>Upcoming Events at this Location</h4>
                {getEventsForLocation(selectedMapLocation.id).length > 0 ? (
                  <div className="location-events-list">
                    {getEventsForLocation(selectedMapLocation.id).map(event => (
                      <div key={event.id} className="location-event-item">
                        <div className="location-event-info">
                          <h5>{event.title}</h5>
                          <p>{event.date} at {event.time}</p>
                          <p className="event-organization">by {event.organization}</p>
                        </div>
                        <button 
                          className="event-details-btn"
                          onClick={() => {
                            // Create a proper event object that matches the expected structure
                            const eventObject = {
                              ...event,
                              post: {
                                author: {
                                  name: event.organization
                                }
                              }
                            };
                            setSelectedEvent(eventObject);
                            setShowEventModal(true);
                            handleCloseLocationModal();
                          }}
                        >
                          View Event
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No upcoming events scheduled at this location.</p>
                )}
              </div>

              <div className="event-modal-actions">
                <button 
                  className="event-modal-share-btn"
                  onClick={() => openInMaps(selectedMapLocation)}
                >
                  🗺️ Open in Maps
                </button>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen; 