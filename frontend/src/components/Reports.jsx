import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const Reports = ({ userRole, teachers }) => {
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;
  
  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchLogs();
  }, [selectedDate, selectedStudent]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students for filter dropdown:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let queryUrl = `${API_BASE_URL}/logs?`;
      if (selectedDate) queryUrl += `date=${selectedDate}&`;
      if (selectedStudent) queryUrl += `studentId=${selectedStudent}&`;

      const res = await fetch(queryUrl);
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLoading(false);
    }
  };

  // Dynamically extract all unique classes/grades from the student directory and teacher assignments
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.grade),
    ...(teachers || []).map(t => t.grade)
  ])).filter(Boolean);

  // Filter logs locally by search term and selected class / teacher grade
  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      log.studentName.toLowerCase().includes(term) ||
      log.grade.toLowerCase().includes(term) ||
      log.rfidUid.toLowerCase().includes(term)
    );
    const matchesClass = isTeacher
      ? (log.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim()
      : (selectedClass ? log.grade === selectedClass : true);
    return matchesSearch && matchesClass;
  });

  // Export Filtered Logs to CSV Utility
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    // CSV Header
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Student Name,Grade / Class,RFID Card UID,Arrival Date,Arrival Time\n';

    // CSV Rows
    filteredLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const cleanName = `"${log.studentName.replace(/"/g, '""')}"`;
      const cleanGrade = `"${log.grade.replace(/"/g, '""')}"`;

      csvContent += `${cleanName},${cleanGrade},${log.rfidUid},${dateStr},${timeStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    
    const fileDateStr = selectedDate || 'all';
    link.setAttribute('download', `Attendance_Report_Date_${fileDateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h1 className="shimmer-text" style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: '800' }}>
          Historical Attendance Reports
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Search, filter, and audit attendance histories. Export data sheets directly to spreadsheets.
        </p>
      </div>

      {/* Filter Control Box */}
      <div className="glass-panel" style={{
        padding: '24px 30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        alignItems: 'end',
        marginBottom: '30px'
      }}>
        {/* Date Filter */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.8, color: 'var(--primary)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Date</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Class Filter */}
        {!isTeacher && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.8, color: 'var(--primary)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Class / Grade</span>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Student Filter */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.8, color: 'var(--primary)' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Filter by Student</span>
          </div>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="">All Students</option>
            {students
              .filter(s => {
                if (isTeacher) {
                  return (s.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim();
                }
                return selectedClass ? s.grade === selectedClass : true;
              })
              .map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            }
          </select>
        </div>

        {/* Text Search Filter */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.8, color: 'var(--primary)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Search Name or RFID</span>
          </div>
          <input
            type="text"
            placeholder="Type student name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* CSV Export Button */}
        <div>
          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, var(--secondary), hsl(190, 85%, 40%))',
              boxShadow: '0 4px 15px var(--secondary-glow)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export CSV Spreadsheet
          </button>
        </div>

        {/* B2B Print Ledger Button */}
        <div>
          <button
            onClick={() => window.print()}
            className="btn-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Print Audit Ledger
          </button>
        </div>
      </div>

      {/* Reports Table Display */}
      <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Compiling database records...</p>
        ) : filteredLogs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.6 }} className="svg-icon"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Logs Found</h3>
            <p style={{ fontSize: '0.85rem' }}>No attendance events matched your active filter selections.</p>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              paddingBottom: '15px'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredLogs.length}</strong> recorded match{filteredLogs.length === 1 ? '' : 'es'}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px' }}>Student Name</th>
                  <th style={{ padding: '16px 20px' }}>Class / Grade</th>
                  <th style={{ padding: '16px 20px' }}>RFID Card UID</th>
                  <th style={{ padding: '16px 20px' }}>Arrival Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Arrival Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', fontSize: '0.95rem' }} className="table-row-hover">
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>{log.studentName}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.1)' }}>
                        {log.grade}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon" style={{ opacity: 0.6 }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                        <span>{log.rfidUid}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {new Date(log.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--success)', fontWeight: '600' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
