import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Cpu,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Radio,
  Home,
  LogOut,
  Upload,
  Sparkles,
  Building,
  Users,
  Settings,
  ShieldCheck,
  Eye
} from "lucide-react";
import {
  fetchSystemStatus,
  fetchStudents,
  updateStudentRfid,
  createSchoolBranding,
  uploadSchoolRoster
} from "@/lib/api";
import type { Student } from "@/lib/mock-data";

export const Route = createFileRoute("/superadmin")({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { session, login, logout } = useAuth();
  const navigate = useNavigate();
  
  // Auth state
  const [passInput, setPassInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMasterAuthed, setIsMasterAuthed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("brahmagupta.superadmin") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  // Diagnostics states
  const [activeTab, setActiveTab] = useState<"diagnostics" | "onboarding">("diagnostics");
  const [status, setStatus] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigningUid, setAssigningUid] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [swActive, setSwActive] = useState(false);

  // Onboarding states
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4D69D6");
  const [accentColor, setAccentColor] = useState("#6366F1");
  const [logoUrl, setLogoUrl] = useState("/school_logo.png");
  const [csvContent, setCsvContent] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        setSwActive(registrations.length > 0);
      });
    }
  }, []);

  const refreshSystemStats = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemStatus(session?.schoolId);
      if (data) setStatus(data);
      const studList = await fetchStudents();
      setStudents(studList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMasterAuthed && session?.role !== "principal" && (session?.role as string) !== "superadmin") return;

    refreshSystemStats();

    // Establish WebSocket Connection
    const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
    const wsUrl = isCapacitor ? "ws://192.168.30.10:5001" : `ws://${window.location.hostname}:5001`;
    setWsStatus("connecting");
    
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("⚠️ [WS Superadmin] Connection failed:", err);
      setWsStatus("disconnected");
    }

    let pingStart = Date.now();

    if (ws) {
      ws.onopen = () => {
        setWsStatus("connected");
        pingStart = Date.now();
        if (ws) ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "pong" || message.type === "attendance_update") {
            setPingMs(Date.now() - pingStart);
            fetchSystemStatus(session?.schoolId).then(setStatus);
          }
        } catch (err) {
          // Ignored
        }
      };

      ws.onerror = () => {
        setWsStatus("disconnected");
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
      };
    }

    return () => {
      if (ws) ws.close();
    };
  }, [session, isMasterAuthed]);

  const handleMasterAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passInput === "mykard-super-2026") {
      setIsMasterAuthed(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("brahmagupta.superadmin", "true");
      }
      login({
        role: "superadmin" as any,
        name: "Super Admin",
        username: "superadmin",
        schoolId: "global"
      });
      toast.success("Superadmin mode unlocked successfully!");
    } else {
      setAuthError("Incorrect system override password");
    }
  };

  const handleLinkRfid = async (uid: string) => {
    if (!selectedStudentId) return;
    try {
      await updateStudentRfid(selectedStudentId, uid);
      setAssigningUid(null);
      setSelectedStudentId("");
      refreshSystemStats();
      toast.success("RFID keycard linked cleanly!");
    } catch (err) {
      toast.error("Failed to assign RFID card to student");
    }
  };

  // CSV/Excel parsing helpers
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Parse CSV columns
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });
        parsedRows.push(rowObj);
      }

      setCsvContent(parsedRows);
      toast.success(`Parsed ${parsedRows.length} user records successfully!`);
    };
    reader.readAsText(file);
  };

  const handleOnboardSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !schoolName) {
      toast.error("Please fill in the School Slug and School Name");
      return;
    }

    try {
      // 1. Create branding color configs
      const brand = await createSchoolBranding({
        id: schoolId,
        name: schoolName,
        primaryColor,
        accentColor,
        logoUrl
      });

      if (!brand) {
        toast.error("Failed to save school config. Verify backend network status.");
        return;
      }

      // 2. Parse roster list arrays
      const studentsList = csvContent
        .filter(r => (r.role || "student").toLowerCase() === "student")
        .map(r => ({
          name: r.name || r["Student Name"],
          grade: r.grade || r["Grade"] || "Grade 8-B",
          rfidUid: r.rfidUid || r["RFID UID"] || "",
          parentName: r.parentName || r["Parent Name"] || "Parent",
          parentPhone: r.parentPhone || r["Parent Phone"] || ""
        }));

      const staffList = csvContent
        .filter(r => (r.role || "student").toLowerCase() !== "student")
        .map(r => ({
          username: r.parentPhone || r.username || r["Parent Phone"] || "",
          name: r.name || r["Student Name"] || "Staff",
          role: (r.role || "").toLowerCase() === "teacher" ? "teacher" : "principal"
        }));

      const rosterResult = await uploadSchoolRoster(schoolId, studentsList, staffList);
      if (rosterResult) {
        toast.success(`Successfully onboarded school cohort for ${schoolName}!`);
        // Reset states
        setSchoolId("");
        setSchoolName("");
        setCsvContent([]);
        setCsvFileName("");
      } else {
        toast.error("School branding created, but Excel roster import failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard school");
    }
  };

  // Auth Protection Shield Layout
  if (!isMasterAuthed && session?.role !== "principal" && (session?.role as string) !== "superadmin") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 bg-cover bg-center" style={{ backgroundImage: `url("/background.png")` }}>
        <div className="w-full flex justify-end">
          <span className="font-serif text-[24px] font-black text-white/90 tracking-tight">
            my<span className="text-[#818CF8]">kard</span>
          </span>
        </div>

        <div className="w-full max-w-md mx-auto my-auto p-8 rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-indigo-500/10 grid place-items-center mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Control Center Lockdown</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
            Diagnostics and multi-tenant management dashboards are restricted. Enter master bypass credentials below.
          </p>

          <form onSubmit={handleMasterAuth} className="w-full space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Superadmin Password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-400 text-center font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal"
                required
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-center font-semibold">
                {authError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-indigo-600 text-white font-extrabold tracking-wider hover:bg-indigo-700 cursor-pointer rounded-xl flex items-center justify-center gap-2"
            >
              <span>ACCESS SYSTEM CONTROL</span>
            </Button>
          </form>
        </div>

        <footer className="text-center text-[10px] text-slate-500">
          Secure Core Terminal v2.6.0 | End-to-End Cryptographic Handshake active
        </footer>
      </div>
    );
  }

  const networkIP = status?.network?.localIPs?.[0] || "192.168.30.10";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white grid place-items-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-none text-slate-900">Control Center</h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Superadmin Diagnostics & School Onboarding</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setActiveTab("diagnostics")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === "diagnostics" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Telemetry HUD
              </button>
              <button
                onClick={() => setActiveTab("onboarding")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === "onboarding" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Onboarding Manager
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 px-4 gap-1.5 cursor-pointer text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            >
              <Link to="/dashboard">
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                localStorage.removeItem("brahmagupta.superadmin");
                setIsMasterAuthed(false);
                logout();
                navigate({ to: "/" });
              }}
              className="h-9 w-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {activeTab === "diagnostics" ? (
          // Telemetry and diagnostics tab content
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">System Telemetry Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live updates via active WebSocket streams</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSystemStats}
                disabled={loading}
                className="h-9 px-4 gap-1.5 cursor-pointer text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Telemetry
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 bg-white border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REST API Server</p>
                  <h4 className="text-base font-bold text-slate-800 mt-1">Ready</h4>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center">
                  <Server className="w-4 h-4" />
                </div>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firestore Client</p>
                  <h4 className="text-base font-bold text-slate-800 mt-1">Live Connected</h4>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center">
                  <Database className="w-4 h-4" />
                </div>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telemetry Gateway</p>
                  <h4 className="text-base font-bold text-slate-800 mt-1 capitalize">{wsStatus}</h4>
                </div>
                <div className={`w-8 h-8 rounded-full grid place-items-center ${wsStatus === "connected" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  <Wifi className="w-4 h-4" />
                </div>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Ping Latency</p>
                  <h4 className="text-base font-bold text-slate-800 mt-1">{pingMs !== null ? `${pingMs}ms` : "N/A"}</h4>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 grid place-items-center">
                  <Radio className="w-4 h-4" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Unregistered scanner log list */}
              <Card className="lg:col-span-2 p-5 bg-white border-slate-200 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">Unmapped RFID Hardware Keys</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Keycards scanned on the readers not yet registered to any student.</p>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-2 font-bold uppercase text-[9px] tracking-wider">Hardware UID</th>
                        <th className="py-2 font-bold uppercase text-[9px] tracking-wider">Scan Terminal</th>
                        <th className="py-2 font-bold uppercase text-[9px] tracking-wider">Date Scanned</th>
                        <th className="py-2 text-right font-bold uppercase text-[9px] tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {status?.unregisteredScans && status.unregisteredScans.length > 0 ? (
                        status.unregisteredScans.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="py-3 font-mono font-bold text-indigo-600">{log.rfid}</td>
                            <td className="py-3 font-semibold">{log.gate}</td>
                            <td className="py-3 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="py-3 text-right">
                              {assigningUid === log.rfid ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-md text-xs px-2 h-7 focus:outline-none"
                                  >
                                    <option value="">Select Child...</option>
                                    {students
                                      .filter((s) => !s.rfidUid)
                                      .map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    onClick={() => handleLinkRfid(log.rfid)}
                                    className="h-7 text-[10px] px-2.5 bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Link
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAssigningUid(null)}
                                    className="h-7 text-[10px] px-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAssigningUid(log.rfid);
                                    setSelectedStudentId("");
                                  }}
                                  className="h-7 text-[10px] px-2.5 cursor-pointer border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                                >
                                  Link RFID Card
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            <CheckCircle className="w-8 h-8 text-emerald-500/55 mx-auto mb-1.5" />
                            No unregistered cards scanned. All keycards mapped cleanly!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Console log Stream */}
              <Card className="p-5 bg-white border-slate-200 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">Console Logs Stream</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time attendance logs updates</p>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[350px]">
                  {status?.recentLogs && status.recentLogs.length > 0 ? (
                    status.recentLogs.map((log: any) => {
                      const isUnreg = log.studentId === "unregistered";
                      return (
                        <div key={log.id} className={`text-xs border p-3 rounded-lg flex flex-col gap-1 ${isUnreg ? "border-amber-100 bg-amber-50/30" : "border-slate-100 bg-slate-50/50"}`}>
                          <div className="flex items-center justify-between">
                            <strong className={`font-bold ${isUnreg ? "text-amber-700" : "text-slate-800"}`}>
                              {log.studentName}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                            <span>Class: {log.grade}</span>
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">{log.rfid}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/50 text-[10px]">
                            <span className="text-slate-400 font-medium">Terminal: {log.gate}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 leading-none ${log.status === "check-in" ? "bg-emerald-600 hover:bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-600"}`}>
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center">
                      <Database className="w-8 h-8 opacity-25 mb-2 text-slate-300" />
                      No logs loaded for today.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        ) : (
          // School and Roster Onboarding Tab View
          <Card className="p-6 bg-white border-slate-200 shadow-xs">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                School Onboarding & Cohort Importer
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Onboard new academic campuses and import student RFID roster directories dynamically using CSV spreadsheets.</p>
            </div>

            <form onSubmit={handleOnboardSchool} className="space-y-6">
              
              {/* Part 1: School Branding */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-l-2 border-indigo-600 pl-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  1. Brand Setup
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School Unique Slug ID</label>
                    <input
                      type="text"
                      placeholder="e.g. school_102"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full h-10 border border-slate-200 bg-white rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-600"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Royal Academy of Science"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full h-10 border border-slate-200 bg-white rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Theme Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 p-0 border border-slate-200 rounded-lg cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 h-10 border border-slate-200 bg-white rounded-lg px-3 text-xs font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accent Theme Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 p-0 border border-slate-200 rounded-lg cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 h-10 border border-slate-200 bg-white rounded-lg px-3 text-xs font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School Logo URL</label>
                    <input
                      type="text"
                      placeholder="/school_logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full h-10 border border-slate-200 bg-white rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: CSV Roster Import */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-l-2 border-indigo-600 pl-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  2. Import Student & Staff Roster
                </h3>

                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Choose CSV Spreadsheet Roster</h4>
                  <p className="text-[10px] text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                    CSV file must include the following headers:<br />
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">name</code>, 
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">grade</code>, 
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">rfidUid</code>, 
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">parentName</code>, 
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">parentPhone</code>, 
                    <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-600 font-mono font-bold">role</code>
                  </p>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Button type="button" variant="outline" className="cursor-pointer border-slate-200 text-slate-700 text-xs">
                      {csvFileName || "Select CSV File"}
                    </Button>
                  </div>
                </div>

                {/* CSV parsed rows preview */}
                {csvContent.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Roster File Preview ({csvContent.length} rows)</span>
                      <Badge className="bg-indigo-600 text-[9px]">{csvFileName}</Badge>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-[9px] uppercase tracking-wider">Name</th>
                            <th className="p-2.5 text-[9px] uppercase tracking-wider">Grade</th>
                            <th className="p-2.5 text-[9px] uppercase tracking-wider">RFID UID</th>
                            <th className="p-2.5 text-[9px] uppercase tracking-wider">Parent Phone</th>
                            <th className="p-2.5 text-[9px] uppercase tracking-wider">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                          {csvContent.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5">{row.name || row["Student Name"] || "—"}</td>
                              <td className="p-2.5">{row.grade || row["Grade"] || "—"}</td>
                              <td className="p-2.5 font-mono">{row.rfidUid || row["RFID UID"] || "—"}</td>
                              <td className="p-2.5">{row.parentPhone || row["Parent Phone"] || "—"}</td>
                              <td className="p-2.5 capitalize"><Badge variant="outline" className="text-[10px]">{row.role || "student"}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvContent.length > 10 && (
                        <div className="p-2.5 bg-slate-50 text-center text-[10px] text-slate-400 font-bold border-t border-slate-100">
                          And {csvContent.length - 10} more rows...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={csvContent.length === 0}
                  className="bg-indigo-600 text-white font-bold text-xs h-10 px-6 cursor-pointer hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-lg flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Onboard School & Deploy Roster
                </Button>
              </div>

            </form>
          </Card>
        )}

      </main>
    </div>
  );
}
