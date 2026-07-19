import { type ReactNode, useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LogOut,
  GraduationCap,
  Bell,
  LayoutDashboard,
  Radio,
  Users,
  CalendarCheck,
  Wallet,
  ClipboardList,
  Baby,
  CreditCard,
  FileEdit,
  IdCard,
  History,
  Cpu,
  User,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/mock-data";
import { fetchParentNotifications } from "@/lib/api";
import { toast } from "sonner";

function NotificationBell({ session }: { session: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);

  useEffect(() => {
    if (session?.parentId) {
      fetchParentNotifications(session.parentId).then(setNotifications);
    }

    // Connect to WebSocket Server for live push notifications
    const wsUrl = `ws://${window.location.hostname}:5001`;
    console.log(`🔌 [WS Notification Bell] Connecting to ${wsUrl}...`);
    
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("⚠️ [WS Bell] Connection failed:", err);
    }

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification_update') {
            // Check if parent should receive it
            const isTarget = session.role !== 'parent' || message.data.phone === session.parentId;
            if (isTarget) {
              console.log("🔥 [WS Bell] New notification:", message.data);
              setNotifications(prev => {
                const filtered = prev.filter(n => n.id !== message.data.id);
                return [message.data, ...filtered];
              });
              setUnreadCount(prev => prev + 1);
              
              // Trigger bell ring animation
              setIsRinging(true);
              // Trigger overlay popup alert
              setCurrentAlert(message.data);
              
              // Trigger Sonner toast alert in top corner!
              toast.info("System Alert", {
                description: message.data.message,
                duration: 6000,
              });
            }
          }
        } catch (err) {
          console.error("❌ Failed to parse notification:", err);
        }
      };
    }

    return () => {
      if (ws) ws.close();
    };
  }, [session]);

  // Handle auto-reset for bell ringing animation
  useEffect(() => {
    if (isRinging) {
      const timer = setTimeout(() => setIsRinging(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isRinging]);

  // Auto-hide alert popup after 6 seconds
  useEffect(() => {
    if (currentAlert) {
      const timer = setTimeout(() => setCurrentAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [currentAlert]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      {/* Premium Pop-in Alert Notification Toast */}
      {currentAlert && (
        <div 
          onClick={() => setCurrentAlert(null)}
          className="fixed top-24 right-6 z-[9999] max-w-sm bg-white/90 backdrop-blur-xl border-2 border-emerald-500/80 shadow-[0_20px_50px_rgba(16,185,129,0.18)] rounded-3xl p-5 animate-pop-in cursor-pointer flex items-start gap-4 transition-all duration-300 hover:scale-102 hover:border-emerald-600"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px] animate-bounce">notifications_active</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-serif font-extrabold text-sm text-slate-900 leading-none">New Gateway Alert</h4>
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">{currentAlert.message}</p>
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleNotifications}
        className="relative cursor-pointer hover:bg-slate-100 rounded-lg"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 text-muted-foreground hover:text-foreground transition-all ${
          isRinging ? "animate-bell-ring text-rose-500" : ""
        }`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-50 animate-in fade-in slide-in-from-top-3 duration-200 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="font-semibold text-xs text-slate-800">In-App Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={() => setNotifications([])}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n, idx) => (
                <div key={n.id || idx} className="text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex flex-col gap-1">
                  <p className="text-slate-700 font-medium leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-slate-400 self-end mt-1">
                    {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 text-xs">No active notifications.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<Role, NavItem[]> = {
  principal: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/dashboard/attendance", label: "Live Attendance", icon: Radio },
    { to: "/dashboard/students", label: "Staff Oversight", icon: Users },
    { to: "/dashboard/leaves", label: "Leave Requests", icon: CalendarCheck },
    { to: "/dashboard/fees", label: "Fees", icon: Wallet },
    { to: "/dashboard/account", label: "Account Center", icon: User },
  ],
  teacher: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/dashboard/attendance", label: "Live Attendance", icon: Radio },
    { to: "/dashboard/roster", label: "Class Roster", icon: ClipboardList },
    { to: "/dashboard/fees", label: "Class Fees", icon: Wallet },
    { to: "/dashboard/account", label: "Account Center", icon: User },
  ],
  parent: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/dashboard/children", label: "My Children", icon: Baby },
    { to: "/dashboard/attendance", label: "Entry & History", icon: History },
    { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { to: "/dashboard/request-leave", label: "Request Leave", icon: FileEdit },
    { to: "/dashboard/account", label: "Account Center", icon: User },
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`👤 User response to PWA install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  if (!session) return null;

  if (session.role === "parent") {
    return <>{children}</>;
  }

  const roleLabel =
    session.role === "principal"
      ? "Principal"
      : session.role === "teacher"
        ? `Class Teacher · Grade ${session.grade ?? "—"}`
        : "Parent";

  const initials = session.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  const nav = NAV[session.role];
  const active = nav.find((n) => (n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex font-sans text-slate-800">
      <style>{`
        .sidebar-dark {
          background: linear-gradient(180deg, #0C0F1D 0%, #171b2f 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .sidebar-active {
          background: linear-gradient(135deg, #0058be 0%, #00479e 100%);
          box-shadow: 0 4px 15px -3px rgba(0, 88, 190, 0.4);
        }
        .premium-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .glass-header {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .glass-nav {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 sidebar-dark sticky top-0 h-screen text-slate-300">
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-white/10 p-0.5 flex items-center justify-center border border-white/10 shadow-inner">
            <img 
              alt="Mykard MB Logo" 
              className="w-full h-full object-contain filter invert opacity-90" 
              src="https://lh3.googleusercontent.com/aida/AP1WRLvBzJXX5X3DTu8iIQJZW7Vym6Oal20kHsACf6E7t4UbGi87bOQbfzAECIVAgjILfhWIBJOwKUykQKfxuQuSdZvtU_TreZO_lDfyRt5ZSqYSOjfOw9wEQwbA_HVaAPkLQjhXLJeG0vFrTteLoRLt9MbZx27hJoBudDkiOfCZcxh0k1TDTOMsGgbTl4LcwqKnJOPWQeC-N8r9U2vdLLqmRNCw_baj4aV229GSjdd3myvXHdto1qFZ2gyC2Zw"
            />
          </div>
          <div>
            <div className="font-serif text-[18px] font-extrabold text-white leading-none tracking-tight">Campus Link</div>
            <div className="text-[10px] text-white/50 mt-1 uppercase font-bold tracking-widest">Console</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {nav.map((item) => {
            const isActive = item.to === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] ${
                  isActive
                    ? "sidebar-active text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {deferredPrompt && (
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition justify-center border border-white/10"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Install App</span>
            </button>
          </div>
        )}
        <div className="border-t border-white/5 p-4 flex items-center gap-3 bg-white/[0.01]">
          <div className="w-10 h-10 rounded-full bg-white/10 text-white border border-white/10 flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-bold text-white truncate">{session.name}</div>
            <div className="text-[11px] text-white/50 mt-0.5 truncate font-medium">{roleLabel}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => { logout(); navigate({ to: "/" }); }}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile top app bar */}
        <header className="lg:hidden sticky top-0 z-30 glass-header">
          <div className="px-4 h-16 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0058be]/10 text-[#0058be] grid place-items-center shrink-0 border border-[#0058be]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-[17px] font-extrabold leading-none truncate text-slate-800">
                {active?.label ?? "Campus Link"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">
                {roleLabel}
              </div>
            </div>
            {deferredPrompt && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleInstallClick}
                className="text-[#0058be] hover:text-[#00479e] cursor-pointer"
                aria-label="Install App"
              >
                <Smartphone className="w-5 h-5 animate-pulse" />
              </Button>
            )}
            <NotificationBell session={session} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => { logout(); navigate({ to: "/" }); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Desktop page header */}
        <div className="hidden lg:flex items-center justify-between px-8 h-20 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h1 className="font-serif text-[22px] font-extrabold text-slate-900 leading-none">
              {active?.label ?? "Dashboard"}
            </h1>
            <p className="text-xs text-slate-500 font-light mt-1.5">
              Signed in as <span className="font-bold text-slate-700">{session.name}</span> · {roleLabel}
            </p>
          </div>
          <NotificationBell session={session} />
        </div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:pb-10">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-nav shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)] bg-white/90"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map((item) => {
              const isActive = item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all ${
                    isActive ? "text-[#0058be]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                  <span className="truncate max-w-full px-1">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}