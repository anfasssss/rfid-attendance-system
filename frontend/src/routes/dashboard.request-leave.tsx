import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchParentStudents, submitLeaveRequest, fetchLeaves } from "@/lib/api";
import type { Student } from "@/lib/mock-data";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard/request-leave")({ component: RequestLeavePage });

function RequestLeavePage() {
  const { session } = useAuth();
  const [kids, setKids] = useState<Student[]>([]);
  const [selectedKid, setSelectedKid] = useState("");
  const [reason, setReason] = useState("");
  const [dates, setDates] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [ok, setOk] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);

  const loadLeaveHistory = () => {
    if (session?.parentId) {
      fetchParentStudents(session.parentId).then((data) => {
        setKids(data);
        if (data[0]) setSelectedKid(data[0].id);

        fetchLeaves().then((allLeaves) => {
          const kidIds = data.map((k) => k.id);
          const filtered = allLeaves.filter((l) => kidIds.includes(l.studentId));
          filtered.sort((a, b) => new Date(b.timestamp || b.submittedAt).getTime() - new Date(a.timestamp || a.submittedAt).getTime());
          setLeaveHistory(filtered);
        });
      });
    }
  };

  useEffect(() => {
    loadLeaveHistory();
  }, [session]);

  useEffect(() => {
    if (selectedDate) {
      setDates(format(selectedDate, "yyyy-MM-dd"));
    } else {
      setDates("");
    }
  }, [selectedDate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kid = kids.find((k) => k.id === selectedKid);
    if (!kid) return;
    await submitLeaveRequest({
      studentId: kid.id,
      studentName: kid.name,
      grade: kid.grade,
      parentName: session?.name ?? "",
      reason,
      dates,
    });
    setReason(""); setSelectedDate(undefined); setDates("");
    setOk(true);
    toast.success("Leave request submitted successfully for approval!");
    loadLeaveHistory();
    setTimeout(() => setOk(false), 3500);
  };

  return (
    <div className="min-h-screen w-screen text-slate-800 flex justify-center relative font-sans bg-cover bg-center pb-28" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
      <div className="w-full max-w-md flex flex-col relative z-10">
      <style>{`
        .premium-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .glass-nav {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Top Header section */}
      <header className="px-6 pt-6 pb-2 flex justify-between items-start relative max-w-xl mx-auto w-full">
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
            Request Leave
          </span>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
            St. Mary's Public School
          </span>
        </div>
      </header>

      <main className="px-6 max-w-xl mx-auto mt-8 space-y-8 flex-grow">
        {/* Header Section */}
        <section className="space-y-2">
          <h2 className="font-serif text-[42px] leading-tight text-slate-900 font-extrabold">Report Absence</h2>
          <p className="text-base text-slate-600 font-light leading-relaxed">
            Notify the campus administration about an upcoming leave or absence dates.
          </p>
        </section>

        {/* Form Container */}
        <div className="premium-card p-6 rounded-3xl bg-white shadow-xs">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 block">SELECT CHILD</label>
              <select 
                value={selectedKid} 
                onChange={(e) => setSelectedKid(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[16px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm text-slate-800 font-bold"
              >
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} · Grade {k.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 block">SELECT LEAVE DATE</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    type="button"
                    className={`w-full justify-start text-left font-normal h-12 px-4 bg-white border border-slate-200 rounded-[16px] hover:bg-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm text-slate-800 ${
                      !selectedDate ? "text-slate-450" : "font-bold"
                    }`}
                  >
                    <CalendarIcon className="mr-2.5 h-4 w-4 text-slate-500" />
                    {selectedDate ? format(selectedDate, "PPP") : <span className="text-slate-400 font-normal">Choose date...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white shadow-xl border border-slate-200 rounded-2xl z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" value={dates} required />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 block">REASON FOR ABSENCE</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe reason (e.g. doctor appointment, travel, sickness...)"
                required
                rows={4}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[16px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#0058be] text-white py-3.5 rounded-[16px] font-serif text-[16px] font-bold hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit Request</span>
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>

          {ok && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold text-center">
              Request logged successfully for Principal approval!
            </div>
          )}
        </div>

        {/* Leave Requests History */}
        <div className="space-y-4 pt-4 pb-12">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Leave Application History</h3>
          {leaveHistory.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-xs text-slate-400 font-bold">
              No leave requests logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {leaveHistory.map((l) => (
                <div key={l.id} className="bg-white border border-slate-100 rounded-3xl p-4 shadow-[0_4px_12px_rgba(240,244,255,0.4)] flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800">
                      {l.studentName} · <span className="text-slate-400 font-normal">{l.grade}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Date: {l.dates}
                    </div>
                    <p className="text-[11px] text-slate-600 font-normal italic leading-relaxed">
                      "{l.reason}"
                    </p>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    l.status === "approved" 
                      ? "bg-emerald-50 text-emerald-600" 
                      : l.status === "denied" 
                      ? "bg-rose-50 text-rose-600" 
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation (Exact Mockup Alignment) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-45 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(240,244,255,0.6)] rounded-t-[28px] overflow-hidden">
        <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center pb-6">
          {/* Link 1: Home */}
          <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-slate-600 transition-colors" to="/dashboard">
            <span className="material-symbols-outlined text-[24px]">home</span>
            <span className="text-[10px] font-bold tracking-tight">Home</span>
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
    </div>
    </div>
  );
}