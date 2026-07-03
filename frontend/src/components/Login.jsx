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
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background grid elements for a highly professional feel */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(var(--border-glass) 1.5px, transparent 1.5px)',
        backgroundSize: '32px 32px',
        opacity: 0.25,
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
      <div style={{ position: 'absolute', top: '10%', right: '15%', width: '150px', height: '150px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: '150px', height: '150px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }} />

      {/* STEP 1: INTRO/SPLASH SCREEN */}
      {step === 'splash' && (
        <div className="animate-fade-in" style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          zIndex: 1,
          padding: '20px'
        }}>
          <div style={{ marginBottom: '45px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'var(--primary-glow)',
              border: '1px solid var(--border-glass)',
              marginBottom: '20px',
              color: 'var(--primary)'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
            </div>
            <h1 className="shimmer-text" style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Brahmagupta Academy
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>
              RFID Student Attendance Portal & Management Control Center
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
              className="glass-panel"
              style={{
                padding: '35px 25px',
                cursor: 'pointer',
                transition: 'var(--transition-spring)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-neon)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <StaffIcon size={26} strokeWidth={2.2} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>Staff Portal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Access live scan timelines, student directory registry, and excused leave logs.
              </p>
            </div>

            {/* Parent Card */}
            <div 
              onClick={() => selectRole('parent')}
              className="glass-panel"
              style={{
                padding: '35px 25px',
                cursor: 'pointer',
                transition: 'var(--transition-spring)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-neon)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <ParentIcon size={26} strokeWidth={2.2} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>Parent Portal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Submit excuse sick leaves, check remaining tuition balances, and track check-ins.
              </p>
            </div>

            {/* Student Card */}
            <div 
              onClick={() => selectRole('student')}
              className="glass-panel"
              style={{
                padding: '35px 25px',
                cursor: 'pointer',
                transition: 'var(--transition-spring)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-neon)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <StudentIcon size={26} strokeWidth={2.2} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>Student Portal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Verify your daily check-in status, view attendance heatmaps, and download exam marks.
              </p>
            </div>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Authorized access only. Secure server connected.
          </span>
        </div>
      )}

      {/* STEP 2: CREDENTIAL ENTRY SCREEN */}
      {step === 'credentials' && (
        <div className="animate-float-up" style={{
          maxWidth: '420px',
          width: '100%',
          zIndex: 1
        }}>
          {/* Back button */}
          <button 
            onClick={() => setStep('splash')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px',
              padding: '4px 0',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeftIcon size={16} /> Back to portals
          </button>

          <div className="glass-panel" style={{
            padding: '40px',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative'
          }}>
            {/* Floating indicator */}
            <div style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              color: 'var(--primary)',
              opacity: 0.15
            }}>
              {loginType === 'staff' ? (
                <StaffIcon size={40} />
              ) : loginType === 'parent' ? (
                <ParentIcon size={40} />
              ) : (
                <StudentIcon size={40} />
              )}
            </div>

            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '800', marginBottom: '8px', textAlign: 'left' }}>
              {loginType === 'staff' ? 'Instructor Login' : loginType === 'parent' ? 'Parent Verification' : 'Student Verification'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '30px', textAlign: 'left', lineHeight: '1.4' }}>
              {loginType === 'staff' 
                ? 'Enter your school credentials to access the teacher management panel.' 
                : loginType === 'parent' 
                ? 'Enter your registered phone number to verify and check your kids.'
                : 'Enter your registered student RFID Card UID to verify and view reports.'}
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
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <InfoIcon size={16} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            {/* Helper notes for Guest Mode */}
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
                <InfoIcon size={16} color="var(--secondary)" style={{ marginTop: '2px' }} />
                <span>Running in Offline Dev Mode. Any email/password will authenticate.</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
              
              {/* STAFF INPUTS */}
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
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Password</label>
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

              {/* PARENT INPUT */}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Provide full country prefix (e.g. +91) linked to student registers.
                  </span>
                </div>
              )}

              {/* STUDENT INPUT */}
              {loginType === 'student' && (
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>RFID Card UID</label>
                  <input
                    type="text"
                    placeholder="2461C901"
                    value={rfidUid}
                    onChange={(e) => setRfidUid(e.target.value)}
                    required
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Enter the alpha-numeric card signature key (e.g. 2461C901).
                  </span>
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
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Secure Authorization'}</span>
                {!loading && <ArrowRightIcon size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
