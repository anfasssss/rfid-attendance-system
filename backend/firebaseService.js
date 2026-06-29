const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db;
let isMock = false;
const mockDbPath = path.join(__dirname, 'mock_db.json');

// Helper to initialize a mock database with default seed data
function initializeMockDb() {
  isMock = true;
  console.log('⚠️  [Firebase Service] firebase-admin credentials not found or incomplete.');
  console.log('🚀  [Firebase Service] Running in MOCK DATABASE mode (saves to mock_db.json).');
  
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

// Try to initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('🔥  [Firebase Service] Connected to live Cloud Firestore successfully.');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    db = admin.firestore();
    console.log('🔥  [Firebase Service] Connected to live Cloud Firestore via ENV credentials.');
  } else {
    initializeMockDb();
  }
} catch (error) {
  console.error('❌  [Firebase Service] Error trying to initialize Firebase SDK:', error.message);
  initializeMockDb();
}

// Read local mock DB helper
function readMockDb() {
  try {
    const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    if (!data.leaves) data.leaves = [];
    if (!data.teachers) data.teachers = [];
    if (!data.payments) data.payments = [];
    return data;
  } catch (err) {
    return { students: [], attendance_logs: [], leaves: [], teachers: [], payments: [] };
  }
}

// Write local mock DB helper
function writeMockDb(data) {
  const tmpPath = mockDbPath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, mockDbPath);
  } catch (err) {
    console.error('❌  [Firebase Service] Error writing mock DB atomically:', err.message);
    // Fallback to direct write if rename fails
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
  }
}

// --- DATABASE SERVICE METHODS ---

const firebaseService = {
  isMockMode: () => isMock,

  // 1. Get student by RFID UID
  getStudentByRfid: async (rfidUid) => {
    const normalizedUid = rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase();
    if (isMock) {
      const data = readMockDb();
      const student = data.students.find(s => s.rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase() === normalizedUid);
      return student || null;
    } else {
      const snapshot = await db.collection('students')
        .where('rfidUid', '==', normalizedUid)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  },

  // 2. Get students linked to a parent's phone number
  getStudentsByParentPhone: async (phone) => {
    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    if (isMock) {
      const data = readMockDb();
      // Match phone numbers by checking if they contain/equal the digits
      return data.students.filter(s => {
        const studentPhone = s.parentPhone.trim().replace(/\s+/g, '');
        return studentPhone === normalizedPhone || studentPhone.includes(normalizedPhone) || normalizedPhone.includes(studentPhone);
      });
    } else {
      // Direct exact match
      let snapshot = await db.collection('students').where('parentPhone', '==', normalizedPhone).get();
      
      // Fallback: search all and match flexibly if no exact match (useful for varying international prefixes)
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
        return results;
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  // 3. Get all students
  getStudents: async () => {
    if (isMock) {
      return readMockDb().students;
    } else {
      const snapshot = await db.collection('students').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  // 7. Log check-in attendance scan
  logAttendance: async (student) => {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    const logRecord = {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      rfidUid: student.rfidUid,
      timestamp: timestamp,
      dateStr: dateStr
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
  }
};

module.exports = firebaseService;
