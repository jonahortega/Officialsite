import React, { useState, useRef, useEffect } from 'react';
import './LabScreen.css';

// 21st MCP Welcome Screen Component (exact code from user)
const GreekLifeWelcomePage = () => {
  const features = [
    {
      icon: "🏛️",
      title: "Manage Your Chapter",
      description: "Streamline chapter operations, member management, and communications all in one place",
    },
    {
      icon: "⏰",
      title: "Scheduling Events",
      description: "Plan and coordinate events effortlessly with integrated scheduling tools",
    },
    {
      icon: "🗺️",
      title: "Interactive Campus Map",
      description: "Navigate your campus with ease and discover chapter locations instantly",
    },
    {
      icon: "📅",
      title: "Calendar",
      description: "Stay organized with a unified calendar for all your Greek life activities",
    },
    {
      icon: "👥",
      title: "Organizations",
      description: "Connect with fraternities, sororities, and clubs across campus",
    },
    {
      icon: "💰",
      title: "Fundraisers",
      description: "Organize and track fundraising campaigns with powerful management tools",
    },
  ];

  return (
    <div className="greek-life-landing-container">
      <div className="landing-background">
        <div className="radial-gradient-1"></div>
        <div className="radial-gradient-2"></div>
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <h1 className="main-title">
            Welcome to{" "}
            <span className="gradient-text">
              Greek Life
            </span>
          </h1>
          <p className="subtitle">
            The whole in one platform for connecting college students throughout
            the United States
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="glow-card">
                <div className="feature-content">
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon">{feature.icon}</div>
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 21st MCP Server Login Component (adapted for your React setup)
const GreekLifeLoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = 'Email or username is required';
    } else if (formData.emailOrUsername.length < 3) {
      newErrors.emailOrUsername = 'Email or username must be at least 3 characters';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Login data:", formData);
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
  };

  return (
    <div className="greek-life-login-container">
      <BackgroundGradientAnimation>
        <div className="login-content-wrapper">
          <div className="login-card">
            {!isSuccess ? (
              <div className="login-form-section">
                <div className="login-header">
                  <div className="login-icon">
                    👤
                  </div>
                  <h1>Welcome Back</h1>
                  <p>Sign in to your Greek Life account</p>
                </div>

                <form onSubmit={onSubmit} className="login-form">
                  <div className="form-field">
                    <label className="form-label">Email or Username</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📧</span>
                      <input
                        type="text"
                        name="emailOrUsername"
                        value={formData.emailOrUsername}
                        onChange={handleInputChange}
                        placeholder="Enter your email or username"
                        className={`glow-input ${errors.emailOrUsername ? 'error' : ''}`}
                      />
                    </div>
                    {errors.emailOrUsername && <span className="error-text">{errors.emailOrUsername}</span>}
                  </div>

                  <div className="form-field">
                    <label className="form-label">Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        className={`glow-input ${errors.password ? 'error' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className="form-options">
                    <label className="checkbox-wrapper">
                      <input type="checkbox" />
                      Remember me
                    </label>
                    <a href="#" className="forgot-link">Forgot password?</a>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="login-submit-btn"
                  >
                    {isLoading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <>
                        Sign In →
                      </>
                    )}
                  </button>
                </form>

                <div className="login-footer">
                  <p>Don't have an account? <a href="#">Sign up</a></p>
                </div>
              </div>
            ) : (
              <div className="success-section">
                <div className="success-icon">✅</div>
                <h2>Login Successful!</h2>
                <p>Redirecting to your dashboard...</p>
              </div>
            )}
          </div>
        </div>
      </BackgroundGradientAnimation>
    </div>
  );
};

// Background Gradient Animation Component
const BackgroundGradientAnimation = ({ children }) => {
  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);
  const interactiveRef = useRef(null);

  useEffect(() => {
    function move() {
      if (!interactiveRef.current) return;
      setCurX(curX + (tgX - curX) / 20);
      setCurY(curY + (tgY - curY) / 20);
      interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    }
    move();
  }, [tgX, tgY, curX, curY]);

  const handleMouseMove = (event) => {
    if (interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    }
  };

  return (
    <div className="gradient-background">
      <div className="gradient-orbs">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
        <div className="gradient-orb orb-5"></div>
        <div
          ref={interactiveRef}
          onMouseMove={handleMouseMove}
          className="interactive-orb"
        ></div>
      </div>
      {children}
    </div>
  );
};

const LabScreen = ({ onNavigate }) => {
  const [selectedComponent, setSelectedComponent] = useState('welcome');

  // Component preview options
  const componentOptions = [
    { id: 'welcome', name: 'Welcome Screen', description: 'Landing page with login/signup' },
    { id: 'login', name: 'Login Form', description: 'User authentication form' },
    { id: 'navbar', name: 'Navigation Bar', description: 'Bottom navigation component' },
    { id: 'home', name: 'Home Feed', description: 'Main dashboard/home screen' },
    { id: 'events', name: 'Events List', description: 'Event browsing and filtering' },
    { id: 'messages', name: 'Messages', description: 'Chat interface' },
    { id: 'profile', name: 'Profile', description: 'User profile page' },
    { id: 'custom', name: 'Custom Component', description: 'Import your own component' }
  ];

  const handleComponentSelect = (componentId) => {
    setSelectedComponent(componentId);
  };

  const renderComponentPreview = () => {
    switch (selectedComponent) {
      case 'welcome':
        return (
          <div className="component-preview">
            <h3>21st MCP Welcome Screen Preview</h3>
            <p>Beautiful welcome page with glow effects and feature cards</p>
            <div className="welcome-preview-wrapper">
              <GreekLifeWelcomePage />
            </div>
          </div>
        );
      
      case 'login':
        return (
          <div className="component-preview">
            <h3>21st MCP Login Form Preview</h3>
            <p>Beautiful animated login form with glassmorphism effects from 21st MCP server</p>
            <div className="login-preview-wrapper">
              <GreekLifeLoginPage />
            </div>
          </div>
        );
      
      case 'navbar':
        return (
          <div className="component-preview">
            <h3>Navigation Bar Preview</h3>
            <p>This is where your new Navigation component will be rendered.</p>
            <div className="preview-placeholder">
              <p>Import your new Navigation component here to preview it safely!</p>
            </div>
          </div>
        );
      
      case 'home':
        return (
          <div className="component-preview">
            <h3>Home Feed Preview</h3>
            <p>This is where your new Home component will be rendered.</p>
            <div className="preview-placeholder">
              <p>Import your new Home component here to preview it safely!</p>
            </div>
          </div>
        );
      
      case 'events':
        return (
          <div className="component-preview">
            <h3>Events List Preview</h3>
            <p>This is where your new Events component will be rendered.</p>
            <div className="preview-placeholder">
              <p>Import your new Events component here to preview it safely!</p>
            </div>
          </div>
        );
      
      case 'messages':
        return (
          <div className="component-preview">
            <h3>Messages Preview</h3>
            <p>This is where your new Messages component will be rendered.</p>
            <div className="preview-placeholder">
              <p>Import your new Messages component here to preview it safely!</p>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="component-preview">
            <h3>Profile Preview</h3>
            <p>This is where your new Profile component will be rendered.</p>
            <div className="preview-placeholder">
              <p>Import your new Profile component here to preview it safely!</p>
            </div>
          </div>
        );
      
      case 'custom':
        return (
          <div className="component-preview">
            <h3>Custom Component Preview</h3>
            <p>This is where you can import and preview any custom component.</p>
            <div className="preview-placeholder">
              <p>Import your custom component here to preview it safely!</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="component-preview">
            <h3>Select a component to preview</h3>
            <p>Choose a component from the sidebar to see its preview.</p>
          </div>
        );
    }
  };

  return (
    <div className="lab-screen">
      <div className="lab-header">
        <button className="back-btn" onClick={() => onNavigate('home')}>
          ← Back to App
        </button>
        <h1>🧪 Component Lab</h1>
        <p>Safe sandbox for previewing new UI components</p>
      </div>

      <div className="lab-content">
        <div className="lab-sidebar">
          <h3>Components to Preview</h3>
          <div className="component-list">
            {componentOptions.map(option => (
              <button
                key={option.id}
                className={`component-option ${selectedComponent === option.id ? 'active' : ''}`}
                onClick={() => handleComponentSelect(option.id)}
              >
                <div className="component-name">{option.name}</div>
                <div className="component-description">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lab-main">
          <div className="preview-container">
            {renderComponentPreview()}
          </div>
        </div>
      </div>

      <div className="lab-footer">
        <div className="lab-instructions">
          <h4>How to use the Lab:</h4>
          <ol>
            <li>Use 21st MCP server to generate new components</li>
            <li>Import the new component into this Lab file</li>
            <li>Preview it safely without breaking your main app</li>
            <li>Once happy, use Bolt to integrate into your real app</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default LabScreen;
