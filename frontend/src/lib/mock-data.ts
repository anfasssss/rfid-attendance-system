// Mock in-memory databases aligned with local Express & ESP32 hardware database

export type Role = "principal" | "teacher" | "parent";

export interface Student {
  id: string;
  name: string;
  grade: string;
  rfid: string;
  rfidUid?: string;
  parentId: string;
  parentName: string;
  address: string;
  avatar: string;
  feeStatus: "paid" | "outstanding";
  feeDue: number;
}

export interface Teacher {
  id: string;
  name: string;
  grade: string;
  email: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  rfid: string;
  timestamp: string;
  status: "check-in" | "check-out" | "unregistered" | "late";
  gate: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  reason: string;
  dates: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
  timestamp?: string;
}

export interface Transaction {
  id: string;
  studentName: string;
  amount: number;
  date: string;
  method: string;
}

// -------- Seed data (synchronized with real backend/mock_db.json entries) --------

export const students: Student[] = [
  { 
    id: "student_2", 
    name: "sahal", 
    grade: "Grade 8-B", 
    rfid: "2461C901", 
    parentId: "+919656108992", 
    parentName: "Emily Jenkins", 
    address: "House #15, Block B, Greenwoods Avenue, Calicut", 
    avatar: "S", 
    feeStatus: "paid", 
    feeDue: 0 
  },
  { 
    id: "student_1779770480339", 
    name: "anfas", 
    grade: "10 a", 
    rfid: "07 13 88 31", 
    parentId: "+919000000000", 
    parentName: "koya", 
    address: "Penthouse C, City Crest Towers, Cochin", 
    avatar: "A", 
    feeStatus: "outstanding", 
    feeDue: 1200 
  },
  { 
    id: "student_1783074964853", 
    name: "hashif ", 
    grade: "Grade 8-B", 
    rfid: "F1883003", 
    parentId: "+919846229229", 
    parentName: "anfas", 
    address: "", 
    avatar: "H", 
    feeStatus: "outstanding", 
    feeDue: 900 
  }
];

export const teachers: Teacher[] = [
  { id: "t1", name: "Anjali Nair", grade: "Grade 8-B", email: "teacher1@school.edu" }
];

export const attendanceLogs: AttendanceLog[] = [
  { 
    id: "log_1779818155092", 
    studentId: "student_1779770480339", 
    studentName: "anfas", 
    grade: "10 a", 
    rfid: "07 13 88 31", 
    timestamp: "2026-05-26T17:55:55.092Z", 
    status: "check-in", 
    gate: "Gate A" 
  },
  { 
    id: "log_1779818157945", 
    studentId: "student_1783074964853", 
    studentName: "hashif ", 
    grade: "Grade 8-B", 
    rfid: "F1883003", 
    timestamp: "2026-05-26T17:55:57.945Z", 
    status: "check-in", 
    gate: "Gate A" 
  }
];

export const leaves: LeaveRequest[] = [
  { 
    id: "leave_1780988200934", 
    studentId: "student_1779770480339", 
    studentName: "anfas", 
    grade: "10 a", 
    parentName: "koya", 
    reason: "Fever", 
    dates: "Jul 06 – Jul 07", 
    status: "approved", 
    submittedAt: "2026-06-09T06:56:40.934Z" 
  }
];

export const transactions: Transaction[] = [
  { id: "tx1", studentName: "sahal", amount: 12000, date: "Jul 01", method: "UPI" }
];

export const feesSummary = {
  collected: 12000,
  outstanding: 2100,
  target: 14100,
};

// Preset credentials mapping directly to registered database IDs & parent phones
export const presetAccounts = [
  { role: "principal" as Role, username: "principal", password: "admin123", label: "Principal", name: "Dr. R. Krishnan" },
  { role: "teacher" as Role, username: "anjali.nair", password: "teach123", label: "Teacher", name: "Anjali Nair", grade: "Grade 8-B" },
  { role: "parent" as Role, username: "emily.jenkins", password: "parent123", label: "Parent", name: "Emily Jenkins", parentId: "+919656108992" },
];