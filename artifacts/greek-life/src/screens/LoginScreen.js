import React, { useState, useEffect, useRef } from 'react';
import './LoginScreen.css';
import { Eye, EyeOff, Mail, Lock, Users, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { trySupabaseLoginAndBuildUser } from '../utils/supabaseSessionUser';
import { preloadEventsAndJoinedForSession } from '../utils/supabaseJoinedEventsHydration';

const LoginScreen = ({ onLoginSuccess, onBack, onNavigate, signupMessage, signupEmail }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Simple validation
    if (!email.trim()) {
      setError('Please enter an email or username.');
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password.');
      setIsLoading(false);
      return;
    }

    const loadingSafetyTimer = setTimeout(() => {
      setIsLoading(false);
      setError('Still loading? Refresh the page and try again — the sign-in step may be stuck.');
    }, 90000);

    try {
      const supabaseResult = await trySupabaseLoginAndBuildUser(email, password);
      if (supabaseResult?.ok === false) {
        setError(supabaseResult.error || 'Login failed. Please try again.');
        return;
      }
      if (supabaseResult?.ok && supabaseResult?.appUser) {
        console.log('✅ Logged in with Supabase:', supabaseResult.appUser.email, 'org:', supabaseResult.appUser.isOrganization);
        let preloaded = null;
        if (supabaseResult.session?.user?.id) {
          try {
            preloaded = await preloadEventsAndJoinedForSession(supabaseResult.session);
          } catch (e) {
            console.warn('Login preload events:', e?.message || e);
          }
        }
        if (onLoginSuccess) onLoginSuccess(supabaseResult.appUser, { preloaded });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      const usernameFromEmail = email.includes('@') ? email.split('@')[0] : email;
      const resolvedEmail = email.includes('@') ? email.trim() : `${email.trim()}@example.com`;
      const treatAsOrganization = false;
      const orgName = null;

      const userData = {
        emailOrUsername: email,
        userId: treatAsOrganization ? `org_${resolvedEmail.toLowerCase()}` : `user_${Date.now()}`,
        email: resolvedEmail,
        username: `@${usernameFromEmail}`,
        isOrganization: treatAsOrganization,
        organizationName: orgName || undefined,
        university: 'Rutgers University',
        name:
          treatAsOrganization && orgName
            ? orgName
            : usernameFromEmail.charAt(0).toUpperCase() + usernameFromEmail.slice(1),
        firstName:
          treatAsOrganization && orgName
            ? orgName.split(/\s+/)[0] || 'Organization'
            : usernameFromEmail.split('.')[0]?.charAt(0).toUpperCase() +
                usernameFromEmail.split('.')[0]?.slice(1) ||
              usernameFromEmail.charAt(0).toUpperCase() + usernameFromEmail.slice(1),
        lastName: treatAsOrganization
          ? 'Admin'
          : usernameFromEmail.split('.')[1]?.charAt(0).toUpperCase() +
              usernameFromEmail.split('.')[1]?.slice(1) || '',
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${treatAsOrganization ? `org-${orgName}` : usernameFromEmail}`,
        bio: '',
        chapter: treatAsOrganization && orgName ? orgName : 'Alpha Delta Pi',
        phone: '',
        organization:
          treatAsOrganization && orgName
            ? {
                name: orgName,
                email: resolvedEmail,
                university: 'Rutgers University',
                type: 'Organization',
              }
            : null,
      };

      console.log('✅ Login successful:', userData);
      if (onLoginSuccess) onLoginSuccess(userData);
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error?.message || 'An error occurred during login. Please try again.');
    } finally {
      clearTimeout(loadingSafetyTimer);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(to bottom right, #312e81, #581c87, #312e81)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10rem',
            left: '-10rem',
            width: '20rem',
            height: '20rem',
            background: 'rgba(147, 51, 234, 0.2)',
            borderRadius: '50%',
            filter: 'blur(64px)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-10rem',
            right: '-10rem',
            width: '24rem',
            height: '24rem',
            background: 'rgba(79, 70, 229, 0.2)',
            borderRadius: '50%',
            filter: 'blur(64px)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '1s'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16rem',
            height: '16rem',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '50%',
            filter: 'blur(64px)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s'
          }}></div>
        </div>
        
        {/* Grid Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMzcsIDIzMywgMjU0LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+")`,
          opacity: 0.4
        }}></div>
      </div>

      {/* Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          position: 'relative',
          zIndex: 10,
          opacity: 0,
          transform: 'translateY(20px)',
          animation: 'fadeInUp 0.6s ease-out forwards'
        }}
      >
        <div style={{
          background: 'rgba(59, 7, 100, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          overflow: 'hidden'
        }}>
          {/* Glassmorphism overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
            pointerEvents: 'none'
          }}></div>
          
          <div style={{
            position: 'relative',
            padding: '2rem'
          }}>
            {/* Logo/Icon */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                opacity: 0,
                transform: 'scale(0)',
                animation: 'scaleIn 0.6s ease-out 0.2s forwards'
              }}
            >
              <div style={{
                width: '4rem',
                height: '4rem',
                background: 'linear-gradient(to bottom right, #9333ea, #4f46e5)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(168, 85, 247, 0.5)'
              }}>
                <Users style={{ width: '2rem', height: '2rem', color: 'white' }} />
              </div>
            </div>

            {/* Header */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '2rem',
                opacity: 0,
                animation: 'fadeIn 0.6s ease-out 0.3s forwards'
              }}
            >
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: '700',
                background: 'linear-gradient(to right, #e9d5ff, #c7d2fe)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: '0.5rem',
                margin: 0
              }}>
                Welcome Back
              </h1>
              <p style={{
                color: 'rgba(196, 181, 253, 0.7)',
                fontSize: '0.875rem',
                margin: 0
              }}>
                Sign in to your Greek Life account
              </p>
          </div>

            {signupMessage && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 0.875rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#bbf7d0',
                  fontSize: '0.875rem',
                  lineHeight: 1.4
                }}
              >
                <strong style={{ color: '#dcfce7' }}>{signupMessage}</strong>
                {signupEmail ? (
                  <div style={{ marginTop: '0.25rem', color: '#86efac' }}>
                    Sent to: {signupEmail}
                  </div>
                ) : null}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.6s ease-out 0.4s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'rgb(196, 181, 253)',
                  marginBottom: '0.5rem'
                }}>
                Email or Username
              </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1.25rem',
                    height: '1.25rem',
                    color: 'rgba(196, 181, 253, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 10
                  }} />
                <input
                  type="text"
                  placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setResetEmailSent(false);
                    }}
                    required
                    style={{
                      display: 'flex',
                      height: '3rem',
                      width: '100%',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: 'rgba(59, 7, 100, 0.4)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      padding: '0.5rem 1rem 0.5rem 2.75rem',
                      fontSize: '0.875rem',
                      color: 'white',
                      transition: 'all 0.4s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = '2px solid transparent';
                      e.target.style.boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
            </div>

              <div
                style={{
                  opacity: 0,
                  transform: 'translateX(-20px)',
                  animation: 'slideInLeft 0.6s ease-out 0.5s forwards'
                }}
              >
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'rgb(196, 181, 253)',
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
                    width: '1.25rem',
                    height: '1.25rem',
                    color: 'rgba(196, 181, 253, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 10
                  }} />
                <input
                    type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      display: 'flex',
                      height: '3rem',
                      width: '100%',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: 'rgba(59, 7, 100, 0.4)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      padding: '0.5rem 2.75rem 0.5rem 2.75rem',
                      fontSize: '0.875rem',
                      color: 'white',
                      transition: 'all 0.4s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = '2px solid transparent';
                      e.target.style.boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.5)';
                    }}
                    onBlur={(e) => {
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
                      color: 'rgba(196, 181, 253, 0.7)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease',
                      zIndex: 10
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
                    onMouseLeave={(e) => e.target.style.color = 'rgba(196, 181, 253, 0.7)'}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} />
                    ) : (
                      <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                    )}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: 0,
                  animation: 'fadeIn 0.6s ease-out 0.6s forwards'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '0.125rem',
                      background: 'rgba(88, 28, 135, 0.3)',
                      border: '2px solid rgba(168, 85, 247, 0.3)',
                      color: '#9333ea',
                      cursor: 'pointer'
                    }}
                  />
                  <label
                    htmlFor="remember"
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgb(196, 181, 253)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setResetEmailSent(false);
                    if (!email) {
                      setError('Please enter your email address first');
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) {
                        setError(error.message);
                      } else {
                        setError('');
                        setResetEmailSent(true);
                      }
                    } catch (err) {
                      setError('Failed to send password reset email');
                    }
                  }}
                  style={{
                    fontSize: '0.875rem',
                    color: 'rgba(196, 181, 253, 0.7)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'rgb(196, 181, 253)'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(196, 181, 253, 0.7)'}
                >
                  Forgot password?
                </button>
            </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}
              {resetEmailSent && !error && (
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: '8px',
                    color: '#6ee7b7',
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '16px',
                  }}
                >
                  Reset link sent
                </div>
              )}

              <div
                style={{
                  opacity: 0,
                  transform: 'translateY(10px)',
                  animation: 'slideInUp 0.6s ease-out 0.7s forwards'
                }}
              >
            <button 
              type="submit" 
              disabled={isLoading}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    background: isLoading ? 'rgba(147, 51, 234, 0.5)' : 'linear-gradient(to right, #9333ea, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(168, 85, 247, 0.3)',
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = 'scale(1.02)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(168, 85, 247, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(168, 85, 247, 0.3)';
                    }
                  }}
                >
                {isLoading ? (
                  <>
                      <Loader2 style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                      Loading...
                  </>
                ) : (
                  <>
                      Sign In
                      <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem', transition: 'transform 0.3s ease' }} />
                  </>
                )}
            </button>
              </div>
          </form>

            {/* Divider */}
            <div
              style={{
                position: 'relative',
                margin: '1.5rem 0',
                opacity: 0,
                animation: 'fadeIn 0.6s ease-out 0.8s forwards'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '100%',
                  borderTop: '1px solid rgba(168, 85, 247, 0.2)'
                }}></div>
              </div>
              <div style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                fontSize: '0.75rem'
              }}>
                <span style={{
                  background: 'rgba(59, 7, 100, 0.4)',
                  padding: '0 0.5rem',
                  color: 'rgba(196, 181, 253, 0.7)'
                }}>
                  New to Greek Life?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div
              style={{
                opacity: 0,
                animation: 'fadeIn 0.6s ease-out 0.9s forwards'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('user-info');
                  }
                }}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  background: 'transparent',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  color: 'rgb(196, 181, 253)',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                  e.target.style.background = 'rgba(168, 85, 247, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.target.style.background = 'transparent';
                }}
              >
                Create an Account
              </button>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            color: 'rgba(196, 181, 253, 0.5)',
            fontSize: '0.75rem',
            opacity: 0,
            animation: 'fadeIn 0.6s ease-out 1s forwards',
            margin: '1.5rem 0 0 0'
          }}
        >
          © 2024 Greek Life. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;