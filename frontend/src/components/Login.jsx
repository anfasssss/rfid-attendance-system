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
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)'
    }}>
      {/* Background dot layout */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(var(--border-glass) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        opacity: 0.12,
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
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
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

      {/* Main Split Layout Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        zIndex: 1
      }}>
        
        {/* LEFT COLUMN: Editorial branding & console diagnostics */}
        <div style={{
          flex: '1.2',
          background: 'rgba(10, 12, 22, 0.4)',
          borderRight: '1px solid var(--border-glass)',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          textAlign: 'left'
        }} className="hidden-mobile">
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--primary-glow)',
              border: '1px solid var(--border-bright)',
              color: 'var(--primary)',
              marginBottom: '40px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
            </div>
            
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '900',
              letterSpacing: '-0.05em',
              lineHeight: '0.95',
              color: 'var(--text-primary)',
              marginBottom: '15px'
            }}>
              Brahmagupta
            </h1>
            <p style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--primary)',
              fontWeight: 'bold',
              marginBottom: '30px'
            }}>
              Security & Check-in Control
            </p>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              maxWidth: '380px'
            }}>
              Bespoke local platform logging secure student verification checks and immediate parental notifications over RFID frequencies.
            </p>
          </div>

          {/* Editorial tech metadata footer */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '25px',
            maxWidth: '320px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="tech-label">System State</span>
              <span className="tech-value" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>ACTIVE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="tech-label">Local Host</span>
              <span className="tech-value" style={{ fontSize: '0.75rem' }}>192.168.1.17</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="tech-label">Gateway Engine</span>
              <span className="tech-value" style={{ fontSize: '0.75rem' }}>Twilio Client</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Login Morph Form */}
        <div style={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}>
          
          {/* STEP 1: SPLASH CARDS ROLE SELECTOR */}
          {step === 'splash' && (
            <div className="animate-fade-in" style={{
              maxWidth: '420px',
              width: '100%',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '35px' }} className="visible-mobile-only">
                <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Brahmagupta</h1>
                <span className="tech-label" style={{ color: 'var(--primary)' }}>Attendance Access</span>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <span className="tech-label">Select Workspace Role</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.03em' }}>Welcome back.</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Staff Link */}
                <div 
                  onClick={() => selectRole('staff')}
                  className="bento-border"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ color: 'var(--primary)' }}><StaffIcon size={18} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Staff Workspace</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Directory, logs, database control</p>
                    </div>
                  </div>
                  <ArrowRightIcon size={14} color="var(--text-muted)" />
                </div>

                {/* Parent Link */}
                <div 
                  onClick={() => selectRole('parent')}
                  className="bento-border"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ color: 'rgba(6, 182, 212, 1)' }}><ParentIcon size={18} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Parent Portal</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Check-in reports, tuition dues, inbox alerts</p>
                    </div>
                  </div>
                  <ArrowRightIcon size={14} color="var(--text-muted)" />
                </div>

                {/* Student Link */}
                <div 
                  onClick={() => selectRole('student')}
                  className="bento-border"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ color: 'rgba(16, 185, 129, 1)' }}><StudentIcon size={18} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Student Workspace</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Personal grades, check-in log records</p>
                    </div>
                  </div>
                  <ArrowRightIcon size={14} color="var(--text-muted)" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS VERIFICATION FORM */}
          {step === 'credentials' && (
            <div className="animate-fade-in" style={{
              maxWidth: '380px',
              width: '100%',
              textAlign: 'left'
            }}>
              {/* Back switcher */}
              <button
                onClick={() => {
                  setStep('splash');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '25px',
                  padding: '8px 0',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <ArrowLeftIcon size={14} />
                <span>Return to workspaces</span>
              </button>

              <div className="bento-border" style={{
                padding: '30px',
                borderRadius: '20px'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {loginType === 'staff' ? 'Staff Login' : loginType === 'parent' ? 'Parent Verification' : 'Student Verification'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '24px' }}>
                  {loginType === 'staff' 
                    ? 'Use verified credentials to open school registry.' 
                    : loginType === 'parent' 
                    ? 'Enter registered parent phone to load student workspaces.' 
                    : 'Input card serial RFID number.'}
                </p>

                {error && (
                  <div style={{
                    background: 'var(--danger-glow)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    marginBottom: '20px',
                    fontWeight: '600',
                    lineHeight: '1.4'
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* STAFF INPUT */}
                  {loginType === 'staff' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="tech-label">Email address</span>
                        <input 
                          type="email" 
                          placeholder="name@school.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="tech-label">Password</span>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* PARENT INPUT */}
                  {loginType === 'parent' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="tech-label">Mobile Number</span>
                      <input 
                        type="tel" 
                        placeholder="+919656108992"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '10px'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <InfoIcon size={12} />
                        <span>Include country calling code (+91)</span>
                      </span>
                    </div>
                  )}

                  {/* STUDENT INPUT */}
                  {loginType === 'student' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="tech-label">RFID Card UID</span>
                      <input 
                        type="text" 
                        placeholder="2461C901"
                        value={rfidUid}
                        onChange={(e) => setRfidUid(e.target.value)}
                        required
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '10px'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <InfoIcon size={12} />
                        <span>Input serial string found on card back</span>
                      </span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary" 
                    style={{
                      width: '100%', 
                      padding: '12px', 
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '10px'
                    }}
                  >
                    {loading ? (
                      <span>Validating Session...</span>
                    ) : (
                      <>
                        <span>Open Workspace</span>
                        <ArrowRightIcon size={12} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
