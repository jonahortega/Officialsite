import React, { useState, useEffect, useRef, useMemo } from 'react';
import './UserInfoScreen.css';
import { Eye, EyeOff, User, Mail, Lock, Check, X, Loader2 } from 'lucide-react';
import SignupUniversityPicker from '../components/SignupUniversityPicker';
import { isSignupUniversity } from '../constants/signupUniversities';
import TermsAndPrivacyModalContent from '../legal/TermsAndPrivacyModalContent';

const UserInfoScreen = ({ onContinue, onBack, onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: "",
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
  /** Stable layout so typing doesn’t re-roll Math.random() and jitter the background. */
  const floatingOrbs = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        i,
        width: 100 + ((i * 47) % 320),
        height: 100 + ((i * 61) % 300),
        leftPct: 3 + ((i * 41) % 82),
        topPct: 2 + ((i * 53) % 78),
        durationSec: 12 + (i % 9),
        colorKey: i % 3,
      })),
    []
  );

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
      case "fullName":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Full name must be at least 2 characters";
        return undefined;
      case "username":
        if (!value.trim()) return "Username is required";
        if (value.length < 3) return "Username must be at least 3 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Username can only contain letters, numbers, and underscores";
        return undefined;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
        return undefined;
      case "university":
        if (!value) return "Please select a university";
        if (!isSignupUniversity(value)) return "Please select a school from the list";
        return undefined;
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
        if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
        if (!/\d/.test(value)) return "Password must contain a number";
        return undefined;
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if terms are agreed to
    if (!agreedToTerms) {
      setShowTermsModal(true);
      return;
    }
    
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    setErrors(newErrors);
    setTouched({
      fullName: true,
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      university: true,
    });

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

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef}
      className="user-info-screen"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -10,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom right, #581c87, #312e81, #7c2d12)'
        }} />
        
        {/* Floating orbs — deterministic layout (no Math.random per render). */}
        {floatingOrbs.map((orb) => (
          <div
            key={orb.i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              mixBlendMode: 'screen',
              filter: 'blur(40px)',
              opacity: 0.3,
              background: `radial-gradient(circle, ${
                orb.colorKey === 0 ? '#a855f7' : orb.colorKey === 1 ? '#6366f1' : '#8b5cf6'
              } 0%, transparent 70%)`,
              width: orb.width,
              height: orb.height,
              left: `${orb.leftPct}%`,
              top: `${orb.topPct}%`,
              animation: `float${orb.i} ${orb.durationSec}s ease-in-out infinite alternate`,
            }}
          />
        ))}
        
        {/* Grid Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=")`,
          opacity: 0.2
        }} />
      </div>
      
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          position: 'relative',
          zIndex: 10,
          opacity: 0,
          transform: 'translateY(20px)',
          animation: 'fadeInUp 0.5s ease-out forwards'
        }}
      >
        <div style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'visible'
        }}>
          <div style={{ padding: '2rem' }}>
            {/* Back Button */}
            <button 
              onClick={onBack}
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                color: 'rgb(196, 181, 253)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
            >
              ← Back
            </button>

            {/* Header */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '2rem',
                opacity: 0,
                transform: 'translateY(-20px)',
                animation: 'fadeInUp 0.5s ease-out 0.2s forwards'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'linear-gradient(to bottom right, #a855f7, #4f46e5)',
                marginBottom: '1rem'
              }}>
                <span style={{
                  fontSize: '1.875rem',
                  fontWeight: '700',
                  color: 'white'
                }}>ΓΛ</span>
              </div>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: '700',
                color: 'white',
                marginBottom: '0.5rem',
                margin: 0
              }}>
                Join Greek Life
              </h1>
              <p style={{
                color: 'rgb(196, 181, 253)',
                margin: 0
              }}>
                Create your account to get started
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Full Name */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.5s ease-out 0.3s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '1.25rem',
                    width: '1.25rem',
                    color: 'rgb(196, 181, 253)'
                  }} />
              <input
                    id="fullName"
                    name="fullName"
                type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {touched.fullName && errors.fullName && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Username */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.5s ease-out 0.35s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
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
                    color: 'rgb(196, 181, 253)'
                  }} />
                  <input
                id="username"
                name="username"
                    type="text"
                value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="johndoe"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {touched.username && errors.username && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.username}
                  </p>
                )}
            </div>

              {/* Email */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.5s ease-out 0.4s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '1.25rem',
                    width: '1.25rem',
                    color: 'rgb(196, 181, 253)'
                  }} />
              <input
                id="email"
                name="email"
                    type="email"
                value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="john@example.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {touched.email && errors.email && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.email}
                  </p>
                )}
            </div>

              {/* University */}
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
                <div style={{ position: 'relative' }}>
                  <SignupUniversityPicker
                    id="university"
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
                  />
                </div>
                {touched.university && errors.university && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.university}
                  </p>
                )}
              </div>

              {/* Password */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.5s ease-out 0.5s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
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
                    color: 'rgb(196, 181, 253)'
                  }} />
              <input
                id="password"
                name="password"
                    type={showPassword ? "text" : "password"}
                value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
                      color: 'rgb(196, 181, 253)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
                  >
                    {showPassword ? <EyeOff style={{ height: '1.25rem', width: '1.25rem' }} /> : <Eye style={{ height: '1.25rem', width: '1.25rem' }} />}
                  </button>
                </div>
                {formData.password && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        style={{
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'color 0.3s ease',
                          color: req.test(formData.password) ? 'rgb(134, 239, 172)' : 'rgb(196, 181, 253)'
                        }}
                      >
                        {req.test(formData.password) ? (
                          <Check style={{ height: '0.75rem', width: '0.75rem' }} />
                        ) : (
                          <X style={{ height: '0.75rem', width: '0.75rem' }} />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
                {touched.password && errors.password && !formData.password && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.password}
                  </p>
                )}
            </div>

              {/* Confirm Password */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.5s ease-out 0.5s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
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
                    color: 'rgb(196, 181, 253)'
                  }} />
              <input
                id="confirmPassword"
                name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
                      color: 'rgb(196, 181, 253)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
                  >
                    {showConfirmPassword ? <EyeOff style={{ height: '1.25rem', width: '1.25rem' }} /> : <Eye style={{ height: '1.25rem', width: '1.25rem' }} />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p style={{
                    color: 'rgb(252, 165, 165)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <X style={{ height: '0.75rem', width: '0.75rem' }} />
                    {errors.confirmPassword}
                  </p>
                )}
                {formData.confirmPassword && formData.confirmPassword === formData.password && (
                  <p style={{
                    color: 'rgb(134, 239, 172)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <Check style={{ height: '0.75rem', width: '0.75rem' }} />
                    Passwords match
                  </p>
                )}
            </div>

              {/* Submit Button */}
              <div
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: 'slideInUp 0.5s ease-out 0.55s forwards'
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
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
            </button>
              </div>
          </form>

            {/* Sign In Link */}
            <div
              style={{
                marginTop: '1.5rem',
                textAlign: 'center',
                opacity: 0,
                animation: 'fadeIn 0.5s ease-out 0.6s forwards'
              }}
            >
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
            </div>

            {/* Organization Signup Link */}
            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                opacity: 0,
                animation: 'fadeIn 0.5s ease-out 0.7s forwards'
              }}
            >
              <p style={{
                color: 'rgb(196, 181, 253)',
                margin: 0
              }}>
                Representing an organization?{" "}
                <button 
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('organization-signup');
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
                  Sign up organization
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: 'rgb(196, 181, 253)',
            fontSize: '0.875rem',
            marginTop: '1.5rem',
            opacity: 0,
            animation: 'fadeIn 0.5s ease-out 0.7s forwards',
            margin: '1.5rem 0 0 0'
          }}
        >
          <input
            type="checkbox"
            id="terms-checkbox"
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
              {/* Header */}
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

              {/* Content */}
              <div style={{
                padding: '20px 24px',
                flex: 1,
                overflowY: 'auto',
                color: '#c4b5fd',
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                <TermsAndPrivacyModalContent acceptContext="user" />
              </div>

              {/* Footer */}
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
  );
};

export default UserInfoScreen; 