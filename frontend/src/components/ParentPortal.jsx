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
        <div className="glass-panel animate-fade-in" style={{
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <h2 className="shimmer-text" style={{ fontSize: '1.5rem', marginBottom: '8px', fontWeight: '800' }}>Retrieving Secure Workspace</h2>
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
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {role === 'student' ? <StudentIcon size={20} /> : <ParentIcon size={20} />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800' }}>
              {role === 'student' ? 'Student Workspace' : 'Parent Console'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {role === 'student' ? `Card UID: ${studentRfid}` : `Verified Phone: ${phone}`}
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
            borderRadius: '8px',
            fontSize: '0.8rem',
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
          gap: '10px',
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
                padding: '12px',
                borderRadius: '12px',
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
                gap: '8px'
              }}
            >
              <StudentIcon size={14} />
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
              {/* Bento Box 1: Profile & Enrollment (Span 12 on mobile, 8 on tablet) */}
              <div className="glass-panel" style={{
                gridColumn: 'span 12',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                border: '1px solid var(--border-glass)'
              }}>
                <img 
                  src={activeStudent.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(activeStudent.name)}`}
                  alt={activeStudent.name}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    boxShadow: 'var(--shadow-neon)'
                  }}
                />
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', fontWeight: '800', marginBottom: '4px' }}>
                    {activeStudent.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      {activeStudent.grade}
                    </span>
                    <span style={{ height: '10px', width: '1px', background: 'var(--border-glass)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {activeStudent.rfidUid}
                    </span>
                  </div>
                  {activeStudent.createdAt && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-hover)',
                      padding: '3px 8px',
                      borderRadius: '6px',
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
              <div className="glass-panel" style={{
                gridColumn: 'span 6',
                padding: '20px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'left'
              }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Today</h4>
                  <p style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? (
                      activeStudent.logs.find(l => l.dateStr === new Date().toISOString().split('T')[0])?.type === 'exit' ? (
                        <span style={{ color: 'var(--accent)' }}>Checked Out</span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>Present in Class</span>
                      )
                    ) : activeStudent.leaves.some(l => l.dateStr === new Date().toISOString().split('T')[0] && l.status === 'Approved') ? (
                      <span style={{ color: 'var(--warning)' }}>Excused Leave</span>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>Absent</span>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? 'var(--success)' : 'var(--danger)',
                    boxShadow: activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? '0 0 8px var(--success)' : '0 0 8px var(--danger)'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? 'Hardware ping active' : 'No hardware scan today'}
                  </span>
                </div>
              </div>

              {/* Bento Box 3: Attendance Gauge (Span 6) */}
              <div className="glass-panel" style={{
                gridColumn: 'span 6',
                padding: '20px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                  <svg height="90" width="90" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="45" cy="45" r="36" stroke="var(--border-glass)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="45" 
                      cy="45" 
                      r="36" 
                      stroke="var(--primary)" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - attendanceRate / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: 'var(--text-primary)'
                  }}>
                    {attendanceRate}%
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                  Attendance Score
                </span>
              </div>

              {/* Bento Box 4: Remaining Fees Summary (Span 12 on mobile, 6 on tablet) */}
              <div className="glass-panel" style={{
                gridColumn: 'span 12',
                padding: '24px',
                border: '1px solid var(--border-glass)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tuition Balance</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h2 style={{ fontSize: '1.8rem', color: remainingFees > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: '900' }}>
                      ₹{remainingFees.toLocaleString()}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      of ₹{totalFeesDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {role === 'parent' && remainingFees > 0 && (
                  <button 
                    onClick={() => setShowPayModal(true)} 
                    className="btn-primary" 
                    style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', alignSelf: 'flex-start' }}
                  >
                    <FeesIcon size={14} />
                    <span>Pay Tuition</span>
                  </button>
                )}
              </div>

              {/* Bento Box 5: Academic Report card snapshot */}
              <div className="glass-panel" style={{
                gridColumn: 'span 12',
                padding: '20px',
                border: '1px solid var(--border-glass)',
                textAlign: 'left'
              }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>Grades Overview</h4>
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>{m.subject}</span>
                      <span style={{ fontSize: '0.85rem', color: m.grade.includes('A') ? 'var(--success)' : 'var(--primary)', fontWeight: '700' }}>{m.grade}</span>
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
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present Days</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>{totalLogs}</p>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-glass)', borderRight: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leaves Excused</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{totalLeavesApproved}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absences</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>{totalAbsences}</p>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px', fontWeight: '700', textAlign: 'left' }}>Daily Attendance Grid</h4>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AttendanceHeatmap logs={activeStudent.logs} leaves={activeStudent.leaves} />
                </div>
              </div>

              {/* Logs Stream */}
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px', fontWeight: '700', textAlign: 'left' }}>Logs History</h4>
                {activeStudent.logs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No logs recorded yet.</p>
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
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            color: log.type === 'exit' ? 'rgba(6, 182, 212, 1)' : 'rgba(16, 185, 129, 1)',
                            background: log.type === 'exit' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            border: log.type === 'exit' ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                            marginRight: '12px',
                            textTransform: 'uppercase'
                          }}>
                            {log.type || 'entry'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px', fontWeight: '700', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageIcon size={18} />
                  <span>Received System Alerts</span>
                </h4>
                
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No messages received yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto' }}>
                    {notifications.map(notif => (
                      <div key={notif.id} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        textAlign: 'left',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(notif.timestamp).toLocaleDateString()} {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }} />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
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
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', position: 'relative', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600' }}>Remaining Tuition Fees</h4>
                <h2 style={{ fontSize: '2.25rem', color: remainingFees > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: '900', marginBottom: '15px' }}>
                  ₹{remainingFees.toLocaleString()}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Dues</span>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{totalFeesDue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid</span>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{totalPaid.toLocaleString()}</p>
                  </div>
                </div>

                {role === 'parent' && remainingFees > 0 && (
                  <button 
                    onClick={() => setShowPayModal(true)} 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <FeesIcon size={16} />
                    <span>Pay Tuition Installment</span>
                  </button>
                )}

                {role === 'student' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--primary-halo)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <InfoIcon size={14} color="var(--primary)" />
                    <span>Payments are restricted to Parent login.</span>
                  </div>
                )}
              </div>

              {/* Payment Receipts History */}
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px', fontWeight: '700', textAlign: 'left' }}>Receipts Ledger</h4>
                {activeStudent.payments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No payments logged yet.</p>
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
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            Tuition Installment
                          </span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {new Date(p.timestamp).toLocaleDateString()} {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: '700' }}>
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
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-glass)' }}>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>Excused Leave Tracker</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {role === 'student' ? 'Leave requests submitted by parent logs.' : 'Submit leave requests directly to class teacher.'}
                  </p>
                </div>
                {role === 'parent' && (
                  <button 
                    onClick={() => setShowLeaveModal(true)} 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <LeavesIcon size={14} />
                    <span>Request Leave</span>
                  </button>
                )}
              </div>

              {/* Leave Requests stream */}
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px', fontWeight: '700', textAlign: 'left' }}>Leave Log</h4>
                {activeStudent.leaves.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No leave requests submitted.</p>
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
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {l.reason}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block', fontFamily: 'var(--font-mono)' }}>
                            Requested on: {new Date(l.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '12px',
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
              <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                  <ReportsIcon size={18} />
                  <span>Academic Report Card</span>
                </h4>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 10px' }}>Subject</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeStudent.marks || []).map((m, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px 10px', color: 'var(--text-primary)', fontWeight: '600' }}>{m.subject}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{m.score} / {m.total}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: m.grade.includes('A') ? 'var(--success)' : 'var(--primary)' }}>
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
      <nav style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '480px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '30px',
        padding: '10px 10px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: 'var(--shadow-ambient)',
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
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
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
          <div className="glass-panel modal-card" style={{
            maxWidth: '400px',
            padding: '30px',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-neon)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '800' }}>Record Fee Payment</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePaySubmit}>
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                  Amount to Pay (INR)
                </label>
                <input 
                  type="number" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  required 
                  style={{ padding: '12px 16px', borderRadius: '10px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={payLoading}
                  className="btn-primary"
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
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
          <div className="glass-panel modal-card" style={{
            maxWidth: '400px',
            padding: '30px',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-neon)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '800' }}>Excuse Absence Log</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleLeaveSubmit}>
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                  Reason for Absence
                </label>
                <textarea 
                  placeholder="Provide brief medical/personal context..."
                  value={leaveReason} 
                  onChange={(e) => setLeaveReason(e.target.value)} 
                  required 
                  rows="3"
                  style={{ padding: '12px 16px', borderRadius: '10px', width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowLeaveModal(false)}
                  style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={leaveLoading}
                  className="btn-primary"
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
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
