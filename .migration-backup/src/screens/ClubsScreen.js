import React, { useState } from 'react';
import './ClubsScreen.css';

const ClubsScreen = ({ user, onSelect, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);

  const availableClubs = [
    {
      id: 1,
      name: "Math Club",
      type: "Academic Club",
      members: 28,
      founded: 2015,
      rating: 4.7,
      description: "A community of math enthusiasts who explore advanced mathematics, participate in competitions, and help each other excel in mathematical concepts. We host weekly problem-solving sessions and participate in regional math competitions.",
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop",
      activities: ["Weekly problem-solving sessions", "Math competitions", "Tutoring programs", "Guest lectures"]
    },
    {
      id: 2,
      name: "Politics Club",
      type: "Academic Club",
      members: 35,
      founded: 2012,
      rating: 4.5,
      description: "Engage in political discussions, debate current events, and develop critical thinking skills. We host debates, invite guest speakers, and organize voter registration drives. All political perspectives are welcome.",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop",
      activities: ["Political debates", "Guest speakers", "Voter registration", "Policy discussions"]
    },
    {
      id: 3,
      name: "Soccer Club",
      type: "Sports Club",
      members: 42,
      founded: 2010,
      rating: 4.8,
      description: "Join our soccer community for friendly matches, training sessions, and tournaments. We welcome players of all skill levels and focus on teamwork, fitness, and having fun on the field.",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=200&fit=crop",
      activities: ["Weekly matches", "Training sessions", "Tournaments", "Fitness training"]
    },
    {
      id: 4,
      name: "Cars Club",
      type: "Hobby Club",
      members: 23,
      founded: 2018,
      rating: 4.6,
      description: "Automotive enthusiasts unite! Share knowledge about cars, attend car shows, and learn about automotive technology. We organize meetups, car shows, and educational sessions about vehicle maintenance and modification.",
      image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=200&fit=crop",
      activities: ["Car shows", "Meetups", "Maintenance workshops", "Technology discussions"]
    },
    {
      id: 5,
      name: "Community Service Club",
      type: "Service Club",
      members: 56,
      founded: 2008,
      rating: 4.9,
      description: "Make a difference in our community through volunteer work, fundraising events, and service projects. We partner with local organizations to address community needs and promote social responsibility.",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=200&fit=crop",
      activities: ["Volunteer work", "Fundraising events", "Service projects", "Community partnerships"]
    },
    {
      id: 6,
      name: "Breast Cancer Awareness Club",
      type: "Health & Awareness Club",
      members: 31,
      founded: 2016,
      rating: 4.7,
      description: "Raising awareness about breast cancer through education, fundraising, and support. We organize awareness campaigns, fundraising events, and provide support to those affected by breast cancer.",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop",
      activities: ["Awareness campaigns", "Fundraising events", "Support groups", "Educational sessions"]
    }
  ];

  const filteredClubs = availableClubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClubSelect = (club) => {
    onSelect(club);
  };

  const handleJoinRequest = (club) => {
    const newRequest = {
      id: Date.now(),
      club: club.name,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      message: 'Your application is under review'
    };
    setJoinRequests(prev => [...prev, newRequest]);
    // Join request sent - silent success
  };

  const handleViewClub = (club) => {
    setSelectedClub(club);
  };

  const handleBackToClubs = () => {
    setSelectedClub(null);
  };

  if (selectedClub) {
    return (
      <div className="clubs-screen">
        <div className="club-detail-header">
          <button className="back-button" onClick={handleBackToClubs}>
            ← Back to Clubs
          </button>
          <h1>{selectedClub.name}</h1>
        </div>
        
        <div className="club-detail-content">
          <div className="club-detail-image">
            <img src={selectedClub.image} alt={selectedClub.name} />
            <span className="club-type-badge">{selectedClub.type}</span>
          </div>
          
          <div className="club-detail-info">
            <h2>{selectedClub.name}</h2>
            <p className="club-description">{selectedClub.description}</p>
            
            <div className="club-stats">
              <span>👥 {selectedClub.members} Members</span>
              <span>🏆 Founded {selectedClub.founded}</span>
              <span>🌟 {selectedClub.rating}/5 Rating</span>
            </div>
            
            <div className="club-activities">
              <h3>Activities & Events</h3>
              <ul>
                {selectedClub.activities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            </div>
            
            <div className="club-actions">
              <button 
                className="select-btn primary"
                onClick={() => handleClubSelect(selectedClub)}
              >
                Join This Club
              </button>
              <button 
                className="join-btn secondary"
                onClick={() => handleJoinRequest(selectedClub)}
              >
                Request to Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clubs-screen">
      <div className="clubs-header">
        <div className="header-content">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <div className="header-text">
            <h1>Select Your Club</h1>
            <p>Choose a club you're a member of or discover new ones to join</p>
          </div>
        </div>
      </div>

      <div className="clubs-content">
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search clubs by name, type, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="clubs-grid">
          {filteredClubs.map(club => (
            <div key={club.id} className="club-card">
              <div className="club-card-image">
                <img src={club.image} alt={club.name} />
                <span className="club-type-badge">{club.type}</span>
              </div>
              <div className="club-card-content">
                <h3>{club.name}</h3>
                <p className="club-description">{club.description.substring(0, 120)}...</p>
                <div className="club-stats">
                  <span>👥 {club.members} Members</span>
                  <span>🏆 Founded {club.founded}</span>
                  <span>🌟 {club.rating}/5 Rating</span>
                </div>
                <div className="club-actions">
                  <button 
                    className="view-btn secondary"
                    onClick={() => handleViewClub(club)}
                  >
                    View Details
                  </button>
                  <button 
                    className="join-btn primary"
                    onClick={() => handleJoinRequest(club)}
                  >
                    Request to Join
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClubs.length === 0 && (
          <div className="no-results">
            <p>No clubs found matching your search criteria.</p>
            <p>Try a different search term or browse all clubs.</p>
          </div>
        )}

        {joinRequests.length > 0 && (
          <div className="join-requests-section">
            <h3>Your Join Requests</h3>
            <div className="requests-list">
              {joinRequests.map(request => (
                <div key={request.id} className={`request-card ${request.status}`}>
                  <div className="request-header">
                    <h4>{request.club}</h4>
                    <span className={`status-badge ${request.status}`}>
                      {request.status === 'pending' ? '⏳ Pending' : 
                       request.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                    </span>
                  </div>
                  <div className="request-details">
                    <p className="request-date">Submitted: {request.date}</p>
                    <p className="request-message">{request.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsScreen; 