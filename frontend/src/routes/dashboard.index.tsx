import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  fetchAttendanceLogs,
  fetchLeaves,
  fetchParentStudents,
  fetchStudents,
  fetchParentNotifications,
} from "@/lib/api";
import type { AttendanceLog, LeaveRequest, Student } from "@/lib/mock-data";
import {
  Clock,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Overview() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [kids, setKids] = useState<Student[]>([]);
  const [parentNotifs, setParentNotifs] = useState<any[]>([]);

  // Parent dashboard modal states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(10);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDueModal, setShowDueModal] = useState(false);
  const [uniformPaid, setUniformPaid] = useState(false);

  // Static mock logs for calendar visualization
  const julyLogs: Record<number, { status: string; time: string }> = {
    1: { status: "Present", time: "9:15 AM" },
    2: { status: "Present", time: "9:20 AM" },
    3: { status: "Present", time: "9:30 AM" },
    4: { status: "Present", time: "9:10 AM" },
    6: { status: "Present", time: "9:25 AM" },
    7: { status: "Present", time: "9:15 AM" },
    8: { status: "Absent", time: "—:—" },
    9: { status: "Present", time: "9:40 AM" },
    10: { status: "Present", time: "9:45 AM" },
    11: { status: "Present", time: "9:22 AM" }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const renderCalendarModal = () => {
    if (!showCalendarModal) return null;
    const monthsList = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    const baseMonthIndex = 6; // July
    const baseYear = 2026;
    let targetMonthIndex = (baseMonthIndex + calendarMonthOffset) % 12;
    if (targetMonthIndex < 0) targetMonthIndex += 12;
    const targetYear = baseYear + Math.floor((baseMonthIndex + calendarMonthOffset) / 12);
    const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const startDayOfWeek = new Date(targetYear, targetMonthIndex, 1).getDay();

    const getLogForDay = (day: number) => {
      if (calendarMonthOffset === 0) return julyLogs[day] || null;
      const dayOfWeek = new Date(targetYear, targetMonthIndex, day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return null; // Weekend
      if (day % 9 === 0) return { status: "Absent", time: "—:—" };
      const minutes = 10 + ((day * 3) % 45);
      return {
        status: "Present",
        time: `9:${minutes < 10 ? "0" + minutes : minutes} AM`
      };
    };

    let totalPresent = 0;
    let totalAbsent = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const log = getLogForDay(d);
      if (log) {
        if (log.status === "Present") totalPresent++;
        if (log.status === "Absent") totalAbsent++;
      }
    }

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-[#4D69D6]/20 rounded-[32px] p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-[0_12px_32px_rgba(77,105,214,0.12)] relative space-y-5 text-slate-800 animate-in zoom-in-95 duration-200">
          
          {/* Close X */}
          <button 
            type="button"
            onClick={() => setShowCalendarModal(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-550 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200 cursor-pointer shadow-xs active:translate-y-[1px] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          {/* Month Heading */}
          <div className="flex items-center justify-between px-2 pt-2">
            <button 
              type="button"
              onClick={() => {
                setCalendarMonthOffset(prev => prev - 1);
                setSelectedCalendarDay(1);
              }}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <div className="text-center text-[16px] font-black text-[#4F54C4] tracking-wide uppercase">
              {monthsList[targetMonthIndex]} {targetYear}
            </div>

            <button 
              type="button"
              onClick={() => {
                setCalendarMonthOffset(prev => prev + 1);
                setSelectedCalendarDay(1);
              }}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center text-[11px] font-extrabold border-b border-slate-100 pb-2 text-slate-400">
            <span className="text-[#E53935]">S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span className="text-[#E53935]">S</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-3 text-center text-sm font-bold text-slate-800">
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <span key={`empty-${idx}`}></span>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected = selectedCalendarDay === day;
              const log = getLogForDay(day);
              const isSunday = new Date(targetYear, targetMonthIndex, day).getDay() === 0;

              return (
                <button 
                  key={day}
                  type="button"
                  onClick={() => setSelectedCalendarDay(day)}
                  className="flex flex-col items-center justify-center py-0.5 relative group cursor-pointer focus:outline-none"
                >
                  <div className={`w-8 h-8 flex flex-col items-center justify-center text-sm font-extrabold rounded-full transition-all ${
                    isSelected 
                      ? "bg-[#4F54C4] text-white font-black shadow-[0_4px_12px_rgba(79,84,196,0.3)]" 
                      : isSunday ? "text-[#E53935] hover:bg-slate-50" : "text-slate-800 hover:bg-slate-50"
                  }`}>
                    {day}
                  </div>
                  {log && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      log.status === "Present" ? "bg-emerald-500" : "bg-rose-500"
                    }`}></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day Status Card */}
          <div className="bg-[#F6F9FF] border border-slate-100 rounded-2xl p-4 text-center space-y-1 shadow-inner">
            {(() => {
              const log = getLogForDay(selectedCalendarDay);
              const dayOfWeek = new Date(targetYear, targetMonthIndex, selectedCalendarDay).getDay();
              if (dayOfWeek === 0 || dayOfWeek === 6) {
                return (
                  <>
                    <div className="text-slate-550 text-[15px] font-extrabold uppercase tracking-wide">Weekend</div>
                    <div className="text-slate-400 text-[12px] font-bold">No school class</div>
                  </>
                );
              }
              if (log) {
                return (
                  <>
                    <div className={`text-[15px] font-extrabold uppercase tracking-wide ${
                      log.status === "Present" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {log.status}
                    </div>
                    <div className="text-slate-650 text-[12px] font-bold">
                      {log.status === "Present" ? `Entry Time : ${log.time}` : "Entry Time : —:—"}
                    </div>
                  </>
                );
              }
              return (
                <>
                  <div className="text-slate-400 text-[15px] font-extrabold uppercase tracking-wide">No Record</div>
                  <div className="text-slate-400 text-[12px] font-bold">Entry Time : —:—</div>
                </>
              );
            })()}
          </div>

          {/* Summary Badges */}
          <div className="flex gap-4 justify-center pt-2">
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-2xl w-[110px] flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">Present</span>
              <span className="text-[26px] font-black leading-none mt-1 text-emerald-600">{totalPresent}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl w-[110px] flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">Absent</span>
              <span className="text-[26px] font-black leading-none mt-1 text-rose-600">{totalAbsent}</span>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderContactModal = () => {
    if (!showContactModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-[#4D69D6]/20 rounded-[32px] p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-[0_12px_32px_rgba(77,105,214,0.12)] relative space-y-6 text-slate-800 animate-in zoom-in-95 duration-200">
          
          {/* Close button X */}
          <button 
            type="button"
            onClick={() => setShowContactModal(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200 cursor-pointer shadow-xs active:translate-y-[1px] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          {/* Title */}
          <div className="text-center pb-2 border-b border-slate-100">
            <span className="text-[18px] font-black uppercase tracking-wider text-[#4F54C4]">
              SCHOOL HELPDESK
            </span>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              St. Mary's Public School
            </div>
          </div>

          {/* Contact details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#4F54C4] mt-0.5">call</span>
              <div>
                <div className="text-[11px] text-slate-400 font-extrabold uppercase">Phone Number</div>
                <a href="tel:+914842345678" className="text-sm font-bold text-slate-850 hover:underline">
                  +91 484 234 5678
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#4F54C4] mt-0.5">mail</span>
              <div>
                <div className="text-[11px] text-slate-400 font-extrabold uppercase">Email Address</div>
                <a href="mailto:info@stmarysschool.edu" className="text-sm font-bold text-slate-850 hover:underline">
                  info@stmarysschool.edu
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#4F54C4] mt-0.5">location_on</span>
              <div>
                <div className="text-[11px] text-slate-400 font-extrabold uppercase">Campus Address</div>
                <p className="text-sm font-bold text-slate-800">
                  St. Mary's Campus, Ernakulam,<br />
                  Kerala, India - 682011
                </p>
              </div>
            </div>
          </div>

          {/* Direct CTA Buttons */}
          <div className="flex gap-4 pt-2">
            <a 
              href="tel:+914842345678"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-[12px] uppercase py-3 rounded-2xl text-center shadow-md active:scale-[0.98] transition-all"
            >
              Call School
            </a>
            <a 
              href="mailto:info@stmarysschool.edu"
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-extrabold text-[12px] uppercase py-3 rounded-2xl text-center shadow-md active:scale-[0.98] transition-all"
            >
              Email Us
            </a>
          </div>

        </div>
      </div>
    );
  };

  const renderDueModal = () => {
    if (!showDueModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-[#4D69D6]/20 rounded-[32px] p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-[0_12px_32px_rgba(77,105,214,0.12)] relative space-y-5 text-slate-800 animate-in zoom-in-95 duration-200">
          
          {/* Close button X */}
          <button 
            type="button"
            onClick={() => setShowDueModal(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200 cursor-pointer shadow-xs active:translate-y-[1px] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          {/* Title */}
          <div className="text-center pb-2 border-b border-slate-100">
            <span className="text-[18px] font-black uppercase tracking-wider text-[#4F54C4]">
              FEES & DUES
            </span>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              St. Mary's Public School
            </div>
          </div>

          {/* List of Fees items */}
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-[12px] text-slate-800">Academic Tuition Fee</p>
                <p className="text-[10px] text-slate-400 font-bold">Term 1 (Yearly)</p>
              </div>
              <span className="text-[11px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Paid
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-[12px] text-slate-800">Transportation Fee</p>
                <p className="text-[10px] text-slate-400 font-bold">July Month Bus</p>
              </div>
              <span className="text-[11px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Paid
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-[12px] text-slate-800">School Uniform & Kit</p>
                <p className="text-[10px] text-slate-400 font-bold">Due Date: 25 July 2026</p>
              </div>
              {uniformPaid ? (
                <span className="text-[11px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 animate-bounce">
                  Paid
                </span>
              ) : (
                <span className="text-[11px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                  ₹3,200
                </span>
              )}
            </div>
          </div>

          {/* Pending Balance Badge */}
          <div className={`border border-slate-100 rounded-2xl p-4 text-center ${
            uniformPaid ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"
          }`}>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-85">Total Pending Balance</p>
            <p className="text-[32px] font-black leading-none mt-1">
              ₹{uniformPaid ? "0" : "3,200"}
            </p>
          </div>

          {/* Action button */}
          {!uniformPaid ? (
            <button 
              type="button"
              onClick={() => {
                setUniformPaid(true);
                toast.success("🎉 Payment of ₹3,200 processed successfully!");
              }}
              className="w-full bg-gradient-to-r from-[#4F54C4] to-[#6366F1] text-white font-extrabold text-[13px] uppercase py-3 rounded-2xl shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Pay Online (₹3,200)
            </button>
          ) : (
            <div className="bg-emerald-600 text-white font-extrabold text-[13px] uppercase py-3 rounded-2xl text-center select-none shadow-sm">
              ✅ All Dues Cleared!
            </div>
          )}

        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchAttendanceLogs().then(setLogs);
    fetchStudents().then(setStudents);
    fetchLeaves().then(setLeaves);
    if (session?.parentId) {
      fetchParentStudents(session.parentId).then(setKids);
      fetchParentNotifications(session.parentId).then(setParentNotifs);
    }

    const wsUrl = `ws://${window.location.hostname}:5001`;
    console.log(`🔌 [WS Overview] Connecting to ${wsUrl}...`);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("⚠️ [WS Overview] Connection failed:", err);
    }

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "attendance_update") {
            console.log("🔥 [WS Overview] Received update event:", message.data);
            setLogs((prevLogs) => {
              const filtered = prevLogs.filter((l) => l.id !== message.data.id);
              return [message.data, ...filtered];
            });
            fetchStudents().then(setStudents);
            fetchLeaves().then(setLeaves);
            if (session?.parentId) fetchParentStudents(session.parentId).then(setKids);
          } else if (message.type === "notification_update") {
            if (session?.role === "parent" && message.data.phone === session.parentId) {
              setParentNotifs((prev) => {
                const filtered = prev.filter((n) => n.id !== message.data.id);
                return [message.data, ...filtered];
              });
            }
          }
        } catch (err) {
          console.error("❌ [WS Overview] Failed parsing WS message:", err);
        }
      };
    }

    return () => {
      if (ws) ws.close();
    };
  }, [session]);

  if (!session) return null;

  if (session.role === "principal") {
    const checkedIn = logs.filter((l) => l.status === "check-in" || l.status === "late").length;
    const alerts = logs.filter((l) => l.status === "unregistered").length + leaves.filter((l) => l.status === "pending").length;
    const checkedInRate = Math.round((checkedIn / (students.length || 1)) * 100);

    return (
      <div className="space-y-8 pb-12 text-slate-800 font-sans">
        <section className="space-y-4">
          <div>
            <h1 className="font-serif text-[28px] sm:text-[42px] leading-tight text-slate-900 font-extrabold">Hi, Admin</h1>
            <p className="text-sm sm:text-base text-slate-500 font-light leading-relaxed">
              Oversight and configuration control center of the campus connected RFID networks.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="bg-[#0058be]/10 text-[#0058be] px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 border border-[#0058be]/5">
              <span className="material-symbols-outlined !text-[16px]">calendar_today</span>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <span className="bg-emerald-50 text-emerald-600 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 border border-emerald-100">
              <span className="material-symbols-outlined !text-[16px] animate-pulse">sensors</span>
              RFID Network Live
            </span>
          </div>
        </section>

        {/* Quick Statistics Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setShowCalendarModal(true)}
            className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all active:scale-95 text-left group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#0058be]/5 flex items-center justify-center border border-slate-100 group-hover:bg-[#0058be]/10 transition-colors">
              <span className="material-symbols-outlined text-[#0058be] text-2xl">how_to_reg</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Attendance Rate</span>
              <span className="text-[22px] font-black text-[#0058be] block mt-1">{checkedInRate}%</span>
            </div>
          </button>
          <Link to="/dashboard/leaves" className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all active:scale-95 text-left group">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/5 flex items-center justify-center border border-slate-100 group-hover:bg-rose-500/10 transition-colors">
              <span className="material-symbols-outlined text-rose-600 text-2xl">event_busy</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Active Alerts & Leaves</span>
              <span className="text-[22px] font-black text-rose-600 block mt-1">{alerts} Pending</span>
            </div>
          </Link>
          <div className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all text-left group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-slate-100 group-hover:bg-emerald-500/10 transition-colors">
              <span className="material-symbols-outlined text-emerald-600 text-2xl">router</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Gateway Hardware</span>
              <span className="text-[14px] font-bold text-emerald-650 block mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Online & Stable
              </span>
            </div>
          </div>
        </section>

        {/* Detailed Grid (Activity Feed and Requests) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 premium-card p-6 rounded-3xl bg-white shadow-xs">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Recent Campus Activity</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Live scan signals</p>
              </div>
              <Link to="/dashboard/attendance" className="text-[#0058be] font-bold text-xs hover:underline">View All logs</Link>
            </div>
            <div className="space-y-4">
              {logs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-none last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-[#0058be] border border-slate-100">
                      {log.studentName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{log.studentName}</p>
                      <p className="text-slate-400 text-[11px] font-medium">{log.gate || "RFID Terminal"} · Grade {log.grade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      log.status === "late" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                    }`}>
                      {log.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-slate-400 py-4 text-xs">No scan signals received yet.</p>
              )}
            </div>
          </section>

          <section className="lg:col-span-1 premium-card p-6 rounded-3xl bg-white shadow-xs">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Hardware Status</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">IoT Network Hubs</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">School Wi-Fi</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Stable</span>
              </div>
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">Gate RFID Scanner</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Connected</span>
              </div>
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">Main Gate Lock</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Secured</span>
              </div>
            </div>
          </section>
        </div>
        {renderCalendarModal()}
      </div>
    );
  }

  // --- TEACHER VIEW ---
  if (session.role === "teacher") {
    const grade = session.grade ?? "8-B";
    const classStudents = students.filter((s) => s.grade === grade);
    const classLogs = logs.filter((l) => l.grade === grade);
    const present = classStudents.filter((s) => classLogs.some((l) => l.studentId === s.id && (l.status === "check-in" || l.status === "late"))).length;
    const late = classLogs.filter((l) => l.status === "late").length;
    const absent = Math.max(0, classStudents.length - present);
    const checkedInRate = Math.round((present / (classStudents.length || 1)) * 100);

    return (
      <div className="space-y-8 pb-12 text-slate-800 font-sans">
        <section className="space-y-4">
          <div>
            <h1 className="font-serif text-[28px] sm:text-[42px] leading-tight text-slate-900 font-extrabold">Hi, {session.name.split(" ")[0]} - Class {grade}</h1>
            <p className="text-sm sm:text-base text-slate-500 font-light leading-relaxed">Welcome back to your dashboard. You have 3 pending tasks for today.</p>
          </div>
          <div className="flex gap-2">
            <span className="bg-[#0058be]/10 text-[#0058be] px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 border border-[#0058be]/5">
              <span className="material-symbols-outlined !text-[16px]">calendar_today</span>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <span className="bg-emerald-50 text-emerald-600 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 border border-emerald-100">
              <span className="material-symbols-outlined !text-[16px] animate-pulse">sensors</span>
              RFID Live
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/dashboard/attendance" className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all active:scale-95 text-left group">
            <div className="w-14 h-14 rounded-2xl bg-[#0058be]/5 flex items-center justify-center border border-slate-100 group-hover:bg-[#0058be]/10 transition-colors">
              <span className="material-symbols-outlined text-[#0058be] text-2xl">how_to_reg</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Mark Attendance</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Daily Check-in</span>
            </div>
          </Link>
          <Link to="/dashboard/fees" className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all active:scale-95 text-left group">
            <div className="w-14 h-14 rounded-2xl bg-[#0058be]/5 flex items-center justify-center border border-slate-100 group-hover:bg-[#0058be]/10 transition-colors">
              <span className="material-symbols-outlined text-[#0058be] text-2xl">add_chart</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Add Exam Marks</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Grade Entry</span>
            </div>
          </Link>
          <button onClick={() => toast.info("Curriculum guidelines are locked in demo mode.")} className="premium-card p-6 rounded-3xl bg-white shadow-xs flex items-center gap-5 hover:bg-gray-50 transition-all active:scale-95 text-left group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-[#0058be]/5 flex items-center justify-center border border-slate-100 group-hover:bg-[#0058be]/10 transition-colors">
              <span className="material-symbols-outlined text-[#0058be] text-2xl">menu_book</span>
            </div>
            <div>
              <span className="font-serif text-[18px] font-bold text-slate-900 block tracking-tight">Lesson Plan</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Curriculum</span>
            </div>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 premium-card p-6 rounded-3xl bg-white shadow-xs">
            <div className="mb-6">
              <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Class {grade} Status</h3>
              <p className="text-slate-450 text-xs font-bold uppercase tracking-wider mt-1">Live Attendance Breakdown</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-[12px] border-slate-100 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[12px] border-[#0058be]" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${checkedInRate}%, 0 ${checkedInRate}%)` }}></div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-serif text-[32px] text-slate-900 font-extrabold">{checkedInRate}%</span>
                    <span className="text-slate-450 text-[10px] font-bold uppercase tracking-widest">Present</span>
                  </div>
                </div>
              </div>
              <div className="w-full mt-8 grid grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0058be]" />
                  <span className="text-sm font-bold text-slate-700">Present: {present}</span>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350" />
                  <span className="text-sm font-bold text-slate-700">Absent: {absent}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-6">
            <div className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
              <div className="px-6 py-5 border-b border-gray-100/50 flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Upcoming Schedule</h3>
                <button onClick={() => toast.info("Full timetable is only accessible to admins.")} className="text-[#0058be] font-bold text-xs hover:underline cursor-pointer">Full Timetable</button>
              </div>
              <div className="divide-y divide-gray-100/50">
                <div className="p-6 flex items-center gap-5 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-slate-700">
                    <span className="font-bold text-[18px] leading-none">09</span>
                    <span className="text-[10px] uppercase font-bold opacity-50 mt-1">AM</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-serif text-[17px] font-bold text-slate-900 mb-0.5">Mathematics</h4>
                    <p className="text-slate-500 text-[13px] font-light">Algebraic Expressions · Room 12</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </div>
                <div className="p-6 flex items-center gap-5 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-slate-700">
                    <span className="font-bold text-[18px] leading-none">11</span>
                    <span className="text-[10px] uppercase font-bold opacity-50 mt-1">30</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-serif text-[17px] font-bold text-slate-900 mb-0.5">English</h4>
                    <p className="text-slate-500 text-[13px] font-light">Creative Writing · Room 04</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">Pending Tasks</h3>
            <span className="bg-red-50 text-red-600 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100">3 Priority</span>
          </div>
          <div className="space-y-4">
            <div className="premium-card p-6 rounded-3xl bg-white shadow-xs flex gap-5">
              <div className="w-12 h-12 rounded-2xl bg-[#0058be]/5 flex items-center justify-center shrink-0 border border-slate-100">
                <span className="material-symbols-outlined text-[#0058be]">assignment_turned_in</span>
              </div>
              <div className="flex-grow space-y-3">
                <div>
                  <h4 className="font-serif text-[17px] font-bold text-slate-900">Grade Math Paper</h4>
                  <p className="text-slate-500 text-sm mt-1 font-light leading-relaxed">Unit Test 3 results need to be uploaded by EOD.</p>
                </div>
                <button onClick={() => navigate({ to: "/dashboard/fees" })} className="bg-[#0058be] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:shadow-lg transition-all active:scale-95 cursor-pointer">Open Portal</button>
              </div>
            </div>
            <div className="premium-card p-6 rounded-3xl bg-white shadow-xs flex gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                <span className="material-symbols-outlined text-emerald-600">person_remove</span>
              </div>
              <div className="flex-grow">
                <h4 className="font-serif text-[17px] font-bold text-slate-900">Review Leave Request</h4>
                <p className="text-slate-500 text-sm mt-1 font-light">James Miller (Sick Leave) - 2 days.</p>
                <div className="flex gap-4 mt-3">
                  <button onClick={() => toast.success("Leave approved.")} className="text-[#0058be] font-bold text-[13px] hover:underline cursor-pointer">Approve</button>
                  <button onClick={() => toast.info("Leave declined.")} className="text-slate-400 font-bold text-[13px] hover:underline cursor-pointer">Decline</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // --- PARENT VIEW ---
  if (session.role === "parent") {
    const parentFirstName = session.name.split(" ")[0];
    const child = kids[0];
    return (
      <div className="fixed inset-0 w-full h-full text-slate-800 font-sans overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
        <div className="w-full h-full overflow-y-auto overflow-x-hidden flex justify-center">
          <div className="w-full max-w-md flex flex-col relative z-10 px-4 pt-4 pb-32">
          
          {/* Top Header section */}
          <header className="px-6 pt-6 pb-2 flex justify-between items-start relative">
            {/* Left Greeting & Brand Logo */}
            <div className="space-y-1.5 pt-2">
              {/* Brand Logo in Corner */}
              <div className="select-none font-serif text-[22px] font-black text-[#2B3990] tracking-tight leading-none mb-1">
                my<span className="text-[#4F54C4]">kard</span>
              </div>
              <div className="text-[18px] font-medium text-[#4A5568] tracking-tight leading-none">Hello,</div>
              <h1 className="text-[44px] font-black text-[#0A1128] tracking-tight leading-[1.05] mt-1.5 mb-2">
                {parentFirstName}
              </h1>
              <p className="text-[12px] font-medium text-slate-400 tracking-wide">
                Welcome back! Have a great day at school.
              </p>
            </div>

            {/* Right Notification, Logout & Profile Avatar */}
            <div className="flex items-center gap-2 pt-2">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => toast.info("You have no new notifications.")}
                  className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(240,244,255,0.8)] cursor-pointer hover:bg-slate-50 relative"
                  title="Notifications"
                >
                  <span className="material-symbols-outlined text-[#0E1630] text-[20px]">notifications</span>
                  {/* Blue dot indicator */}
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#4D69D6]"></span>
                </button>
              </div>

              {/* Logout Option */}
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(240,244,255,0.8)] cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition active:scale-95"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-rose-600 text-[18px]">logout</span>
              </button>

              {/* Profile Avatar (Dual ring lavender/white border) */}
              <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#3B82F6]/20 to-[#7C3AED]/20 shadow-[0_8px_24px_rgba(77,105,214,0.12)]">
                <div className="w-16 h-16 rounded-full border-[3px] border-white overflow-hidden bg-[#E2E8F0] flex items-center justify-center">
                  <img 
                    src={(typeof window !== "undefined" && (window as any).Capacitor) ? "avatar.jpg" : "/avatar.jpg"} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Grid of Four Action Cards (Attendance, Leave, Due, Contact) */}
          <section className="px-6 py-4 grid grid-cols-2 gap-3">
            {/* Card 1: Attendance */}
            <button 
              onClick={() => setShowCalendarModal(true)}
              className="bg-[#F5F3FF]/80 border border-[#E0D7FF]/60 rounded-[24px] p-4 flex flex-col items-start shadow-[0_6px_20px_rgba(124,58,237,0.04)] hover:bg-[#F5F3FF] transition active:scale-[0.97] cursor-pointer text-left relative group min-h-[90px] justify-between"
            >
              <span className="material-symbols-outlined text-[#7C3AED] text-[24px] font-bold">calendar_month</span>
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-[11px] font-black text-[#0E1630] tracking-tight">Attendance</span>
                <span className="material-symbols-outlined text-slate-400 text-[14px] font-bold group-hover:translate-x-0.5 transition-transform">chevron_right</span>
              </div>
            </button>

            {/* Card 2: Request Leave */}
            <Link 
              to="/dashboard/request-leave"
              className="bg-[#FFFDF5]/80 border border-[#FFEFC2]/60 rounded-[24px] p-4 flex flex-col items-start shadow-[0_6px_20px_rgba(245,158,11,0.04)] hover:bg-[#FFFDF5] transition active:scale-[0.97] cursor-pointer text-left relative group min-h-[90px] justify-between"
            >
              <span className="material-symbols-outlined text-[#F59E0B] text-[24px] font-bold">file_edit</span>
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-[11px] font-black text-[#0E1630] tracking-tight">Request Leave</span>
                <span className="material-symbols-outlined text-slate-400 text-[14px] font-bold group-hover:translate-x-0.5 transition-transform">chevron_right</span>
              </div>
            </Link>

            {/* Card 3: Due */}
            <button 
              onClick={() => setShowDueModal(true)}
              className="bg-[#EFF6FF]/80 border border-[#DCEBFF]/60 rounded-[24px] p-4 flex flex-col items-start shadow-[0_6px_20px_rgba(59,130,246,0.04)] hover:bg-[#EFF6FF] transition active:scale-[0.97] cursor-pointer text-left relative group min-h-[90px] justify-between"
            >
              <span className="material-symbols-outlined text-[#3B82F6] text-[24px] font-bold">sync_saved_locally</span>
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-[11px] font-black text-[#0E1630] tracking-tight">Due</span>
                <span className="material-symbols-outlined text-slate-400 text-[14px] font-bold group-hover:translate-x-0.5 transition-transform">chevron_right</span>
              </div>
            </button>

            {/* Card 4: Contact */}
            <button 
              onClick={() => setShowContactModal(true)}
              className="bg-[#ECFDF5]/80 border border-[#D1FAE5]/65 rounded-[24px] p-4 flex flex-col items-start shadow-[0_6px_20px_rgba(16,185,129,0.04)] hover:bg-[#ECFDF5] transition active:scale-[0.97] cursor-pointer text-left relative group min-h-[90px] justify-between"
            >
              <span className="material-symbols-outlined text-[#10B981] text-[24px] font-bold">phone_in_talk</span>
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-[11px] font-black text-[#0E1630] tracking-tight">Contact</span>
                <span className="material-symbols-outlined text-slate-400 text-[14px] font-bold group-hover:translate-x-0.5 transition-transform">chevron_right</span>
              </div>
            </button>
          </section>

          {/* Central Student ID Card Container */}
          <main className="px-6 py-2 flex-grow flex flex-col justify-start">
            {/* Student ID Card */}
            <div className="bg-white border border-[#4D69D6]/15 rounded-[32px] p-6 shadow-[0_12px_32px_rgba(77,105,214,0.06)] w-full space-y-5 text-slate-800 relative overflow-hidden">
                {/* Card Header (School Seal & Titles) */}
                <div className="flex items-center justify-center gap-3 pb-3 border-b border-slate-100">
                  {/* School Seal SVG */}
                  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-[#2B3990]">
                    <path d="M20 4L6 9.5V20C6 28.5 12 36 20 38C28 36 34 28.5 34 20V9.5L20 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="#F0F4FE" />
                    <circle cx="20" cy="18" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M14 26C14 24 17 23 20 23C23 23 26 24 26 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <div className="text-left">
                    <span className="text-[12px] font-black uppercase tracking-wide text-[#0E1630] block leading-none">
                      St. Mary's Public School
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
                      Student Identity Card
                    </span>
                  </div>
                </div>

                {/* Student Photo with Ring Accent */}
                <div className="flex justify-center pt-1">
                  <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#3B82F6] to-[#7C3AED] shadow-[0_6px_20px_rgba(59,130,246,0.15)] flex items-center justify-center">
                    <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden bg-[#E8F0FE] flex items-center justify-center">
                      <img 
                        src={(typeof window !== "undefined" && (window as any).Capacitor) ? "avatar.jpg" : "/avatar.jpg"} 
                        alt="Student Photo" 
                        className="w-full h-full object-cover animate-fade-in"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Info Details */}
                <div className="text-center space-y-2.5">
                  <h2 className="text-[22px] font-black tracking-tight text-[#0E1630] leading-none uppercase">
                    {child?.name || "SAHAL"}
                  </h2>
                  
                  <div className="flex justify-center gap-2">
                    <span className="bg-[#EEF2FF] text-[#4F54C4] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">school</span>
                      Grade {child?.grade || "8-B"}
                    </span>
                    <span className="bg-[#ECFDF5] text-[#10B981] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      Roll No: 14
                    </span>
                  </div>
                </div>

                {/* Additional Info Table fields */}
                <div className="bg-[#F6F9FF] border border-slate-100 rounded-2xl p-4 text-[12px] font-bold space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      <span>Card ID:</span>
                    </div>
                    <span className="text-[#0E1630] font-extrabold">1111111111</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">water_drop</span>
                      <span>Blood Group:</span>
                    </div>
                    <span className="text-[#0E1630] font-extrabold">O +ve</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                      <span>Emergency Contact:</span>
                    </div>
                    <span className="text-[#0E1630] font-extrabold">+91 98765 43210</span>
                  </div>
                </div>

                {/* Custom Barcode block */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="border border-slate-200/80 p-1.5 rounded-xl bg-white shadow-xs">
                    <svg width="220" height="38" viewBox="0 0 220 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="2" height="38" fill="black" />
                      <rect x="4" width="1" height="38" fill="black" />
                      <rect x="7" width="3" height="38" fill="black" />
                      <rect x="12" width="1" height="38" fill="black" />
                      <rect x="15" width="2" height="38" fill="black" />
                      <rect x="19" width="4" height="38" fill="black" />
                      <rect x="25" width="1" height="38" fill="black" />
                      <rect x="28" width="3" height="38" fill="black" />
                      <rect x="33" width="2" height="38" fill="black" />
                      <rect x="37" width="1" height="38" fill="black" />
                      <rect x="40" width="4" height="38" fill="black" />
                      <rect x="46" width="2" height="38" fill="black" />
                      <rect x="50" width="1" height="38" fill="black" />
                      <rect x="53" width="3" height="38" fill="black" />
                      <rect x="58" width="2" height="38" fill="black" />
                      <rect x="62" width="4" height="38" fill="black" />
                      <rect x="68" width="1" height="38" fill="black" />
                      <rect x="71" width="3" height="38" fill="black" />
                      <rect x="76" width="2" height="38" fill="black" />
                      <rect x="80" width="1" height="38" fill="black" />
                      <rect x="83" width="4" height="38" fill="black" />
                      <rect x="89" width="2" height="38" fill="black" />
                      <rect x="93" width="1" height="38" fill="black" />
                      <rect x="96" width="3" height="38" fill="black" />
                      <rect x="101" width="2" height="38" fill="black" />
                      <rect x="105" width="4" height="38" fill="black" />
                      <rect x="111" width="1" height="38" fill="black" />
                      <rect x="114" width="3" height="38" fill="black" />
                      <rect x="119" width="2" height="38" fill="black" />
                      <rect x="123" width="1" height="38" fill="black" />
                      <rect x="126" width="4" height="38" fill="black" />
                      <rect x="132" width="2" height="38" fill="black" />
                      <rect x="136" width="1" height="38" fill="black" />
                      <rect x="139" width="3" height="38" fill="black" />
                      <rect x="144" width="2" height="38" fill="black" />
                      <rect x="148" width="4" height="38" fill="black" />
                      <rect x="154" width="1" height="38" fill="black" />
                      <rect x="157" width="3" height="38" fill="black" />
                      <rect x="162" width="2" height="38" fill="black" />
                      <rect x="166" width="1" height="38" fill="black" />
                      <rect x="169" width="4" height="38" fill="black" />
                      <rect x="175" width="2" height="38" fill="black" />
                      <rect x="179" width="1" height="38" fill="black" />
                      <rect x="182" width="3" height="38" fill="black" />
                      <rect x="187" width="2" height="38" fill="black" />
                      <rect x="191" width="4" height="38" fill="black" />
                      <rect x="197" width="1" height="38" fill="black" />
                      <rect x="200" width="3" height="38" fill="black" />
                      <rect x="205" width="2" height="38" fill="black" />
                      <rect x="209" width="1" height="38" fill="black" />
                      <rect x="212" width="4" height="38" fill="black" />
                    </svg>
                  </div>
                </div>

              </div>
          </main>
        </div>
      </div>

        {/* Bottom Navigation (Exact Mockup Alignment) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-45 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(240,244,255,0.6)] rounded-t-[28px] overflow-hidden">
          <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center pb-6">
            {/* Link 1: Home */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-[#4F54C4] font-bold transition-all relative" to="/dashboard">
              <span className="material-symbols-outlined text-[24px]">home</span>
              <span className="text-[10px] font-bold tracking-tight">Home</span>
              {/* Indicator bar */}
              <span className="absolute -bottom-2 w-5 h-1 bg-[#4F54C4] rounded-full"></span>
            </Link>

            {/* Link 2: Attendance */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-slate-600 transition-colors" to="/dashboard/attendance">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
              <span className="text-[10px] font-bold tracking-tight">Attendance</span>
            </Link>

            {/* Link 3: Profile */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-[#4F54C4] transition-colors" to="/dashboard/account">
              <span className="material-symbols-outlined text-[24px]">person</span>
              <span className="text-[10px] font-bold tracking-tight">Profile</span>
            </Link>
          </div>
        </nav>

        {renderCalendarModal()}
        {renderContactModal()}
        {renderDueModal()}
      </div>
    );
  }

  // --- STUDENT VIEW ---
  const me = students.find((s) => s.id === session.studentId);
  const myLogs = logs.filter((l) => l.studentId === session.studentId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value="96%" hint="Term-to-date" accent="terminal" />
        <StatCard label="Late Marks" value="2" accent="magenta" />
        <StatCard label="Grade" value={me?.grade ?? "—"} accent="indigo" />
        <StatCard label="Fee Status" value={me?.feeStatus === "paid" ? "Cleared" : `₹${me?.feeDue ?? 0}`} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Log History */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            My Campus Check-in Logs
          </h3>
          <div className="space-y-3">
            {myLogs.slice(0,6).map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 capitalize">{log.status === 'check-out' ? 'Exit Gate Scan' : 'Entry Gate Scan'}</span>
                <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
            {myLogs.length === 0 && (
              <p className="text-center py-10 text-slate-400">No logs mapped to your ID card today.</p>
            )}
          </div>
        </div>

        {/* Gate Pass Card Display */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-[240px] bg-slate-900 rounded-2xl p-4 text-white space-y-8 relative overflow-hidden shadow-lg border border-slate-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold leading-tight font-serif">Brahmagupta GatePass</h4>
                <span className="text-[8px] text-indigo-300 font-mono tracking-widest">DIGITAL NFC TAG</span>
              </div>
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide">{session.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono mt-0.5">{me?.grade ?? "Unknown Grade"}</p>
            </div>

            <div className="flex justify-between items-end">
              <span className="text-[10px] text-indigo-300 font-mono">{me?.rfidUid || "00000000"}</span>
              <span className="text-[8px] text-slate-500">SYSTEM ID: {session.studentId}</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400">This digital gate pass corresponds to your physical RFID ID Card.</p>
        </div>
      </div>
    </div>
  );
}