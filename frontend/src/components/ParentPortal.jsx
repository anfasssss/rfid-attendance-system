import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';
import AttendanceHeatmap from './AttendanceHeatmap';
import { 
  HomeIcon, 
  LogsIcon, 
  FeesIcon, 
  LeavesIcon, 
  ReportsIcon, 
  LogoutIcon, 
  CloseIcon, 
  InfoIcon, 
  CheckIcon,
  StudentIcon,
  ParentIcon,
  MessageIcon
} from './Icons';

const ParentPortal = ({ role = 'parent', parentPhone = '', studentRfid = '', onLogout }) => {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data State
  const [students, setStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('home'); // home, logs, messages, fees, leaves, marks

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('5000');
  const [payLoading, setPayLoading] = useState(false);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  const activeStudent = students[selectedStudentIndex] || null;

  // Auto-login on mount
  useEffect(() => {
    if (role === 'student') {
      if (studentRfid) {
        setError('');
        setLoading(true);
        fetch(`${API_BASE_URL}/students/login?rfidUid=${encodeURIComponent(studentRfid)}`)
          .then(res => {
            if (!res.ok) throw new Error('Student profile details not found.');
            return res.json();
          })
          .then(studentData => {
            setStudents([studentData]);
            setNotifications(studentData.notifications || []);
            setIsLoggedIn(true);
          })
          .catch(err => {
            setError(err.message || 'Failed to retrieve student profile.');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } else {
      const loginPhone = parentPhone || localStorage.getItem('parent_phone');
      if (loginPhone) {
        setPhone(loginPhone);
        handleLogin(null, loginPhone);
      } else {
        setError('No verified phone session found.');
      }
    }
  }, [role, studentRfid, parentPhone]);

  const handleLogin = async (e, forcePhone = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginPhone = forcePhone || phone;
    if (!loginPhone) {
      setError('Please enter your registered phone number.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/parents/students?phone=${encodeURIComponent(loginPhone)}`);
      if (!res.ok) throw new Error('Failed to connect to local server.');
      const data = await res.json();
      
      const fetchedStudents = data.students || [];
      const fetchedNotifications = data.notifications || [];

      if (fetchedStudents.length === 0) {
        throw new Error('No students linked to this phone number. Make sure to include the country code (e.g. +919656108992).');
      }

      setStudents(fetchedStudents);
      setNotifications(fetchedNotifications);
      setIsLoggedIn(true);
      localStorage.setItem('parent_phone', loginPhone);
    } catch (err) {
      setError(err.message || 'Verification failed. Try again.');
      localStorage.removeItem('parent_phone');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_phone');
    setIsLoggedIn(false);
    setStudents([]);
    setNotifications([]);
    setPhone('');
    setSelectedStudentIndex(0);
    setActiveSubTab('home');
    if (onLogout) onLogout();
  };

  const reloadData = async () => {
    try {
      if (role === 'student') {
        const res = await fetch(`${API_BASE_URL}/students/login?rfidUid=${encodeURIComponent(studentRfid)}`);
        if (res.ok) {
          const studentData = await res.json();
          setStudents([studentData]);
          setNotifications(studentData.notifications || []);
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/parents/students?phone=${encodeURIComponent(phone)}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error('Error refreshing portal details:', err);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!activeStudent || !payAmount) return;
    setPayLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/parents/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeStudent.id,
          amount: Number(payAmount)
        })
      });

      if (!res.ok) throw new Error('Payment server error');
      
      setShowPayModal(false);
      setPayAmount('5000');
      await reloadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!activeStudent || !leaveReason) return;
    setLeaveLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/parents/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeStudent.id,
          reason: leaveReason
        })
      });

      if (!res.ok) throw new Error('Leave request server error');
      
      setShowLeaveModal(false);
      setLeaveReason('');
      await reloadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLeaveLoading(false);
    }
  };

  // Loading Screen
  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div className="bento-border animate-fade-in" style={{
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: '800', letterSpacing: '-0.02em' }}>Retrieving secure session</h2>
          <div style={{ margin: '20px 0', height: '2px', background: 'var(--border-glass)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', height: '100%', width: '40%', background: 'var(--primary)', animation: 'shimmer 1.5s infinite ease-in-out' }} />
          </div>
          {error && (
            <div style={{
              background: 'var(--danger-glow)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              textAlign: 'left',
              fontWeight: '500'
            }}>
              {error}
              <button onClick={onLogout} style={{ display: 'block', marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer' }}>Back to Login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate student attendance rate
  const totalLogs = activeStudent?.logs?.length || 0;
  const attendanceRate = Math.min(100, Math.max(0, Math.round((totalLogs / 30) * 100)));
  const totalLeavesApproved = activeStudent?.leaves?.filter(l => l.status === 'Approved').length || 0;
  const totalAbsences = Math.max(0, 30 - totalLogs - totalLeavesApproved);

  // Calculate payments
  const totalPaid = activeStudent?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalFeesDue = 15000;
  const remainingFees = Math.max(0, totalFeesDue - totalPaid);

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '20px 20px 100px 20px',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Universal Floating Phone Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '25px',
        padding: '10px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-glass)'
          }}>
            {role === 'student' ? <StudentIcon size={18} /> : <ParentIcon size={18} />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '800', letterSpacing: '-0.02em' }}>
              {role === 'student' ? 'Student Workspace' : 'Parent Console'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {role === 'student' ? `CARD: ${studentRfid}` : `TEL: ${phone}`}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          style={{
            background: 'none',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-secondary)',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '0.78rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 68, 68, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.borderColor = 'var(--border-glass)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <LogoutIcon size={14} />
          <span>Exit</span>
        </button>
      </header>

      {/* Children Carousel Tab Selector (Only visible for Parent role) */}
      {role === 'parent' && students.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '5px'
        }}>
          {students.map((student, idx) => (
            <button
              key={student.id}
              onClick={() => {
                setSelectedStudentIndex(idx);
                reloadData();
              }}
              style={{
                flex: '1',
                padding: '10px 14px',
                borderRadius: '10px',
                background: selectedStudentIndex === idx ? 'var(--primary-glow)' : 'var(--bg-surface)',
                border: selectedStudentIndex === idx ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                color: selectedStudentIndex === idx ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'var(--transition-fast)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.82rem'
              }}
            >
              <StudentIcon size={12} />
              <span>{student.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* PORTAL MAIN TAB BODY CONTAINER */}
      {activeStudent && (
        <div style={{ minHeight: '300px' }}>
          
          {/* TAB 1: ASYMMETRICAL BENTO GRID WORKSPACE */}
          {activeSubTab === 'home' && (
            <div className="animate-float-up" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '20px'
            }}>
              {/* Bento Box 1: Profile & Enrollment */}
              <div className="bento-border" style={{
                gridColumn: 'span 12',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                borderRadius: '20px'
              }}>
                <img 
                  src={activeStudent.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(activeStudent.name)}`}
                  alt={activeStudent.name}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '1.5px solid var(--primary)',
                    boxShadow: 'var(--shadow-neon)'
                  }}
                />
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: '900', marginBottom: '4px', letterSpacing: '-0.03em' }}>
                    {activeStudent.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="tech-value" style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px' }}>
                      {activeStudent.grade}
                    </span>
                    <span style={{ height: '10px', width: '1px', background: 'var(--border-glass)' }} />
                    <span className="tech-value" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {activeStudent.rfidUid}
                    </span>
                  </div>
                  {activeStudent.createdAt && (
                    <span className="tech-value" style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-glass)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '4px', height: '4px', background: 'var(--success)', borderRadius: '50%' }} />
                      Enrolled: {new Date(activeStudent.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Bento Box 2: Attendance Status (Span 6) */}
              <div className="bento-border" style={{
                gridColumn: 'span 6',
                padding: '20px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'left'
              }}>
                <div>
                  <span className="tech-label">Status Today</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>
                    {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? (
                      activeStudent.logs.find(l => l.dateStr === new Date().toISOString().split('T')[0])?.type === 'exit' ? (
                        <span style={{ color: 'var(--accent)' }}>Checked Out</span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>Present</span>
                      )
                    ) : activeStudent.leaves.some(l => l.dateStr === new Date().toISOString().split('T')[0] && l.status === 'Approved') ? (
                      <span style={{ color: 'var(--warning)' }}>Excused Leave</span>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>Absent</span>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? 'var(--success)' : 'var(--danger)',
                    boxShadow: activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? '0 0 8px var(--success)' : '0 0 8px var(--danger)'
                  }} />
                  <span className="tech-label" style={{ fontSize: '0.6rem' }}>
                    {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? 'Ping Active' : 'No Ping'}
                  </span>
                </div>
              </div>

              {/* Bento Box 3: Attendance Rate Gauge */}
              <div className="bento-border" style={{
                gridColumn: 'span 6',
                padding: '20px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <svg height="80" width="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="32" stroke="var(--border-glass)" strokeWidth="5" fill="transparent" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="var(--primary)" 
                      strokeWidth="5" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - attendanceRate / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="tech-value" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.15rem',
                    color: 'var(--text-primary)'
                  }}>
                    {attendanceRate}%
                  </div>
                </div>
                <span className="tech-label" style={{ marginTop: '12px' }}>
                  Score
                </span>
              </div>

              {/* Bento Box 4: Tuition Balance */}
              <div className="bento-border" style={{
                gridColumn: 'span 12',
                padding: '24px',
                borderRadius: '20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span className="tech-label">Tuition Balance</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                    <h2 className="tech-value" style={{ fontSize: '1.65rem', color: remainingFees > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      ₹{remainingFees.toLocaleString()}
                    </h2>
                    <span className="tech-value" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      of ₹{totalFeesDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {role === 'parent' && remainingFees > 0 && (
                  <button 
                    onClick={() => setShowPayModal(true)} 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', alignSelf: 'flex-start' }}
                  >
                    <FeesIcon size={12} />
                    <span>Pay Dues</span>
                  </button>
                )}
              </div>

              {/* Bento Box 5: Grades Overview snapshot */}
              <div className="bento-border" style={{
                gridColumn: 'span 12',
                padding: '20px',
                borderRadius: '20px',
                textAlign: 'left'
              }}>
                <span className="tech-label" style={{ marginBottom: '12px', display: 'block' }}>Grades ledger</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(activeStudent.marks || []).slice(0, 3).map((m, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px'
                    }}>
                      <span className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{m.subject}</span>
                      <span className="tech-value" style={{ fontSize: '0.8rem', color: m.grade.includes('A') ? 'var(--success)' : 'var(--primary)' }}>{m.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED ATTENDANCE REPORT & HEATMAP */}
          {activeSubTab === 'logs' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Detailed Monthly Stats Card */}
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', textAlign: 'center' }}>
                <div>
                  <span className="tech-label">Present</span>
                  <p className="tech-value" style={{ fontSize: '1.15rem', color: 'var(--success)', marginTop: '4px' }}>{totalLogs}</p>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-glass)', borderRight: '1px solid var(--border-glass)' }}>
                  <span className="tech-label">Excused</span>
                  <p className="tech-value" style={{ fontSize: '1.15rem', color: 'var(--primary)', marginTop: '4px' }}>{totalLeavesApproved}</p>
                </div>
                <div>
                  <span className="tech-label">Absent</span>
                  <p className="tech-value" style={{ fontSize: '1.15rem', color: 'var(--danger)', marginTop: '4px' }}>{totalAbsences}</p>
                </div>
              </div>

              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '15px', textAlign: 'left' }}>Daily Grid</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AttendanceHeatmap logs={activeStudent.logs} leaves={activeStudent.leaves} />
                </div>
              </div>

              {/* Logs Stream */}
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '15px', textAlign: 'left' }}>Logs Ledger</span>
                {activeStudent.logs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>No logs recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {activeStudent.logs.map(log => (
                      <div key={log.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="tech-value" style={{
                            fontSize: '0.62rem',
                            color: log.type === 'exit' ? 'rgba(6, 182, 212, 1)' : 'rgba(16, 185, 129, 1)',
                            background: log.type === 'exit' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: log.type === 'exit' ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                            marginRight: '12px'
                          }}>
                            {log.type === 'exit' ? 'EXIT' : 'ENTRY'}
                          </span>
                          <span className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REAL-TIME MESSAGES INBOX */}
          {activeSubTab === 'messages' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <MessageIcon size={14} />
                  <span>Received Alerts History</span>
                </span>
                
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontSize: '0.8rem' }}>No messages received yet.</p>
                ) : (
                  <div className="timeline-guide-rail" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto', paddingLeft: '10px' }}>
                    {notifications.map(notif => (
                      <div key={notif.id} style={{
                        padding: '16px 16px 16px 28px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-glass)',
                        textAlign: 'left',
                        position: 'relative'
                      }}>
                        {/* Timeline Node Ring */}
                        <div style={{
                          position: 'absolute',
                          left: '-14px',
                          top: '20px',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: 'var(--bg-base)',
                          border: '2px solid var(--primary)',
                          boxShadow: '0 0 6px var(--primary)',
                          zIndex: 2
                        }} />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="tech-value" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {new Date(notif.timestamp).toLocaleDateString()} {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line', fontWeight: '500' }}>
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FEES & PAYMENTS */}
          {activeSubTab === 'fees' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Fee balance card */}
              <div className="bento-border" style={{ padding: '24px', textAlign: 'center', borderRadius: '20px' }}>
                <span className="tech-label">Remaining Balance</span>
                <h2 className="tech-value" style={{ fontSize: '2.1rem', color: remainingFees > 0 ? 'var(--warning)' : 'var(--success)', marginTop: '10px', marginBottom: '15px' }}>
                  ₹{remainingFees.toLocaleString()}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                  <div>
                    <span className="tech-label">Dues Total</span>
                    <p className="tech-value" style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '4px' }}>₹{totalFeesDue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="tech-label">Paid Ledger</span>
                    <p className="tech-value" style={{ fontSize: '0.95rem', color: 'var(--success)', marginTop: '4px' }}>₹{totalPaid.toLocaleString()}</p>
                  </div>
                </div>

                {role === 'parent' && remainingFees > 0 && (
                  <button 
                    onClick={() => setShowPayModal(true)} 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}
                  >
                    <FeesIcon size={14} />
                    <span>Pay Tuition Dues</span>
                  </button>
                )}

                {role === 'student' && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <InfoIcon size={14} color="var(--primary)" />
                    <span>Payments are restricted to Parent login.</span>
                  </div>
                )}
              </div>

              {/* Payment Receipts History */}
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '15px' }}>Receipts ledger</span>
                {activeStudent.payments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>No payments logged yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeStudent.payments.map(p => (
                      <div key={p.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ textAlign: 'left' }}>
                          <span className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            Tuition Installment
                          </span>
                          <p className="tech-value" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(p.timestamp).toLocaleDateString()} {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="tech-value" style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                          + ₹{p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: LEAVE REQUESTS */}
          {activeSubTab === 'leaves' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <span className="tech-label">Excused Log</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {role === 'student' ? 'Leave requests submitted by parent logs.' : 'Submit leave excuses directly.'}
                  </p>
                </div>
                {role === 'parent' && (
                  <button 
                    onClick={() => setShowLeaveModal(true)} 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <LeavesIcon size={12} />
                    <span>Submit</span>
                  </button>
                )}
              </div>

              {/* Leave Requests stream */}
              <div className="bento-border" style={{ padding: '20px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '15px' }}>Excuse log</span>
                {activeStudent.leaves.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>No leave requests submitted.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeStudent.leaves.map(l => (
                      <div key={l.id} style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ textAlign: 'left' }}>
                          <p className="tech-value" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {l.reason}
                          </p>
                          <span className="tech-value" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                            Requested: {new Date(l.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="tech-value" style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: l.status === 'Approved' ? 'var(--success)' : l.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)',
                          background: l.status === 'Approved' ? 'var(--success-glow)' : l.status === 'Rejected' ? 'var(--danger-glow)' : 'rgba(245, 158, 11, 0.08)',
                          border: l.status === 'Approved' ? '1px solid rgba(16, 185, 129, 0.2)' : l.status === 'Rejected' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                        }}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: REPORT CARD (EXAM MARKS) */}
          {activeSubTab === 'marks' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="bento-border" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="tech-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <ReportsIcon size={14} />
                  <span>Academic Transcript</span>
                </span>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.7rem' }}>
                      <th className="tech-label" style={{ padding: '12px 10px' }}>Subject</th>
                      <th className="tech-label" style={{ padding: '12px 10px', textAlign: 'center' }}>Score</th>
                      <th className="tech-label" style={{ padding: '12px 10px', textAlign: 'right' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeStudent.marks || []).map((m, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem' }}>
                        <td className="tech-value" style={{ padding: '12px 10px', color: 'var(--text-primary)' }}>{m.subject}</td>
                        <td className="tech-value" style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{m.score} / {m.total}</td>
                        <td className="tech-value" style={{ padding: '12px 10px', textAlign: 'right', color: m.grade.includes('A') ? 'var(--success)' : 'var(--primary)' }}>
                          {m.grade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Bottom Floating Phone App Navigation Bar */}
      <nav className="bento-border" style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '480px',
        borderRadius: '30px',
        padding: '10px 10px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 999
      }}>
        <button
          onClick={() => setActiveSubTab('home')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'home' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'home' ? '700' : '500'
          }}
        >
          <HomeIcon size={18} color={activeSubTab === 'home' ? 'var(--primary)' : '#64748b'} />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'logs' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'logs' ? '700' : '500'
          }}
        >
          <LogsIcon size={18} color={activeSubTab === 'logs' ? 'var(--primary)' : '#64748b'} />
          <span>Report</span>
        </button>

        <button
          onClick={() => setActiveSubTab('messages')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'messages' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'messages' ? '700' : '500'
          }}
        >
          <MessageIcon size={18} color={activeSubTab === 'messages' ? 'var(--primary)' : '#64748b'} />
          <span>Inbox</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fees')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'fees' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'fees' ? '700' : '500'
          }}
        >
          <FeesIcon size={18} color={activeSubTab === 'fees' ? 'var(--primary)' : '#64748b'} />
          <span>Fees</span>
        </button>

        <button
          onClick={() => setActiveSubTab('leaves')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'leaves' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'leaves' ? '700' : '500'
          }}
        >
          <LeavesIcon size={18} color={activeSubTab === 'leaves' ? 'var(--primary)' : '#64748b'} />
          <span>Leaves</span>
        </button>

        <button
          onClick={() => setActiveSubTab('marks')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeSubTab === 'marks' ? 'var(--primary)' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeSubTab === 'marks' ? '700' : '500'
          }}
        >
          <ReportsIcon size={18} color={activeSubTab === 'marks' ? 'var(--primary)' : '#64748b'} />
          <span>Grades</span>
        </button>
      </nav>

      {/* QUICK PAY MODAL POPUP */}
      {showPayModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="bento-border modal-card" style={{
            maxWidth: '400px',
            padding: '30px',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '800', letterSpacing: '-0.02em' }}>Record Tuition Payment</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <CloseIcon size={16} />
              </button>
            </div>
            
            <form onSubmit={handlePaySubmit}>
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Amount to Pay (INR)
                </span>
                <input 
                  type="number" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  required 
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    width: '100%',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={payLoading}
                  className="btn-primary"
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  {payLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL POPUP */}
      {showLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="bento-border modal-card" style={{
            maxWidth: '400px',
            padding: '30px',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '800', letterSpacing: '-0.02em' }}>Excuse Absence Log</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <CloseIcon size={16} />
              </button>
            </div>
            
            <form onSubmit={handleLeaveSubmit}>
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <span className="tech-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Reason for Absence
                </span>
                <textarea 
                  placeholder="Provide brief medical/personal context..."
                  value={leaveReason} 
                  onChange={(e) => setLeaveReason(e.target.value)} 
                  required 
                  rows="3"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    width: '100%',
                    resize: 'none',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowLeaveModal(false)}
                  style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={leaveLoading}
                  className="btn-primary"
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  {leaveLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParentPortal;
