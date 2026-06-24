import React, { useState, useEffect, useRef } from 'react';
import './UserInfoScreen.css';
import { Eye, EyeOff, Building2, Mail, Lock, Check, X, Loader2, User } from 'lucide-react';
import SignupUniversityPicker from '../components/SignupUniversityPicker';
import { isSignupUniversity } from '../constants/signupUniversities';
import TermsAndPrivacyModalContent from '../legal/TermsAndPrivacyModalContent';

const OrganizationSignupScreen = ({ onContinue, onBack, onNavigate }) => {
  const [formData, setFormData] = useState({
    organizationName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    university: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const passwordRequirements = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "Contains number", test: (p) => /\d/.test(p) },
  ];

  const validateField = (name, value) => {
    switch (name) {
      case "organizationName":
        if (!value.trim()) return "Organization name is required";
        if (value.trim().length < 2) return "Organization name must be at least 2 characters";
        return undefined;
      case "username":
        if (!value.trim()) return "Username is required";
        if (value.trim().length < 3) return "Username must be at least 3 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Username can only contain letters, numbers, and underscores";
        return undefined;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
        return undefined;
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return undefined;
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return undefined;
      case "university":
        if (!value) return "Please select a university";
        if (!isSignupUniversity(value)) return "Please select a school from the list";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if terms are agreed to
    if (!agreedToTerms) {
      setShowTermsModal(true);
      return;
    }
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        if (onContinue) {
          const result = await Promise.resolve(onContinue(formData));
          if (result?.ok === false) {
            const msg = result.error || 'Signup failed. Please try again.';
            setErrors((prev) => ({
              ...prev,
              email: msg,
              username: msg,
            }));
          }
        }
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          email: err?.message || 'Signup failed. Please try again.',
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getPasswordStrength = (password) => {
    const passed = passwordRequirements.filter(req => req.test(password)).length;
    return (passed / passwordRequirements.length) * 100;
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 25) return '#ef4444';
    if (strength < 50) return '#f59e0b';
    if (strength < 75) return '#3b82f6';
    return '#10b981';
  };

  return (
    <div 
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            opacity: 0,
            animation: 'fadeIn 0.5s ease-out 0.1s forwards'
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(to right, #9333ea, #4f46e5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Building2 style={{ height: '2rem', width: '2rem', color: 'white' }} />
          </div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(to right, #ffffff, #e0e7ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Organization Sign up
          </h1>
          <p
            style={{
              color: 'rgb(196, 181, 253)',
              fontSize: '1rem',
              margin: 0
            }}
          >
            Create your organization account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Organization Name */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.3s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Organization Name
            </label>
            <div style={{ position: 'relative' }}>
              <Building2 style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1.25rem',
                width: '1.25rem',
                color: 'rgb(196, 181, 253)',
                zIndex: 1
              }} />
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Enter organization name"
                style={{
                  width: '100%',
                  padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.organizationName ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9333ea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.organizationName ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.organizationName && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.organizationName}
              </p>
            )}
          </div>

          {/* Username */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.32s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1.25rem',
                width: '1.25rem',
                color: 'rgb(196, 181, 253)',
                zIndex: 1
              }} />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.username ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9333ea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.username ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.username && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.37s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1.25rem',
                width: '1.25rem',
                color: 'rgb(196, 181, 253)',
                zIndex: 1
              }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.email ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9333ea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* University Selection */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.42s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              University
            </label>
            <SignupUniversityPicker
              name="university"
              value={formData.university}
              onChange={(v) => {
                setFormData((prev) => ({ ...prev, university: v }));
                if (touched.university) {
                  const err = validateField('university', v);
                  setErrors((prev) => ({ ...prev, university: err }));
                }
              }}
              onBlurField={handleBlur}
              invalid={Boolean(errors.university)}
              size="lg"
            />
            {errors.university && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.university}
              </p>
            )}
          </div>

          {/* Password */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.47s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1.25rem',
                width: '1.25rem',
                color: 'rgb(196, 181, 253)',
                zIndex: 1
              }} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Create a password"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.password ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9333ea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgb(196, 181, 253)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          {formData.password && (
            <div
              style={{
                opacity: 0,
                transform: 'translateY(10px)',
                animation: 'slideInUp 0.5s ease-out 0.52s forwards'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgb(196, 181, 253)' }}>Password strength</span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: getPasswordStrengthColor(getPasswordStrength(formData.password)),
                    fontWeight: '500'
                  }}>
                    {Math.round(getPasswordStrength(formData.password))}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '0.25rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.125rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getPasswordStrength(formData.password)}%`,
                    height: '100%',
                    background: `linear-gradient(to right, ${getPasswordStrengthColor(getPasswordStrength(formData.password))}, ${getPasswordStrengthColor(getPasswordStrength(formData.password))}80)`,
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {passwordRequirements.map((req, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {req.test(formData.password) ? (
                      <Check size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <X size={16} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{
                      fontSize: '0.75rem',
                      color: req.test(formData.password) ? '#10b981' : '#ef4444'
                    }}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div
            style={{
              opacity: 0,
              transform: 'translateX(-20px)',
              animation: 'slideInLeft 0.5s ease-out 0.55s forwards'
            }}
          >
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1.25rem',
                width: '1.25rem',
                color: 'rgb(196, 181, 253)',
                zIndex: 1
              }} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.confirmPassword ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9333ea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgb(196, 181, 253)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div
            style={{
              opacity: 0,
              transform: 'translateY(20px)',
              animation: 'slideInUp 0.5s ease-out 0.6s forwards'
            }}
          >
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? 'rgba(147, 51, 234, 0.5)' : 'linear-gradient(to right, #9333ea, #4f46e5)',
                color: 'white',
                fontWeight: '600',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 style={{ height: '1.25rem', width: '1.25rem', animation: 'spin 1s linear infinite' }} />
                  Creating Organization...
                </>
              ) : (
                "Create Organization Account"
              )}
            </button>
          </div>
        </form>

        {/* Back to Regular Signup Link */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            opacity: 0,
            animation: 'fadeIn 0.5s ease-out 0.65s forwards'
          }}
        >
          <p style={{
            color: 'rgb(196, 181, 253)',
            margin: 0
          }}>
            Individual user?{" "}
            <button 
              onClick={() => {
                if (onNavigate) {
                  onNavigate('user-info');
                }
              }}
              style={{
                color: 'white',
                fontWeight: '600',
                textDecoration: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Sign up as individual
            </button>
          </p>
        </div>

        {/* Sign In Link */}
        <div
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            opacity: 0,
            animation: 'fadeIn 0.5s ease-out 0.75s forwards'
          }}
        >
          <p style={{
            color: 'rgb(196, 181, 253)',
            margin: '0 0 1rem 0'
          }}>
            <input
              type="checkbox"
              id="org-terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                accentColor: '#7c3aed',
                marginRight: '8px',
                verticalAlign: 'middle'
              }}
            />
            I agree to the{" "}
            <span
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              style={{
                textDecoration: 'underline',
                color: 'white',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Terms of Service
            </span>{" "}
            and{" "}
            <span
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              style={{
                textDecoration: 'underline',
                color: 'white',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Privacy Policy
            </span>
          </p>

          <p style={{
            color: 'rgb(196, 181, 253)',
            margin: 0
          }}>
            Already have an account?{" "}
            <button 
              onClick={() => {
                if (onNavigate) {
                  onNavigate('login');
                }
              }}
              style={{
                color: 'white',
                fontWeight: '600',
                textDecoration: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Sign in
            </button>
          </p>

          {/* Terms and Services Modal */}
          {showTermsModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px'
            }} onClick={() => setShowTermsModal(false)}>
              <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: '20px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '85vh',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                display: 'flex',
                flexDirection: 'column'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: 0
                  }}>
                    Terms of Service & Privacy Policy
                  </h2>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    style={{
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
                      fontSize: '20px'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{
                  padding: '20px 24px',
                  flex: 1,
                  overflowY: 'auto',
                  color: '#c4b5fd',
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}>
                  <TermsAndPrivacyModalContent acceptContext="organization" />
                </div>

                <div style={{
                  padding: '20px 24px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  gap: '12px',
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => {
                      setAgreedToTerms(true);
                      setShowTermsModal(false);
                    }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Accept & Continue
                  </button>
                  <button
                    onClick={() => setShowTermsModal(false)}
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
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSignupScreen;
