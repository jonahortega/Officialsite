import React, { useState } from 'react';
import './MembersScreen.css';

const MembersScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  // Mock data for members
  const members = [
    {
      id: 1,
      name: "Sarah Johnson",
      organization: "Alpha Phi",
      year: "Senior",
      major: "Psychology",
      role: "President",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567",
      image: "https://via.placeholder.com/150/667eea/ffffff?text=SJ"
    },
    {
      id: 2,
      name: "Michael Chen",
      organization: "Sigma Chi",
      year: "Junior",
      major: "Computer Science",
      role: "Vice President",
      email: "michael.chen@email.com",
      phone: "(555) 234-5678",
      image: "https://via.placeholder.com/150/764ba2/ffffff?text=MC"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      organization: "Kappa Delta",
      year: "Sophomore",
      major: "Business Administration",
      role: "Treasurer",
      email: "emily.rodriguez@email.com",
      phone: "(555) 345-6789",
      image: "https://via.placeholder.com/150/ff6b6b/ffffff?text=ER"
    },
    {
      id: 4,
      name: "David Thompson",
      organization: "Alpha Phi",
      year: "Senior",
      major: "Engineering",
      role: "Member",
      email: "david.thompson@email.com",
      phone: "(555) 456-7890",
      image: "https://via.placeholder.com/150/4ecdc4/ffffff?text=DT"
    },
    {
      id: 5,
      name: "Jessica Lee",
      organization: "Sigma Chi",
      year: "Freshman",
      major: "Biology",
      role: "Member",
      email: "jessica.lee@email.com",
      phone: "(555) 567-8901",
      image: "https://via.placeholder.com/150/45b7d1/ffffff?text=JL"
    },
    {
      id: 6,
      name: "Alex Martinez",
      organization: "Kappa Delta",
      year: "Junior",
      major: "Communications",
      role: "Secretary",
      email: "alex.martinez@email.com",
      phone: "(555) 678-9012",
      image: "https://via.placeholder.com/150/96ceb4/ffffff?text=AM"
    }
  ];

  const organizations = [
    { value: 'all', label: 'All Organizations' },
    { value: 'Alpha Phi', label: 'Alpha Phi' },
    { value: 'Sigma Chi', label: 'Sigma Chi' },
    { value: 'Kappa Delta', label: 'Kappa Delta' }
  ];

  const years = [
    { value: 'all', label: 'All Years' },
    { value: 'Freshman', label: 'Freshman' },
    { value: 'Sophomore', label: 'Sophomore' },
    { value: 'Junior', label: 'Junior' },
    { value: 'Senior', label: 'Senior' }
  ];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.major.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrganization = filterOrganization === 'all' || member.organization === filterOrganization;
    const matchesYear = filterYear === 'all' || member.year === filterYear;
    return matchesSearch && matchesOrganization && matchesYear;
  });

  return (
    <div className="members-screen">
      <header className="members-header">
        <h1>Members Directory</h1>
        <p>Connect with brothers and sisters across all Greek organizations</p>
      </header>

      <div className="members-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search members by name, major, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters-container">
          <select
            value={filterOrganization}
            onChange={(e) => setFilterOrganization(e.target.value)}
            className="filter-select"
          >
            {organizations.map(org => (
              <option key={org.value} value={org.value}>
                {org.label}
              </option>
            ))}
          </select>
          
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="filter-select"
          >
            {years.map(year => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="members-grid">
        {filteredMembers.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-header">
              <img src={member.image} alt={member.name} className="member-avatar" />
              <div className="member-info">
                <h3>{member.name}</h3>
                <p className="member-organization">{member.organization}</p>
                <span className={`member-role ${member.role.toLowerCase()}`}>
                  {member.role}
                </span>
              </div>
            </div>
            
            <div className="member-details">
              <div className="detail-item">
                <span className="detail-label">Year:</span>
                <span className="detail-value">{member.year}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Major:</span>
                <span className="detail-value">{member.major}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{member.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{member.phone}</span>
              </div>
            </div>
            
            <div className="member-actions">
              <button className="btn btn-primary">View Profile</button>
              <button className="btn btn-secondary">Send Message</button>
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="no-members">
          <p>No members found matching your criteria.</p>
        </div>
      )}

      <div className="members-stats">
        <div className="stat-card">
          <h4>Total Members</h4>
          <p className="stat-number">{members.length}</p>
        </div>
        <div className="stat-card">
          <h4>Organizations</h4>
          <p className="stat-number">{organizations.length - 1}</p>
        </div>
        <div className="stat-card">
          <h4>Active Members</h4>
          <p className="stat-number">{members.length}</p>
        </div>
      </div>
    </div>
  );
};

export default MembersScreen; 