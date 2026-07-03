import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';
import AttendanceHeatmap from './AttendanceHeatmap';

const ParentPortal = ({ onLogout }) => {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Parent Data
  const [students, setStudents] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('home'); // home, logs, fees, leaves, marks

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('5000');
  const [payLoading, setPayLoading] = useState(false);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  const activeStudent = students[selectedStudentIndex] || null;

  // Auto-login if phone is in localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem('parent_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      handleLogin(null, savedPhone);
    }
  }, []);

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
      
      if (data.length === 0) {
        throw new Error('No students linked to this phone number. Make sure to include the country code (e.g. +919656108992).');
      }

      setStudents(data);
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
    setPhone('');
    setSelectedStudentIndex(0);
    setActiveSubTab('home');
    if (onLogout) onLogout();
  };

  const reloadData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/parents/students?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
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

  // Login screen styling
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
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            border: '1.5px solid rgba(99, 102, 241, 0.2)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>

          <h2 className="shimmer-text" style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: '800' }}>Parent Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px' }}>
            Enter your registered WhatsApp phone number to view your children's reports.
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
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '25px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>WhatsApp Phone Number</label>
              <input 
                type="text" 
                placeholder="+919656108992" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold' }}
            >
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>

            <button 
              type="button" 
              onClick={onLogout} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                marginTop: '20px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Go to Teacher/Admin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate student attendance rate
  const totalLogs = activeStudent?.logs?.length || 0;
  const attendanceRate = Math.min(100, Math.max(0, Math.round((totalLogs / 30) * 100)));
  
  // Calculate payments
  const totalPaid = activeStudent?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalFeesDue = 15000;
  const remainingFees = Math.max(0, totalFeesDue - totalPaid);

  return (
    <div style={{
      maxWidth: '520px',
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
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            👨‍👩‍👦
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>Parent Portal</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{phone}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          style={{
            background: 'rgba(255, 68, 68, 0.08)',
            border: '1px solid rgba(255, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </header>

      {/* Children Carousel Tab Selector */}
      {students.length > 1 && (
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
                transition: 'var(--transition-fast)'
              }}
            >
              👶 {student.name}
            </button>
          ))}
        </div>
      )}

      {/* Active Child Hero Card */}
      {activeStudent && (
        <div className="glass-panel animate-fade-in" style={{
          padding: '24px',
          marginBottom: '25px',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-glow)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <img 
            src={activeStudent.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(activeStudent.name)}`}
            alt={activeStudent.name}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary)'
            }}
          />
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: '800', marginBottom: '4px' }}>
              {activeStudent.name}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                {activeStudent.grade}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                RFID: {activeStudent.rfidUid}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL MAIN TAB BODY CONTAINER */}
      {activeStudent && (
        <div style={{ minHeight: '300px' }}>
          
          {/* TAB 1: HOME SUBTAB */}
          {activeSubTab === 'home' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Check-in Status Card */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Status Today</h4>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? (
                      activeStudent.logs.find(l => l.dateStr === new Date().toISOString().split('T')[0])?.type === 'exit' ? (
                        <span style={{ color: 'var(--accent)' }}>🚪 Checked Out (Exit)</span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>🏫 Checked In (Present)</span>
                      )
                    ) : activeStudent.leaves.some(l => l.dateStr === new Date().toISOString().split('T')[0] && l.status === 'Approved') ? (
                      <span style={{ color: 'var(--warning)' }}>📝 Excused Leave</span>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>🚨 Absent (Not Scanned)</span>
                    )}
                  </p>
                </div>
                <div style={{ fontSize: '2rem' }}>
                  {activeStudent.logs.some(l => l.dateStr === new Date().toISOString().split('T')[0]) ? '✅' : '❌'}
                </div>
              </div>

              {/* Circular Attendance Gauge Card */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Attendance Rate (Last 30 Days)</h4>
                
                <div style={{ position: 'relative', width: '130px', height: '130px', marginBottom: '15px' }}>
                  <svg height="130" width="130" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="65" cy="65" r="50" stroke="rgba(255,255,255,0.03)" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="65" 
                      cy="65" 
                      r="50" 
                      stroke="var(--primary)" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - attendanceRate / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.6rem',
                    fontWeight: '800',
                    color: 'var(--text-primary)'
                  }}>
                    {attendanceRate}%
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total days logged present: {totalLogs}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: LOGS & HEATMAP */}
          {activeSubTab === 'logs' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px' }}>Attendance Calendar</h4>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AttendanceHeatmap logs={activeStudent.logs} leaves={activeStudent.leaves} />
                </div>
              </div>

              {/* Logs Stream */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px' }}>Recent Scans</h4>
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
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            color: log.type === 'exit' ? 'rgba(6, 182, 212, 1)' : 'rgba(16, 185, 129, 1)',
                            background: log.type === 'exit' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            border: log.type === 'exit' ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                            marginRight: '8px',
                            textTransform: 'uppercase'
                          }}>
                            {log.type || 'entry'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FEES & PAYMENTS */}
          {activeSubTab === 'fees' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Fee balance card */}
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', position: 'relative' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Remaining Tuition Fees</h4>
                <h2 style={{ fontSize: '2.25rem', color: remainingFees > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: '900', marginBottom: '15px' }}>
                  ₹{remainingFees.toLocaleString()}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Dues</span>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{totalFeesDue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid</span>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{totalPaid.toLocaleString()}</p>
                  </div>
                </div>

                {remainingFees > 0 && (
                  <button 
                    onClick={() => setShowPayModal(true)} 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}
                  >
                    💸 Pay Fees Now
                  </button>
                )}
              </div>

              {/* Payment Receipts History */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px' }}>Payment History</h4>
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
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            Tuition Installment
                          </span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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

          {/* TAB 4: LEAVE REQUESTS */}
          {activeSubTab === 'leaves' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>Excuse Sick Leaves</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Submit leave requests directly to class teacher.</p>
                </div>
                <button 
                  onClick={() => setShowLeaveModal(true)} 
                  className="btn-primary" 
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  ➕ Request Leave
                </button>
              </div>

              {/* Leave Requests stream */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '15px' }}>Leave Requests History</h4>
                {activeStudent.leaves.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No leave requests submitted.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeStudent.leaves.map(l => (
                      <div key={l.id} style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {l.reason}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
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

          {/* TAB 5: REPORT CARD (EXAM MARKS) */}
          {activeSubTab === 'marks' && (
            <div className="animate-float-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Academic Exam Report Card
                </h4>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 10px' }}>Subject</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeStudent.marks || []).map((m, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', fontSize: '0.9rem' }}>
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
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '30px',
        padding: '10px 15px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
            fontWeight: activeSubTab === 'home' ? 'bold' : '500'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🏡</span>
          Home
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
            fontWeight: activeSubTab === 'logs' ? 'bold' : '500'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📅</span>
          Logs
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
            fontWeight: activeSubTab === 'fees' ? 'bold' : '500'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>💳</span>
          Fees
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
            fontWeight: activeSubTab === 'leaves' ? 'bold' : '500'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📝</span>
          Leaves
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
            fontWeight: activeSubTab === 'marks' ? 'bold' : '500'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📊</span>
          Reports
        </button>
      </nav>

      {/* QUICK PAY MODAL POPUP */}
      {showPayModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="glass-panel modal-card" style={{
            maxWidth: '400px',
            padding: '30px',
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#0f172a', fontWeight: '800' }}>💸 Pay School Fees</h3>
            
            <form onSubmit={handlePaySubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>
                  Amount to Pay (INR)
                </label>
                <input 
                  type="number" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  required 
                  style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '12px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={payLoading}
                  style={{ padding: '10px 24px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {payLoading ? 'Processing...' : 'Confirm Payment'}
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
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#0f172a', fontWeight: '800' }}>📝 Request Sick Leave</h3>
            
            <form onSubmit={handleLeaveSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>
                  Reason for Absence
                </label>
                <textarea 
                  placeholder="e.g. High fever, doctor advised 2 days rest"
                  value={leaveReason} 
                  onChange={(e) => setLeaveReason(e.target.value)} 
                  required 
                  rows="3"
                  style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '12px', width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowLeaveModal(false)}
                  style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={leaveLoading}
                  style={{ padding: '10px 24px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
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
