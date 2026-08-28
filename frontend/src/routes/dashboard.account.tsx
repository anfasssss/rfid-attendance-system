import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Key,
  Smartphone,
  ShieldCheck,
  Bell,
  Trash2,
} from "lucide-react";
import { presetAccounts, type Student } from "@/lib/mock-data";
import { fetchParentStudents } from "@/lib/api";

export const Route = createFileRoute("/dashboard/account")({
  component: AccountCenter,
});

function AccountCenter() {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  if (!session) return null;

  const roleLabel =
    session.role === "principal"
      ? "Principal (Super Admin)"
      : session.role === "teacher"
        ? `Class Teacher · ${session.grade ?? "—"}`
        : "Parent / Guardian";

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get currently active password
      let savedPasswords: Record<string, string> = {};
      try {
        const raw = localStorage.getItem("brahmagupta.custom_passwords");
        if (raw) savedPasswords = JSON.parse(raw);
      } catch {}

      const preset = presetAccounts.find(p => p.username === session.username);
      const activePassword = savedPasswords[session.username] || preset?.password;

      // 2. Validate current password
      if (currentPassword !== activePassword) {
        toast.error("Incorrect current password.");
        setLoading(false);
        return;
      }

      // 3. Validate new password
      if (!newPassword || newPassword.length < 4) {
        toast.error("New password must be at least 4 characters long.");
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        setLoading(false);
        return;
      }

      // 4. Save custom password
      savedPasswords[session.username] = newPassword;
      localStorage.setItem("brahmagupta.custom_passwords", JSON.stringify(savedPasswords));

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setPushEnabled(true);
          toast.success("Browser push notifications enabled!");
        } else {
          toast.error("Notification permission denied by browser.");
        }
      } else {
        toast.error("Notifications not supported in this browser.");
      }
    } else {
      setPushEnabled(false);
      toast.info("Notifications turned off.");
    }
  };

  const handleResetCache = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("brahmagupta.custom_passwords");
        toast.success("All custom user profiles and passwords reset to defaults.");
      } catch {
        toast.error("Failed to clear local cache.");
      }
    }
  };

  const [kids, setKids] = useState<Student[]>([]);
  const { logout } = useAuth();
  
  useEffect(() => {
    if (session?.parentId) {
      fetchParentStudents(session.parentId).then(setKids);
    }
  }, [session]);

  const isParent = session.role === "parent";

  if (isParent) {
    const parentFirstName = session.name.split(" ")[0];
    const email = `${session.username}@example.com`;
    const phone = session.parentId || "+1 (555) 012-3456";

    const handleLogout = () => {
      logout();
      window.location.href = "/";
    };

    return (
      <div className="fixed inset-0 w-full h-full text-slate-800 flex justify-center relative font-sans bg-cover bg-center overflow-y-auto pb-28 px-4" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
        <div className="w-full max-w-md flex flex-col relative z-10 pb-16">
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
              Account & Settings
            </span>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
              St. Mary's Public School
            </span>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-8 space-y-10 flex-grow">
          {/* Header Section */}
          <section className="space-y-2">
            <h2 className="font-serif text-[42px] leading-tight text-slate-900 font-extrabold">Account Settings</h2>
            <p className="text-base text-slate-600 font-light leading-relaxed">
              Manage your personal information, student records, and security preferences.
            </p>
          </section>

          <div className="space-y-6">
            {/* Profile Settings Card */}
            <section className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
              <div className="px-6 py-5 border-b border-gray-100/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0058be]/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0058be]">person</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800">Profile Settings</h3>
                </div>
                <button onClick={() => toast.info("Profile editing is locked in demo mode.")} className="text-[#0058be] text-xs font-bold hover:underline cursor-pointer">
                  Edit
                </button>
              </div>

              <div className="divide-y divide-gray-100/50">
                <div className="px-6 py-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mb-1 block font-bold">Full Name</span>
                    <span className="text-[17px] font-bold text-slate-800">{session.name}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </div>
                <div className="px-6 py-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mb-1 block font-bold">Contact Email</span>
                    <span className="text-[17px] font-bold text-[#0058be]">{email}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </div>
                <div className="px-6 py-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mb-1 block font-bold">Phone Number</span>
                    <span className="text-[17px] font-bold text-slate-800">{phone}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </div>
              </div>
            </section>

            {/* Student Management Card */}
            <section className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
              <div className="px-6 py-5 border-b border-gray-100/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0058be]/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0058be]">school</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800">Student Management</h3>
                </div>
                <button onClick={() => toast.info("Adding new students is locked in demo mode.")} className="bg-[#0058be] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add Student
                </button>
              </div>

              <div className="divide-y divide-gray-100/50">
                {kids.map((kid) => (
                  <div key={kid.id} className="px-6 py-6 flex items-center gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center font-extrabold text-[#0058be] text-lg border border-slate-200">
                      {kid.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-[17px] font-bold text-slate-800">{kid.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-slate-500 text-[10px] font-bold uppercase">
                          Grade {kid.grade}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-slate-500 text-[13px]">#{kid.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold uppercase tracking-wide border border-emerald-100">
                        Active
                      </span>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Notification Preferences */}
            <section className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
              <div className="px-6 py-5 border-b border-gray-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0058be]/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0058be]">notifications_active</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800">Notification Preferences</h3>
                </div>
              </div>
              
              <div className="px-6 py-6 space-y-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <p className="text-[17px] font-bold text-slate-800">RFID Arrival Alerts</p>
                    <p className="text-slate-500 text-sm mt-1 font-light">Receive instant push notifications when your child scans their badge.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input defaultChecked className="sr-only peer" type="checkbox" onChange={(e) => toast.info(`RFID arrival alerts set to: ${e.target.checked}`)}/>
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <p className="text-[17px] font-bold text-slate-800">Departure Logging</p>
                    <p className="text-slate-500 text-sm mt-1 font-light">Alerts when your child checks out at the end of the day.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input defaultChecked className="sr-only peer" type="checkbox" onChange={(e) => toast.info(`Departure logging alerts set to: ${e.target.checked}`)}/>
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <p className="text-[17px] font-bold text-slate-800">Fee & Payment Reminders</p>
                    <p className="text-slate-500 text-sm mt-1 font-light">Notifications regarding tuition deadlines and fees.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input className="sr-only peer" type="checkbox" onChange={(e) => toast.info(`Fee reminders set to: ${e.target.checked}`)}/>
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Security Section */}
            <section className="premium-card rounded-3xl overflow-hidden bg-white shadow-xs">
              <div className="px-6 py-5 border-b border-gray-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0058be]/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0058be]">security</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800">Security</h3>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100/50">
                <button 
                  onClick={() => toast.info("Password updates are managed via standard dashboard settings.")}
                  className="w-full px-6 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <span className="material-symbols-outlined text-slate-500">lock_reset</span>
                    </div>
                    <div>
                      <p className="text-[17px] font-bold text-slate-800">Change Password</p>
                      <p className="text-slate-500 text-[13px] font-light">Manage authentication keys</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#0058be] transition-colors">chevron_right</span>
                </button>
              </div>
            </section>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="w-full py-5 bg-red-50 text-red-600 rounded-3xl text-[17px] font-bold hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2.5 mt-4 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">logout</span>
              Sign Out
            </button>
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
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-[#4F54C4] font-bold transition-all relative" to="/dashboard/account">
              <span className="material-symbols-outlined text-[24px]">person</span>
              <span className="text-[10px] font-bold tracking-tight">Profile</span>
              <span className="absolute -bottom-2 w-5 h-1 bg-[#4F54C4] rounded-full"></span>
            </Link>
          </div>
        </nav>
      </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal sign-in credentials and app settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card Overview */}
        <Card className="p-5 bg-white border-slate-200 shadow-xs md:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center font-bold text-lg shadow-inner">
                {session.name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{session.name}</h3>
                <span className="text-[10px] text-slate-500 font-semibold">{roleLabel}</span>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Username</span>
                <span className="font-mono font-semibold text-slate-800">{session.username}</span>
              </div>
              {session.parentId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Linked Phone</span>
                  <span className="font-mono text-slate-800 font-semibold">{session.parentId}</span>
                </div>
              )}
              {session.grade && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Grade</span>
                  <span className="text-slate-800 font-semibold">{session.grade}</span>
                </div>
              )}
              {session.studentId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Student ID</span>
                  <span className="font-mono text-slate-800 font-semibold">{session.studentId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Active Secure Session
          </div>
        </Card>

        {/* Change Password Form */}
        <Card className="p-5 bg-white border-slate-200 shadow-xs md:col-span-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-900 border-b border-slate-100 pb-3 mb-4">
            <Key className="w-4 h-4 text-indigo-600" />
            Update Sign-in Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-pass" className="text-xs text-slate-600 font-medium">Current Password</Label>
              <Input
                id="current-pass"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9 text-xs border-slate-200 placeholder:text-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pass" className="text-xs text-slate-600 font-medium">New Password</Label>
                <Input
                  id="new-pass"
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs border-slate-200 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pass" className="text-xs text-slate-600 font-medium">Confirm Password</Label>
                <Input
                  id="confirm-pass"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs border-slate-200 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-9 px-6 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                {loading ? "Updating..." : "Save New Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* App Preferences Settings */}
      <Card className="p-5 bg-white border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-900 border-b border-slate-100 pb-3 mb-4">
          <Smartphone className="w-4 h-4 text-indigo-600" />
          Application Preferences
        </h3>

        <div className="divide-y divide-slate-100 space-y-4">
          {/* Notifications config */}
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                Browser Push Notifications
              </h4>
              <p className="text-[11px] text-slate-500">
                Receive check-in log popups directly on your desktop screen even when the dashboard tab is running in the background.
              </p>
            </div>
            <Button
              variant={pushEnabled ? "default" : "outline"}
              onClick={handleTogglePush}
              className="h-8 text-[11px] px-4 cursor-pointer"
            >
              {pushEnabled ? "Enabled" : "Turn On"}
            </Button>
          </div>

          {/* Reset configurations */}
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Reset Account Credentials
              </h4>
              <p className="text-[11px] text-slate-500">
                Restore all customized passwords and custom session credentials back to standard school demo presets.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetCache}
              className="h-8 text-[11px] px-4 border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
