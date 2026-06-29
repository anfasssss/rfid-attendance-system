import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const LeaveReports = ({ userRole }) => {
  const [leaves, setLeaves] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(true);

  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;

  const filteredLeaves = isTeacher
    ? leaves.filter(l => (l.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim())
    : leaves;

  const filteredStudents = isTeacher
    ? students.filter(s => (s.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim())
    : students;

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Approved');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchLeaves();
    fetchStudents();

    // Refresh leaves feed every 3 seconds for active sync
    const interval = setInterval(fetchLeaves, 3000);

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
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/leaves`);
      const data = await res.json();
      setLeaves(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching excused leaves:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchLeaves(); // Sync instantly
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
    }
  };

  const handleDeleteLeave = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this leave record?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLeaves(); // Sync instantly
      }
    } catch (err) {
      console.error('Error deleting leave record:', err);
    }
  };

  const handleAddLeaveSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);

    if (!studentId || !reason) {
      setModalError('Please select a student and provide a reason.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, reason, status })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit leave record');
      }

      setShowAddModal(false);
      setStudentId('');
      setReason('');
      fetchLeaves();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Stats
  const totalExcused = filteredLeaves.length;
  const pendingCount = filteredLeaves.filter(l => l.status === 'Pending').length;
  const approvedCount = filteredLeaves.filter(l => l.status === 'Approved').length;

  return (
    <>
      <div className="animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Top Banner: Shimmer Title & Action Controls */}
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
            Leave & Absence Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Monitor and approve excused student absences submitted live via parent WhatsApp chatbot or manual entries.
          </p>
        </div>

        {/* Dynamic Buttons */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary border-beam-card"
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-neon)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Leave Slip
        </button>
      </div>

      {/* Connection / Excused Pipeline Indicator Capsule Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '35px'
      }}>
        {/* Diagnostic Capsule 1 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Leaves logged</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '4px', fontFamily: 'var(--font-display)' }}>{totalExcused}</h3>
          </div>
        </div>

        {/* Diagnostic Capsule 2 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            background: pendingCount > 0 ? 'var(--danger-glow)' : 'var(--success-glow)',
            color: pendingCount > 0 ? 'var(--danger)' : 'var(--success)',
            padding: '12px',
            borderRadius: '12px',
            border: pendingCount > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)',
            transform: pendingCount > 0 && pulse ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Awaiting Review</p>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '800', 
              marginTop: '4px', 
              fontFamily: 'var(--font-display)',
              color: pendingCount > 0 ? 'var(--danger)' : 'var(--text-primary)'
            }}>{pendingCount}</h3>
          </div>
        </div>

        {/* Diagnostic Capsule 3 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            background: 'var(--success-glow)',
            color: 'var(--success)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.15)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Excused Absences</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '4px', fontFamily: 'var(--font-display)' }}>{approvedCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Leave Timeline Stream */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="pulse-ripple" style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredLeaves.length === 0 ? (
        
        /* Interactive concentric ripple radar waves for empty stats */
        <div className="glass-panel border-beam-card animate-fade-in" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 40px',
          textAlign: 'center',
          minHeight: '400px'
        }}>
          {/* Pulsating Radar rings - Flawlessly Centered! */}
          <div style={{
            position: 'relative',
            width: '300px',
            height: '250px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <div className="radar-sweep-beam" />
            <div className="radar-ring" style={{ borderStyle: 'dashed' }} />
            <div className="radar-ring" />
            <div className="radar-ring" style={{ animationDelay: '2.6s' }} />
            
            {/* Centered Shield Icon */}
            <div style={{
              position: 'absolute',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
          </div>

          <h3 className="shimmer-text" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '10px' }}>
            Absence Airspace Clear
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            All students are accounted for. No active sick leaves or excused absences have been logged today.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '30px' }}>
          
          {/* Vertical timeline accent line */}
          <div style={{
            position: 'absolute',
            left: '8px',
            top: '15px',
            bottom: '15px',
            width: '2px',
            background: 'linear-gradient(to bottom, var(--primary), var(--secondary), rgba(0,0,0,0.05))',
            borderRadius: '1px',
            zIndex: 1
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {filteredLeaves.map((leave, index) => (
              <div 
                key={leave.id}
                className="animate-fade-in"
                style={{ position: 'relative', zIndex: 2 }}
              >
                {/* Timeline node bullet */}
                <div style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '25px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: leave.status === 'Pending' 
                    ? 'var(--danger)' 
                    : leave.status === 'Approved' 
                      ? 'var(--success)' 
                      : 'var(--text-muted)',
                  border: '3px solid var(--bg-base)',
                  boxShadow: leave.status === 'Pending' && pulse ? '0 0 10px var(--danger)' : 'none',
                  transition: 'all 0.3s ease'
                }} />

                {/* Excused Leave card */}
                <div className="glass-panel" style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'transform 0.3s ease',
                  borderLeft: leave.status === 'Pending' 
                    ? '4px solid var(--warning)' 
                    : leave.status === 'Approved' 
                      ? '4px solid var(--success)' 
                      : '4px solid var(--text-muted)'
                }}>
                  
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: '800', fontFamily: 'var(--font-display)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {leave.studentName}
                        {leave.status === 'Pending' && (
                          <span style={{
                            fontSize: '0.7rem',
                            background: 'var(--danger-glow)',
                            border: '1px solid var(--danger)',
                            color: 'var(--danger)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            letterSpacing: '0.05em'
                          }}>
                            AWAITING APPROVAL
                          </span>
                        )}
                      </h4>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        background: 'rgba(0,0,0,0.03)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)'
                      }}>
                        {leave.grade}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                      
                      {/* WhatsApp Channel badge */}
                      <div style={{
                        fontSize: '0.75rem',
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
                        {/* WhatsApp SVG Path */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                        WhatsApp Bot
                      </div>

                      {/* Monospace Submission Date */}
                      <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-glass)', paddingLeft: '15px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          fontSize: '1rem'
                        }}>
                          {new Date(leave.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(leave.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      {/* Trash action control */}
                      <button 
                        onClick={() => handleDeleteLeave(leave.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '5px'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Card Content: Reason */}
                  <div style={{
                    background: 'rgba(0,0,0,0.015)',
                    border: '1px solid var(--border-glass)',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Absence</strong>
                    {leave.reason}
                  </div>

                  {/* Interactive Action Control Panel */}
                  {leave.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignSelf: 'flex-start' }}>
                      <button
                        onClick={() => handleStatusChange(leave.id, 'Approved')}
                        className="btn-primary"
                        style={{
                          background: 'var(--success-glow)',
                          color: 'var(--success)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--success-glow)'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Approve Absence
                      </button>

                      <button
                        onClick={() => handleStatusChange(leave.id, 'Declined')}
                        style={{
                          background: 'var(--danger-glow)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--danger-glow)'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Reject
                      </button>
                    </div>
                  )}

                  {leave.status === 'Approved' && (
                    <span style={{
                      alignSelf: 'flex-start',
                      fontSize: '0.75rem',
                      color: 'var(--success)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      Leave Approved (Excused)
                    </span>
                  )}

                  {leave.status === 'Declined' && (
                    <span style={{
                      alignSelf: 'flex-start',
                      fontSize: '0.75rem',
                      color: 'var(--danger)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                      Leave Rejected (Unexcused)
                    </span>
                  )}

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Manual "Add Leave Slip" Modal popup */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card border-beam-card" style={{
            maxWidth: '500px',
            padding: '35px'
          }}>
            <h2 className="shimmer-text" style={{ fontSize: '1.6rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ color: 'var(--primary)' }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 14h6" /><path d="M9 18h6" /><path d="M12 10h.01" /></svg>
              Manual Absence Slip
            </h2>

            {modalError && (
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
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddLeaveSubmit}>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Select Student *</label>
                <select 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">-- Choose student from directory --</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Reason for Absence *</label>
                <textarea 
                  placeholder="e.g. Attending a medical check-up, severe flu, or family wedding."
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  required
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Approval Status</label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="status" value="Approved" checked={status === 'Approved'} onChange={() => setStatus('Approved')} />
                    Pre-Approved (Excused)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="status" value="Pending" checked={status === 'Pending'} onChange={() => setStatus('Pending')} />
                    Awaiting Review (Pending)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary" style={{ padding: '10px 24px' }}>
                  {actionLoading ? 'Saving...' : 'Add Excuse Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveReports;
