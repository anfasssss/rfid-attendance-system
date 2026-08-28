require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const dbService = require('./firebaseService');

const app = express();
const PORT = process.env.PORT || 5001;

// Wraps express in a native HTTP server to attach WebSocket listener
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const wsClients = new Set();
wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`🔌  [WebSocket Server] Client connected. Active clients: ${wsClients.size}`);
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`🔌  [WebSocket Server] Client disconnected. Active clients: ${wsClients.size}`);
  });
});

// Helper function to broadcast events to all active websocket clients
function broadcastEvent(type, data) {
  const payload = JSON.stringify({ type, data });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Logs notifications to database and broadcasts them to active clients
async function logAndBroadcastNotification(parentPhone, message) {
  try {
    await dbService.logNotification(parentPhone, message);
    broadcastEvent('notification_update', {
      id: "notif_" + Date.now(),
      phone: parentPhone,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to log/broadcast notification:', err.message);
  }
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required to parse URL-encoded bodies from Twilio Webhooks

// ==========================================
// DUAL-MODE WHATSAPP CONFIGURATIONS
// ==========================================
const PROVIDER = 'none'; // process.env.WHATSAPP_PROVIDER || 'webjs'; // WhatsApp disabled (Pure Web/PWA App Mode)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Print boot status
console.log('🤖  RFID Attendance System starting...');
console.log(`📂  Database Mode: ${dbService.isMockMode() ? 'MOCK LOCAL DB' : 'LIVE FIREBASE'}`);
console.log(`💬  WhatsApp Mode: ${PROVIDER.toUpperCase()}`);

// Initialize Twilio client if selected
if (PROVIDER === 'twilio') {
  if (TWILIO_SID && TWILIO_TOKEN && TWILIO_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      twilioClient = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
      console.log('☎️   [WhatsApp Provider] Twilio Client initialized successfully.');
    } catch (err) {
      console.error('❌  [WhatsApp Provider] Error initializing Twilio Client:', err.message);
    }
  } else {
    console.log('⚠️   [WhatsApp Provider] Running in Twilio mode but credentials are still default placeholders.');
  }
}

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mykard-super-secret-key-123456';

// Middleware to verify JWT tokens and secure API endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // If running in development/local test mode, allow fallback for easy local validation if token is missing
    if (process.env.NODE_ENV === 'development' || dbService.isMockMode()) {
      req.user = { role: 'parent', parentId: '+919656108992', schoolId: 'school_101' };
      return next();
    }
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ==========================================
// 1. HEALTH & CRUD API ENDPOINTS
// ==========================================

// GET: Retrieve all schools
app.get('/api/schools', async (req, res) => {
  try {
    const schools = await dbService.getSchools();
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve schools' });
  }
});

// POST: Onboard a new school
app.post('/api/admin/schools', async (req, res) => {
  const { name, id, domain, logoUrl, primaryColor, accentColor, backgroundUrl } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }
  try {
    const newSchool = await dbService.createSchool({
      id,
      name,
      domain,
      logoUrl,
      primaryColor,
      accentColor,
      backgroundUrl
    });
    res.status(201).json({ ok: true, message: 'School onboarded successfully', school: newSchool });
  } catch (err) {
    res.status(500).json({ error: 'Failed to onboard school' });
  }
});

// POST: Multi-tenant JWT Authentication
// POST: Multi-tenant JWT Authentication
app.post('/api/auth/login', async (req, res) => {
  const { role, username, phone, password, otp } = req.body;
  
  try {
    // 1. Superadmin master login check
    if (role === 'superadmin' || username === 'superadmin') {
      if (!password) {
        return res.status(400).json({ error: 'Superadmin password is required' });
      }
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      const expectedHash = crypto.createHash('sha256').update('mykard-super-2026').digest('hex');
      if (hash !== expectedHash) {
        return res.status(401).json({ error: 'Incorrect superadmin password' });
      }
      const payload = {
        role: 'superadmin',
        userId: 'superadmin',
        schoolId: 'global',
        name: 'Super Admin'
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        ok: true,
        token,
        user: {
          role: 'superadmin',
          name: 'Super Admin',
          username: 'superadmin',
          schoolId: 'global'
        }
      });
    }

    const userId = role === 'parent' ? (phone || '').trim() : (username || '').trim();
    if (!userId) {
      return res.status(400).json({ error: 'Phone number or Username is required' });
    }

    // 2. Fetch user profile
    let user = await dbService.getUser(userId);
    if (!user) {
      // Auto-register parent from student DB if they aren't registered yet (backward compatibility fallback)
      if (role === 'parent') {
        const studentsLinked = await dbService.getStudentsByParentPhone(userId);
        if (studentsLinked.length > 0) {
          user = await dbService.createUser({
            id: userId,
            role: 'parent',
            schoolId: studentsLinked[0].schoolId || 'school_101',
            name: studentsLinked[0].parentName || 'Parent',
            setupRequired: true
          });
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'Credentials not found. Please contact campus administration.' });
    }

    // 3. First time login - Setup password required
    if (user.setupRequired || !user.passwordHash) {
      return res.json({
        ok: true,
        setupRequired: true,
        userId: user.id,
        role: user.role
      });
    }

    // 4. Standard password validation
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) {
      return res.status(401).json({ error: 'Incorrect password credentials' });
    }

    // 5. Generate session token
    const payload = {
      role: user.role,
      userId: user.id,
      parentId: user.role === 'parent' ? user.id : undefined,
      schoolId: user.schoolId || 'school_101',
      name: user.name || 'User'
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      ok: true,
      token,
      user: {
        role: payload.role,
        name: payload.name,
        username: payload.userId,
        schoolId: payload.schoolId
      }
    });
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST: First-time Password Configuration
app.post('/api/auth/setup-password', async (req, res) => {
  const { userId, password, otp } = req.body;
  
  if (!userId || !password || !otp) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verification code check
  if (otp !== '111111' && otp !== '111112') {
    return res.status(400).json({ error: 'Invalid verification OTP code' });
  }

  try {
    const user = await dbService.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // Hash password using crypto SHA-256
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    await dbService.updateUserPassword(userId, passwordHash);
    
    // Auto login session generation
    const payload = {
      role: user.role,
      userId: user.id,
      parentId: user.role === 'parent' ? user.id : undefined,
      schoolId: user.schoolId || 'school_101',
      name: user.name || 'User'
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      ok: true,
      token,
      user: {
        role: payload.role,
        name: payload.name,
        username: payload.userId,
        schoolId: payload.schoolId
      }
    });
  } catch (err) {
    console.error('Password setup endpoint error:', err.message);
    res.status(500).json({ error: 'Failed to configure password' });
  }
});

// POST: Bulk school roster Excel onboarding
app.post('/api/admin/onboard-excel', async (req, res) => {
  const { schoolId, studentsList, staffList } = req.body;
  
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID slug is required' });
  }
  
  try {
    const school = await dbService.getSchoolById(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'Target school branding colors not found. Please onboard school branding first.' });
    }
    
    // 1. Onboard students
    if (studentsList && Array.isArray(studentsList)) {
      for (const std of studentsList) {
        if (!std.name) continue;
        await dbService.createStudent({
          schoolId,
          name: std.name,
          grade: std.grade || 'Grade 8-B',
          rfidUid: std.rfidUid || '',
          parentName: std.parentName || 'Parent',
          parentPhone: std.parentPhone || '',
          feeStatus: 'outstanding',
          feeDue: std.feeDue || 12500
        });
        
        // Link parent credential space
        if (std.parentPhone) {
          const parentId = std.parentPhone.trim();
          const existingParent = await dbService.getUser(parentId);
          if (!existingParent) {
            await dbService.createUser({
              id: parentId,
              role: 'parent',
              schoolId,
              name: std.parentName || 'Parent',
              setupRequired: true
            });
          }
        }
      }
    }
    
    // 2. Onboard Staff members
    if (staffList && Array.isArray(staffList)) {
      for (const staff of staffList) {
        if (!staff.username) continue;
        const staffId = staff.username.trim();
        await dbService.createUser({
          id: staffId,
          role: staff.role || 'teacher',
          schoolId,
          name: staff.name || 'Staff Member',
          setupRequired: true
        });
      }
    }
    
    res.json({ ok: true, message: `Successfully onboarded school cohort for school: ${school.name}` });
  } catch (err) {
    console.error('Excel Onboarding error:', err.message);
    res.status(500).json({ error: 'Failed to onboard school roster records' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    databaseMode: dbService.isMockMode() ? 'mock' : 'live',
    whatsappProvider: PROVIDER,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/system-status', async (req, res) => {
  const { schoolId } = req.query;
  try {
    let students = await dbService.getStudents();
    let logs = await dbService.getAttendanceLogs();
    let leaves = await dbService.getLeaves();
    let payments = await dbService.getPayments();
    
    if (schoolId && schoolId !== 'global') {
      students = students.filter(s => s.schoolId === schoolId);
      logs = logs.filter(l => l.schoolId === schoolId);
      leaves = leaves.filter(l => l.schoolId === schoolId);
      payments = payments.filter(p => p.schoolId === schoolId);
    }
    
    const isTwilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && 
                                 process.env.TWILIO_AUTH_TOKEN && 
                                 process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
                                 
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const localIPs = [];
    Object.keys(networkInterfaces).forEach((ifname) => {
      networkInterfaces[ifname].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIPs.push(iface.address);
        }
      });
    });

    res.json({
      status: 'healthy',
      databaseMode: dbService.isMockMode() ? 'mock' : 'live',
      activeClients: wsClients.size,
      studentCount: students.length,
      attendanceCount: logs.length,
      pendingLeaveCount: leaves.filter(l => l.status && l.status.toLowerCase() === 'pending').length,
      paymentCount: payments.length,
      whatsapp: {
        provider: PROVIDER,
        configured: PROVIDER === 'twilio' ? isTwilioConfigured : true,
      },
      network: {
        localIPs,
        configuredServerUrl: `http://${localIPs[0] || '127.0.0.1'}:${PORT}/api/scan`
      },
      recentLogs: logs.slice(-15).reverse(),
      unregisteredScans: logs.filter(l => l.studentId === 'unregistered').slice(-10).reverse()
    });
  } catch (error) {
    console.error('❌ [System Status Endpoint] Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache to prevent duplicate double scans (cooldown)
const recentScansCache = new Map();
const COOLDOWN_MS = 10 * 1000; // 10 seconds cooldown for easier testing

// POST: Receive RFID scans from ESP32
app.post('/api/scan', async (req, res) => {
  const { rfidUid, schoolId } = req.body;
  
  if (!rfidUid) {
    return res.status(400).json({ error: 'rfidUid is required' });
  }

  const normalizedUid = rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase();
  console.log(`🏷️  [RFID Scan Event] Scanned Card UID: ${rfidUid} (School ID: ${schoolId || 'unscoped'})`);

  try {
    const student = await dbService.getStudentByRfid(rfidUid, schoolId);
    
    if (!student) {
      console.log(`⚠️  [RFID Scan Event] Card UID ${rfidUid} not registered. Logging scan to live feed.`);
      
      try {
        const unregStudent = {
          id: "unregistered",
          name: "Unregistered Card",
          grade: "Unassigned",
          rfidUid: rfidUid,
          type: "entry",
          schoolId: schoolId || "school_101"
        };
        await dbService.logAttendance(unregStudent);
        
        // Broadcast unregistered card scan event in real time via WS
        broadcastEvent('attendance_update', {
          id: "log_" + Date.now(),
          studentId: "unregistered",
          studentName: "Unregistered Card",
          grade: "—",
          rfid: rfidUid,
          timestamp: new Date().toISOString(),
          status: "unregistered",
          gate: "Gate A"
        });
      } catch (logErr) {
        console.error("⚠️ Failed to write unrecognized log:", logErr.message);
      }

      return res.status(404).json({ 
        status: 'error', 
        message: `RFID Card (${rfidUid}) not registered. Please register card in dashboard.`,
        beepCode: 3
      });
    }

    // Log check-in / check-out
    const attendanceLog = await dbService.logAttendance(student);
    console.log(`✅ [RFID Scan Event] Logged ${attendanceLog.type.toUpperCase()}: ${student.name} (${student.grade}) at ${attendanceLog.timestamp}`);
    
    // Broadcast check-in/check-out scan event in real time via WS
    broadcastEvent('attendance_update', {
      id: attendanceLog.id || ("log_" + Date.now()),
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      rfid: student.rfidUid || rfidUid,
      timestamp: attendanceLog.timestamp,
      status: attendanceLog.type === 'exit' ? 'check-out' : 'check-in',
      gate: 'Gate A'
    });
    
    // Trigger real-time proactive notification to parent
    try {
      sendInstantAttendanceNotification(student, attendanceLog.timestamp, attendanceLog.type);
    } catch (err) {
      console.error('⚠️  Failed to send proactive WhatsApp alert:', err.message);
    }

    return res.json({
      status: 'success',
      studentName: student.name,
      grade: student.grade,
      timestamp: attendanceLog.timestamp,
      type: attendanceLog.type,
      beepCode: attendanceLog.type === 'exit' ? 2 : 1
    });
  } catch (error) {
    console.error('❌  [RFID Scan Event] Database error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Student Login API endpoint
// GET: Fetch student profile for student login using RFID Card UID
app.get('/api/students/login', async (req, res) => {
  const { rfidUid } = req.query;
  if (!rfidUid) {
    return res.status(400).json({ error: 'rfidUid query parameter is required' });
  }

  try {
    const student = await dbService.getStudentByRfid(rfidUid);
    if (!student) {
      return res.status(404).json({ error: 'Student RFID Card not registered.' });
    }

    const allLogs = await dbService.getAttendanceLogs();
    const allLeaves = await dbService.getLeaves();
    const allPayments = await dbService.getPayments();

    const logs = allLogs.filter(l => l.studentId === student.id);
    const leaves = allLeaves.filter(l => l.studentId === student.id);
    const payments = allPayments.filter(p => p.studentId === student.id);
    const notifications = await dbService.getNotificationsByPhone(student.parentPhone || '');

    res.json({
      ...student,
      logs,
      leaves,
      payments,
      notifications
    });
  } catch (error) {
    console.error('Error verifying student login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parent Portal API endpoints
// GET: Fetch all students linked to a parent phone number
app.get('/api/parents/students', authenticateToken, async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: 'phone query parameter is required' });
  }

  try {
    const students = await dbService.getStudentsByParentPhone(phone);
    const allLogs = await dbService.getAttendanceLogs();
    const allLeaves = await dbService.getLeaves();
    const allPayments = await dbService.getPayments();
    const notifications = await dbService.getNotificationsByPhone(phone);
    
    const enrichedStudents = students.map(student => {
      const logs = allLogs.filter(l => l.studentId === student.id);
      const leaves = allLeaves.filter(l => l.studentId === student.id);
      const payments = allPayments.filter(p => p.studentId === student.id);
      
      return {
        ...student,
        logs,
        leaves,
        payments
      };
    });

    res.json({
      students: enrichedStudents,
      notifications
    });
  } catch (error) {
    console.error('Error fetching parent students details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Record a parent mock fee payment
app.post('/api/parents/payments', authenticateToken, async (req, res) => {
  const { studentId, amount } = req.body;
  if (!studentId || !amount) {
    return res.status(400).json({ error: 'studentId and amount are required' });
  }

  try {
    const payment = await dbService.recordPayment(studentId, amount);
    
    // Log message history
    try {
      const studentsList = await dbService.getStudents();
      const student = studentsList.find(s => s.id === studentId);
      if (student) {
        await logAndBroadcastNotification(student.parentPhone, `Payment Recorded: Receipt confirmation for tuition installment of ₹${Number(amount).toLocaleString()} received successfully for ${student.name}.`);
      }
    } catch (err) {
      console.error('Failed to log payment notification:', err.message);
    }

    res.json({ status: 'success', payment });
  } catch (error) {
    console.error('Error recording parent payment:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Submit a parent sick leave request
app.post('/api/parents/leaves', authenticateToken, async (req, res) => {
  const { studentId, reason } = req.body;
  if (!studentId || !reason) {
    return res.status(400).json({ error: 'studentId and reason are required' });
  }

  try {
    const students = await dbService.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const leave = await dbService.logLeave(student, reason, 'Pending');
    
    // Log message history
    try {
      await logAndBroadcastNotification(student.parentPhone, `Leave Request: Sick leave excuse requested for ${student.name}. Status: Pending review.`);
    } catch (err) {
      console.error('Failed to log leave creation notification:', err.message);
    }

    res.json({ status: 'success', leave });
  } catch (error) {
    console.error('Error recording parent leave request:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student Database CRUD Operations
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const students = await dbService.getStudents();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const newStudent = await dbService.addStudent(req.body);
    
    // Automatically link previous unregistered attendance records to this new student!
    try {
      if (req.body.rfidUid) {
        await dbService.linkUnregisteredLogs(req.body.rfidUid, newStudent);
      }
    } catch (linkErr) {
      console.error('⚠️ Failed to link historical unregistered logs:', linkErr.message);
    }

    res.status(201).json(newStudent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await dbService.updateStudent(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    await dbService.deleteStudent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.date) filters.date = req.query.date;
    if (req.query.studentId) filters.studentId = req.query.studentId;
    
    const logs = await dbService.getAttendanceLogs(filters);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Leave Reports API endpoints
app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await dbService.getLeaves();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const { studentId, reason, status } = req.body;
    const students = await dbService.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const newLeave = await dbService.logLeave(student, reason, status || 'Approved');
    res.status(201).json(newLeave);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/leaves/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await dbService.updateLeaveStatus(req.params.id, status);
    
    // Log status update to message history
    try {
      const students = await dbService.getStudents();
      const student = students.find(s => s.id === updated.studentId);
      if (student) {
        await logAndBroadcastNotification(student.parentPhone, `Leave Request Status: Sick leave excuse for ${student.name} has been ${status.toUpperCase()}.`);
      }
    } catch (err) {
      console.error('Failed to log leave status update notification:', err.message);
    }
    
    // If approved, trigger WhatsApp notification to parent
    if (status === 'Approved') {
      try {
        const students = await dbService.getStudents();
        const student = students.find(s => s.id === updated.studentId);
        if (student) {
          sendLeaveApprovalNotification(student, updated);
        } else {
          console.log(`⚠️ Student not found for ID: ${updated.studentId} to send leave approval notification.`);
        }
      } catch (notifyErr) {
        console.error('⚠️ Failed to process leave approval notification:', notifyErr.message);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/leaves/:id', async (req, res) => {
  try {
    await dbService.deleteLeave(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Class Teachers API endpoints
app.get('/api/teachers', authenticateToken, async (req, res) => {
  try {
    const teachers = await dbService.getTeachers();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, grade } = req.body;
    if (!name || !email || !phone || !grade) {
      return res.status(400).json({ error: 'Missing name, email, phone, or grade' });
    }
    const newTeacher = await dbService.addTeacher({ name, email, phone, grade });
    res.status(201).json(newTeacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teachers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteTeacher(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payments API endpoints
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await dbService.getPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { studentId, amount } = req.body;
    if (!studentId || amount === undefined) {
      return res.status(400).json({ error: 'Missing studentId or amount' });
    }
    const newPayment = await dbService.recordPayment(studentId, amount);
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-Send Fee Reminders API endpoint
app.post('/api/fees/auto-reminders', async (req, res) => {
  try {
    const students = await dbService.getStudents();
    const payments = await dbService.getPayments();
    
    // Group payments by studentId
    const paidByStudent = {};
    payments.forEach(p => {
      paidByStudent[p.studentId] = (paidByStudent[p.studentId] || 0) + Number(p.amount);
    });

    const getFeeStructure = (grade) => {
      const cleanGrade = (grade || '').toLowerCase();
      if (cleanGrade.includes('10')) return 35000;
      if (cleanGrade.includes('9')) return 30000;
      if (cleanGrade.includes('8')) return 28000;
      return 25000;
    };

    const getDefaultPaidAmount = (studentId, totalFee) => {
      let hash = 0;
      for (let i = 0; i < studentId.length; i++) {
        hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const absHash = Math.abs(hash);
      const mod = absHash % 3;
      if (mod === 0) return totalFee;
      if (mod === 1) return Math.floor(totalFee * 0.4);
      return 0;
    };

    const dueDate = new Date();
    dueDate.setDate(28);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let sentCount = 0;
    let failCount = 0;

    const targetGrade = req.body?.grade || req.query?.grade;

    for (const student of students) {
      if (targetGrade && (student.grade || '').toLowerCase().trim() !== targetGrade.toLowerCase().trim()) {
        continue;
      }
      const totalFee = getFeeStructure(student.grade);
      const hasCustomPayment = student.id in paidByStudent;
      const paidAmount = hasCustomPayment 
        ? paidByStudent[student.id] 
        : getDefaultPaidAmount(student.id, totalFee);

      const remaining = Math.max(0, totalFee - paidAmount);
      if (remaining > 0) {
        const success = await sendFeesReminderNotification(student, remaining, formattedDueDate);
        if (success) {
          sentCount++;
        } else {
          failCount++;
        }
      }
    }

    res.json({ success: true, sentCount, failCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Automated Fees Reminder Scheduler (runs every 24 hours)
setInterval(async () => {
  console.log('⏰  [Automated Scheduler] Checking for daily fees reminders to send...');
  try {
    const students = await dbService.getStudents();
    const payments = await dbService.getPayments();
    
    const paidByStudent = {};
    payments.forEach(p => {
      paidByStudent[p.studentId] = (paidByStudent[p.studentId] || 0) + Number(p.amount);
    });

    const getFeeStructure = (grade) => {
      const cleanGrade = (grade || '').toLowerCase();
      if (cleanGrade.includes('10')) return 35000;
      if (cleanGrade.includes('9')) return 30000;
      if (cleanGrade.includes('8')) return 28000;
      return 25000;
    };

    const getDefaultPaidAmount = (studentId, totalFee) => {
      let hash = 0;
      for (let i = 0; i < studentId.length; i++) {
        hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const absHash = Math.abs(hash);
      const mod = absHash % 3;
      if (mod === 0) return totalFee;
      if (mod === 1) return Math.floor(totalFee * 0.4);
      return 0;
    };

    const dueDate = new Date();
    dueDate.setDate(28);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    for (const student of students) {
      const totalFee = getFeeStructure(student.grade);
      const hasCustomPayment = student.id in paidByStudent;
      const paidAmount = hasCustomPayment 
        ? paidByStudent[student.id] 
        : getDefaultPaidAmount(student.id, totalFee);

      const remaining = Math.max(0, totalFee - paidAmount);
      if (remaining > 0) {
        await sendFeesReminderNotification(student, remaining, formattedDueDate);
      }
    }
  } catch (err) {
    console.error('❌  [Automated Scheduler Error] Failed to run automated fees reminders:', err.message);
  }
}, 24 * 60 * 60 * 1000); // 24 hours


// ==========================================
// 2. UNIFIED CHATBOT REPLAY LOGIC (D.R.Y.)
// ==========================================

function normalizePhone(phoneStr) {
  return phoneStr.replace(/\D/g, ''); // Extract only raw digits
}

function formatTime(isoString) {
  const date = new Date(isoString);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Single function containing all chatbot dialog trees.
 * Used by both WebJS message handlers and Twilio webhooks.
 */
// Global teacher session registry to track interactive states
const teacherSessions = {};

// Interactive Chatbot Logic for Class Teachers
async function handleTeacherChatbotLogic(teacher, messageText) {
  const text = messageText.trim().toLowerCase();
  
  if (!teacherSessions[teacher.phone]) {
    teacherSessions[teacher.phone] = { step: 'menu' };
  }
  const session = teacherSessions[teacher.phone];
  const todayStr = new Date().toISOString().split('T')[0];

  // Global reset back to Menu
  if (text === 'hi' || text === 'hello' || text === 'menu') {
    session.step = 'menu';
    let menuMsg = `🏫 *mykard Academy - Teacher Portal* 👩‍🏫\n`;
    menuMsg += `Hello Teacher *${teacher.name}* (${teacher.grade}).\n\n`;
    menuMsg += `Please choose an option:\n`;
    menuMsg += `1️⃣ *Leaves Today* - Today's leave reports\n`;
    menuMsg += `2️⃣ *Leaves by Date* - View leaves by custom date\n`;
    menuMsg += `3️⃣ *Pending Approvals* - Review & approve leaves\n`;
    menuMsg += `4️⃣ *Attendance Summary* - Attendance stats\n\n`;
    menuMsg += `_Type the option number or command (e.g., "1" or "leaves")._`;
    return menuMsg;
  }

  // Step: Awaiting Custom Date Input
  if (session.step === 'awaiting_date') {
    const dateRegex = /^(\d{1,2})[\/\-.](\d{1,2})$/;
    if (!dateRegex.test(text)) {
      return `⚠️ *Invalid Format*:\nPlease enter the date in *DD/MM* format (e.g. *25/06*), or reply with *Menu* to cancel.`;
    }
    const match = text.match(dateRegex);
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = new Date().getFullYear();
    
    const pad = (n) => String(n).padStart(2, '0');
    const targetDateStr = `${year}-${pad(month)}-${pad(day)}`;

    const leaves = await dbService.getLeaves();
    const gradeLeaves = leaves.filter(l => l.grade.toLowerCase() === teacher.grade.toLowerCase() && l.dateStr === targetDateStr);
    
    const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let reply = `📝 *Leaves for ${displayDate}* 📝\n`;
    if (gradeLeaves.length === 0) {
      reply += `\nNo student leaves logged for this date. ✅`;
    } else {
      gradeLeaves.forEach((l, index) => {
        reply += `\n${index + 1}. *${l.studentName}*\n📝 Reason: ${l.reason}\n🛡️ Status: *${l.status}*\n`;
      });
    }
    session.step = 'menu';
    reply += `\n_Reply with *Menu* to return to the options menu._`;
    return reply;
  }

  // Step: Awaiting Approval Action (Approve/Deny)
  if (session.step === 'awaiting_approval') {
    const approveDenyRegex = /^(approve|deny|reject)\s+(\d+)$/;
    if (!approveDenyRegex.test(text)) {
      return `⚠️ *Invalid Command*:\nPlease reply with *approve [number]* or *deny [number]* (e.g., \`approve 1\`), or reply with *Menu* to cancel.`;
    }
    
    const match = text.match(approveDenyRegex);
    const action = match[1];
    const index = parseInt(match[2], 10) - 1;
    
    const pendingLeaves = session.pendingLeaves || [];
    if (index < 0 || index >= pendingLeaves.length) {
      return `❌ *Index Out of Range*:\nPlease choose a number between 1 and ${pendingLeaves.length}.`;
    }
    
    const selectedLeave = pendingLeaves[index];
    const newStatus = (action === 'approve') ? 'Approved' : 'Declined';
    
    try {
      const updated = await dbService.updateLeaveStatus(selectedLeave.id, newStatus);
      
      if (newStatus === 'Approved') {
        const students = await dbService.getStudents();
        const student = students.find(s => s.id === updated.studentId);
        if (student) {
          await sendLeaveApprovalNotification(student, updated);
        }
      }
      
      session.step = 'menu';
      return `✅ *Success*:\nLeave request for *${selectedLeave.studentName}* has been *${newStatus}* successfully!\n\n_Reply with *Menu* to return._`;
    } catch (err) {
      console.error('Error updating leave status from chatbot:', err.message);
      return `❌ Failed to update leave status. Please try again.`;
    }
  }

  // Standard Option Selection Menu
  if (session.step === 'menu') {
    // Option 1: Leaves Today
    if (text === '1' || text === 'leaves today' || text === 'leaves') {
      const leaves = await dbService.getLeaves();
      const gradeLeaves = leaves.filter(l => l.grade.toLowerCase() === teacher.grade.toLowerCase() && l.dateStr === todayStr);
      
      let reply = `📝 *Leaves Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})* 📝\n`;
      if (gradeLeaves.length === 0) {
        reply += `\nNo student leaves reported for today! ✅`;
      } else {
        gradeLeaves.forEach((l, index) => {
          reply += `\n${index + 1}. *${l.studentName}*\n📝 Reason: ${l.reason}\n🛡️ Status: *${l.status}*\n`;
        });
      }
      reply += `\n_Reply with *Menu* to return._`;
      return reply;
    }

    // Option 2: Leaves by custom date
    if (text === '2' || text === 'leaves by date' || text === 'date') {
      session.step = 'awaiting_date';
      return `📅 *Enter Date* 📅\n\nPlease enter the date you want to view in *DD/MM* format (e.g. *25/06*):`;
    }

    // Option 3: Pending approvals
    if (text === '3' || text === 'pending' || text === 'approvals') {
      const leaves = await dbService.getLeaves();
      const pendingLeaves = leaves.filter(l => l.grade.toLowerCase() === teacher.grade.toLowerCase() && l.status === 'Pending');
      
      if (pendingLeaves.length === 0) {
        return `🛡️ *Pending Approvals* 🛡️\n\nNo pending leave requests for ${teacher.grade}! ✅\n\n_Reply with *Menu* to return._`;
      }

      session.step = 'awaiting_approval';
      session.pendingLeaves = pendingLeaves;

      let reply = `🛡️ *Pending Leave Approvals* 🛡️\n\n`;
      pendingLeaves.forEach((l, index) => {
        reply += `[${index + 1}] *${l.studentName}*\n📝 Reason: ${l.reason}\n📅 Date: ${new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n`;
      });
      reply += `\n👉 To approve or deny, reply with:\n*approve [number]* or *deny [number]*\n(e.g., \`approve 1\`)\n\n_Reply with *Menu* to return._`;
      return reply;
    }

    // Option 4: Attendance Summary
    if (text === '4' || text === 'attendance' || text === 'summary') {
      const students = await dbService.getStudents();
      const logs = await dbService.getAttendanceLogs();
      
      const gradeStudents = students.filter(s => s.grade.toLowerCase() === teacher.grade.toLowerCase());
      const studentIds = gradeStudents.map(s => s.id);
      
      const todayScans = logs.filter(log => log.dateStr === todayStr && studentIds.includes(log.studentId));
      const scannedStudentIds = new Set(todayScans.map(log => log.studentId));
      
      const presentCount = scannedStudentIds.size;
      const totalCount = gradeStudents.length;
      const absentCount = Math.max(0, totalCount - presentCount);

      let summary = `📊 *Today's Attendance Summary* 📊\n`;
      summary += `🏫 *Class:* ${teacher.grade}\n`;
      summary += `📅 *Date:* ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
      summary += `✅ *Present:* ${presentCount} / ${totalCount}\n`;
      summary += `❌ *Absent:* ${absentCount}\n\n`;
      
      if (absentCount > 0) {
        summary += `👤 *Absent Students:*`;
        const absents = gradeStudents.filter(s => !scannedStudentIds.has(s.id));
        absents.forEach(s => {
          summary += `\n- ${s.name}`;
        });
      }
      summary += `\n\n_Reply with *Menu* to return._`;
      return summary;
    }
  }

  // Fallback if option input unrecognized
  session.step = 'menu';
  return `⚠️ *Option Unrecognized*:\n\nPlease reply with *Menu* to reset and view your portal options list.`;
}

async function handleIncomingChatbotLogic(senderPhoneDigits, messageText) {
  // Check if sender is a teacher first
  const teacher = await dbService.getTeacherByPhone(senderPhoneDigits);
  if (teacher) {
    return await handleTeacherChatbotLogic(teacher, messageText);
  }

  const text = messageText.trim().toLowerCase();
  
  // Verify parent's phone number in database
  const linkedStudents = await dbService.getStudentsByParentPhone(senderPhoneDigits);

  if (linkedStudents.length === 0) {
    return `Welcome to the *RFID Student Attendance System* 🏫\n\n⚠️ *Access Denied*:\nThis number (+${senderPhoneDigits}) is not registered in our database.\n\nPlease contact your school teacher or administrator to link this phone number to your child's student record.`;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Option 1: 7-Day History logs
  if (text === '1' || text === 'history') {
    let historyReply = `📊 *7-Day Attendance History* 📊\n`;
    for (const student of linkedStudents) {
      historyReply += `\n👤 *Student:* ${student.name}\n`;
      const logs = await dbService.getAttendanceLogs({ studentId: student.id });
      const last7 = logs.slice(0, 7);
      if (last7.length === 0) {
        historyReply += `❌ No attendance history logged yet.\n`;
      } else {
        last7.forEach(log => {
          const date = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const time = formatTime(log.timestamp);
          historyReply += `📅 ${date} - Entered at *${time}* ✅\n`;
        });
      }
    }
    historyReply += `\n_Reply with *Menu* to return._`;
    return historyReply;
  }

  // Option 2: School Contact Details
  if (text === '2' || text === 'school') {
    return `🏫 *School Contact Details* 🏫\n\n📌 *School:* mykard Academy\n📍 *Address:* 123 Education Drive, Tech City\n📞 *Office Phone:* +1 (555) 019-2834\n📧 *Email:* info@abacademy.edu\n🕒 *Hours:* 8:00 AM - 3:00 PM\n\n_Reply with *Menu* to return._`;
  }

  // Option 3: Registered Child & RFID Details
  if (text === '3' || text === 'rfid' || text === 'details') {
    let rfidReply = `🔑 *Child RFID & Class Details* 🔑\n`;
    linkedStudents.forEach(student => {
      rfidReply += `\n👤 *Student:* ${student.name}\n🏫 *Class/Grade:* ${student.grade}\n🏷️ *RFID Card UID:* \`${student.rfidUid}\`\n🛡️ *Security Status:* Active ✅\n`;
    });
    rfidReply += `\n_Reply with *Menu* to return._`;
    return rfidReply;
  }

  // Option 4: Sick Leave / Absence Guide
  if (text === '4' || text === 'leave') {
    let leaveReply = `📝 *Report Sick Leave / Absence* 📝\n\nTo report sick leave or excuse an absence for your child today, please reply in the following format:\n\n*Leave [Child First Name] [Reason for Absence]*\n\n_Example:_\n\`Leave ${linkedStudents[0].name.split(' ')[0]} Fever\`\n\nWe will automatically log this in the database and notify their teacher.`;
    return leaveReply;
  }

  // Handle Sick Leave submission: "leave [Name] [Reason]"
  if (text.startsWith('leave ')) {
    const parts = messageText.split(' ');
    if (parts.length < 3) {
      return `⚠️ *Incomplete Command*:\nPlease use the format: \`Leave [Name] [Reason]\`\n\n_Example:_\n\`Leave ${linkedStudents[0].name.split(' ')[0]} Fever\``;
    }
    const childNameQuery = parts[1].toLowerCase();
    const reason = parts.slice(2).join(' ');

    const matchedChild = linkedStudents.find(s => s.name.toLowerCase().includes(childNameQuery));
    if (!matchedChild) {
      return `❌ *Child Not Found*:\nWe couldn't find a child named "${parts[1]}" linked to your number.\n\nType *3* to view your registered children.`;
    }

    // Save the excused leave record to the database!
    try {
      await dbService.logLeave(matchedChild, reason, 'Pending');
    } catch (dbErr) {
      console.error('⚠️ Failed to save leave record to database:', dbErr.message);
    }

    // Return a beautiful excused-leave receipt
    return `✅ *Excused Absence Logged* ✅\n\n👤 *Student:* ${matchedChild.name}\n🏫 *Class:* ${matchedChild.grade}\n📅 *Date:* ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}\n📝 *Reason:* ${reason}\n🛡️ *Status:* Pending Review (Teacher Notified)\n\nThank you for keeping the school updated!`;
  }

  // Specific Date query (e.g. "24/05" or "24-05")
  const dateRegex = /^(\d{1,2})[\/\-.](\d{1,2})$/;
  if (dateRegex.test(text)) {
    const match = text.match(dateRegex);
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = new Date().getFullYear();
    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedDay = day < 10 ? '0' + day : day;
    const queryDateStr = `${year}-${formattedMonth}-${formattedDay}`;

    let dateReply = `📅 *Attendance Check for ${formattedDay}/${formattedMonth}/${year}* 📅\n`;
    for (const student of linkedStudents) {
      const logs = await dbService.getAttendanceLogs({ studentId: student.id, date: queryDateStr });
      if (logs.length > 0) {
        const entryTime = formatTime(logs[0].timestamp);
        dateReply += `\n👤 *${student.name}:* Entered at *${entryTime}* ✅`;
      } else {
        dateReply += `\n👤 *${student.name}:* Not checked in (Absent/Holiday) ❌`;
      }
    }
    dateReply += `\n\n_Reply with *Menu* to return._`;
    return dateReply;
  }

  // Default welcome response: Greet parent and show today's status immediately
  let welcomeReply = `🌟 *Student Attendance Chatbot* 🌟\n\n`;
  const parentName = linkedStudents[0].parentName || 'Parent';
  welcomeReply += `Hello Mr./Mrs. *${parentName}*! Here is today's report for your family:\n`;

  for (const student of linkedStudents) {
    const todayLogs = await dbService.getAttendanceLogs({ studentId: student.id, date: todayStr });
    welcomeReply += `\n👤 *Student:* ${student.name} (${student.grade})\n`;
    if (todayLogs.length > 0) {
      const entryTime = formatTime(todayLogs[0].timestamp);
      welcomeReply += `📅 *Today:* Checked in safely at *${entryTime}* 🏫✅\n`;
    } else {
      welcomeReply += `📅 *Today:* Not checked in yet ❌ (Awaiting entry)\n`;
    }
  }

  welcomeReply += `\n👉 *Quick Menu (Reply with number or word)*:\n`;
  welcomeReply += `1️⃣ or *History* - View last 7 days logs\n`;
  welcomeReply += `2️⃣ or *School*  - Get school contact details\n`;
  welcomeReply += `3️⃣ or *RFID*    - View Child RFID Card info\n`;
  welcomeReply += `4️⃣ or *Leave*   - Submit Excused Sick Leave\n`;
  welcomeReply += `🔍 Or type a date like *${new Date().getDate()}/${new Date().getMonth()+1}* to check a specific day!\n`;
  welcomeReply += `\n_Your privacy is protected. You can only view details of children linked to your phone number._`;

  return welcomeReply;
}

// Proactive instant push alert when student scans RFID card (Entry/Exit)
async function sendInstantAttendanceNotification(student, timestamp, type) {
  const normalizedPhone = normalizePhone(student.parentPhone);
  if (!normalizedPhone) return;

  const timeStr = formatTime(timestamp);
  const actionWord = type === 'exit' ? 'left' : 'entered';
  const actionIcon = type === 'exit' ? '🚪👋' : '🏫✅';
  const alertMsg = `🔔 *Attendance Alert* 🔔\n\nHello Mr./Mrs. ${student.parentName || 'Parent'},\nWe are pleased to inform you that your child *${student.name}* has *${actionWord}* school safely today at *${timeStr}*. ${actionIcon}`;

  // Log to parent workspace notification logs history
  try {
    const dbMsg = `Attendance Alert: We are pleased to inform you that your child ${student.name} has ${actionWord} school safely today at ${timeStr}.`;
    await logAndBroadcastNotification(student.parentPhone, dbMsg);
  } catch (dbErr) {
    console.error('❌ Failed to log notification to database:', dbErr.message);
  }

  if (PROVIDER === 'twilio' && twilioClient) {
    try {
      const payload = {
        from: TWILIO_FROM,
        to: `whatsapp:+${normalizedPhone}`
      };

      if (process.env.TWILIO_CONTENT_SID && type === 'entry') { // Template only for check-in
        payload.contentSid = process.env.TWILIO_CONTENT_SID;
        payload.contentVariables = JSON.stringify({
          "1": student.parentName || 'Parent',
          "2": student.name,
          "3": timeStr
        });
      } else {
        payload.body = alertMsg;
      }

      await twilioClient.messages.create(payload);
      console.log(`📩  Proactive Twilio WhatsApp notification sent to +${normalizedPhone} for student ${student.name} (${type.toUpperCase()})`);
    } catch (err) {
      console.error(`❌  Failed to send Twilio alert to +${normalizedPhone}:`, err.message);
    }
  } else if (PROVIDER === 'webjs' && isBotReady) {
    const recipientId = `${normalizedPhone}@c.us`;
    try {
      await client.sendMessage(recipientId, alertMsg);
      console.log(`📩  Proactive WebJS WhatsApp notification sent to +${normalizedPhone} for student ${student.name} (${type.toUpperCase()})`);
    } catch (err) {
      console.error(`❌  Failed to send WebJS alert to +${normalizedPhone}:`, err.message);
    }
  }
}

// Proactive WhatsApp notification when leave request is approved by teacher/principal
async function sendLeaveApprovalNotification(student, leaveRecord) {
  const normalizedPhone = normalizePhone(student.parentPhone);
  if (!normalizedPhone) return;

  const alertMsg = `📝 *Leave Approved* 📝\n\nHello Mr./Mrs. ${student.parentName || 'Parent'},\nWe are pleased to inform you that the leave request for your child *${student.name}* (Reason: ${leaveRecord.reason}) has been *Approved* by the teacher or principal. 🏫✅`;

  if (PROVIDER === 'twilio' && twilioClient) {
    try {
      const payload = {
        from: TWILIO_FROM,
        to: `whatsapp:+${normalizedPhone}`,
        body: alertMsg
      };

      await twilioClient.messages.create(payload);
      console.log(`📩  Twilio WhatsApp leave approval notification sent to +${normalizedPhone} for student ${student.name}`);
    } catch (err) {
      console.error(`❌  Failed to send Twilio leave approval alert to +${normalizedPhone}:`, err.message);
    }
  } else if (PROVIDER === 'webjs' && isBotReady) {
    const recipientId = `${normalizedPhone}@c.us`;
    try {
      await client.sendMessage(recipientId, alertMsg);
      console.log(`📩  WebJS WhatsApp leave approval notification sent to +${normalizedPhone} for student ${student.name}`);
    } catch (err) {
      console.error(`❌  Failed to send WebJS leave approval alert to +${normalizedPhone}:`, err.message);
    }
  }
}

// Proactive WhatsApp notification for fee reminders
async function sendFeesReminderNotification(student, remaining, dueDate) {
  const normalizedPhone = normalizePhone(student.parentPhone);
  if (!normalizedPhone) return false;

  const alertMsg = `🔔 *Fee Reminder - mykard Academy* 🏫\n\nHello Mr./Mrs. ${student.parentName || 'Parent'},\nThis is a friendly reminder that the school fees for your child *${student.name}* (${student.grade}) has a remaining balance of *₹${remaining.toLocaleString()}*.\n\n📅 *Due Date:* ${dueDate}\n\nPlease settle the dues at your earliest convenience. Thank you!`;

  if (PROVIDER === 'twilio' && twilioClient) {
    try {
      const payload = {
        from: TWILIO_FROM,
        to: `whatsapp:+${normalizedPhone}`,
        body: alertMsg
      };

      await twilioClient.messages.create(payload);
      console.log(`📩  Twilio WhatsApp fee reminder sent to +${normalizedPhone} for student ${student.name}`);
      return true;
    } catch (err) {
      console.error(`❌  Failed to send Twilio fee reminder to +${normalizedPhone}:`, err.message);
      return false;
    }
  } else if (PROVIDER === 'webjs' && isBotReady) {
    const recipientId = `${normalizedPhone}@c.us`;
    try {
      await client.sendMessage(recipientId, alertMsg);
      console.log(`📩  WebJS WhatsApp fee reminder sent to +${normalizedPhone} for student ${student.name}`);
      return true;
    } catch (err) {
      console.error(`❌  Failed to send WebJS fee reminder to +${normalizedPhone}:`, err.message);
      return false;
    }
  }
  return false;
}


// ==========================================
// 3. WHATSAPP WEB CLIENT SETUP (webjs mode)
// ==========================================
let client = null;
let isBotReady = false;

if (PROVIDER === 'webjs') {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  let puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  };

  // macOS standard Chrome binary path integration (bypasses Gatekeeper bugs)
  if (os.platform() === 'darwin') {
    const macChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macChromePath)) {
      console.log('🍏  [WhatsApp Bot] macOS detected. Loading standard Google Chrome for stable Puppeteer initialization...');
      puppeteerConfig.executablePath = macChromePath;
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: puppeteerConfig
  });

  client.on('qr', (qrCode) => {
    console.log('\n💬  [WhatsApp Bot] Action Required: Scan this QR code with your phone to connect the bot!');
    qrcode.generate(qrCode, { small: true });
  });

  client.on('ready', () => {
    console.log('💬  [WhatsApp Bot] Bot is connected and active! Ready to respond to messages.');
    isBotReady = true;
  });

  client.on('auth_failure', (msg) => {
    console.error('❌  [WhatsApp Bot] Authentication failure:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️  [WhatsApp Bot] Client disconnected:', reason);
    isBotReady = false;
  });

  client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return; // Ignore group chats

    const rawPhone = msg.from.split('@')[0];
    const normalizedSender = normalizePhone(rawPhone);
    
    console.log(`💬  [WhatsApp WebJS Inbox] Message received from +${rawPhone}: "${msg.body}"`);

    try {
      const replyText = await handleIncomingChatbotLogic(normalizedSender, msg.body);
      await msg.reply(replyText);
    } catch (err) {
      console.error('❌  [WhatsApp WebJS Error] Error processing message:', err.message);
      await msg.reply('⚠️ Sorry, there was an issue querying your request. Please try again.');
    }
  });
}


// ==========================================
// 4. TWILIO WEBHOOK ENDPOINT (twilio mode)
// ==========================================

app.post('/api/whatsapp/webhook', async (req, res) => {
  const { From, Body } = req.body;

  if (PROVIDER !== 'twilio' || !twilioClient) {
    return res.status(400).send('Twilio WhatsApp provider is not active on this backend.');
  }

  if (!From || !Body) {
    return res.status(400).send('Missing webhook From or Body variables.');
  }

  // From format is typically "whatsapp:+919876543210"
  const rawPhone = From.replace('whatsapp:', '');
  const normalizedSender = normalizePhone(rawPhone);

  console.log(`💬  [Twilio Webhook Inbox] Message received from +${rawPhone}: "${Body}"`);

  try {
    const replyText = await handleIncomingChatbotLogic(normalizedSender, Body);
    
    // Respond back to parent
    await twilioClient.messages.create({
      from: TWILIO_FROM,
      to: From,
      body: replyText
    });

    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('❌  [Twilio Webhook Error] Error processing message:', error.message);
    res.status(500).send('Error processing incoming SMS webhook.');
  }
});

// Serve static assets from the React frontend build
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/.output/public')));

// Fallback route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/.output/public/index.html'));
});


// ==========================================
// 5. SERVER RUN
// ==========================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Express API Server + WebSockets listening on http://0.0.0.0:${PORT}`);
  
  if (PROVIDER === 'webjs' && client) {
    console.log('🔌  [WhatsApp Bot] Initializing free webjs client...');
    client.initialize().catch(err => {
      console.error('❌  [WhatsApp Bot] Failed to initialize WhatsApp Web client:', err.message);
      console.log('👉  Continuing running backend Express API server independently.');
    });
  }
});
