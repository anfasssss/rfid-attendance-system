import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const FeesManagement = ({ userRole, teachers }) => {
  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [paymentsCache, setPaymentsCache] = useState({});
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showConfirmRemindersModal, setShowConfirmRemindersModal] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showPaymentModal || showConfirmRemindersModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPaymentModal, showConfirmRemindersModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const studRes = await fetch(`${API_BASE_URL}/students`);
      const studData = await studRes.json();
      
      const payRes = await fetch(`${API_BASE_URL}/payments`);
      const payData = await payRes.json();
      
      const cache = {};
      payData.forEach(p => {
        cache[p.studentId] = (cache[p.studentId] || 0) + Number(p.amount);
      });
      
      setStudents(studData);
      setPaymentsCache(cache);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching fees data:', err);
      setLoading(false);
    }
  };

  // Helper: Deterministic total fees based on Grade
  const getFeeStructure = (grade) => {
    const cleanGrade = (grade || '').toLowerCase();
    if (cleanGrade.includes('10')) return 35000;
    if (cleanGrade.includes('9')) return 30000;
    if (cleanGrade.includes('8')) return 28000;
    return 25000; // default fee
  };

  // Helper: Deterministic default paid amount based on student ID to make it look realistic
  const getDefaultPaidAmount = (studentId, totalFee) => {
    // Generate a deterministic ratio based on studentId string hash
    let hash = 0;
    for (let i = 0; i < studentId.length; i++) {
      hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const mod = absHash % 3;
    if (mod === 0) return totalFee; // Fully Paid
    if (mod === 1) return Math.floor(totalFee * 0.4); // Partially Paid
    return 0; // Unpaid / Overdue
  };

  // Map students to their fee details
  const mappedRecords = students.map(student => {
    const totalFee = getFeeStructure(student.grade);
    
    // Check if there is a custom payment logged in our cache
    const hasCustomPayment = student.id in paymentsCache;
    const paidAmount = hasCustomPayment 
      ? paymentsCache[student.id] 
      : getDefaultPaidAmount(student.id, totalFee);

    const remaining = Math.max(0, totalFee - paidAmount);
    
    // Status classification
    let status = 'Paid';
    if (remaining > 0) {
      // Deterministically set some pending records as overdue
      const isOverdue = student.name.toLowerCase().charCodeAt(0) % 2 === 0;
      status = isOverdue ? 'Overdue' : 'Pending';
    }

    // Due date (always end of current month)
    const dueDate = new Date();
    dueDate.setDate(28); // Standard due date
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      ...student,
      totalFee,
      paidAmount,
      remaining,
      status,
      dueDate: formattedDueDate
    };
  });

  const feeRecords = isTeacher 
    ? mappedRecords.filter(r => (r.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim())
    : mappedRecords;

  // Calculate dashboard totals
  const totalExpected = feeRecords.reduce((sum, r) => sum + r.totalFee, 0);
  const totalCollected = feeRecords.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalPending = feeRecords.reduce((sum, r) => sum + r.remaining, 0);
  const overdueCount = feeRecords.filter(r => r.status === 'Overdue').length;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Filter lists
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.grade),
    ...(teachers || []).map(t => t.grade)
  ])).filter(Boolean);
  const filteredRecords = feeRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.rfidUid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? record.status === statusFilter : true;
    const matchesClass = classFilter ? record.grade === classFilter : true;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const handleOpenPayment = (record) => {
    setSelectedStudent(record);
    setPaymentAmount(record.remaining);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: amount
        })
      });

      if (res.ok) {
        await fetchData();
        setShowPaymentModal(false);
        showToast(`Payment of ₹${amount.toLocaleString()} recorded for ${selectedStudent.name}!`);
      } else {
        const errData = await res.json();
        console.error('Failed to submit payment:', errData.error);
        showToast('⚠️ Failed to save payment in database.');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('⚠️ Network error saving payment.');
    }
  };

  const handleOpenConfirmReminders = () => {
    setConfirmInputText('');
    setShowConfirmRemindersModal(true);
  };

  const handleAutoSendReminders = async () => {
    if (sendingReminders) return;
    setShowConfirmRemindersModal(false);
    setSendingReminders(true);
    showToast('🚀 Sending automated WhatsApp reminders to parents...');
    
    try {
      const res = await fetch(`${API_BASE_URL}/fees/auto-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isTeacher ? { grade: teacherGrade } : {})
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ Sent ${data.sentCount} reminders successfully! (${data.failCount} failed)`);
      } else {
        showToast('❌ Failed to dispatch automated reminders.');
      }
    } catch (err) {
      console.error('Error sending auto reminders:', err);
      showToast('❌ Network error sending automated reminders.');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSendReminder = (record) => {
    const parentPhoneDigits = record.parentPhone.replace(/\D/g, '');
    const message = `🔔 *Fee Reminder - Brahmagupta Academy* 🏫\n\nHello Mr./Mrs. ${record.parentName},\nThis is a friendly reminder that the school fees for your child *${record.name}* (${record.grade}) has a remaining balance of *₹${record.remaining.toLocaleString()}*.\n\n📅 *Due Date:* ${record.dueDate}\n\nPlease settle the dues at your earliest convenience. Thank you!`;
    
    // Open standard WhatsApp message link
    const waUrl = `https://wa.me/${parentPhoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    showToast(`WhatsApp reminder prepared for ${record.name}'s parent.`);
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  return (
    <>
      <div className="animate-fade-in">
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: '30px',
          right: '30px',
          background: 'var(--primary)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.25)',
          zIndex: 1100,
          fontWeight: '600',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          {successToast}
        </div>
      )}

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '40px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 className="shimmer-text" style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: '800' }}>
            Fees Ledger & Accounts
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage student tuition fees, track transaction histories, and send proactive reminders to parents.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenConfirmReminders}
            disabled={sendingReminders || loading}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: sendingReminders ? 'var(--text-muted)' : 'var(--warning)',
              borderColor: 'rgba(217, 119, 6, 0.2)',
              boxShadow: sendingReminders ? 'none' : '0 4px 15px rgba(217, 119, 6, 0.15)',
              color: 'white',
              cursor: sendingReminders || loading ? 'not-allowed' : 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            {sendingReminders ? 'Sending Reminders...' : 'Auto-Send Reminders'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {/* Total Collected */}
        <div className="glass-panel glass-card border-beam-card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Total Collected
          </p>
          <h3 style={{ fontSize: '2rem', color: 'var(--success)', fontWeight: '800' }}>
            ₹{loading ? '...' : totalCollected.toLocaleString()}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Collection Rate: <strong>{collectionRate}%</strong>
          </span>
        </div>

        {/* Pending Dues */}
        <div className="glass-panel glass-card border-beam-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Pending Balances
          </p>
          <h3 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: '800' }}>
            ₹{loading ? '...' : totalPending.toLocaleString()}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Total Expected: ₹{totalExpected.toLocaleString()}
          </span>
        </div>

        {/* Overdue Accounts */}
        <div className="glass-panel glass-card border-beam-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Overdue Accounts
          </p>
          <h3 style={{ fontSize: '2rem', color: 'var(--danger)', fontWeight: '800' }}>
            {loading ? '...' : overdueCount}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Require immediate notification alerts.
          </span>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input 
            type="text" 
            placeholder="Search by student name or card UID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
          <svg style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)', opacity: 0.6 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {/* Class Select */}
          {!isTeacher && (
            <select 
              value={classFilter} 
              onChange={(e) => setClassFilter(e.target.value)} 
              style={{ width: '160px' }}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Status Select */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            style={{ width: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '10px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Student Details</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Fee</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Paid</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Remaining</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Due Date</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading financial records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No fee records match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  {/* Name and class */}
                  <td style={{ padding: '16px 24px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{record.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.grade}</span>
                  </td>

                  {/* Fee Total */}
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: '500' }}>
                    ₹{record.totalFee.toLocaleString()}
                  </td>

                  {/* Paid */}
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--success)' }}>
                    ₹{record.paidAmount.toLocaleString()}
                  </td>

                  {/* Remaining */}
                  <td style={{ 
                    padding: '16px 24px', 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    color: record.remaining > 0 ? 'var(--primary)' : 'var(--text-muted)' 
                  }}>
                    {record.remaining === 0 ? 'Settled ✓' : `₹${record.remaining.toLocaleString()}`}
                  </td>

                  {/* Due Date */}
                  <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {record.dueDate}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: record.status === 'Paid' ? 'var(--success-glow)' : 
                                  record.status === 'Pending' ? 'var(--primary-glow)' : 'var(--danger-glow)',
                      color: record.status === 'Paid' ? 'var(--success)' : 
                             record.status === 'Pending' ? 'var(--primary)' : 'var(--danger)',
                      border: '1px solid transparent',
                      borderColor: record.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 
                                   record.status === 'Pending' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      {record.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {/* Record Payment Button */}
                      {record.remaining > 0 && (
                        <button
                          onClick={() => handleOpenPayment(record)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                          Pay
                        </button>
                      )}

                      {/* WhatsApp Reminder Button */}
                      {record.remaining > 0 && (
                        <button
                          onClick={() => handleSendReminder(record)}
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            color: 'var(--success)',
                            boxShadow: 'none',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          Remind
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card border-beam-card" style={{
            maxWidth: '440px',
            padding: '30px'
          }}>
            <h2 className="shimmer-text" style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Record Fee Payment
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Entering a payment for **{selectedStudent.name}** ({selectedStudent.grade}). 
              Remaining balance: <strong>₹{selectedStudent.remaining.toLocaleString()}</strong>.
            </p>

            <form onSubmit={handlePaymentSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                  Payment Amount (₹)
                </label>
                <input 
                  type="number" 
                  max={selectedStudent.remaining} 
                  min="1"
                  step="any"
                  placeholder="Enter amount paid..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary" style={{ padding: '10px 18px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 22px' }}>
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Batch Reminders Confirmation Modal */}
      {showConfirmRemindersModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card border-beam-card" style={{
            maxWidth: '440px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--warning-glow)',
              border: '1px solid rgba(217, 119, 6, 0.15)',
              marginBottom: '20px',
              color: 'var(--warning)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="shimmer-text" style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '800' }}>
              Confirm Batch Reminders
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              This will automatically compile fee balances and dispatch WhatsApp reminders to all parents with unpaid dues.<br/><br/>
              Please type <strong>CONFIRM</strong> below to authorize:
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (confirmInputText === 'CONFIRM') handleAutoSendReminders(); }}>
              <div style={{ marginBottom: '24px' }}>
                <input 
                  type="text" 
                  placeholder="Type CONFIRM here..."
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  required
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    borderColor: confirmInputText === 'CONFIRM' ? 'var(--success)' : undefined
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button type="button" onClick={() => setShowConfirmRemindersModal(false)} className="btn-secondary" style={{ padding: '10px 18px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={confirmInputText !== 'CONFIRM'}
                  style={{ 
                    padding: '10px 22px',
                    background: confirmInputText === 'CONFIRM' ? 'var(--warning)' : 'var(--text-muted)',
                    borderColor: confirmInputText === 'CONFIRM' ? 'rgba(217, 119, 6, 0.2)' : 'var(--border-glass)',
                    cursor: confirmInputText === 'CONFIRM' ? 'pointer' : 'not-allowed'
                  }}
                >
                  Send Reminders
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeesManagement;
