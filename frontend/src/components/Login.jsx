import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseActive } from '../firebaseConfig';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isFirebaseActive) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      } catch (err) {
        console.error('Login error:', err);
        setError(err.message || 'Failed to authenticate. Check credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // In local API mode, any input works for testing!
      setTimeout(() => {
        onLoginSuccess({
          email: email || 'teacher@school.edu',
          uid: 'local_guest_teacher',
          displayName: 'Administrator'
        });
        setLoading(false);
      }, 600);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 15px 45px rgba(31, 38, 135, 0.04)',
        border: '1px solid var(--border-glass)'
      }}>
        {/* Floating Theme Toggle */}
        <button 
          onClick={toggleTheme}
          type="button"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            padding: '8px',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: 'none'
          }}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>

        {/* Decorative Glowing Orbs inside the card */}
        <div style={{
          position: 'absolute',
          top: '-15px',
          right: '-15px',
          width: '60px',
          height: '60px',
          background: 'var(--primary)',
          filter: 'blur(30px)',
          opacity: 0.15,
          borderRadius: '50%',
          zIndex: -1
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15px',
          left: '-15px',
          width: '60px',
          height: '60px',
          background: 'var(--secondary)',
          filter: 'blur(30px)',
          opacity: 0.15,
          borderRadius: '50%',
          zIndex: -1
        }} />

        <div style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--primary-glow)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            marginBottom: '16px',
            color: 'var(--primary)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Brahmagupta Academy
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            RFID Student Attendance Control Center
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {error}
          </div>
        )}

        {!isFirebaseActive && (
          <div style={{
            background: 'var(--secondary-glow)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            color: 'var(--secondary)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '20px',
            textAlign: 'left',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <svg style={{ marginTop: '2px', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
            <span>Running in <strong>Local API Mode</strong>. Enter any email/password to log in instantly.</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={isFirebaseActive}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              Security Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={isFirebaseActive}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Instructor'}
          </button>
        </form>

        <p style={{
          marginTop: '30px',
          color: 'var(--text-muted)',
          fontSize: '0.8rem'
        }}>
          Authorized Teacher Credentials Only.
        </p>
      </div>
    </div>
  );
};

export default Login;
