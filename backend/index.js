require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const dbService = require('./firebaseService');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required to parse URL-encoded bodies from Twilio Webhooks

// ==========================================
// DUAL-MODE WHATSAPP CONFIGURATIONS
// ==========================================
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'webjs';
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

// ==========================================
// 1. HEALTH & CRUD API ENDPOINTS
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    databaseMode: dbService.isMockMode() ? 'mock' : 'live',
    whatsappProvider: PROVIDER,
    timestamp: new Date().toISOString()
  });
});

// Cache to prevent duplicate double scans (cooldown)
const recentScansCache = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// POST: Receive RFID scans from ESP32
app.post('/api/scan', async (req, res) => {
  const deviceToken = req.headers['x-device-token'];
  const secretToken = process.env.DEVICE_SECRET_TOKEN || 'brahmagupta_security_key_2026';
  
  console.log('🔍 [RFID Debug] Headers:', JSON.stringify(req.headers));
  console.log('🔍 [RFID Debug] Received token:', deviceToken);
  console.log('🔍 [RFID Debug] Expected token:', secretToken);

  // Authentication bypassed for demo/presentation
  if (deviceToken && deviceToken !== secretToken) {
    console.log('⚠️ [RFID Scan Event] Warning: X-Device-Token header mismatch, but proceeding anyway.');
  }

  const { rfidUid } = req.body;
  
  if (!rfidUid) {
    return res.status(400).json({ error: 'rfidUid is required' });
  }

  const normalizedUid = rfidUid.trim().replace(/[\s:-]+/g, '').toUpperCase();
  const now = Date.now();

  // Check cooldown cache to ignore duplicate double-scans
  if (recentScansCache.has(normalizedUid)) {
    const lastScanTime = recentScansCache.get(normalizedUid);
    if (now - lastScanTime < COOLDOWN_MS) {
      console.log(`ℹ️   [RFID Scan Event] Cooldown active for Card UID: ${rfidUid}. Duplicate scan ignored.`);
      
      try {
        const student = await dbService.getStudentByRfid(rfidUid);
        if (student) {
          return res.json({
            status: 'success',
            studentName: student.name,
            grade: student.grade,
            timestamp: new Date().toISOString(),
            beepCode: 1,
            cooldownActive: true
          });
        } else {
          return res.status(404).json({ 
            status: 'error', 
            message: `RFID Card (${rfidUid}) not registered. Please register card in dashboard.`,
            beepCode: 3,
            cooldownActive: true
          });
        }
      } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Update cooldown timestamp
  recentScansCache.set(normalizedUid, now);

  console.log(`🏷️  [RFID Scan Event] Scanned Card UID: ${rfidUid}`);

  try {
    const student = await dbService.getStudentByRfid(rfidUid);
    
    if (!student) {
      console.log(`⚠️  [RFID Scan Event] Card UID ${rfidUid} not registered. Logging scan to live feed.`);
      
      // Write a temporary log for this unrecognized scan so the teacher can see it in real-time
      try {
        const unregStudent = {
          id: "unregistered",
          name: "Unregistered Card",
          grade: "Unassigned",
          rfidUid: rfidUid
        };
        await dbService.logAttendance(unregStudent);
      } catch (logErr) {
        console.error("⚠️ Failed to write unrecognized log:", logErr.message);
      }

      return res.status(404).json({ 
        status: 'error', 
        message: `RFID Card (${rfidUid}) not registered. Please register card in dashboard.`,
        beepCode: 3
      });
    }

    // Log check-in
    const attendanceLog = await dbService.logAttendance(student);
    console.log(`✅ [RFID Scan Event] Checked in: ${student.name} (${student.grade}) at ${attendanceLog.timestamp}`);
    
    // Trigger real-time proactive notification to parent
    try {
      sendInstantCheckinNotification(student, attendanceLog.timestamp);
    } catch (err) {
      console.error('⚠️  Failed to send proactive WhatsApp alert:', err.message);
    }

    return res.json({
      status: 'success',
      studentName: student.name,
      grade: student.grade,
      timestamp: attendanceLog.timestamp,
      beepCode: 1
    });
  } catch (error) {
    console.error('❌  [RFID Scan Event] Database error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Student Database CRUD Operations
app.get('/api/students', async (req, res) => {
  try {
    const students = await dbService.getStudents();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
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

app.put('/api/students/:id', async (req, res) => {
  try {
    const updated = await dbService.updateStudent(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await dbService.deleteStudent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
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
app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = await dbService.getLeaves();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leaves', async (req, res) => {
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

app.put('/api/leaves/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await dbService.updateLeaveStatus(req.params.id, status);
    
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
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await dbService.getTeachers();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers', async (req, res) => {
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

app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteTeacher(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payments API endpoints
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await dbService.getPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
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
    let menuMsg = `🏫 *Brahmagupta Academy - Teacher Portal* 👩‍🏫\n`;
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
    return `🏫 *School Contact Details* 🏫\n\n📌 *School:* Brahmagupta Academy\n📍 *Address:* 123 Education Drive, Tech City\n📞 *Office Phone:* +1 (555) 019-2834\n📧 *Email:* info@abacademy.edu\n🕒 *Hours:* 8:00 AM - 3:00 PM\n\n_Reply with *Menu* to return._`;
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

// Proactive instant push alert when student scans RFID card
async function sendInstantCheckinNotification(student, timestamp) {
  const normalizedPhone = normalizePhone(student.parentPhone);
  if (!normalizedPhone) return;

  const timeStr = formatTime(timestamp);
  const alertMsg = `🔔 *Attendance Alert* 🔔\n\nHello Mr./Mrs. ${student.parentName || 'Parent'},\nWe are pleased to inform you that your child *${student.name}* has entered school safely today at *${timeStr}*. 🏫✅`;

  if (PROVIDER === 'twilio' && twilioClient) {
    try {
      const payload = {
        from: TWILIO_FROM,
        to: `whatsapp:+${normalizedPhone}`
      };

      if (process.env.TWILIO_CONTENT_SID) {
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
      console.log(`📩  Proactive Twilio WhatsApp notification sent to +${normalizedPhone} for student ${student.name} ${process.env.TWILIO_CONTENT_SID ? '(using Template)' : ''}`);
    } catch (err) {
      console.error(`❌  Failed to send Twilio alert to +${normalizedPhone}:`, err.message);
    }
  } else if (PROVIDER === 'webjs' && isBotReady) {
    const recipientId = `${normalizedPhone}@c.us`;
    try {
      await client.sendMessage(recipientId, alertMsg);
      console.log(`📩  Proactive WebJS WhatsApp notification sent to +${normalizedPhone} for student ${student.name}`);
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

  const alertMsg = `🔔 *Fee Reminder - Brahmagupta Academy* 🏫\n\nHello Mr./Mrs. ${student.parentName || 'Parent'},\nThis is a friendly reminder that the school fees for your child *${student.name}* (${student.grade}) has a remaining balance of *₹${remaining.toLocaleString()}*.\n\n📅 *Due Date:* ${dueDate}\n\nPlease settle the dues at your earliest convenience. Thank you!`;

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
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


// ==========================================
// 5. SERVER RUN
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Express API Server listening on http://0.0.0.0:${PORT}`);
  
  if (PROVIDER === 'webjs' && client) {
    console.log('🔌  [WhatsApp Bot] Initializing free webjs client...');
    client.initialize().catch(err => {
      console.error('❌  [WhatsApp Bot] Failed to initialize WhatsApp Web client:', err.message);
      console.log('👉  Continuing running backend Express API server independently.');
    });
  }
});
