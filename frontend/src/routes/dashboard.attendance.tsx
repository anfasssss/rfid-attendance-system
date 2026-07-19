import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAttendanceLogs, fetchParentStudents, fetchStudents } from "@/lib/api";
import type { AttendanceLog, Student } from "@/lib/mock-data";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/attendance")({ component: AttendancePage });

function AttendancePage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [kids, setKids] = useState<Student[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>(
    session?.role === "teacher" ? session.grade ?? "all" : "all",
  );
  const [childFilter, setChildFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchAttendanceLogs().then((fetchedLogs) => {
      setLogs(fetchedLogs);
      // Fetch all students to match logs
      fetchStudents().then((allStudents) => {
        setStudents(allStudents);
        
        // Populate initial toggles based on logs
        const initialMap: Record<string, 'present' | 'absent' | 'late'> = {};
        allStudents.forEach((student) => {
          const studentLogs = fetchedLogs.filter(l => l.studentId === student.id);
          const hasCheckIn = studentLogs.some(l => l.status === 'check-in');
          const hasLate = studentLogs.some(l => l.status === 'late');
          if (hasLate) {
            initialMap[student.id] = 'late';
          } else if (hasCheckIn) {
            initialMap[student.id] = 'present';
          } else {
            initialMap[student.id] = 'absent';
          }
        });
        setAttendanceMap(initialMap);
      });
    });

    if (session?.role === "parent" && session?.parentId) {
      fetchParentStudents(session.parentId).then(setKids);
    }

    // Connect to WebSockets
    const wsUrl = `ws://${window.location.hostname}:5001`;
    console.log(`🔌 [WS Client] Connecting to ${wsUrl}...`);
    
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("⚠️ [WS Client] Connection failed:", err);
    }

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'attendance_update') {
            console.log("🔥 [WS Client] Received attendance update:", message.data);
            setLogs((prevLogs) => {
              const filtered = prevLogs.filter(l => l.id !== message.data.id);
              return [message.data, ...filtered];
            });
          }
        } catch (err) {
          console.error("❌ [WS Client] Failed parsing WS message:", err);
        }
      };
    }

    return () => {
      if (ws) ws.close();
    };
  }, [session]);

  const isParent = session?.role === "parent";

  // Filter logs
  const filtered = logs.filter((l) => {
    // Parent security filter: only show logs for parent's children
    if (isParent) {
      const parentKidsIds = kids.map((k) => k.id);
      if (!parentKidsIds.includes(l.studentId)) return false;
      if (childFilter !== "all" && l.studentId !== childFilter) return false;
    } else {
      // Non-parent standard filter
      if (gradeFilter !== "all" && l.grade !== gradeFilter) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && l.status !== statusFilter) return false;

    // Date filter (Calendar selected date check)
    if (selectedDate) {
      const logDate = new Date(l.timestamp);
      if (
        logDate.getDate() !== selectedDate.getDate() ||
        logDate.getMonth() !== selectedDate.getMonth() ||
        logDate.getFullYear() !== selectedDate.getFullYear()
      ) {
        return false;
      }
    }
    
    return true;
  });

  if (isParent) {
    const parentFirstName = session?.name.split(" ")[0] || "Parent";
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Aggregate children status details
    const kidNames = kids.map(k => k.name).join(", ") || "Your Children";
    const totalPresent = kids.filter(k => logs.some(l => l.studentId === k.id && (l.status === 'check-in' || l.status === 'late'))).length;
    const latestLog = filtered.length > 0 ? filtered[0] : null;
    const latestTime = latestLog ? new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—:—";
    const latestGate = latestLog ? `${latestLog.gate || 'RFID Terminal'}` : "None today";

    return (
      <div className="min-h-screen w-screen text-slate-800 flex justify-center relative font-sans bg-cover bg-center pb-28" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
        <div className="w-full max-w-md flex flex-col relative z-10">
          
          {/* Top Header section */}
          <header className="px-6 pt-6 pb-2 flex justify-between items-start relative">
            {/* Back Home navigation button */}
            <Link 
              to="/dashboard"
              className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(240,244,255,0.8)] cursor-pointer hover:bg-slate-50 relative"
              title="Back to Home"
            >
              <span className="material-symbols-outlined text-[#0E1630] text-[20px]">arrow_back</span>
            </Link>

            {/* Title / School Header */}
            <div className="text-right">
              <span className="text-[12px] font-black uppercase tracking-wide text-[#0E1630] block leading-none">
                Attendance Log
              </span>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
                St. Mary's Public School
              </span>
            </div>
          </header>

          {/* Main Body */}
          <main className="px-6 flex-grow space-y-6 mt-4">
            
            {/* Calendar Widget Container */}
            <div className="bg-white border border-[#4D69D6]/20 rounded-[32px] p-6 shadow-[0_12px_32px_rgba(77,105,214,0.06)] space-y-5 text-slate-800">
              
              {/* Month Title Header */}
              <div className="text-center text-[16px] font-black text-[#4F54C4] tracking-wide uppercase">
                JULY 2026
              </div>

              {/* Weekday Letters */}
              <div className="grid grid-cols-7 text-center text-[11px] font-extrabold border-b border-slate-100 pb-2 text-slate-400">
                <span className="text-[#E53935]">S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-y-3 text-center text-sm font-bold text-slate-800">
                {/* Offset empty slots */}
                <span></span>
                <span></span>
                <span></span>

                {/* Days 1 to 31 */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isSelected = day === 10;
                  const hasDot = day <= 11 && day !== 5 && day !== 12;
                  const isSunday = [5, 12, 19, 26].includes(day);
                  const isAbsent = day === 8;

                  return (
                    <div key={day} className="flex flex-col items-center justify-center py-0.5">
                      <div className={`w-8 h-8 flex items-center justify-center text-sm font-extrabold rounded-full transition-all ${
                        isSelected 
                          ? "bg-[#4F54C4] text-white shadow-[0_4px_12px_rgba(79,84,196,0.3)]" 
                          : isSunday ? "text-[#E53935]" : "text-slate-800"
                      }`}>
                        {day}
                      </div>
                      {hasDot && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          isAbsent ? "bg-rose-500" : "bg-emerald-500"
                        }`}></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Present Detail Badge */}
            <div className="bg-[#F6F9FF] border border-slate-100 rounded-2xl p-4 text-center space-y-1 shadow-inner max-w-xs mx-auto">
              <div className="text-emerald-600 text-[15px] font-extrabold uppercase tracking-wide">
                Present
              </div>
              <div className="text-slate-650 text-[12px] font-bold">
                Entry Time : 9:45 AM
              </div>
            </div>

            {/* Stats Summary cards */}
            <div className="flex gap-4 justify-center pt-2">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-2xl w-[110px] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">Present</span>
                <span className="text-[26px] font-black leading-none mt-1 text-emerald-600">7</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl w-[110px] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">Absent</span>
                <span className="text-[26px] font-black leading-none mt-1 text-rose-600">1</span>
              </div>
            </div>

            {/* Leave Applying Buttons */}
            <div className="flex gap-3 justify-center pt-4 px-2 max-w-sm mx-auto">
              <Link 
                to="/dashboard/request-leave" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-[#4F54C4] text-white font-extrabold text-[11px] uppercase py-3 rounded-xl text-center shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">file_edit</span>
                <span>Apply Leave</span>
              </Link>
              <Link 
                to="/dashboard/request-leave" 
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase py-3 rounded-xl text-center shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">history</span>
                <span>Leave Status</span>
              </Link>
            </div>

          </main>

          {/* Centered responsive Bottom Navigation */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-45 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(240,244,255,0.6)] rounded-t-[28px] overflow-hidden">
            <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center pb-6">
              {/* Link 1: Home */}
              <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-slate-600 transition-colors" to="/dashboard">
                <span className="material-symbols-outlined text-[24px]">home</span>
                <span className="text-[10px] font-bold tracking-tight">Home</span>
              </Link>

              {/* Link 2: Attendance */}
              <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-[#4F54C4] font-bold transition-all relative" to="/dashboard/attendance">
                <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                <span className="text-[10px] font-bold tracking-tight">Attendance</span>
                {/* Indicator bar */}
                <span className="absolute -bottom-2 w-5 h-1 bg-[#4F54C4] rounded-full"></span>
              </Link>

              {/* Link 3: Profile */}
              <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-[#4F54C4] transition-colors" to="/dashboard/account">
                <span className="material-symbols-outlined text-[24px]">person</span>
                <span className="text-[10px] font-bold tracking-tight">Profile</span>
              </Link>
            </div>
          </nav>

        </div>
      </div>
    );
  }

  // --- NON-PARENT INTERACTIVE VIEW (TEACHER & PRINCIPAL) ---
  const activeGrade = session?.role === "teacher" ? (session.grade ?? "8-B") : gradeFilter;
  const classStudents = activeGrade === "all" ? students : students.filter(s => s.grade === activeGrade);
  
  // Calculate stats
  const totalStudents = classStudents.length;
  const presentCount = classStudents.filter(s => attendanceMap[s.id] === 'present').length;
  const lateCount = classStudents.filter(s => attendanceMap[s.id] === 'late').length;
  const absentCount = classStudents.filter(s => attendanceMap[s.id] === 'absent').length;
  const presentPct = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 100;

  const cycleStatus = (studentId: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || 'absent';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const displayedStudents = classStudents.filter((student) => {
    if (statusFilter === "all") return true;
    const currentStatus = attendanceMap[student.id] || "absent";
    return currentStatus === statusFilter;
  });

  return (
    <div className="text-on-background min-h-screen pb-40 bg-[#F8FAFC] font-sans">
      <style>{`
        .premium-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .student-photo-wrapper {
          background: linear-gradient(45deg, #e0e7ff 0%, #ffffff 100%);
          padding: 2px;
        }
      `}</style>

      <main className="max-w-xl mx-auto px-6 pt-8 space-y-10">
        {/* Breadcrumb & Title Section */}
        <section className="space-y-3">
          <nav className="flex items-center gap-2 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">Academics</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Attendance</span>
          </nav>
          <h2 className="font-serif text-[28px] sm:text-[42px] leading-tight text-slate-900 font-extrabold">
            {activeGrade === "all" ? "All Classes" : `Class ${activeGrade}`} Attendance
          </h2>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
            <p className="text-[15px] text-slate-500 font-light leading-relaxed">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • <span className="font-semibold text-[#0058be]">Morning Session</span>
            </p>
            {session?.role === "principal" && (
              <div className="relative">
                <Select value={gradeFilter} onValueChange={(val) => setGradeFilter(val)}>
                  <SelectTrigger className="w-[140px] bg-white rounded-xl border-slate-200 text-xs font-bold shadow-xs">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Classes</SelectItem>
                    {Array.from(new Set(students.map(s => s.grade))).map((g) => (
                      <SelectItem key={g} value={g ?? "all"}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="premium-card p-4 rounded-2xl bg-[#E6F4EA]/60 border-[#CEEAD6] flex flex-col justify-between min-h-[100px]">
            <p className="text-[#137333] uppercase text-[9px] tracking-wider font-extrabold opacity-80">Today's Attendance</p>
            <div>
              <p className="font-serif text-[28px] text-[#137333] font-extrabold leading-none">{presentPct}%</p>
              <p className="text-[10px] text-[#137333]/80 font-medium mt-1.5">{presentCount + lateCount} active check-ins</p>
            </div>
          </div>
          <div className="premium-card p-4 rounded-2xl bg-[#FCE8E6]/60 border-[#FAD2CF] flex flex-col justify-between min-h-[100px]">
            <p className="text-[#C5221F] uppercase text-[9px] tracking-wider font-extrabold opacity-80">Absences</p>
            <div>
              <p className="font-serif text-[28px] text-[#C5221F] font-extrabold leading-none">{absentCount}</p>
              <p className="text-[10px] text-[#C5221F]/80 font-medium mt-1.5">not present today</p>
            </div>
          </div>
          <div className="premium-card p-4 rounded-2xl bg-[#FEF7E0]/60 border-[#FDE293] flex flex-col justify-between min-h-[100px]">
            <p className="text-[#B06000] uppercase text-[9px] tracking-wider font-extrabold opacity-80">Tardies</p>
            <div>
              <p className="font-serif text-[28px] text-[#B06000] font-extrabold leading-none">{lateCount}</p>
              <p className="text-[10px] text-[#B06000]/80 font-medium mt-1.5">late entries</p>
            </div>
          </div>
          <div className="premium-card p-4 rounded-2xl bg-[#E8F0FE]/60 border-[#D2E3FC] flex flex-col justify-between min-h-[100px]">
            <p className="text-[#1A73E8] uppercase text-[9px] tracking-wider font-extrabold opacity-80">Students</p>
            <div>
              <p className="font-serif text-[28px] text-[#1A73E8] font-extrabold leading-none">{totalStudents}</p>
              <p className="text-[10px] text-[#1A73E8]/80 font-medium mt-1.5">total class size</p>
            </div>
          </div>
        </section>

        {/* RFID Status Banner */}
        <div className="premium-card p-4 rounded-2xl bg-white flex items-center gap-3 shadow-xs">
          <span className="live-dot"></span>
          <div className="flex-grow">
            <p className="text-slate-800 font-semibold text-[13px]">RFID Scanners Live: Entrance 04 & Library</p>
            <p className="text-slate-450 text-[11px] font-medium">Last sync: 2 mins ago</p>
          </div>
          <span className="material-symbols-outlined text-emerald-500">sensors</span>
        </div>

        {/* Student List */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Student Roster</h3>
                <p className="text-[10px] text-slate-400 font-medium">💡 Tap on the status badge to cycle status</p>
              </div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">Alphabetical</span>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 pb-1 overflow-x-auto select-none no-scrollbar">
              {(["all", "present", "absent", "late"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                    statusFilter === status
                      ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-55"
                  }`}
                >
                  {status === "all" ? "All" : status === "present" ? "Present" : status === "absent" ? "Absent" : "Tardies"}
                </button>
              ))}
            </div>
          </div>

          {/* Student Cards */}
          <div className="space-y-3">
            {displayedStudents.map((student, idx) => {
              const currentStatus = attendanceMap[student.id] || 'absent';
              const rollNum = String(idx + 1).padStart(2, '0');
              const initials = student.name.split(" ").map(n => n[0]).join("").toUpperCase();

              return (
                <div key={student.id} className="premium-card p-4 rounded-2xl bg-white shadow-xs flex items-center justify-between gap-4 transition-all duration-250">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-slate-700 bg-indigo-50/50 border border-slate-100 font-serif text-sm">
                        {initials}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-xs">
                        {rollNum}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-[15px] font-bold text-slate-800 leading-snug truncate">{student.name}</h4>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold flex flex-wrap items-center gap-1.5 mt-0.5">
                        {activeGrade === "all" && (
                          <span className="text-[#0058be] bg-[#0058be]/10 px-1.5 py-0.2 rounded-md font-bold text-[9px] lowercase first-letter:uppercase">grade {student.grade}</span>
                        )}
                        <span>Tag: <span className="font-mono">{student.rfidUid || "992-881"}</span></span>
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Status Badge (Click to Cycle Status) */}
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => cycleStatus(student.id)}
                      className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
                        currentStatus === 'present'
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                          : currentStatus === 'absent'
                            ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                            : 'bg-[#FEF7E0] text-[#B06000] border-[#FDE293]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{currentStatus}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {displayedStudents.length === 0 && (
              <p className="text-center py-20 text-slate-400 text-sm">No students found matching your filters.</p>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}