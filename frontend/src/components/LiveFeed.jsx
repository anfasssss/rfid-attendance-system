import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const LiveFeed = ({ userRole }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(true);

  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;
  const filteredLogs = isTeacher 
    ? logs.filter(log => (log.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim() || log.studentId === 'unregistered') 
    : logs;

  // Quick Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [quickRfidUid, setQuickRfidUid] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    // Check database logs every 2s for instant dashboard update
    const interval = setInterval(fetchLogs, 2000);
    
    // Toggle pulse animation for local UI indicator
    const pulseInterval = setInterval(() => {
      setPulse(p => !p);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearInterval(pulseInterval);
    };
  }, []);

  useEffect(() => {
    if (showRegisterModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showRegisterModal]);

  const fetchLogs = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE_URL}/logs?date=${todayStr}`);
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching live logs:', err);
    }
  };

  const handleOpenRegister = (uid) => {
    setQuickRfidUid(uid);
    setName('');
    setGrade('');
    setParentName('');
    setParentPhone('');
    setRegisterError('');
    setShowRegisterModal(true);
  };

  const handleQuickRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    if (!name || !grade || !parentName || !parentPhone) {
      setRegisterError('Please fill in all required fields.');
      setRegisterLoading(false);
      return;
    }

    const payload = {
      name,
      grade,
      rfidUid: quickRfidUid.trim().toUpperCase(),
      parentName,
      parentPhone: parentPhone.trim().replace(/\s+/g, '')
    };

    try {
      const res = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register student record');
      }

      setShowRegisterModal(false);
      fetchLogs(); // Reload logs to reflect newly registered card name instantly!
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <>
      <div className="animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Top Banner: Shimmer Title & active indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 className="shimmer-text" style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: '800' }}>
            Live RFID Scan Feed
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real-time display of incoming student RFID scans as they cross the entrance gate.
          </p>
        </div>

        {/* Live Pulse Indicator Badge */}
        <div 
          className="border-beam-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            padding: '10px 18px',
            borderRadius: '12px',
            boxShadow: pulse ? '0 0 15px rgba(16, 185, 129, 0.1)' : 'var(--shadow-glow)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 10px var(--success)',
            transform: pulse ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }} />
          <span style={{
            fontSize: '0.85rem',
            color: 'var(--success)',
            fontFamily: 'var(--font-display)',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            SYSTEM ACTIVE
          </span>
        </div>
      </div>

      {/* Futuristic Connection Diagnostics panel */}
      <div className="glass-panel" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        padding: '20px 24px',
        marginBottom: '35px',
        borderLeft: '4px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', padding: '8px', borderRadius: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Server Terminal</p>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>192.168.30.6 : 5001</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--secondary)', background: 'var(--secondary-glow)', padding: '8px', borderRadius: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 8.96a17 17 0 0 1 21.16 0" /><circle cx="12" cy="17" r="2" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardware Port</p>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>ESP32 MFRC522 RF</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--success)', background: 'var(--success-glow)', padding: '8px', borderRadius: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp Gateway</p>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>Twilio Sandbox Active</p>
          </div>
        </div>
      </div>

      {/* Main Timeline Card Container */}
      <div className="glass-panel scanner-badge" style={{
        padding: '40px',
        minHeight: '450px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px', height: '300px', color: 'var(--text-secondary)' }}>
            <svg style={{ animation: 'spin 2s linear infinite', color: 'var(--primary)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
            <span style={{ fontSize: '0.95rem', fontWeight: '500', letterSpacing: '0.02em' }}>Synchronizing hardware gateway...</span>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '350px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Radar sweep beam and concentric rings */}
            <div style={{
              position: 'relative',
              width: '300px',
              height: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div className="radar-sweep-beam" />
              <div className="radar-ring" />
              <div className="radar-ring" />
              <div className="radar-ring" />
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary-glow)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                zIndex: 5
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 8.96a17 17 0 0 1 21.16 0" /><circle cx="12" cy="17" r="2" /></svg>
              </div>
            </div>
            <h3 className="shimmer-text" style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>Scanning Airspace</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '380px', lineHeight: '1.6' }}>
              The MFRC522 reader is broadcasting active RF fields. Present an RFID card to log automatic attendance.
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Live Activity Log stream ({filteredLogs.length} tapped events today)
              </span>
            </div>

            {/* Glowing Vertical Timeline */}
            <div className="timeline-stream">
              {filteredLogs.map((log, index) => (
                <div 
                  key={log.id} 
                  className="animate-slide-left"
                  style={{ 
                    position: 'relative', 
                    marginBottom: '25px',
                    animationDelay: `${index * 0.06}s`
                  }}
                >
                  {/* Timeline Node Point indicator */}
                  <div 
                    className={`timeline-node ${log.studentId === 'unregistered' ? 'beacon-pulse' : ''}`}
                    style={{
                      borderColor: log.studentId === 'unregistered' ? 'var(--danger)' : index === 0 ? 'var(--primary)' : 'var(--success)',
                      background: log.studentId === 'unregistered' ? 'var(--danger-glow)' : 'var(--bg-base)',
                      top: '24px'
                    }}
                  />

                  {/* Sleek Glassmorphic Floating Card */}
                  <div 
                    className="glass-panel glass-card timeline-card-hover" 
                    style={{
                      padding: '20px 24px',
                      marginLeft: '15px',
                      borderLeft: log.studentId === 'unregistered' 
                        ? '4px solid var(--danger)' 
                        : index === 0 
                          ? '4px solid var(--primary)' 
                          : '4px solid var(--success)',
                      background: log.studentId === 'unregistered' 
                        ? 'var(--danger-glow)' 
                        : index === 0 
                          ? 'rgba(99, 102, 241, 0.03)' 
                          : 'var(--bg-surface)',
                      boxShadow: log.studentId === 'unregistered'
                        ? '0 6px 20px rgba(239, 68, 68, 0.05)'
                        : 'var(--shadow-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '15px'
                    }}
                  >
                    {/* Student Identity and Avatar details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: log.studentId === 'unregistered'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : index === 0 
                            ? 'var(--primary)' 
                            : 'rgba(99, 102, 241, 0.08)',
                        color: log.studentId === 'unregistered'
                          ? 'var(--danger)'
                          : index === 0 
                            ? 'white' 
                            : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        border: log.studentId === 'unregistered' ? '1.5px solid rgba(239, 68, 68, 0.25)' : 'none'
                      }}>
                        {log.studentId === 'unregistered' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        ) : log.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ 
                          fontSize: '1.05rem', 
                          fontWeight: '700',
                          color: log.studentId === 'unregistered' ? 'var(--danger)' : 'var(--text-primary)',
                          marginBottom: '4px'
                        }}>
                          {log.studentName}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            color: log.studentId === 'unregistered' ? 'var(--danger)' : 'var(--text-secondary)',
                            background: log.studentId === 'unregistered' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(0,0,0,0.03)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-glass)'
                          }}>
                            {log.grade}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.6 }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                            {log.rfidUid}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick registration or diagnostic indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
                      {log.studentId === 'unregistered' ? (
                        <button 
                          onClick={() => handleOpenRegister(log.rfidUid)}
                          className="btn-primary" 
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--danger), hsl(340, 80%, 45%))',
                            boxShadow: '0 4px 12px var(--danger-glow)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
                          Quick Register
                        </button>
                      ) : (
                        <div style={{
                          fontSize: '0.8rem',
                          background: 'rgba(16, 185, 129, 0.05)',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          color: 'var(--success)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                          WhatsApp Sent
                        </div>
                      )}

                      {/* Monospace arrival digital clock */}
                      <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-glass)', paddingLeft: '15px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: index === 0 ? 'var(--primary)' : 'var(--text-primary)',
                          fontSize: '1.1rem',
                          letterSpacing: '0.02em'
                        }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Arrival time</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      </div>

      {/* Futuristic Quick Register modal shortcut pop-up */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card border-beam-card" style={{
            maxWidth: '500px',
            padding: '35px'
          }}>
            <h2 className="shimmer-text" style={{ fontSize: '1.6rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ color: 'var(--primary)' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
              Quick Card Linker
            </h2>

            {registerError && (
              <div style={{ 
                background: 'var(--danger-glow)', 
                border: '1px solid var(--danger)', 
                color: 'var(--danger)', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleQuickRegisterSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>RFID Card UID (Hex Linked)</label>
                <input 
                  type="text" 
                  value={quickRfidUid} 
                  disabled 
                  style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.03)', fontWeight: 'bold', color: 'var(--primary)' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Student Name *</label>
                  <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Grade / Class *</label>
                  <input type="text" placeholder="Grade 10-A" value={grade} onChange={(e) => setGrade(e.target.value)} required />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)', margin: '25px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Parent Name *</label>
                  <input type="text" placeholder="Mary Doe" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>WhatsApp Phone *</label>
                  <input type="text" placeholder="+919876543210" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={registerLoading} className="btn-primary" style={{ padding: '10px 24px' }}>
                  {registerLoading ? 'Linking...' : 'Complete Linking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveFeed;
