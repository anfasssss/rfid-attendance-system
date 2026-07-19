import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchTeachers } from "@/lib/api";
import type { Teacher } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/students")({ component: StudentsPage });

interface RichTeacher extends Teacher {
  status: "IN-CLASS" | "FREE" | "ON-LEAVE";
  attendance: string;
  location: string;
  department: string;
  avatarInitials: string;
  icon?: string;
}

function StudentsPage() {
  const [teachers, setTeachers] = useState<RichTeacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "IN-CLASS" | "FREE" | "ON-LEAVE">("ALL");

  useEffect(() => {
    fetchTeachers().then((fetched) => {
      // Enhance mock teachers with high fidelity attributes matching premium_staff_oversight_v2 template
      const enriched: RichTeacher[] = [
        {
          id: "t_sterling",
          name: "Dr. Robert Sterling",
          grade: "Grade 11-A",
          email: "r.sterling@school.edu",
          status: "IN-CLASS",
          attendance: "98.4%",
          location: "Room 402 Active",
          department: "Mathematics · Senior Faculty",
          avatarInitials: "RS"
        },
        ...fetched.map((t, idx) => ({
          ...t,
          status: (idx % 2 === 0 ? "IN-CLASS" : "FREE") as any,
          attendance: "96.5%",
          location: "Room 102 Active",
          department: "Science Dept · Faculty Member",
          avatarInitials: t.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        })),
        {
          id: "t_rodriguez",
          name: "Elena Rodriguez",
          grade: "Grade 9-B",
          email: "e.rodriguez@school.edu",
          status: "FREE",
          attendance: "92.1%",
          location: "Standby Mode",
          department: "History · Arts Dept",
          avatarInitials: "ER"
        },
        {
          id: "t_chang",
          name: "Michael Chang",
          grade: "Grade 12-C",
          email: "m.chang@school.edu",
          status: "ON-LEAVE",
          attendance: "--",
          location: "Medical Leave",
          department: "Physics · Science Dept",
          avatarInitials: "MC"
        }
      ];
      setTeachers(enriched);
    });
  }, []);

  const filteredTeachers = teachers.filter((t) => {
    // Search
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.department.toLowerCase().includes(searchQuery.toLowerCase());
    // Tab
    const matchesTab = filterTab === "ALL" || t.status === filterTab;
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-8 pb-10 text-slate-800 font-sans">
      <style>{`
        .premium-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.06);
        }
        .pulse-teal {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* Header Hero */}
      <section className="space-y-2">
        <h2 className="font-serif text-[28px] sm:text-[38px] leading-tight text-slate-900 font-extrabold">Personnel Directory</h2>
        <p className="text-sm sm:text-base text-slate-500 font-light leading-relaxed">Real-time oversight and presence tracking for all campus faculty.</p>
      </section>

      {/* Filters & Search */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7 lg:col-span-8 premium-card rounded-2xl p-2 flex items-center bg-white shadow-xs">
          <div className="pl-4 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:ring-0 w-full text-slate-800 placeholder:text-slate-400 py-3 px-4 outline-none text-sm" 
            placeholder="Search staff or departments..." 
            type="text"
          />
        </div>
        <div className="md:col-span-5 lg:col-span-4 premium-card rounded-2xl p-2 flex items-center justify-between gap-1 overflow-x-auto bg-white shadow-xs">
          {(["ALL", "IN-CLASS", "FREE", "ON-LEAVE"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-[11px] whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                filterTab === tab 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "hover:bg-slate-50 text-slate-500"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "IN-CLASS" ? "In-Class" : tab === "FREE" ? "Free" : "Leave"}
            </button>
          ))}
        </div>
      </section>

      {/* Staff List Container */}
      <section className="space-y-4">
        {filteredTeachers.map((teacher) => (
          <div key={teacher.id} className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl shadow-xs overflow-hidden border border-slate-100 bg-indigo-50 flex items-center justify-center font-bold text-[#0058be] font-serif text-xl">
                    {teacher.avatarInitials}
                  </div>
                  {teacher.status === "IN-CLASS" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-[3px] border-white rounded-full pulse-teal"></div>
                  )}
                  {teacher.status === "FREE" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-[3px] border-white rounded-full"></div>
                  )}
                  {teacher.status === "ON-LEAVE" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-500 border-[3px] border-white rounded-full"></div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-[20px] font-bold text-slate-900 leading-tight">{teacher.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{teacher.department}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-6 sm:gap-8 lg:gap-12 flex-grow justify-end px-2 md:px-0">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest opacity-60">Status</span>
                  <div className={`px-3.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit ${
                    teacher.status === "IN-CLASS" ? "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]" :
                    teacher.status === "FREE" ? "bg-[#FEF7E0] text-[#B06000] border-[#FDE293]" :
                    "bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]"
                  }`}>
                    {teacher.status === "IN-CLASS" ? "In class" : teacher.status === "FREE" ? "Free" : "On leave"}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest opacity-60">Attendance</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif text-[22px] font-extrabold text-slate-800 leading-none">{teacher.attendance}</span>
                    {teacher.attendance !== "--" && (
                      <span className="material-symbols-outlined text-emerald-500 text-[18px]">trending_up</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest opacity-60">
                    {teacher.status === "ON-LEAVE" ? "Reason" : "Location"}
                  </span>
                  <div className={`flex items-center gap-2 font-bold text-xs ${
                    teacher.status === "ON-LEAVE" ? "text-rose-500" : "text-slate-700"
                  }`}>
                    <span className="material-symbols-outlined text-[18px] opacity-40">
                      {teacher.status === "ON-LEAVE" ? "medical_services" : "sensors"}
                    </span>
                    {teacher.location}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTeachers.length === 0 && (
          <p className="text-center py-20 text-slate-400 text-sm">No personnel matched your filter query.</p>
        )}
      </section>
    </div>
  );
}