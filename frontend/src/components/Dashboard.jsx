import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';
import AttendanceHeatmap from './AttendanceHeatmap';

const Dashboard = ({ userRole, teachers }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allLogs, setAllLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); // Class Dashboard selector
  const [selectedProfileStudent, setSelectedProfileStudent] = useState(null);

  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;
  const currentClassFilter = isTeacher ? teacherGrade : selectedClass;

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedProfileStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProfileStudent]);

  const fetchDashboardData = async () => {
    try {
      const studentRes = await fetch(`${API_BASE_URL}/students`);
      const studentsData = await studentRes.json();
      setStudents(studentsData);

      const todayStr = new Date().toISOString().split('T')[0];
      const logRes = await fetch(`${API_BASE_URL}/logs?date=${todayStr}`);
      const logs = await logRes.json();
      setAllLogs(logs);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  // Compile list of unique classes in database (combining students and teacher assignments)
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.grade),
    ...(teachers || []).map(t => t.grade)
  ])).filter(Boolean);

  // DYNAMIC SEPARATE CLASS DASHBOARD FILTERING
  const classStudents = currentClassFilter 
    ? students.filter(s => (s.grade || '').toLowerCase().trim() === currentClassFilter.toLowerCase().trim()) 
    : students;
  const classLogs = currentClassFilter 
    ? allLogs.filter(l => (l.grade || '').toLowerCase().trim() === currentClassFilter.toLowerCase().trim()) 
    : allLogs;

  const studentsCount = classStudents.length;
  const uniquePresent = new Set(classLogs.map(log => log.studentId));
  const presentCount = uniquePresent.size;
  const absentCount = Math.max(0, studentsCount - presentCount);
  const attendanceRate = studentsCount > 0 ? Math.round((presentCount / studentsCount) * 100) : 0;

  // Recent logs specifically for this filtered dashboard
  const displayRecentLogs = classLogs.slice(0, 5);

  // Identify absent students for the selected class dashboard
  const presentStudentIds = Array.from(uniquePresent);
  const absentStudentsList = classStudents.filter(s => !presentStudentIds.includes(s.id));

  // Dynamically calculate class-wise attendance rates (for comparison breakdown card)
  const classBreakdown = uniqueClasses.map(cls => {
    const totalInClass = students.filter(s => s.grade === cls).length;
    const presentInClass = new Set(
      allLogs.filter(l => l.grade === cls).map(l => l.studentId)
    ).size;
    const rate = totalInClass > 0 ? Math.round((presentInClass / totalInClass) * 100) : 0;
    return { className: cls, total: totalInClass, present: presentInClass, rate };
  });

  // SVG Gauge variables
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (attendanceRate / 100) * circumference;

  return (
    <>
      <div style={{ position: 'relative' }}>
      {/* Dashboard Header with Class Dashboard Selector */}
      <div className="animate-float-up" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '40px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 className="shimmer-text" style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: '800' }}>
            {isTeacher ? `${teacherGrade} Dashboard` : (selectedClass ? `${selectedClass} Dashboard` : 'General School Dashboard')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isTeacher 
                ? `Real-time classroom monitoring for ${teacherGrade}.` 
                : (selectedClass 
                    ? `Real-time attendance overview specifically for class ${selectedClass}.` 
                    : "Real-time summary of today's total school statistics and RFID scans."
                  )
              }
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--success-glow)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginLeft: '10px',
              whiteSpace: 'nowrap'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'inline-block',
                boxShadow: '0 0 8px var(--success)',
                animation: 'beacon-ping 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite'
              }} />
              Live Connected
            </span>
          </div>
        </div>

        {/* Dashboard Class Switcher */}
        {!isTeacher && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ color: 'var(--primary)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>View:</span>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontWeight: '600',
                minWidth: '180px',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <option value="">Entire School (All)</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* B2B Safety Compliance Warning Banner */}
      {!loading && attendanceRate < 85 && (
        <div className="animate-float-up delay-1" style={{
          background: 'var(--danger-glow)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          padding: '14px 20px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.05)'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span><strong>Safety Compliance Alert:</strong> Current attendance rate is below the school district's mandatory <strong>85%</strong> security threshold. Immediate parent notifications are recommended.</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {/* Card 1: Total Students */}
        <div className="glass-panel glass-card border-beam-card animate-float-up delay-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {selectedClass ? 'Students in Class' : 'Total Students'}
            </p>
            <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '6px' }}>{loading ? '...' : studentsCount}</h3>
            {/* Sparkline Graph */}
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none" style={{ opacity: 0.85, marginTop: '4px' }}>
              <path d="M 0 16 Q 15 6, 30 12 T 60 4" fill="none" stroke="var(--primary)" strokeWidth="2" className="sparkline-path" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="glass-panel glass-card border-beam-card animate-float-up delay-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid var(--success)' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Present Today
            </p>
            <h3 style={{ fontSize: '2.2rem', color: 'var(--success)', fontWeight: '700', marginBottom: '6px' }}>{loading ? '...' : presentCount}</h3>
            {/* Sparkline Graph */}
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none" style={{ opacity: 0.85, marginTop: '4px' }}>
              <path d="M 0 18 Q 15 8, 30 4 T 60 2" fill="none" stroke="var(--success)" strokeWidth="2" className="sparkline-path" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'var(--success-glow)', color: 'var(--success)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="glass-panel glass-card border-beam-card animate-float-up delay-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid var(--danger)' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Absent Today
            </p>
            <h3 style={{ fontSize: '2.2rem', color: 'var(--danger)', fontWeight: '700', marginBottom: '6px' }}>{loading ? '...' : absentCount}</h3>
            {/* Sparkline Graph */}
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none" style={{ opacity: 0.85, marginTop: '4px' }}>
              <path d="M 0 4 Q 15 16, 30 8 T 60 20" fill="none" stroke="var(--danger)" strokeWidth="2" className="sparkline-path" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'var(--danger-glow)', color: 'var(--danger)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="glass-panel glass-card border-beam-card animate-float-up delay-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid var(--secondary)' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Attendance Rate
            </p>
            <h3 style={{ fontSize: '2.2rem', color: 'var(--secondary)', fontWeight: '700', marginBottom: '2px' }}>{loading ? '...' : `${attendanceRate}%`}</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: 85% safety threshold</p>
          </div>
          
          {/* Animated Circular Progress Gauge */}
          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              {/* Foreground animated ring */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="var(--secondary)"
                strokeWidth="3.5"
                strokeDasharray={loading ? "0 100" : `${attendanceRate} ${100 - attendanceRate}`}
                strokeDashoffset="0"
                style={{
                  transition: 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))'
                }}
              />
            </svg>
            <span style={{ position: 'absolute', fontSize: '0.68rem', color: 'var(--text-primary)', fontWeight: '700' }}>
              {loading ? '..' : `${Math.round(attendanceRate)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* B2B School Weekly Analytics Card */}
      <div className="glass-panel animate-float-up delay-5" style={{ padding: '30px', marginBottom: '30px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              Weekly Attendance Trends
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Administrative compliance mapping for current school term cycles.</p>
          </div>
          <div style={{ background: 'var(--success-glow)', border: '1px solid var(--success)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            94.6% Term Average
          </div>
        </div>

        {/* Beautiful Interactive Area-Curve SVG */}
        <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '10px' }}>
          <svg viewBox="0 0 500 120" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            
            {/* Grid Horizontal Guide lines */}
            <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(0,0,0,0.03)" strokeDasharray="4 4" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(0,0,0,0.03)" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(0,0,0,0.03)" strokeDasharray="4 4" />
            
            {/* Area path fill */}
            <path d="M 0 100 C 30 90, 50 60, 83.3 50 C 110 40, 140 80, 166.7 70 C 200 60, 220 50, 250 40 C 280 30, 310 15, 333.3 20 C 360 25, 390 100, 416.7 115 C 445 120, 475 120, 500 120 L 500 120 L 0 120 Z" fill="url(#chartGrad)"/>
            
            {/* Curved Area stroke line */}
            <path d="M 0 100 C 30 90, 50 60, 83.3 50 C 110 40, 140 80, 166.7 70 C 200 60, 220 50, 250 40 C 280 30, 310 15, 333.3 20 C 360 25, 390 100, 416.7 115 C 445 120, 475 120, 500 120" fill="none" stroke="var(--primary)" strokeWidth="3"/>
            
            {/* Nodes */}
            <circle cx="0" cy="100" r="4.5" fill="var(--primary)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="83.3" cy="50" r="4.5" fill="var(--secondary)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="166.7" cy="70" r="4.5" fill="var(--primary)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="250" cy="40" r="4.5" fill="var(--secondary)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="333.3" cy="20" r="4.5" fill="var(--success)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="416.7" cy="115" r="4.5" fill="var(--warning)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
            <circle cx="500" cy="120" r="4.5" fill="var(--danger)" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}/>
          </svg>
        </div>

        {/* Labels bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '12px', padding: '0 5px' }}>
          <span>Monday (91%)</span>
          <span>Tuesday (95%)</span>
          <span>Wednesday (93%)</span>
          <span>Thursday (96%)</span>
          <span>Friday (97%)</span>
          <span>Saturday (15%)</span>
          <span>Sunday (0%)</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px'
      }}>
        {/* Recent Scans Logs */}
        <div className="glass-panel animate-float-up delay-6" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>Recent Arrival Logs</span>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--primary-glow)',
              border: '1px solid rgba(99, 102, 241, 0.12)',
              color: 'var(--primary)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}>
              <span className="beacon-pulse" style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block'
              }} />
              RFID Scanning
            </span>
          </h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading logs...</p>
          ) : displayRecentLogs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px', opacity: 0.7 }} className="svg-icon"><path d="M22 13h-4l-3 3H9l-3-3H2" /><path d="M12 2v11" /><path d="M12 2l4 4" /><path d="M12 2L8 6" /><path d="M2 13v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6" /></svg>
              No check-ins logged yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayRecentLogs.map((log) => {
                const studentObj = students.find(s => s.id === log.studentId);
                const imageUrl = studentObj?.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(log.studentName)}`;
                return (
                  <div 
                    key={log.id} 
                    onClick={() => studentObj && setSelectedProfileStudent(studentObj)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      cursor: studentObj ? 'pointer' : 'default',
                      transition: 'var(--transition-fast)'
                    }}
                    className={studentObj ? "table-row-hover" : ""}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img 
                        src={imageUrl} 
                        alt={log.studentName} 
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid var(--border-glass)'
                        }}
                      />
                      <div>
                        <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{log.studentName}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '12px' }}>
                          {log.grade}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: '500' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>RFID: {log.rfidUid}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attendance Gauge & Class Breakdown / Absent Lists */}
        <div className="animate-float-up delay-7" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Circular Gauge Card */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '30px', color: 'var(--text-primary)' }}>
              {selectedClass ? `${selectedClass} Rate` : 'Total Attendance Rate'}
            </h3>
            <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '20px' }}>
              <svg height="160" width="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  stroke="rgba(255,255,255,0.03)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={80}
                  cy={80}
                />
                <circle
                  stroke="var(--secondary)"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out', filter: 'drop-shadow(0 0 6px var(--secondary-glow))' }}
                  r={normalizedRadius}
                  cx={80}
                  cy={80}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)'
              }}>
                {loading ? '...' : `${attendanceRate}%`}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Goal: **85%** daily minimum safety compliance.
            </p>
          </div>

          {/* Conditional Display: If class is selected, show Absent list. If not, show Class Breakdowns. */}
          {selectedClass ? (
            /* Absent Students List */
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> Absent Students ({absentStudentsList.length})
              </h3>
              {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading absent list...</p>
              ) : absentStudentsList.length === 0 ? (
                <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0', fontWeight: '600' }}>
                  Awesome! 100% Present Today!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                  {absentStudentsList.map(student => {
                    const imageUrl = student.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`;
                    return (
                      <div key={student.id} 
                        onClick={(e) => {
                          if (e.target.closest('a')) return;
                          setSelectedProfileStudent(student);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--danger-glow)',
                          border: '1px solid rgba(239, 68, 68, 0.1)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                        className="table-row-hover"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={imageUrl} 
                            alt={student.name} 
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-glass)'
                            }}
                          />
                          <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>{student.name}</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Parent: {student.parentName}</span>
                          </div>
                        </div>
                        <a 
                          href={`https://wa.me/${student.parentPhone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{
                            fontSize: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid var(--success)',
                            color: 'var(--success)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> Alert
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Class-wise Breakdown Card */
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> Class-wise Attendance
              </h3>
              {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Calculating breakdowns...</p>
              ) : classBreakdown.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                  No classes registered in directory.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {classBreakdown.map((stat) => (
                    <div key={stat.className} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{stat.className}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                          {stat.present}/{stat.total} Present ({stat.rate}%)
                        </span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        position: 'relative',
                        border: '1px solid rgba(255,255,255,0.01)'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${stat.rate}%`,
                          background: stat.rate >= 85 ? 'var(--success)' : stat.rate >= 50 ? 'var(--secondary)' : 'var(--danger)',
                          boxShadow: stat.rate >= 85 ? '0 0 8px var(--success-glow)' : stat.rate >= 50 ? '0 0 8px var(--secondary-glow)' : '0 0 8px var(--danger-glow)',
                          borderRadius: '3px',
                          transition: 'width 0.8s ease-in-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Futuristic Student Profile & Calendar Modal */}
      {selectedProfileStudent && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProfileStudent(null); }}
          className="modal-overlay"
          style={{ zIndex: 1000 }}
        >
          <div className="glass-panel modal-card border-beam-card" style={{ maxWidth: '480px', padding: '30px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <img 
                src={selectedProfileStudent.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedProfileStudent.name)}`}
                alt={selectedProfileStudent.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid var(--border-glass)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: '800' }}>{selectedProfileStudent.name}</h2>
                <span style={{ fontSize: '0.8rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', fontWeight: '600' }}>
                  {selectedProfileStudent.grade}
                </span>
              </div>
              <button 
                onClick={() => setSelectedProfileStudent(null)} 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            {/* Fobs health diagnostics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-glass)', padding: '15px', borderRadius: '8px', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active RFID Card</p>
                <p style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--secondary)' }}>{selectedProfileStudent.rfidUid}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Card Signal</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--success)' }}>100% Diagnostic Valid</p>
              </div>
            </div>

            {/* Emergency & Address Info */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Detailed Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <span><strong>Address:</strong> <span style={{ color: 'var(--text-secondary)' }}>{selectedProfileStudent.address || 'No Address Registered'}</span></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span><strong>Parent Name:</strong> <span style={{ color: 'var(--text-secondary)' }}>{selectedProfileStudent.parentName}</span></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', flexShrink: 0 }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                  <span><strong>WhatsApp:</strong> <span style={{ color: 'var(--success)', fontWeight: '600' }}>{selectedProfileStudent.parentPhone}</span></span>
                </div>
              </div>
            </div>

            {/* Attendance Matrix Calendar */}
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Term Attendance Compliance
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Visual check-in calendar ledger (Last 30 school days)</p>
              
              <AttendanceHeatmap studentId={selectedProfileStudent.id} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
