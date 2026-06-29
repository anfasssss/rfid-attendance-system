import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, isFirebaseActive, API_BASE_URL } from './firebaseConfig';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LiveFeed from './components/LiveFeed';
import StudentDirectory from './components/StudentDirectory';
import Reports from './components/Reports';
import LeaveReports from './components/LeaveReports';
import FeesManagement from './components/FeesManagement';
import ToastContainer from './components/ToastContainer';
import ScanSimulator from './components/ScanSimulator';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Light by default
  const [teachers, setTeachers] = useState([]);
  const [userRole, setUserRole] = useState({ role: 'admin', grade: null });

  // Global Toast Alert State
  const [toasts, setToasts] = useState([]);

  const triggerToast = (type, message) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Automatically remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Poll new scan logs to trigger global toast alerts
  const processedLogIdsRef = useRef(new Set());
  const isFirstFetchRef = useRef(true);

  useEffect(() => {
    if (!currentUser) return;

    const pollLogs = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE_URL}/logs?date=${todayStr}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const isFirst = isFirstFetchRef.current;
        const processed = processedLogIdsRef.current;

        // Sort ascending chronologically so toasts stack correctly
        const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedData.forEach(log => {
          if (!processed.has(log.id)) {
            processed.add(log.id);
            if (!isFirst) {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              if (log.studentId === 'unregistered') {
                triggerToast('warning', `🚨 Unregistered card scanned! UID: ${log.rfidUid}`);
              } else {
                triggerToast('success', `✅ ${log.studentName} checked in safely at ${timeStr} (${log.grade})`);
              }
            }
          }
        });

        if (isFirst) {
          isFirstFetchRef.current = false;
        }
      } catch (err) {
        console.error('Error polling logs for toasts:', err);
      }
    };

    pollLogs();
    const interval = setInterval(pollLogs, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/teachers`);
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      console.error('Error fetching teachers list:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setUserRole({ role: 'admin', grade: null });
      return;
    }

    const cleanEmail = currentUser.email.toLowerCase().trim();
    const matchedTeacher = teachers.find(t => t.email.toLowerCase().trim() === cleanEmail);

    if (matchedTeacher) {
      setUserRole({
        role: 'teacher',
        grade: matchedTeacher.grade,
        name: matchedTeacher.name
      });
    } else {
      setUserRole({
        role: 'admin',
        grade: null,
        name: currentUser.displayName || 'Administrator'
      });
    }
  }, [currentUser, teachers]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    if (isFirebaseActive) {
      try {
        await signOut(auth);
        setCurrentUser(null);
      } catch (err) {
        console.error('Signout error:', err);
      }
    } else {
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
          <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
        </svg>
      )
    },
    {
      id: 'live',
      label: 'Live Feed',
      sublabel: 'Real-time RFID',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 8.96a17 17 0 0 1 21.16 0"/>
          <circle cx="12" cy="17" r="2"/>
        </svg>
      )
    },
    {
      id: 'directory',
      label: 'Students',
      sublabel: 'Directory',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reports',
      sublabel: 'Historical',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      )
    },
    {
      id: 'leaves',
      label: 'Leave Reports',
      sublabel: 'Approvals',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )
    },
    {
      id: 'fees',
      label: userRole.role === 'teacher' ? 'Class Fees' : 'Fees',
      sublabel: userRole.role === 'teacher' ? 'Ledger' : 'Management',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      )
    }
  ];

  const tabColors = {
    dashboard: 'var(--primary)',
    live:      'var(--accent)',
    directory: 'var(--success)',
    reports:   'var(--secondary)',
    leaves:    'var(--danger)',
    fees:      'var(--warning)',
  };

  return (
    <div className="app-container">
      {/* Background Orbs */}
      {darkMode && (
        <>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </>
      )}

      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="mobile-toggle-btn"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Navigation */}
      <nav className={`sidebar ${mobileMenuOpen ? 'active' : ''}`} style={{ left: mobileMenuOpen ? '0' : undefined }}>

        {/* School Branding */}
        <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{
              width: '42px', height: '42px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 20px rgba(var(--primary-raw), 0.4)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
              </svg>
            </div>
            <div>
              <h3 className="shimmer-text" style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Brahmagupta
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Attendance Hub
              </span>
            </div>
          </div>

          {/* Teacher active classroom card */}
          {userRole.role === 'teacher' && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: 'var(--primary-glow)',
              border: '1px solid var(--border-bright)',
              borderRadius: '14px',
              animation: 'pulse-glow 4s ease infinite',
            }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Active Classroom
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
                  {userRole.grade}
                </h4>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {darkMode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div style={{
              width: '36px', height: '20px',
              background: darkMode ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              position: 'relative',
              transition: 'var(--transition-smooth)',
              boxShadow: darkMode ? '0 0 10px rgba(var(--primary-raw), 0.4)' : 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '2px',
                left: darkMode ? '18px' : '2px',
                width: '16px', height: '16px',
                background: 'white',
                borderRadius: '50%',
                transition: 'var(--transition-smooth)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }} />
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
              className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
              style={{ '--active-color': tabColors[item.id] }}
            >
              <div className="nav-icon" style={activeTab === item.id ? {
                background: `${tabColors[item.id]}22`,
                borderColor: `${tabColors[item.id]}44`,
                color: tabColors[item.id],
                boxShadow: `0 0 12px ${tabColors[item.id]}30`
              } : {}}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: activeTab === item.id ? '700' : '500', lineHeight: 1.2, color: activeTab === item.id ? tabColors[item.id] : 'inherit' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                  {item.sublabel}
                </div>
              </div>
              {activeTab === item.id && (
                <div style={{
                  marginLeft: 'auto',
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: tabColors[item.id],
                  boxShadow: `0 0 8px ${tabColors[item.id]}`,
                  flexShrink: 0
                }} />
              )}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-glass)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.95rem', fontWeight: '800',
              flexShrink: 0,
              boxShadow: '0 0 14px rgba(var(--primary-raw), 0.35)'
            }}>
              {currentUser.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {userRole.name || 'Instructor'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                {userRole.role === 'teacher' ? `Class Teacher · ${userRole.grade}` : 'Principal Admin'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              border: '1px solid rgba(var(--danger-raw), 0.2)',
              color: 'var(--danger)',
              background: 'var(--danger-glow)',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(var(--danger-raw), 0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--danger-glow)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab === 'dashboard'  && <Dashboard  userRole={userRole} teachers={teachers} />}
        {activeTab === 'live'       && <LiveFeed   userRole={userRole} />}
        {activeTab === 'directory'  && <StudentDirectory userRole={userRole} teachers={teachers} fetchTeachers={fetchTeachers} />}
        {activeTab === 'reports'    && <Reports    userRole={userRole} teachers={teachers} />}
        {activeTab === 'leaves'     && <LeaveReports userRole={userRole} />}
        {activeTab === 'fees'       && <FeesManagement userRole={userRole} teachers={teachers} />}
      </main>

      {/* Global Toast Alert Center */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Collapsible RFID Scanner Simulator */}
      <ScanSimulator triggerToast={triggerToast} />
    </div>
  );
}

export default App;
