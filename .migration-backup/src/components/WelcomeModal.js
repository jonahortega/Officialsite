import React, { useState } from 'react';
import './WelcomeModal.css';

const WelcomeModal = ({ isOpen, onClose, user }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const features = [
    {
      title: "Revolutionizing Campus Life",
      description: "Designed to enhance and revolutionize student engagement on campuses across the U.S.",
      icon: "🚀",
      color: "#0c4a6e",
      isIntro: true
    },
    {
      title: "Community Feed",
      description: "Stay connected with your Greek life community through real-time posts, events, and updates.",
      icon: "📱",
      color: "#0284c7"
    },
    {
      title: "Event Management",
      description: "Create, join, and manage events with your organization. Never miss an important gathering.",
      icon: "📅",
      color: "#0ea5e9"
    },
    {
      title: "Direct Messaging",
      description: "Chat directly with organization members and leaders. Stay in the loop with private conversations.",
      icon: "💬",
      color: "#38bdf8"
    },
    {
      title: "Campus Map",
      description: "Navigate your campus with our interactive map showing Greek houses, event locations, and campus landmarks.",
      icon: "🗺️",
      color: "#7dd3fc"
    },
    {
      title: "Organization Profiles",
      description: "Explore detailed profiles of Greek organizations, view members, and learn about their activities.",
      icon: "🏛️",
      color: "#bae6fd"
    },
    {
      title: "Notifications",
      description: "Get instant notifications for events, messages, and important updates from your community.",
      icon: "🔔",
      color: "#e0f2fe"
    }
  ];

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay" onClick={handleSkip}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        {features[currentStep].isIntro && (
          <div className="welcome-modal-header">
            <div className="welcome-title">
              <h2>Welcome to Greek Life</h2>
            </div>
            <button className="welcome-close-btn" onClick={handleSkip}>×</button>
          </div>
        )}

        <div className={`welcome-modal-content ${!features[currentStep].isIntro ? 'no-header' : ''}`}>
          <div className={`feature-showcase ${features[currentStep].isIntro ? 'intro-slide' : ''}`}>
            <div className="feature-icon" style={{ backgroundColor: features[currentStep].color }}>
              <span className="feature-emoji">{features[currentStep].icon}</span>
            </div>
            <h3 className="feature-title">{features[currentStep].title}</h3>
            <p className="feature-description">{features[currentStep].description}</p>
          </div>

          <div className="welcome-progress">
            <div className="progress-dots">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`progress-dot ${index === currentStep ? 'active' : ''}`}
                  style={{ backgroundColor: index === currentStep ? features[currentStep].color : '#e2e8f0' }}
                />
              ))}
            </div>
          </div>

          <div className="welcome-actions">
            {currentStep > 0 && (
              <button className="welcome-btn welcome-btn-secondary" onClick={handleBack}>
                Back
              </button>
            )}
            <button className="welcome-btn welcome-btn-primary" onClick={handleNext}>
              {currentStep === features.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal; 