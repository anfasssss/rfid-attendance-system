import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const ScanSimulator = ({ triggerToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isUnregistered, setIsUnregistered] = useState(false);
  const [customUid, setCustomUid] = useState('');
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle', 'scanning', 'success', 'error'
  const [simulatedLogs, setSimulatedLogs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      const data = await res.json();
      setStudents(data);
      if (data.length > 0) {
        setSelectedStudentId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching students for simulator:', err);
    }
  };

  // HTML5 Web Audio Synthesizer for beeps
  const playBeep = (frequency, duration) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.error('Web Audio beep failed:', err);
    }
  };

  const handleSimulateScan = async () => {
    if (scanStatus === 'scanning') return;

    let rfidUid = '';
    let targetName = 'Unknown Card';

    if (isUnregistered) {
      rfidUid = customUid.trim().toUpperCase() || 'E2 8A C4 D9';
    } else {
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) {
        triggerToast('danger', 'Please select a student.');
        return;
      }
      rfidUid = student.rfidUid;
      targetName = student.name;
    }

    setScanStatus('scanning');

    // Simulate terminal delay (800ms)
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': 'brahmagupta_security_key_2026'
          },
          body: JSON.stringify({ rfidUid })
        });

        const data = await res.json();

        if (res.status === 200) {
          setScanStatus('success');
          // Successful checkin beep: 850Hz, 150ms
          playBeep(850, 0.15);
          
          const newLog = {
            id: Date.now(),
            name: targetName,
            uid: rfidUid,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'success',
            msg: data.cooldownActive ? 'Scan ignored (cooldown active)' : 'Check-in recorded'
          };
          setSimulatedLogs(prev => [newLog, ...prev].slice(0, 5));
          
          if (data.cooldownActive) {
            triggerToast('warning', `ℹ️ Cooldown active for ${targetName}. Check-in ignored.`);
          }
        } else {
          setScanStatus('error');
          // Failed beep: double low beep (300Hz, 80ms)
          playBeep(300, 0.08);
          setTimeout(() => playBeep(300, 0.08), 120);

          const newLog = {
            id: Date.now(),
            name: targetName,
            uid: rfidUid,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'error',
            msg: data.error || 'Access Denied / Not Registered'
          };
          setSimulatedLogs(prev => [newLog, ...prev].slice(0, 5));
        }
      } catch (err) {
        setScanStatus('error');
        // Error beep: low double beep
        playBeep(250, 0.1);
        setTimeout(() => playBeep(250, 0.1), 150);
        
        triggerToast('danger', 'Network error simulating scan.');
      }

      // Reset scanner state to idle after 1.5 seconds
      setTimeout(() => {
        setScanStatus('idle');
      }, 1500);

    }, 800);
  };

  const generateRandomUid = () => {
    const chars = '0123456789ABCDEF';
    let uid = '';
    for (let i = 0; i < 4; i++) {
      uid += chars[Math.floor(Math.random() * 16)] + chars[Math.floor(Math.random() * 16)] + ' ';
    }
    setCustomUid(uid.trim());
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: isOpen ? '374px' : '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          border: 'none',
          boxShadow: 'var(--shadow-neon)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'var(--transition-smooth)',
          outline: 'none'
        }}
        title="Toggle RFID Scan Simulator"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><circle cx="12" cy="10" r="3"/></svg>
        )}
      </button>

      {/* Collapsible Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-350px',
        width: '350px',
        height: '100vh',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-glass)',
        boxShadow: isOpen ? '-10px 0 30px rgba(0, 0, 0, 0.15)' : 'none',
        zIndex: 9998,
        transition: 'var(--transition-smooth)',
        padding: '30px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: 'auto'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><circle cx="12" cy="10" r="3"/></svg>
            RFID Scan Simulator
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Simulate hardware tap events to test live triggers, beeps, and parent messages.
          </p>
        </div>

        {/* Scanner Surface Indicator */}
        <div style={{
          height: '120px',
          borderRadius: '16px',
          background: scanStatus === 'success' 
            ? 'rgba(16, 185, 129, 0.15)' 
            : scanStatus === 'error' 
              ? 'rgba(239, 68, 68, 0.15)' 
              : 'rgba(255, 255, 255, 0.02)',
          border: `2px solid ${
            scanStatus === 'success' 
              ? 'var(--success)' 
              : scanStatus === 'error' 
                ? 'var(--danger)' 
                : 'var(--border-glass)'
          }`,
          boxShadow: scanStatus === 'success'
            ? '0 0 20px rgba(16, 185, 129, 0.1)'
            : scanStatus === 'error'
              ? '0 0 20px rgba(239, 68, 68, 0.1)'
              : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.25s ease'
        }}>
          {scanStatus === 'idle' && (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={scanStatus === 'scanning' ? 'pulse-glow' : ''}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 8.96a17 17 0 0 1 21.16 0"/><circle cx="12" cy="17" r="2"/></svg>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>DEVICE READY: TAP CARD</span>
            </>
          )}
          {scanStatus === 'scanning' && (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.05)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '600' }}>READING CARD SECTOR...</span>
            </>
          )}
          {scanStatus === 'success' && (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '750' }}>ACCESS GRANTED (BEEP)</span>
            </>
          )}
          {scanStatus === 'error' && (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: '750' }}>ACCESS DENIED (BEEP-BEEP)</span>
            </>
          )}
        </div>

        {/* Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>
            <input
              type="checkbox"
              checked={isUnregistered}
              onChange={(e) => setIsUnregistered(e.target.checked)}
              style={{ width: 'auto', marginRight: '6px', appearance: 'auto', cursor: 'pointer' }}
            />
            Simulate Unregistered Card
          </label>

          {isUnregistered ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Hex RFID UID</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. F1 88 30 03"
                  value={customUid}
                  onChange={(e) => setCustomUid(e.target.value)}
                  style={{ fontFamily: 'monospace', flexGrow: 1 }}
                />
                <button
                  onClick={generateRandomUid}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Random
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ padding: '10px 14px', background: 'var(--bg-surface)' }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSimulateScan}
            disabled={scanStatus === 'scanning'}
            className="btn-primary"
            style={{ padding: '12px', marginTop: '10px' }}
          >
            ⚡ Tap Card on Scanner
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />

        {/* Local Scan Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Simulation Logs
          </h4>
          {simulatedLogs.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No cards scanned yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {simulatedLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{log.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{log.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--secondary)' }}>UID: {log.uid}</span>
                    <span style={{ color: log.status === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {log.msg}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ScanSimulator;
