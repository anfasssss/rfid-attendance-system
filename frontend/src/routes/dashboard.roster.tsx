import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { fetchAttendanceLogs, fetchStudents } from "@/lib/api";
import type { AttendanceLog, Student } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/roster")({ component: RosterPage });

function RosterPage() {
  const { session } = useAuth();
  const grade = session?.grade ?? "8-B";
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [overrides, setOverrides] = useState<Record<string, "present" | "absent" | "late">>({});

  useEffect(() => {
    fetchAttendanceLogs().then(setLogs);
    fetchStudents().then(setStudents);
  }, []);

  const classStudents = useMemo(() => students.filter((s) => s.grade === grade), [students, grade]);
  const classLogs = useMemo(() => logs.filter((l) => l.grade === grade), [logs, grade]);

  const cycleOverride = (studentId: string, current: "present" | "late" | "absent") => {
    const next = current === "present" ? "absent" : current === "absent" ? "late" : "present";
    setOverrides((o) => ({ ...o, [studentId]: next }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-[22px] font-bold text-slate-900 tracking-tight">Class Roster · Grade {grade}</h2>
          <p className="text-xs text-slate-400 font-medium">💡 Tap status badge to override manually</p>
        </div>
      </div>

      <div className="space-y-3">
        {classStudents.map((s, idx) => {
          const auto = classLogs.find((l) => l.studentId === s.id);
          const current = overrides[s.id] ?? (auto ? (auto.status === "late" ? "late" : "present") : "absent");
          const rollNum = String(idx + 1).padStart(2, '0');
          const initials = s.name.split(" ").map(n => n[0]).join("").toUpperCase();

          return (
            <div key={s.id} className="premium-card p-4 rounded-2xl bg-white shadow-xs flex items-center justify-between gap-4">
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
                  <h4 className="font-serif text-[15px] font-bold text-slate-800 leading-snug truncate">{s.name}</h4>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>Parent: <span className="font-semibold text-slate-600">{s.parentName}</span></span>
                    <span className="opacity-40">•</span>
                    <span>RFID: <span className="font-mono">{s.rfid || "—"}</span></span>
                  </p>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => cycleOverride(s.id, current)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
                    current === 'present'
                      ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                      : current === 'absent'
                        ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                        : 'bg-[#FEF7E0] text-[#B06000] border-[#FDE293]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{current}</span>
                </button>
              </div>
            </div>
          );
        })}

        {classStudents.length === 0 && (
          <p className="text-center py-20 text-slate-400 text-sm">No students in this class.</p>
        )}
      </div>
    </div>
  );
}