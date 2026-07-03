import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseActive, API_BASE_URL } from '../firebaseConfig';

const Login = ({ onLoginSuccess }) => {
  const [loginType, setLoginType] = useState('staff'); // staff, parent, student
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  
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

    if (loginType === 'staff') {
      if (isFirebaseActive) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          onLoginSuccess({
            ...userCredential.user,
            role: 'teacher'
          });
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
            displayName: 'Administrator',
            role: 'teacher'
          });
          setLoading(false);
        }, 600);
      }
    } else if (loginType === 'parent') {
      try {
        const res = await fetch(`${API_BASE_URL}/parents/students?phone=${encodeURIComponent(phone)}`);
        if (!res.ok) throw new Error('Verification request failed.');
        const data = await res.json();
        if (data.length === 0) {
          throw new Error('No students found linked to this phone number.');
        }
        onLoginSuccess({ role: 'parent', phone: phone });
      } catch (err) {
        setError(err.message || 'Verification failed. Try again.');
      } finally {
        setLoading(false);
      }
    } else if (loginType === 'student') {
      try {
        const res = await fetch(`${API_BASE_URL}/students/login?rfidUid=${encodeURIComponent(rfidUid)}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('RFID Card UID not registered in student directory.');
          throw new Error('Student login verification failed.');
        }
        const student = await res.json();
        onLoginSuccess({ role: 'student', rfidUid: student.rfidUid });
      } catch (err) {
        setError(err.message || 'Verification failed. Try again.');
      } finally {
        setLoading(false);
      }
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
        maxWidth: '430px',
        width: '100%',
        padding: '35px',
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

        {/* Decorative Orbs */}
        <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', background: 'var(--primary)', filter: 'blur(30px)', opacity: 0.1, borderRadius: '50%', zIndex: -1 }} />
        <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', width: '60px', height: '60px', background: 'var(--secondary)', filter: 'blur(30px)', opacity: 0.1, borderRadius: '50%', zIndex: -1 }} />

        <div style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--primary-glow)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            marginBottom: '14px',
            color: 'var(--primary)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
          </div>
          <h2 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: '800' }}>
            Brahmagupta Academy
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            RFID Student Attendance Control Center
          </p>
        </div>

        {/* PERSISTENT 3-WAY ROLE SELECTOR TABS */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.03)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-glass)',
          marginBottom: '25px'
        }}>
          {['staff', 'parent', 'student'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setLoginType(type);
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: loginType === type ? 'var(--primary-glow)' : 'transparent',
                color: loginType === type ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}
            >
              {type === 'staff' ? '🏫 Staff' : type === 'parent' ? '👨‍👩‍👦 Parent' : '🎒 Student'}
            </button>
          ))}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> 
            <span>{error}</span>
          </div>
        )}

        {/* Local API Mode helper tag for staff login */}
        {loginType === 'staff' && !isFirebaseActive && (
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
            <span>Local Admin Mode: Enter any email/password to log in instantly.</span>
          </div>
        )}

        {/* Parent Mode helper tag */}
        {loginType === 'parent' && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            color: 'var(--primary)',
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
            👨‍👩‍👦 <span>Enter WhatsApp phone matching child records (e.g. <strong>+919656108992</strong>).</span>
          </div>
        )}

        {/* Student Mode helper tag */}
        {loginType === 'student' && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            color: 'var(--success)',
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
            🎒 <span>Enter your student RFID Card UID to log in (e.g. <strong>2461C901</strong> or <strong>07 13 88 31</strong>).</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          
          {/* STAFF INPUT FIELDS */}
          {loginType === 'staff' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Security Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* PARENT INPUT FIELD */}
          {loginType === 'parent' && (
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>WhatsApp Phone Number</label>
              <input
                type="text"
                placeholder="+919656108992"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}

          {/* STUDENT INPUT FIELD */}
          {loginType === 'student' && (
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>RFID Card UID</label>
              <input
                type="text"
                placeholder="2461C901"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value)}
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '700',
              fontSize: '1rem',
              borderRadius: '12px'
            }}
          >
            {loading ? 'Verifying...' : `Access as ${loginType === 'staff' ? 'Instructor' : loginType === 'parent' ? 'Parent' : 'Student'}`}
          </button>
        </form>

        <p style={{ marginTop: '25px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Brahmagupta Attendance System. All connections are encrypted.
        </p>
      </div>
    </div>
  );
};

export default Login;
