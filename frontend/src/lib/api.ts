// HTTP fetch stubs. Point BASE_URL to your Node/Express + ESP32 backend.
// Each function tries the real endpoint first and falls back to mock data
// so the UI stays functional in preview.

import {
  students,
  teachers,
  attendanceLogs,
  leaves,
  transactions,
  feesSummary,
  presetAccounts,
  type Role,
  type LeaveRequest,
  type Student,
  type AttendanceLog,
} from "./mock-data";

const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

export const BASE_URL = isCapacitor
  ? "http://192.168.30.10:5001/api"
  : typeof window !== "undefined" && (window as any).__BRAHMAGUPTA_API__
    ? (window as any).__BRAHMAGUPTA_API__
    : import.meta.env.PROD
      ? typeof window !== "undefined"
        ? `${window.location.origin}/api`
        : "/api"
      : typeof window !== "undefined"
        ? `http://${window.location.hostname}:5001/api`
        : "http://localhost:5001/api";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("brahmagupta.auth_token");
    } catch {
      return null;
    }
  }
  return null;
}

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem("brahmagupta.auth_token", token);
      } else {
        localStorage.removeItem("brahmagupta.auth_token");
      }
    } catch {}
  }
}

async function tryFetch<T>(path: string, init?: RequestInit & { timeout?: number }): Promise<T | null> {
  const timeoutMs = init?.timeout ?? 400; // Default 400ms for instant fallback
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// --- Schema Mappers to connect Lovable types with ESP32 Backend database ---
function mapStudent(s: any): Student {
  return {
    id: s.id,
    name: s.name,
    grade: s.grade,
    rfid: s.rfidUid || s.rfid || "",
    parentId: s.parentPhone || "p1",
    parentName: s.parentName || "",
    address: s.address || "",
    avatar: s.name ? s.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "S",
    feeStatus: s.feeStatus || "paid",
    feeDue: s.feeDue || 0
  };
}

function mapLog(l: any): AttendanceLog {
  return {
    id: l.id,
    studentId: l.studentId,
    studentName: l.studentName,
    grade: l.grade,
    rfid: l.rfidUid || l.rfid || "",
    timestamp: l.timestamp,
    status: (l.status || "check-in") as any,
    gate: l.gate || "Gate A"
  };
}

function mapLeave(lv: any): LeaveRequest {
  return {
    id: lv.id,
    studentId: lv.studentId,
    studentName: lv.studentName,
    grade: lv.grade,
    parentName: lv.parentName || "Parent",
    reason: lv.reason,
    dates: lv.dates || lv.dateStr || "",
    status: (lv.status ? lv.status.toLowerCase() : "pending") as any,
    submittedAt: lv.submittedAt || lv.timestamp
  };
}

// --- Auth ---
export async function loginRequest(role: Role, username: string, phone: string, otp: string): Promise<{ ok: boolean; user: any; token?: string; setupRequired?: boolean }> {
  const remote = await tryFetch<{ ok: boolean; user: any; token?: string; setupRequired?: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ role, username, phone, otp }),
    timeout: 3000,
  });
  if (remote?.ok) {
    if (remote.token) {
      setAuthToken(remote.token);
    }
    return remote;
  }

  // Offline / Mock fallback
  const preset = presetAccounts.find((p) => p.role === role);
  if (preset) {
    return {
      ok: true,
      token: "mock-jwt-token",
      user: {
        role: preset.role,
        name: preset.role === "parent" ? "Emily Jenkins" : preset.role === "teacher" ? "Anjali Nair" : "Halo, Admin",
        username: preset.username,
        schoolId: "school_101"
      }
    };
  }
  throw new Error("Invalid credentials");
}

// --- Reads ---
export async function fetchStudents() {
  const remote = await tryFetch<any[]>("/students");
  if (remote) return remote.map(mapStudent);
  return students;
}

export async function fetchAttendanceLogs() {
  const remote = await tryFetch<any[]>("/logs");
  if (remote) return remote.map(mapLog);
  return attendanceLogs;
}

export async function fetchLeaves() {
  const remote = await tryFetch<any[]>("/leaves");
  if (remote) return remote.map(mapLeave);
  return leaves;
}

export async function fetchTransactions() {
  const remote = await tryFetch<any[]>("/payments");
  if (remote) {
    return remote.map((p, idx) => ({
      id: p.id || `tx-${idx}`,
      studentName: p.studentName || `Student ID: ${p.studentId}`,
      amount: p.amount,
      date: new Date(p.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      method: "UPI"
    }));
  }
  return transactions;
}

export async function fetchFeesSummary() {
  const remote = await tryFetch<any>("/fees/summary");
  if (remote) return remote;
  return feesSummary;
}

export async function fetchTeachers() {
  const remote = await tryFetch<any[]>("/teachers");
  if (remote) return remote;
  return teachers;
}

export async function fetchParentStudents(parentId: string) {
  // Check if parentId is active phone
  const phoneParam = parentId.startsWith("+") ? parentId : "+919656108992";
  const remote = await tryFetch<{ students: any[] }>(`/parents/students?phone=${encodeURIComponent(phoneParam)}`);
  if (remote && remote.students) {
    return remote.students.map(mapStudent);
  }
  return students.filter((s) => s.parentId === parentId);
}

// --- Writes ---
export async function submitLeaveRequest(payload: Omit<LeaveRequest, "id" | "status" | "submittedAt">) {
  const backendPayload = {
    studentId: payload.studentId,
    reason: payload.reason,
    status: "Approved"
  };
  
  const remote = await tryFetch<any>("/leaves", {
    method: "POST",
    body: JSON.stringify(backendPayload),
  });
  
  const local: LeaveRequest = remote ? mapLeave(remote) : {
    ...payload,
    id: `lv${Date.now()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  
  leaves.unshift(local);
  return local;
}

export async function resolveLeave(id: string, status: "approved" | "denied") {
  const capStatus = status.charAt(0).toUpperCase() + status.slice(1); // Approved / Denied
  const remote = await tryFetch<any>(`/leaves/${id}`, { 
    method: "PUT", 
    body: JSON.stringify({ status: capStatus }) 
  });
  
  const updated = remote ? mapLeave(remote) : null;
  const l = leaves.find((x) => x.id === id);
  if (l) l.status = status;
  return updated || l;
}

export async function fetchSystemStatus(schoolId?: string) {
  const path = schoolId ? `/system-status?schoolId=${encodeURIComponent(schoolId)}` : "/system-status";
  const remote = await tryFetch<any>(path);
  return remote;
}

export async function updateStudentRfid(id: string, rfidUid: string) {
  const remote = await tryFetch<any>(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify({ rfidUid })
  });
  return remote;
}

export async function fetchParentNotifications(parentId: string) {
  const phoneParam = parentId.startsWith("+") ? parentId : "+919656108992";
  const remote = await tryFetch<{ notifications: any[] }>(`/parents/students?phone=${encodeURIComponent(phoneParam)}`);
  if (remote && remote.notifications) {
    return remote.notifications;
  }
  return [];
}

export async function createSchoolBranding(school: {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
}) {
  const remote = await tryFetch<any>("/schools", {
    method: "POST",
    body: JSON.stringify(school),
    timeout: 5000,
  });
  return remote;
}

export async function uploadSchoolRoster(schoolId: string, studentsList: any[], staffList: any[]) {
  const remote = await tryFetch<any>("/admin/onboard-excel", {
    method: "POST",
    body: JSON.stringify({ schoolId, studentsList, staffList }),
    timeout: 10000,
  });
  return remote;
}

export async function setupCustomPassword(userId: string, password: string, otp: string) {
  const remote = await tryFetch<any>("/auth/setup-password", {
    method: "POST",
    body: JSON.stringify({ userId, password, otp }),
    timeout: 5000,
  });
  return remote;
}