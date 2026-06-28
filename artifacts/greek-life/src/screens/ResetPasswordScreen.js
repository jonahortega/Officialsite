import React, { useState } from 'react';
import './LoginScreen.css';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

/**
 * Shown when the user opens the link from Supabase password-reset email (redirectTo …/reset-password).
 * Session must be the temporary PASSWORD_RECOVERY session.
 */
export default function ResetPasswordScreen({ onNavigate }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError(
          'This link is invalid or expired. Request a new reset from the login screen (Forgot password).'
        );
        setLoading(false);
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message || 'Could not update password.');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      setLoading(false);
      setSuccess(true);
      setRedirecting(true);
      await new Promise((r) => setTimeout(r, 1000));
      if (onNavigate) onNavigate('login');
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(to bottom right, #312e81, #581c87, #312e81)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            background: 'none',
            border: 'none',
            color: 'rgba(196, 181, 253, 0.85)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={18} /> Back to login
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Lock size={40} style={{ color: '#a78bfa', marginBottom: 12 }} />
          <h1 style={{ color: 'white', fontSize: '1.75rem', margin: '0 0 8px' }}>Set new password</h1>
          <p style={{ color: 'rgba(196, 181, 253, 0.85)', margin: 0, fontSize: 15 }}>
            Choose a new password for your account.
          </p>
        </div>

        {success ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#6ee7b7', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>
              Successful
            </p>
            {redirecting ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={20} style={{ color: '#a7f3d0' }} />
                <span style={{ color: 'rgba(167, 243, 208, 0.95)', fontSize: 14 }}>
                  Opening login…
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#e9d5ff', marginBottom: 8, fontSize: 14 }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: 16,
                  opacity: loading ? 0.7 : 1,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#e9d5ff', marginBottom: 8, fontSize: 14 }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
                placeholder="Repeat password"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: 16,
                  opacity: loading ? 0.7 : 1,
                }}
              />
            </div>

            {error ? (
              <div
                style={{
                  padding: '12px',
                  marginBottom: 16,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 600,
                fontSize: 16,
                cursor: loading ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? <Loader2 size={20} /> : null}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
