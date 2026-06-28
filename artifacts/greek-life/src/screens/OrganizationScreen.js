import React, { useState } from 'react';
import './OrganizationScreen.css';

const OrganizationScreen = ({ onOrganizationSelect, onBack, userData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');

  // Mock organization data - in a real app, this would come from an API
  const organizations = {
    fraternities: [
      "Alpha Phi Alpha",
      "Kappa Alpha Psi",
      "Omega Psi Phi",
      "Phi Beta Sigma",
      "Iota Phi Theta",
      "Alpha Epsilon Pi",
      "Alpha Tau Omega",
      "Beta Theta Pi",
      "Chi Phi",
      "Delta Chi",
      "Delta Kappa Epsilon",
      "Delta Tau Delta",
      "Delta Upsilon",
      "Kappa Delta Rho",
      "Kappa Sigma",
      "Lambda Chi Alpha",
      "Phi Delta Theta",
      "Phi Gamma Delta",
      "Phi Kappa Psi",
      "Phi Kappa Sigma",
      "Phi Kappa Tau",
      "Phi Sigma Kappa",
      "Pi Kappa Alpha",
      "Pi Kappa Phi",
      "Psi Upsilon",
      "Sigma Alpha Epsilon",
      "Sigma Chi",
      "Sigma Nu",
      "Sigma Phi Epsilon",
      "Sigma Pi",
      "Tau Kappa Epsilon",
      "Theta Chi",
      "Theta Delta Chi",
      "Theta Xi",
      "Zeta Beta Tau",
      "Zeta Psi"
    ],
    sororities: [
      "Alpha Chi Omega",
      "Alpha Delta Pi",
      "Alpha Epsilon Phi",
      "Alpha Gamma Delta",
      "Alpha Kappa Alpha",
      "Alpha Omicron Pi",
      "Alpha Phi",
      "Alpha Sigma Alpha",
      "Alpha Sigma Tau",
      "Alpha Xi Delta",
      "Chi Omega",
      "Delta Delta Delta",
      "Delta Gamma",
      "Delta Phi Epsilon",
      "Delta Zeta",
      "Gamma Phi Beta",
      "Kappa Alpha Theta",
      "Kappa Delta",
      "Kappa Kappa Gamma",
      "Phi Mu",
      "Phi Sigma Sigma",
      "Pi Beta Phi",
      "Sigma Delta Tau",
      "Sigma Kappa",
      "Sigma Sigma Sigma",
      "Theta Phi Alpha",
      "Zeta Tau Alpha"
    ]
  };

  const allOrganizations = [...organizations.fraternities, ...organizations.sororities];
  
  const filteredOrganizations = allOrganizations.filter(org =>
    org.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrganizationSelect = (organization) => {
    setSelectedOrganization(organization);
  };

  const handleContinue = () => {
    if (selectedOrganization) {
      onOrganizationSelect(selectedOrganization);
    }
  };

  const getOrganizationType = (orgName) => {
    return organizations.fraternities.includes(orgName) ? 'Fraternity' : 'Sorority';
  };

  return (
    <div className="organization-screen">
      <div className="organization-container">
        <div className="organization-content">
          <div className="organization-header">
            <button className="back-btn" onClick={onBack}>
              ← Back
            </button>
            <h1>Select Your Organization</h1>
            <p>Hi {userData.name}, please select your fraternity or sorority</p>
          </div>

          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search for your organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          <div className="organizations-list">
            {filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((organization, index) => (
                <button
                  key={index}
                  className={`organization-item ${selectedOrganization === organization ? 'selected' : ''}`}
                  onClick={() => handleOrganizationSelect(organization)}
                >
                  <div className="organization-info">
                    <span className="organization-name">{organization}</span>
                    <span className="organization-type">{getOrganizationType(organization)}</span>
                  </div>
                  {selectedOrganization === organization && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="no-results">
                <p>No organizations found matching "{searchTerm}"</p>
                <p>Try a different search term or check the spelling</p>
              </div>
            )}
          </div>

          {selectedOrganization && (
            <div className="selected-info">
              <p>Selected: <strong>{selectedOrganization}</strong></p>
              <p className="organization-type-label">{getOrganizationType(selectedOrganization)}</p>
            </div>
          )}

          <button
            className="continue-btn"
            onClick={handleContinue}
            disabled={!selectedOrganization}
          >
            Complete Setup
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationScreen; 