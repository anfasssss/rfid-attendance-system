import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseActive, API_BASE_URL } from '../firebaseConfig';
import { 
  StaffIcon, 
  ParentIcon, 
  StudentIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon, 
  InfoIcon 
} from './Icons';

const Login = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('splash'); // splash, credentials
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

  const selectRole = (role) => {
    setLoginType(role);
    setError('');
    setStep('credentials');
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
        
        // Match the object response shape { students, notifications }
        const students = data.students || [];
        if (students.length === 0) {
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
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background grid overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(var(--border-glass) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        opacity: 0.15,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Floating Theme Toggle */}
      <button 
        onClick={toggleTheme}
        type="button"
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          background: 'var(--primary-glow)',
          color: 'var(--primary)',
          border: '1px solid var(--border-glass)',
          padding: '10px',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: 'var(--shadow-ambient)',
          transition: 'var(--transition-fast)'
        }}
      >
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        )}
      </button>

      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '10%', right: '15%', width: '180px', height: '180px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: '180px', height: '180px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%', zIndex: 0 }} />

      {/* STEP 1: INTRO/SPLASH SCREEN */}
      {step === 'splash' && (
        <div className="animate-fade-in" style={{
          maxWidth: '780px',
          width: '100%',
          textAlign: 'center',
          zIndex: 1,
          padding: '20px'
        }}>
          <div style={{ marginBottom: '50px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--primary-glow)',
              border: '1px solid var(--border-glass)',
              marginBottom: '20px',
              color: 'var(--primary)'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Brahmagupta
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Attendance & Communications Console
            </p>
          </div>

          {/* Role selector cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            {/* Staff Card */}
            <div 
              onClick={() => selectRole('staff')}
              className="glass-card"
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                border: '1px solid var(--border-glass)',
                padding: '28px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '180px',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(99,102,241,0.08)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <StaffIcon size={20} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Staff Portal</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Access student directory, approve excuse logs, and record pings.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '20px', color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem' }}>
                <span>Secure Log-in</span>
                <ArrowRightIcon size={12} />
              </div>
            </div>

            {/* Parent Card */}
            <div 
              onClick={() => selectRole('parent')}
              className="glass-card"
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                border: '1px solid var(--border-glass)',
                padding: '28px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '180px',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(6,182,212,0.08)',
                  color: 'rgba(6,182,212,1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <ParentIcon size={20} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Parent Console</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Track daily logs, view inbox notifications, request sick leaves, and settle dues.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '20px', color: 'rgba(6,182,212,1)', fontWeight: '700', fontSize: '0.8rem' }}>
                <span>Access Console</span>
                <ArrowRightIcon size={12} />
              </div>
            </div>

            {/* Student Card */}
            <div 
              onClick={() => selectRole('student')}
              className="glass-card"
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                border: '1px solid var(--border-glass)',
                padding: '28px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '180px',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(16,185,129,0.08)',
                  color: 'rgba(16,185,129,1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <StudentIcon size={20} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Student Workspace</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Verify scanned check-ins, read class circulars, and monitor grades.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '20px', color: 'rgba(16,185,129,1)', fontWeight: '700', fontSize: '0.8rem' }}>
                <span>Verify RFID</span>
                <ArrowRightIcon size={12} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CREDENTIALS FORMS */}
      {step === 'credentials' && (
        <div className="animate-fade-in" style={{
          maxWidth: '440px',
          width: '100%',
          zIndex: 1,
          padding: '20px'
        }}>
          {/* Back button */}
          <button
            onClick={() => {
              setStep('splash');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '25px',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeftIcon size={16} />
            <span>Switch Role</span>
          </button>

          <div className="glass-panel" style={{
            padding: '36px',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-glow)',
            textAlign: 'left'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {loginType === 'staff' ? 'Staff Authorization' : loginType === 'parent' ? 'Parent Verification' : 'Student Verification'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>
              {loginType === 'staff' 
                ? 'Enter email credentials to open administrative portal.' 
                : loginType === 'parent' 
                ? 'Enter your registered phone number to load child logs.' 
                : 'Scan or enter your RFID card UID number.'}
            </p>

            {error && (
              <div style={{
                background: 'var(--danger-glow)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '20px',
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* STAFF LOG IN */}
              {loginType === 'staff' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Email address</label>
                    <input 
                      type="email" 
                      placeholder="name@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Password</label>
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

              {/* PARENT LOG IN */}
              {loginType === 'parent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Registered Mobile Number</label>
                  <input 
                    type="tel" 
                    placeholder="+919656108992"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <InfoIcon size={12} />
                    <span>Include country code (e.g. +91)</span>
                  </span>
                </div>
              )}

              {/* STUDENT LOG IN */}
              {loginType === 'student' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>RFID Card UID</label>
                  <input 
                    type="text" 
                    placeholder="2461C901"
                    value={rfidUid}
                    onChange={(e) => setRfidUid(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <InfoIcon size={12} />
                    <span>UID can be found on back of card</span>
                  </span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary" 
                style={{
                  width: '100%', 
                  padding: '14px', 
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <span>Authorizing...</span>
                ) : (
                  <>
                    <span>Request Verification</span>
                    <ArrowRightIcon size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
