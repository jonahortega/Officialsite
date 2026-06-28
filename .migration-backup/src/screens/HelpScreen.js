import React, { useState } from 'react';
import './HelpScreen.css';

const HelpScreen = ({ user, onNavigate }) => {
  const [activeSection, setActiveSection] = useState('help');
  const [email, setEmail] = useState('');
  const [organizationRequest, setOrganizationRequest] = useState({
    organizationName: '',
    university: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (!email) {
      console.log('Email address required');
      return;
    }
    
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      // Password reset email sent - silent success
      setEmail('');
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  const handleOrganizationRequest = (e) => {
    e.preventDefault();
    const { organizationName, university, adminName, adminEmail } = organizationRequest;
    
    if (!organizationName || !university || !adminName || !adminEmail) {
      console.log('All fields required');
      return;
    }
    
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      // Organization request submitted - silent success
      setOrganizationRequest({
        organizationName: '',
        university: '',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        description: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganizationRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="help-screen">
      <header className="help-header">
        <button className="back-btn" onClick={() => onNavigate('settings')}>
          ← Back to Settings
        </button>
        <h1>Help & Support</h1>
        <p>Get help with your account and request new organizations</p>
      </header>

      <div className="help-container">
        <div className="help-tabs">
          <button 
            className={`help-tab-btn ${activeSection === 'help' ? 'active' : ''}`}
            onClick={() => setActiveSection('help')}
          >
            <span className="tab-icon">❓</span>
            Help Center
          </button>
          <button 
            className={`help-tab-btn ${activeSection === 'password' ? 'active' : ''}`}
            onClick={() => setActiveSection('password')}
          >
            <span className="tab-icon">🔐</span>
            Reset Password
          </button>
          <button 
            className={`help-tab-btn ${activeSection === 'organization' ? 'active' : ''}`}
            onClick={() => setActiveSection('organization')}
          >
            <span className="tab-icon">🏛️</span>
            Request Organization
          </button>
        </div>

        <div className="help-content">
          {activeSection === 'help' && (
            <div className="help-section">
              <div className="help-header-section">
                <h2>Help Center</h2>
                <p>Find answers to common questions and get support</p>
              </div>

              <div className="faq-section">
                <h3>Frequently Asked Questions</h3>
                
                <div className="faq-item">
                  <h4>How do I join an organization?</h4>
                  <p>Navigate to the Organizations tab and search for your organization. Click "Join" and follow the verification process.</p>
                </div>

                <div className="faq-item">
                  <h4>How do I RSVP to events?</h4>
                  <p>Go to the Events tab, find an event you're interested in, and click the "RSVP" button. You'll need to complete payment if required.</p>
                </div>

                <div className="faq-item">
                  <h4>How do I message other members?</h4>
                  <p>Use the Messages tab to start conversations with other members of your organizations.</p>
                </div>

                <div className="faq-item">
                  <h4>Can I change my organization?</h4>
                  <p>Yes! Go to your Profile settings and you can manage your organization memberships there.</p>
                </div>

                <div className="faq-item">
                  <h4>How do I update my profile?</h4>
                  <p>Navigate to Settings → Profile to update your personal information, photo, and preferences.</p>
                </div>
              </div>

              <div className="contact-section">
                <h3>Still Need Help?</h3>
                <p>If you can't find what you're looking for, contact our support team:</p>
                <div className="contact-methods">
                  <div className="contact-method">
                    <span className="contact-icon">📧</span>
                    <div>
                      <h4>Email Support</h4>
                      <p>support@greeklife.com</p>
                    </div>
                  </div>
                  <div className="contact-method">
                    <span className="contact-icon">📱</span>
                    <div>
                      <h4>Live Chat</h4>
                      <p>Available 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <div className="password-section">
              <div className="password-header-section">
                <h2>Reset Your Password</h2>
                <p>Enter your email address and we'll send you a link to reset your password</p>
              </div>

              <form onSubmit={handlePasswordReset} className="password-form">
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="reset-btn" 
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>

                {success && (
                  <div className="success-message">
                    ✅ Password reset email sent! Check your inbox.
                  </div>
                )}
              </form>

              <div className="password-tips">
                <h3>Password Tips</h3>
                <ul>
                  <li>Use a strong password with at least 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Add numbers and special characters</li>
                  <li>Don't use the same password for multiple accounts</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'organization' && (
            <div className="organization-section">
              <div className="organization-header-section">
                <h2>Request New Organization</h2>
                <p>Don't see your club or organization? Send us a request to add it to our platform.</p>
              </div>

              <form onSubmit={handleOrganizationRequest} className="organization-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Organization Name *</label>
                    <input 
                      type="text"
                      name="organizationName"
                      value={organizationRequest.organizationName}
                      onChange={handleInputChange}
                      placeholder="e.g., Alpha Beta Gamma"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>University *</label>
                    <input 
                      type="text"
                      name="university"
                      value={organizationRequest.university}
                      onChange={handleInputChange}
                      placeholder="e.g., University of California, Berkeley"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Admin/Leader Name *</label>
                    <input 
                      type="text"
                      name="adminName"
                      value={organizationRequest.adminName}
                      onChange={handleInputChange}
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Email *</label>
                    <input 
                      type="email"
                      name="adminEmail"
                      value={organizationRequest.adminEmail}
                      onChange={handleInputChange}
                      placeholder="e.g., john.smith@university.edu"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Admin Phone (Optional)</label>
                  <input 
                    type="tel"
                    name="adminPhone"
                    value={organizationRequest.adminPhone}
                    onChange={handleInputChange}
                    placeholder="e.g., (555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label>Organization Description</label>
                  <textarea 
                    name="description"
                    value={organizationRequest.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about your organization, its mission, and activities..."
                    rows="4"
                  />
                </div>

                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>

                {success && (
                  <div className="success-message">
                    ✅ Request submitted successfully! We'll review and get back to you soon.
                  </div>
                )}
              </form>

              <div className="organization-info">
                <h3>What happens next?</h3>
                <div className="info-steps">
                  <div className="info-step">
                    <span className="step-number">1</span>
                    <div>
                      <h4>Review Process</h4>
                      <p>Our team will review your request within 2-3 business days</p>
                    </div>
                  </div>
                  <div className="info-step">
                    <span className="step-number">2</span>
                    <div>
                      <h4>Verification</h4>
                      <p>We'll verify the organization details and contact information</p>
                    </div>
                  </div>
                  <div className="info-step">
                    <span className="step-number">3</span>
                    <div>
                      <h4>Setup</h4>
                      <p>Once approved, we'll set up your organization on the platform</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpScreen; 