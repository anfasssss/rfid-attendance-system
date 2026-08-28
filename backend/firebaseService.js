const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db;
let isMock = false;
const mockDbPath = path.join(__dirname, 'mock_db.json');

// Helper to initialize the local JSON database with default seed data
function initializeMockDb() {
  isMock = true;
  console.log('🚀  [Database Service] Running in local JSON database mode (saves to mock_db.json).');
  
  if (!fs.existsSync(mockDbPath)) {
    const seedData = {
      students: [
        {
          id: "student_1",
          name: "Adam Smith",
          grade: "Grade 6-A",
          rfidUid: "A3 B2 C5 D9",
          parentName: "John Smith",
          parentPhone: "+1234567890",
          createdAt: new Date().toISOString()
        },
        {
          id: "student_2",
          name: "sahal",
          grade: "Grade 8-B",
          rfidUid: "2461C901",
          parentName: "Emily Jenkins",
          parentPhone: "+919656108992",
          createdAt: new Date().toISOString()
        },
        {
          id: "student_1779770480339",
          name: "anfas",
          grade: "10 a",
          rfidUid: "07 13 88 31",
          parentName: "koya",
          parentPhone: "+919656108992",
          createdAt: new Date().toISOString()
        }
      ],
      attendance_logs: [
        {
          id: "log_1",
          studentId: "student_1",
          studentName: "Adam Smith",
          grade: "Grade 6-A",
          rfidUid: "A3 B2 C5 D9",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          dateStr: new Date().toISOString().split('T')[0]
        }
      ],
      teachers: [
        {
          id: "teacher_1",
          name: "Anjali Nair",
          email: "teacher1@school.edu",
          phone: "+919656108994",
          grade: "Grade 8-B",
          createdAt: new Date().toISOString()
        },
        {
          id: "teacher_2",
          name: "Koya",
          email: "teacher2@school.edu",
          phone: "+919656108993",
          grade: "10 a",
          createdAt: new Date().toISOString()
        }
      ],
      payments: [
        {
          id: "pay_1",
          studentId: "student_2",
          amount: 14000,
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ]
    };
    fs.writeFileSync(mockDbPath, JSON.stringify(seedData, null, 2));
  }
}

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
    db = admin.firestore();
    isMock = false;
    console.log('🔥  [Database Service] Running in LIVE FIREBASE mode using serviceAccountKey.json.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase with serviceAccountKey.json:', err.message);
    initializeMockDb();
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    isMock = false;
    console.log('🔥  [Database Service] Running in LIVE FIREBASE mode using FIREBASE_SERVICE_ACCOUNT env var.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase with FIREBASE_SERVICE_ACCOUNT:', err.message);
    initializeMockDb();
  }
} else {
  // Fallback to local mock JSON database
  initializeMockDb();
}

// Read local mock DB helper
function readMockDb() {
  try {
    const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    if (!data.leaves) data.leaves = [];
    if (!data.teachers) data.teachers = [];
    if (!data.payments) data.payments = [];
    if (!data.users) {
      data.users = [
        {
          id: "+919656108992",
          role: "parent",
          schoolId: "school_101",
          name: "Emily Jenkins",
          passwordHash: "", // blank passwordHash means setupRequired: true
          setupRequired: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "teacher_001",
          role: "teacher",
          schoolId: "school_101",
          name: "Anjali Nair",
          passwordHash: "",
          setupRequired: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "admin_001",
          role: "principal",
          schoolId: "school_101",
          name: "Principal Principal",
          passwordHash: "",
          setupRequired: true,
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
    }
    if (!data.schools) {
      data.schools = [
        {
          id: "school_101",
          name: "St. Mary's Public School",
          domain: "stmarys.mykard.com",
          branding: {
            logoUrl: "/school_logo.png",
            primaryColor: "#4D69D6",
            accentColor: "#6366F1",
            backgroundUrl: "/background.png"
          },
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
    }
    return data;
  } catch (err) {
    console.error('❌ Error reading mock DB:', err.message);
    return { students: [], attendance_logs: [], leaves: [], teachers: [], payments: [], schools: [], users: [] };
  }
}

// Write local mock DB helper
function writeMockDb(data) {
  try {
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error writing to mock DB:', err.message);
  }
}

function enrichStudent(student) {
  if (!student) return null;
  if (!student.marks) {
    student.marks = [
      { subject: "Mathematics", score: 88, total: 100, grade: "A" },
      { subject: "Science", score: 94, total: 100, grade: "A+" },
      { subject: "English", score: 82, total: 100, grade: "A" },
      { subject: "Social Studies", score: 79, total: 100, grade: "B+" }
    ];
  }
  return student;
}

const dbService = {
  isMockMode: () => isMock,

  getStudentByRfid: async (rfidUid, schoolId) => {
    const normalizedUid = rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase();
    if (isMock) {
      const data = readMockDb();
      const student = data.students.find(s => 
        s.rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase() === normalizedUid &&
        (!schoolId || s.schoolId === schoolId)
      );
      return enrichStudent(student);
    } else {
      let query = db.collection('students').where('rfidUid', '==', normalizedUid);
      if (schoolId) {
        query = query.where('schoolId', '==', schoolId);
      }
      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return enrichStudent({ id: doc.id, ...doc.data() });
    }
  },

  // 2. Get students linked to a parent's phone number
  getStudentsByParentPhone: async (phone) => {
    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    if (isMock) {
      const data = readMockDb();
      const results = data.students.filter(s => {
        const studentPhone = s.parentPhone.trim().replace(/\s+/g, '');
        return studentPhone === normalizedPhone || studentPhone.includes(normalizedPhone) || normalizedPhone.includes(studentPhone);
      });
      return results.map(enrichStudent);
    } else {
      let snapshot = await db.collection('students').where('parentPhone', '==', normalizedPhone).get();
      
      if (snapshot.empty) {
        const allSnapshot = await db.collection('students').get();
        const results = [];
        allSnapshot.forEach(doc => {
          const s = doc.data();
          const studentPhone = (s.parentPhone || '').trim().replace(/\s+/g, '');
          if (studentPhone && (studentPhone === normalizedPhone || studentPhone.includes(normalizedPhone) || normalizedPhone.includes(studentPhone))) {
            results.push({ id: doc.id, ...s });
          }
        });
        return results.map(enrichStudent);
      }
      
      return snapshot.docs.map(doc => enrichStudent({ id: doc.id, ...doc.data() }));
    }
  },

  // 3. Get all students
  getStudents: async () => {
    if (isMock) {
      return readMockDb().students.map(enrichStudent);
    } else {
      const snapshot = await db.collection('students').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => enrichStudent({ id: doc.id, ...doc.data() }));
    }
  },

  // 4. Add student
  addStudent: async (studentData) => {
    const record = {
      name: studentData.name,
      grade: studentData.grade,
      rfidUid: studentData.rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase(),
      parentName: studentData.parentName,
      parentPhone: studentData.parentPhone.trim().replace(/\s+/g, ''),
      address: studentData.address || '',
      imageUrl: studentData.imageUrl || '',
      createdAt: new Date().toISOString()
    };

    if (isMock) {
      const data = readMockDb();
      const id = 'student_' + Date.now();
      const newStudent = { id, ...record };
      data.students.push(newStudent);
      writeMockDb(data);
      return newStudent;
    } else {
      const docRef = await db.collection('students').add(record);
      return { id: docRef.id, ...record };
    }
  },

  // 5. Update student
  updateStudent: async (id, studentData) => {
    const updates = {
      name: studentData.name,
      grade: studentData.grade,
      rfidUid: studentData.rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase(),
      parentName: studentData.parentName,
      parentPhone: studentData.parentPhone.trim().replace(/\s+/g, ''),
      address: studentData.address || '',
      imageUrl: studentData.imageUrl || ''
    };

    if (isMock) {
      const data = readMockDb();
      const idx = data.students.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Student not found');
      data.students[idx] = { ...data.students[idx], ...updates };
      writeMockDb(data);
      return data.students[idx];
    } else {
      await db.collection('students').doc(id).update(updates);
      return { id, ...updates };
    }
  },

  // 6. Delete student
  deleteStudent: async (id) => {
    if (isMock) {
      const data = readMockDb();
      data.students = data.students.filter(s => s.id !== id);
      writeMockDb(data);
      return { success: true };
    } else {
      await db.collection('students').doc(id).delete();
      return { success: true };
    }
  },

  // 7. Log check-in/check-out attendance scan
  logAttendance: async (student) => {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    // Determine log type: entry or exit
    let type = 'entry';
    if (isMock) {
      const data = readMockDb();
      const studentTodayLogs = data.attendance_logs.filter(l => l.studentId === student.id && l.dateStr === dateStr);
      studentTodayLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      if (studentTodayLogs.length > 0) {
        const lastLog = studentTodayLogs[studentTodayLogs.length - 1];
        type = lastLog.type === 'entry' ? 'exit' : 'entry';
      }
    } else {
      const snapshot = await db.collection('attendance_logs')
        .where('studentId', '==', student.id)
        .where('dateStr', '==', dateStr)
        .get();
      if (!snapshot.empty) {
        const logs = snapshot.docs.map(doc => doc.data());
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const lastLog = logs[logs.length - 1];
        type = lastLog.type === 'entry' ? 'exit' : 'entry';
      }
    }

    const logRecord = {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      rfidUid: student.rfidUid,
      timestamp: timestamp,
      dateStr: dateStr,
      type: type
    };

    if (isMock) {
      const data = readMockDb();
      const id = 'log_' + Date.now();
      const newLog = { id, ...logRecord };
      data.attendance_logs.push(newLog);
      writeMockDb(data);
      return newLog;
    } else {
      const docRef = await db.collection('attendance_logs').add(logRecord);
      return { id: docRef.id, ...logRecord };
    }
  },

  // 8. Get attendance logs with optional filter
  getAttendanceLogs: async (filters = {}) => {
    if (isMock) {
      const data = readMockDb();
      let logs = [...data.attendance_logs];

      if (filters.date) {
        logs = logs.filter(l => l.dateStr === filters.date);
      }
      if (filters.studentId) {
        logs = logs.filter(l => l.studentId === filters.studentId);
      }

      // Sort descending by timestamp
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return logs;
    } else {
      let query = db.collection('attendance_logs');

      if (filters.date) {
        query = query.where('dateStr', '==', filters.date);
      }
      if (filters.studentId) {
        query = query.where('studentId', '==', filters.studentId);
      }

      const snapshot = await query.get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort descending
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return logs;
    }
  },

  // 9. Link previously unregistered attendance logs to a newly registered student
  linkUnregisteredLogs: async (rfidUid, student) => {
    const normalizedUid = rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase();
    
    if (isMock) {
      const data = readMockDb();
      let updatedCount = 0;
      data.attendance_logs = data.attendance_logs.map(log => {
        const logUid = (log.rfidUid || '').trim().replace(/[\s:-]+/g, '').toUpperCase();
        if (log.studentId === 'unregistered' && logUid === normalizedUid) {
          updatedCount++;
          return {
            ...log,
            studentId: student.id,
            studentName: student.name,
            grade: student.grade
          };
        }
        return log;
      });
      if (updatedCount > 0) {
        writeMockDb(data);
      }
      return updatedCount;
    } else {
      const snapshot = await db.collection('attendance_logs')
        .where('studentId', '==', 'unregistered')
        .get();
      
      let updatedCount = 0;
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        const logData = doc.data();
        const logUid = (logData.rfidUid || '').trim().replace(/[\s:-]+/g, '').toUpperCase();
        if (logUid === normalizedUid) {
          batch.update(doc.ref, {
            studentId: student.id,
            studentName: student.name,
            grade: student.grade
          });
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
      }
      return updatedCount;
    }
  },

  // 10. Log excused leave record
  logLeave: async (student, reason, status = 'Pending') => {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    
    const leaveRecord = {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      reason: reason,
      timestamp: timestamp,
      dateStr: dateStr,
      status: status
    };
    
    if (isMock) {
      const data = readMockDb();
      const id = 'leave_' + Date.now();
      const newLeave = { id, ...leaveRecord };
      data.leaves.push(newLeave);
      writeMockDb(data);
      return newLeave;
    } else {
      const docRef = await db.collection('leaves').add(leaveRecord);
      return { id: docRef.id, ...leaveRecord };
    }
  },

  // 11. Get all excused leaves
  getLeaves: async () => {
    if (isMock) {
      const data = readMockDb();
      const leaves = [...data.leaves];
      leaves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return leaves;
    } else {
      const snapshot = await db.collection('leaves').get();
      const leaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      leaves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return leaves;
    }
  },

  // 12. Update leave status (e.g. Approve/Decline)
  updateLeaveStatus: async (leaveId, status) => {
    if (isMock) {
      const data = readMockDb();
      const index = data.leaves.findIndex(l => l.id === leaveId);
      if (index !== -1) {
        data.leaves[index].status = status;
        writeMockDb(data);
        return data.leaves[index];
      }
      throw new Error("Leave record not found");
    } else {
      const docRef = db.collection('leaves').doc(leaveId);
      await docRef.update({ status: status });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    }
  },

  // 13. Delete leave record
  deleteLeave: async (leaveId) => {
    if (isMock) {
      const data = readMockDb();
      data.leaves = data.leaves.filter(l => l.id !== leaveId);
      writeMockDb(data);
      return true;
    } else {
      await db.collection('leaves').doc(leaveId).delete();
      return true;
    }
  },

  // 14. Teachers database operations
  getTeachers: async () => {
    if (isMock) {
      const data = readMockDb();
      return data.teachers || [];
    } else {
      const snapshot = await db.collection('teachers').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  getTeacherByPhone: async (phone) => {
    const normalizedPhone = phone.trim().replace(/\D/g, '');
    if (isMock) {
      const data = readMockDb();
      return data.teachers.find(t => t.phone.trim().replace(/\D/g, '') === normalizedPhone) || null;
    } else {
      let snapshot = await db.collection('teachers').where('phone', '==', phone.trim()).get();
      if (snapshot.empty) {
        const allTeachers = await db.collection('teachers').get();
        for (const doc of allTeachers.docs) {
          const t = doc.data();
          if (t.phone && t.phone.trim().replace(/\D/g, '') === normalizedPhone) {
            return { id: doc.id, ...t };
          }
        }
        return null;
      }
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  },

  getTeacherByEmail: async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    if (isMock) {
      const data = readMockDb();
      return data.teachers.find(t => t.email.trim().toLowerCase() === cleanEmail) || null;
    } else {
      const snapshot = await db.collection('teachers')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  },

  addTeacher: async (teacherData) => {
    if (isMock) {
      const data = readMockDb();
      const newTeacher = {
        id: `teacher_${Date.now()}`,
        name: teacherData.name,
        email: teacherData.email,
        phone: teacherData.phone,
        grade: teacherData.grade,
        createdAt: new Date().toISOString()
      };
      data.teachers.push(newTeacher);
      writeMockDb(data);
      return newTeacher;
    } else {
      const ref = await db.collection('teachers').add({
        name: teacherData.name,
        email: teacherData.email,
        phone: teacherData.phone,
        grade: teacherData.grade,
        createdAt: new Date().toISOString()
      });
      return { id: ref.id, ...teacherData };
    }
  },

  deleteTeacher: async (id) => {
    if (isMock) {
      const data = readMockDb();
      data.teachers = data.teachers.filter(t => t.id !== id);
      writeMockDb(data);
      return true;
    } else {
      await db.collection('teachers').doc(id).delete();
      return true;
    }
  },

  // 15. Payments database operations
  getPayments: async () => {
    if (isMock) {
      const data = readMockDb();
      return data.payments || [];
    } else {
      const snapshot = await db.collection('payments').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  recordPayment: async (studentId, amount) => {
    const paymentRecord = {
      studentId,
      amount: Number(amount),
      timestamp: new Date().toISOString()
    };
    if (isMock) {
      const data = readMockDb();
      const id = 'pay_' + Date.now();
      const newPayment = { id, ...paymentRecord };
      data.payments.push(newPayment);
      writeMockDb(data);
      return newPayment;
    } else {
      const docRef = await db.collection('payments').add(paymentRecord);
      return { id: docRef.id, ...paymentRecord };
    }
  },

  // 16. Messages & Notifications log operations
  logNotification: async (phone, message) => {
    const record = {
      phone: phone.trim().replace(/\D/g, ''),
      message: message,
      timestamp: new Date().toISOString()
    };
    if (isMock) {
      const data = readMockDb();
      if (!data.notifications) data.notifications = [];
      const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newNotif = { id, ...record };
      data.notifications.push(newNotif);
      writeMockDb(data);
      return newNotif;
    } else {
      const ref = await db.collection('notifications').add(record);
      return { id: ref.id, ...record };
    }
  },

  getNotificationsByPhone: async (phone) => {
    const normalized = phone.trim().replace(/\D/g, '');
    if (isMock) {
      const data = readMockDb();
      if (!data.notifications) data.notifications = [];
      const notifs = data.notifications.filter(n => {
        const p = n.phone.replace(/\D/g, '');
        return p === normalized || p.includes(normalized) || normalized.includes(p);
      });
      notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return notifs;
    } else {
      const snapshot = await db.collection('notifications').get();
      const results = [];
      snapshot.forEach(doc => {
        const n = doc.data();
        const p = (n.phone || '').replace(/\D/g, '');
        if (p === normalized || p.includes(normalized) || normalized.includes(p)) {
          results.push({ id: doc.id, ...n });
        }
      });
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return results;
    }
  },
  
  // 17. School Multi-Tenancy Operations
  getSchools: async () => {
    if (isMock) {
      const data = readMockDb();
      return data.schools || [];
    } else {
      const snapshot = await db.collection('schools').get();
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    }
  },

  getSchoolById: async (id) => {
    if (isMock) {
      const data = readMockDb();
      return (data.schools || []).find(s => s.id === id) || null;
    } else {
      const doc = await db.collection('schools').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }
  },

  createSchool: async (schoolData) => {
    const newSchool = {
      id: schoolData.id || 'school_' + Date.now(),
      name: schoolData.name,
      domain: schoolData.domain || '',
      branding: {
        logoUrl: schoolData.logoUrl || '/school_logo.png',
        primaryColor: schoolData.primaryColor || '#4D69D6',
        accentColor: schoolData.accentColor || '#6366F1',
        backgroundUrl: schoolData.backgroundUrl || '/background.png'
      },
      createdAt: new Date().toISOString()
    };

    if (isMock) {
      const data = readMockDb();
      if (!data.schools) data.schools = [];
      data.schools.push(newSchool);
      writeMockDb(data);
      return newSchool;
    } else {
      await db.collection('schools').doc(newSchool.id).set(newSchool);
      return newSchool;
    }
  },

  getUser: async (userId) => {
    const normalizedId = userId.trim();
    if (isMock) {
      const data = readMockDb();
      if (!data.users) data.users = [];
      return data.users.find(u => u.id === normalizedId) || null;
    } else {
      const doc = await db.collection('users').doc(normalizedId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }
  },

  createUser: async (userData) => {
    const newUser = {
      id: userData.id.trim(),
      role: userData.role,
      schoolId: userData.schoolId || 'school_101',
      name: userData.name || '',
      passwordHash: userData.passwordHash || '',
      setupRequired: userData.setupRequired !== undefined ? userData.setupRequired : true,
      createdAt: new Date().toISOString()
    };

    if (isMock) {
      const data = readMockDb();
      if (!data.users) data.users = [];
      data.users = data.users.filter(u => u.id !== newUser.id);
      data.users.push(newUser);
      writeMockDb(data);
      return newUser;
    } else {
      await db.collection('users').doc(newUser.id).set(newUser);
      return newUser;
    }
  },

  updateUserPassword: async (userId, passwordHash) => {
    const normalizedId = userId.trim();
    if (isMock) {
      const data = readMockDb();
      if (!data.users) data.users = [];
      const user = data.users.find(u => u.id === normalizedId);
      if (user) {
        user.passwordHash = passwordHash;
        user.setupRequired = false;
        writeMockDb(data);
        return user;
      }
      return null;
    } else {
      const ref = db.collection('users').doc(normalizedId);
      await ref.update({
        passwordHash: passwordHash,
        setupRequired: false
      });
      const updated = await ref.get();
      return { id: updated.id, ...updated.data() };
    }
  },

  createStudent: async (studentData) => {
    const newStudent = {
      id: studentData.id || 'std_' + Date.now() + Math.floor(Math.random() * 1000),
      schoolId: studentData.schoolId || 'school_101',
      name: studentData.name,
      grade: studentData.grade || 'Grade 8-B',
      rfidUid: studentData.rfidUid || '',
      parentName: studentData.parentName || '',
      parentPhone: studentData.parentPhone.trim().replace(/\s+/g, ''),
      feeStatus: studentData.feeStatus || 'paid',
      feeDue: studentData.feeDue || 0,
      createdAt: new Date().toISOString()
    };

    if (isMock) {
      const data = readMockDb();
      data.students.push(newStudent);
      writeMockDb(data);
      return newStudent;
    } else {
      await db.collection('students').doc(newStudent.id).set(newStudent);
      return newStudent;
    }
  }
};

module.exports = dbService;
