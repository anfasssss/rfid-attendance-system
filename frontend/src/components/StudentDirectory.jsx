import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../firebaseConfig';
import AttendanceHeatmap from './AttendanceHeatmap';

const StudentDirectory = ({ userRole, teachers, fetchTeachers }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState(null);

  const isTeacher = userRole?.role === 'teacher';
  const teacherGrade = userRole?.grade;

  // Class Management States
  const [subTab, setSubTab] = useState('students'); // 'students' or 'classes'
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tGrade, setTGrade] = useState('');
  const [tError, setTError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    if (fetchTeachers) fetchTeachers();
  }, []);

  useEffect(() => {
    if (showModal || selectedProfileStudent || showTeacherModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal, selectedProfileStudent, showTeacherModal]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      const data = await res.json();
      setStudents(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setName('');
    setGrade(isTeacher ? teacherGrade : '');
    setRfidUid('');
    setParentName('');
    setParentPhone('');
    setAddress('');
    setImageUrl('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setName(student.name);
    setGrade(student.grade);
    setRfidUid(student.rfidUid);
    setParentName(student.parentName || '');
    setParentPhone(student.parentPhone || '');
    setAddress(student.address || '');
    setImageUrl(student.imageUrl || '');
    setError('');
    setShowModal(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target.result);
    };
    reader.onerror = () => {
      setError('Error reading file.');
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !grade || !rfidUid || !parentName || !parentPhone) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      name,
      grade,
      rfidUid: rfidUid.trim().toUpperCase(),
      parentName,
      parentPhone: parentPhone.trim().replace(/\s+/g, ''),
      address,
      imageUrl
    };

    try {
      let res;
      if (editingStudent) {
        // PUT Update
        res = await fetch(`${API_BASE_URL}/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // POST Create
        res = await fetch(`${API_BASE_URL}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save student record');
      }

      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this student and revoke card access?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchStudents();
      } else {
        throw new Error('Failed to delete student.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to remove this Class Teacher profile and suspend their dashboard login?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/teachers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (fetchTeachers) fetchTeachers();
      } else {
        throw new Error('Failed to delete teacher.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setTError('');

    if (!tGrade || !tName || !tEmail || !tPhone) {
      setTError('Please fill in all fields.');
      return;
    }

    const payload = {
      grade: tGrade.trim(),
      name: tName.trim(),
      email: tEmail.trim().toLowerCase(),
      phone: tPhone.trim().replace(/\s+/g, '')
    };

    try {
      const res = await fetch(`${API_BASE_URL}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register class teacher');
      }

      setShowTeacherModal(false);
      setTGrade('');
      setTName('');
      setTEmail('');
      setTPhone('');
      if (fetchTeachers) fetchTeachers();
    } catch (err) {
      setTError(err.message);
    }
  };

  // Classes for STUDENT filter dropdown — only from actual student records
  const uniqueStudentGrades = Array.from(new Set(
    students.map(s => s.grade)
  )).filter(Boolean).sort();

  // All unique classes across both students AND teachers (for Dashboard/Reports use)
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.grade),
    ...(teachers || []).map(t => t.grade)
  ])).filter(Boolean).sort();
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Filter students based on selected class / teacher grade
  const filteredStudents = students.filter(s => {
    if (isTeacher) {
      return (s.grade || '').toLowerCase().trim() === teacherGrade.toLowerCase().trim();
    }
    return selectedClassFilter ? s.grade === selectedClassFilter : true;
  });

  return (
    <>
      <div className="animate-fade-in" style={{ position: 'relative' }}>
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
            {subTab === 'classes' ? 'Class & Teacher Administration' : 'Student Directory'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {subTab === 'classes' 
              ? 'Manage school classrooms, create new grade profiles, and configure Class Teacher dashboards.'
              : 'Manage student registrations, link hardware RFID card UIDs, and verify parent phone numbers.'
            }
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Class Filter Dropdown */}
          {subTab === 'students' && !isTeacher && (
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{
                padding: '10px 15px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                minWidth: '150px',
              }}
            >
              <option value="">All Classes</option>
              {uniqueStudentGrades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {subTab === 'students' && (
            <button onClick={openAddModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Register Student
            </button>
          )}

          {subTab === 'classes' && !isTeacher && (
            <button
              onClick={() => {
                setTName(''); setTEmail(''); setTPhone(''); setTGrade(''); setTError('');
                setShowTeacherModal(true);
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Class & Teacher
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Selectors for Principal */}
      {!isTeacher && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          <button
            onClick={() => setSubTab('students')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: subTab === 'students' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-glass)',
              background: subTab === 'students' ? 'var(--primary-glow)' : 'transparent',
              color: subTab === 'students' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              boxShadow: subTab === 'students' ? 'var(--shadow-neon)' : 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Student Roster
          </button>
          <button
            onClick={() => setSubTab('classes')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: subTab === 'classes' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-glass)',
              background: subTab === 'classes' ? 'var(--primary-glow)' : 'transparent',
              color: subTab === 'classes' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              boxShadow: subTab === 'classes' ? 'var(--shadow-neon)' : 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Classes & Teachers
          </button>
        </div>
      )}

      {/* ── STUDENT TABLE ── */}
      {subTab === 'students' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '30px', overflowX: 'auto' }}>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading directory database...</p>
          ) : filteredStudents.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Students Registered</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Add a student and assign an RFID Card to get started.</p>
              <button onClick={openAddModal} className="btn-primary">Add First Student</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Grade / Class</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>RFID UID</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Parent</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>WhatsApp</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={(e) => { if (e.target.closest('button')) return; setSelectedProfileStudent(student); }}
                    style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem', cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px 18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={student.imageUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`} alt={student.name}
                          style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                        {student.name}
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ fontSize: '0.78rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border-bright)', fontWeight: '600' }}>
                        {student.grade}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--secondary)' }}>{student.rfidUid}</td>
                    <td style={{ padding: '16px 18px', color: 'var(--text-secondary)' }}>{student.parentName}</td>
                    <td style={{ padding: '16px 18px', color: 'var(--success)', fontWeight: '500', fontSize: '0.88rem' }}>{student.parentPhone}</td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditModal(student)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px' }}>Edit</button>
                        <button onClick={() => handleDelete(student.id)} className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── CLASSES & TEACHERS TABLE ── */}
      {subTab === 'classes' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '30px', overflowX: 'auto' }}>
          {(!teachers || teachers.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Classes Created Yet</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Create your first classroom and assign a Class Teacher.</p>
              <button onClick={() => { setTName(''); setTEmail(''); setTPhone(''); setTGrade(''); setTError(''); setShowTeacherModal(true); }} className="btn-primary">
                Add First Class & Teacher
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Class / Grade</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Teacher Name</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Login Email</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Contact Phone</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600' }}>Students</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => {
                  const classStudentCount = students.filter(s => s.grade === teacher.grade).length;
                  return (
                    <tr key={teacher.id} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem' }} className="table-row-hover">
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg, var(--primary-glow), var(--accent-halo))', border: '1px solid var(--border-bright)', color: 'var(--primary)', padding: '5px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '0.88rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          {teacher.grade}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          {teacher.name}
                        </div>
                      </td>
                      <td style={{ padding: '16px 18px', color: 'var(--secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{teacher.email}</td>
                      <td style={{ padding: '16px 18px', color: 'var(--text-secondary)' }}>{teacher.phone}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ background: classStudentCount > 0 ? 'var(--success-glow)' : 'rgba(0,0,0,0.04)', color: classStudentCount > 0 ? 'var(--success)' : 'var(--text-muted)', border: classStudentCount > 0 ? '1px solid rgba(48,213,109,0.25)' : '1px solid var(--border-glass)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                          {classStudentCount} student{classStudentCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteTeacher(teacher.id)} className="btn-danger" style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Elegant CSS Glass Modal Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card" style={{
            maxWidth: '500px',
            padding: '35px'
          }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '25px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editingStudent ? (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  <span>Update Student Record</span>
                </>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="svg-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
                  <span>Register New Student</span>
                </>
              )}
            </h2>

            {error && (
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
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Student Name *</label>
                  <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Grade / Class *</label>
                  <input type="text" placeholder="Grade 10-A" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={isTeacher} required />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>RFID Card UID (Hex) *</label>
                <input type="text" placeholder="A3 B2 C5 D9" value={rfidUid} onChange={(e) => setRfidUid(e.target.value)} required style={{ fontFamily: 'monospace' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Tip: RFID reader displays UID when a card is scanned on the terminal logs.
                </span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '25px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Parent Name *</label>
                  <input type="text" placeholder="Mary Doe" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Parent WhatsApp Phone *</label>
                  <input type="text" placeholder="+919876543210" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Include country code, e.g., +91... or +1...
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Home Address</label>
                <input type="text" placeholder="123 Oakwood Lane, Tech City" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              {/* Drag and Drop Kids Image */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                  Student Photo (Drag & drop or URL - Optional)
                </label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  style={{
                    border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-glass)',
                    borderRadius: '12px',
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: isDragging ? 'var(--primary-glow)' : 'rgba(0,0,0,0.01)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    minHeight: '120px'
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  {imageUrl ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        style={{ 
                          width: '90px', 
                          height: '90px', 
                          borderRadius: '16px', 
                          objectFit: 'cover', 
                          border: '2px solid var(--border-glass)',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        background: 'var(--primary-glow)',
                        color: 'var(--primary)',
                        padding: '10px',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Drag & drop student photo here
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          or click to browse local files (PNG, JPG)
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Optional Image URL Input fallback for direct URLs */}
                <div style={{ marginTop: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Or paste direct image URL instead..." 
                    value={imageUrl && imageUrl.startsWith('data:') ? '' : imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.7)',
                      border: '1px solid var(--border-glass)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
                  {editingStudent ? 'Save Changes' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Futuristic Student Profile & Calendar Modal */}
      {selectedProfileStudent && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProfileStudent(null); }}
          className="modal-overlay"
        >
          <div className="glass-panel modal-card border-beam-card" style={{
            maxWidth: '480px',
            padding: '30px'
          }}>
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
      {/* ── ADD CLASS & TEACHER MODAL ── */}
      {showTeacherModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTeacherModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '480px', padding: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Add Class & Teacher</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creates a dashboard login for the class teacher</p>
              </div>
              <button type="button" onClick={() => setShowTeacherModal(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>

            {tError && (
              <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {tError}
              </div>
            )}

            <form onSubmit={handleTeacherSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class / Grade *</label>
                  <input type="text" placeholder="e.g. Grade 10-A" value={tGrade} onChange={(e) => setTGrade(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Teacher Name *</label>
                  <input type="text" placeholder="Mr. / Ms. Name" value={tName} onChange={(e) => setTName(e.target.value)} required />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Teacher Login Email *</label>
                <input type="email" placeholder="teacher@school.edu" value={tEmail} onChange={(e) => setTEmail(e.target.value)} required />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>Teacher will use this email to log in to their dashboard.</p>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '7px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Phone *</label>
                <input type="text" placeholder="+919876543210" value={tPhone} onChange={(e) => setTPhone(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTeacherModal(false)} className="btn-secondary" style={{ padding: '11px 22px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '11px 28px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Class
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default StudentDirectory;
