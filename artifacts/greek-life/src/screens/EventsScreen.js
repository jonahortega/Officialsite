import React, { useState } from 'react';
import { isEventAtCapacity } from '../utils/eventCapacity';
import './EventsScreen.css';

const EventsScreen = ({ 
  user, 
  onNavigate, 
  navigationData, 
  joinedEvents = [], 
  setJoinedEvents = () => {},
  searchTerm = '',
  setSearchTerm = () => {},
  searchCategory = 'all',
  setSearchCategory = () => {},
  searchSortBy = 'date',
  setSearchSortBy = () => {},
  showMyEvents = false,
  setShowMyEvents = () => {},
  activeTab = 'events',
  setActiveTab = () => {},
  searchType = 'both',
  setSearchType = () => {}
}) => {
  // Handle navigation data to set search type
  React.useEffect(() => {
    if (navigationData && navigationData.searchType) {
      // Update the search type in the parent component
      if (setSearchType) {
        setSearchType(navigationData.searchType);
      }
    }
  }, [navigationData, setSearchType]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [rsvpProcessing, setRsvpProcessing] = useState(new Set());
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEvent, setShareEvent] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recipientType, setRecipientType] = useState('person');

  const events = [
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
      tags: ["formal", "dancing", "music"]
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
      tags: ["charity", "fundraiser", "awareness"]
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
      tags: ["community", "volunteer", "impact"]
    }
  ];

  // Mock organizations data
  const organizations = [
    {
      id: 'org-1',
      name: 'Alpha Beta Gamma Fraternity',
      type: 'fraternity',
      category: 'Social',
      description: 'Building better men through brotherhood, scholarship, and service.',
      members: 45,
      image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=400&fit=crop',
      founded: '1920',
      gpa: '3.2',
      events: [1, 5]
    },
    {
      id: 'org-2',
      name: 'Delta Epsilon Zeta Sorority',
      type: 'sorority',
      category: 'Philanthropy',
      description: 'Empowering women through leadership, scholarship, and service.',
      members: 38,
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop',
      founded: '1925',
      gpa: '3.4',
      events: [2]
    },
    {
      id: 'org-3',
      name: 'Theta Iota Kappa Fraternity',
      type: 'fraternity',
      category: 'Service',
      description: 'Dedicated to community service and leadership development.',
      members: 32,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      founded: '1930',
      gpa: '3.1',
      events: [3]
    }
  ];

  // Share recipients data
  const shareRecipients = {
    people: [
      { id: 1, name: 'Sarah Johnson', university: 'University of California' },
      { id: 2, name: 'Mike Chen', university: 'Stanford University' }
    ],
    organizations: [
      { id: 1, name: 'Alpha Beta Gamma', type: 'Fraternity', university: 'University of California' },
      { id: 2, name: 'Delta Epsilon Zeta', type: 'Sorority', university: 'Stanford University' }
    ]
  };

  // Filter events based on search
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = searchCategory === 'all' || event.category.toLowerCase() === searchCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = searchCategory === 'all' || 
                           (searchCategory === 'fraternity' && org.type === 'fraternity') ||
                           (searchCategory === 'sorority' && org.type === 'sorority');
    return matchesSearch && matchesCategory;
  });

  // Combined search results with organizations first
  const combinedResults = [
    ...filteredOrganizations.map(org => ({ ...org, type: 'organization' })),
    ...filteredEvents.map(event => ({ ...event, type: 'event' }))
  ];

  const isUserAttending = (eventId) => {
    return joinedEvents.some(event => event.id === eventId);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setShowPaymentModal(false);
  };

  const handleRSVP = (event) => {
    setRsvpProcessing(prev => new Set(prev).add(event.id));
    
    setTimeout(() => {
      if (isUserAttending(event.id)) {
        setJoinedEvents(prev => prev.filter(e => e.id !== event.id));
      } else {
        if (isEventAtCapacity(event)) {
          setRsvpProcessing((prev) => {
            const newSet = new Set(prev);
            newSet.delete(event.id);
            return newSet;
          });
          return;
        }
        setJoinedEvents(prev => [...prev, event]);
      }
        setRsvpProcessing(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id);
          return newSet;
        });
    }, 1000);
  };

  const handleShare = (event) => {
    setShareEvent(event);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareEvent(null);
    setShareMessage('');
    setSelectedRecipient('');
  };

  const handleSendShare = () => {
    // Handle share logic here
    console.log('Sharing event:', shareEvent.title, 'with:', selectedRecipient, 'message:', shareMessage);
      closeShareModal();
  };

  const renderSearchResult = (item) => {
    if (item.type === 'organization') {
      return (
        <div key={item.id} className="organization-search-item" onClick={() => onNavigate('organization-profile', { organization: item })}>
          <div className="org-search-avatar">
            <img 
              src={item.image} 
              alt={item.name}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="org-avatar-fallback" style={{ display: 'none' }}>
              <span className="fallback-icon">🏛️</span>
            </div>
          </div>
          
          <div className="org-search-info">
            <div className="org-search-name">{item.name}</div>
            <div className="org-search-members">{item.members} members</div>
            </div>
          
          <div className="org-search-actions">
            <button 
              className="org-search-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('organization-profile', { organization: item });
              }}
            >
              Visit
            </button>
            </div>
        </div>
      );
    } else {
  return (
        <div key={item.id} className="shotgun-event-card" onClick={() => handleEventClick(item)}>
                    <div className="shotgun-event-image">
            <img src={item.image} alt={item.title} />
                      <div className="shotgun-event-overlay">
                        <div className="shotgun-event-badges">
                {item.isPaid && (
                  <div className="shotgun-price-badge">${item.price}</div>
                          )}
                {isUserAttending(item.id) && (
                            <div className="shotgun-attending-badge">✓</div>
                          )}
                        </div>
                        <div className="shotgun-event-actions">
                          <button 
                            className="shotgun-share-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                    handleShare(item);
                            }}
                          >
                            📤
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shotgun-event-content">
                      <div className="shotgun-event-header">
              <div className="shotgun-event-org">{item.organization}</div>
              <div className="shotgun-event-category">{item.category}</div>
                      </div>
                      
            <h3 className="shotgun-event-title">{item.title}</h3>
                      
                      <div className="shotgun-event-meta">
                        <div className="shotgun-event-details">
                <span className="shotgun-event-date">{item.date}, {item.time}</span>
                <span className="shotgun-event-location">{item.location}</span>
                        </div>
                      </div>
                      
                      <div className="shotgun-event-actions-bottom">
                        <button 
                className={`shotgun-rsvp-btn ${isUserAttending(item.id) ? 'attending' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                  handleRSVP(item);
                          }}
                disabled={
                  rsvpProcessing.has(item.id) ||
                  (!isUserAttending(item.id) && isEventAtCapacity(item))
                }
                        >
                {rsvpProcessing.has(item.id) ? 'Processing...' : 
                 isUserAttending(item.id) ? '✓ Attending' : isEventAtCapacity(item) ? 'Full' : 'Join Event'}
                        </button>
                        <button 
                          className="shotgun-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                  handleEventClick(item);
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
      );
    }
  };

  return (
    <div className="events-screen">
      <div className="events-container">
        {/* Combined Search Results */}
        {combinedResults.length > 0 ? (
          <div className="search-results-container">
            <div className="combined-results-grid">
              {combinedResults.map(renderSearchResult)}
            </div>
          </div>
        ) : searchTerm ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try adjusting your search terms or browse all content below.</p>
          </div>
        ) : (
          // Default view when no search - show organizations first
          <div className="default-content">
          {/* Organizations Section */}
            <div className="organizations-section">
              <h2>Featured Organizations ({organizations.length})</h2>
              <div className="organizations-grid">
                {organizations.map(org => (
                  <div key={org.id} className="organization-card">
                    <div className="org-image">
                  <img src={org.image} alt={org.name} />
                      <div className="org-type-badge">{org.type}</div>
                </div>
                <div className="org-content">
                  <h3>{org.name}</h3>
                  <p className="org-type">{org.type}</p>
                  <p className="org-description">{org.description}</p>
                  <div className="org-stats">
                    <span>👥 {org.members} members</span>
                        <span>📅 {org.events.length} events</span>
                  </div>
                  <div className="org-actions">
                    <button className="view-org-btn" onClick={() => onNavigate('organization-profile', { organization: org })}>
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>

            {/* Events Section */}
            <div className="events-section">
              <h2>Upcoming Events ({events.length})</h2>
              <div className="events-grid">
                {events.map(event => (
                  <div key={event.id} className="event-card">
                    <div className="event-image">
                      <img src={event.image} alt={event.title} />
                      <div className="event-overlay">
                        <button 
                          className="share-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(event);
                          }}
                        >
                          📤
                        </button>
                      </div>
                    </div>
                    
                    <div className="event-content">
                      <h3>{event.title}</h3>
                      <p className="event-org">{event.organization}</p>
                      <p className="event-details">{event.date}, {event.time}</p>
                      <p className="event-location">{event.location}</p>
                      
                      <div className="event-actions">
                        <button 
                          className={`rsvp-btn ${isUserAttending(event.id) ? 'attending' : ''}`}
                          onClick={() => handleRSVP(event)}
                          disabled={
                            rsvpProcessing.has(event.id) ||
                            (!isUserAttending(event.id) && isEventAtCapacity(event))
                          }
                        >
                          {rsvpProcessing.has(event.id) ? 'Processing...' : 
                           isUserAttending(event.id) ? '✓ Attending' : isEventAtCapacity(event) ? 'Full' : 'Join Event'}
                        </button>
                        <button 
                          className="details-btn"
                          onClick={() => handleEventClick(event)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={handleCloseModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <h3>Event Details</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="event-modal-content">
              <h2>{selectedEvent.title}</h2>
              <p><strong>Organization:</strong> {selectedEvent.organization}</p>
              <p><strong>Date & Time:</strong> {selectedEvent.date}, {selectedEvent.time}</p>
              <p><strong>Location:</strong> {selectedEvent.location}</p>
              <p><strong>Description:</strong> {selectedEvent.description}</p>
              
              <div className="modal-actions">
                <button 
                  className={`rsvp-btn ${isUserAttending(selectedEvent.id) ? 'attending' : ''}`}
                  onClick={() => handleRSVP(selectedEvent)}
                  disabled={
                    rsvpProcessing.has(selectedEvent.id) ||
                    (!isUserAttending(selectedEvent.id) && isEventAtCapacity(selectedEvent))
                  }
                >
                  {rsvpProcessing.has(selectedEvent.id) ? 'Processing...' : 
                   isUserAttending(selectedEvent.id) ? '✓ Attending' : isEventAtCapacity(selectedEvent) ? 'Full' : 'Join Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareEvent && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Event</h2>
              <button className="modal-close" onClick={closeShareModal}>×</button>
            </div>
            
            <div className="share-modal-content">
              <div className="share-event-preview">
                    <h4>{shareEvent.title}</h4>
                    <p>Hosted by: {shareEvent.organization}</p>
                    <p>{shareEvent.date}, {shareEvent.time}</p>
                    <p>{shareEvent.location}</p>
              </div>

              <div className="share-recipient-selection">
                <label>Select Recipient:</label>
                <select 
                  value={selectedRecipient} 
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="share-recipient-select"
                >
                  <option value="">Choose a recipient...</option>
                  {shareRecipients.people.map(person => (
                        <option key={person.id} value={person.name}>
                          {person.name} - {person.university}
                        </option>
                  ))}
                </select>
              </div>

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
    </div>
  );
};

export default EventsScreen; 