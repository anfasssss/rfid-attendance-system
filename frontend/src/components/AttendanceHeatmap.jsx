import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../firebaseConfig';

const AttendanceHeatmap = ({ studentId }) => {
  const [logs, setLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch student scan logs
        const logsRes = await fetch(`${API_BASE_URL}/logs?studentId=${studentId}`);
        const logsData = await logsRes.json();
        setLogs(logsData);

        // Fetch student leave applications
        const leavesRes = await fetch(`${API_BASE_URL}/leaves`);
        const leavesData = await leavesRes.json();
        const studentLeaves = leavesData.filter(l => l.studentId === studentId);
        setLeaves(studentLeaves);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setLoading(false);
      }
    };

    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  // Generate the last 30 school days (skipping Sat & Sun)
  const getSchoolDays = (count) => {
    const days = [];
    let current = new Date();
    // Start from today
    while (days.length < count) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Saturday (6) and Sunday (0)
        days.push(new Date(current));
      }
      current.setDate(current.getDate() - 1);
    }
    return days.reverse(); // Ascending (oldest first)
  };

  if (loading) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Loading compliance ledger...
      </div>
    );
  }

  const schoolDays = getSchoolDays(30);
  const dayStatuses = schoolDays.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Find scan log
    const dayLog = logs.find(l => l.dateStr === dateStr || l.timestamp.startsWith(dateStr));
    // Find leave application
    const dayLeave = leaves.find(l => l.dateStr === dateStr);

    let status = 'absent';
    let label = 'Absent Warning';
    let detail = 'No check-in record logged.';

    if (dayLog) {
      status = 'present';
      label = 'Present';
      const timeStr = new Date(dayLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      detail = `Checked in safely at ${timeStr}`;
    } else if (dayLeave) {
      if (dayLeave.status === 'Approved') {
        status = 'leave';
        label = 'Excused Absence';
      } else {
        status = 'pending-leave';
        label = 'Pending Review';
      }
      detail = `Leave: ${dayLeave.reason}`;
    }

    return {
      date,
      dateStr,
      status,
      label,
      detail,
      formattedDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  });

  // Group into columns (weeks of 5 school days)
  const weeks = [];
  for (let i = 0; i < 30; i += 5) {
    weeks.push(dayStatuses.slice(i, i + 5));
  }

  // Row labels (Mon - Fri)
  const rowLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        {/* Day labels column */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 0', height: '110px' }}>
          {rowLabels.map(label => (
            <span key={label} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600', height: '14px', lineHeight: '14px' }}>
              {label}
            </span>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {week.map((day, dayIdx) => {
                // Determine block background color
                let bg = 'rgba(239, 68, 68, 0.15)'; // Absent (Soft red)
                let border = '1px solid rgba(239, 68, 68, 0.25)';
                if (day.status === 'present') {
                  bg = 'var(--success)';
                  border = '1px solid rgba(16, 185, 129, 0.3)';
                } else if (day.status === 'leave') {
                  bg = 'var(--secondary)';
                  border = '1px solid rgba(6, 182, 212, 0.3)';
                } else if (day.status === 'pending-leave') {
                  bg = 'rgba(245, 158, 11, 0.3)';
                  border = '1px solid rgba(245, 158, 11, 0.5)';
                }

                return (
                  <div
                    key={day.dateStr}
                    className="heatmap-cell-wrapper"
                    style={{ position: 'relative' }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: bg,
                        border: border,
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    />
                    {/* Floating Tooltip */}
                    <div className="heatmap-tooltip">
                      <div style={{ fontWeight: '700', marginBottom: '2px', color: '#ffffff' }}>
                        {day.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                        {day.detail}
                      </div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                        {day.formattedDate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '15px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '16px', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--success)' }} /> Present
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--secondary)' }} /> Excused Leave
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.3)', border: '1px solid rgba(245, 158, 11, 0.5)' }} /> Pending Leave
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)' }} /> Absent Warning
        </span>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
