import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { presetAccounts, type Role } from "@/lib/mock-data";
import { loginRequest, setupCustomPassword } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("parent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"otp" | "setup_password" | "password">("otp");
  
  // Temp credentials holder
  const [tempUserId, setTempUserId] = useState("");
  const [tempOtp, setTempOtp] = useState("");
  
  // Password inputs
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next box
    if (val && index < 5) {
      const nextEl = document.getElementById(`otp-${index + 1}`);
      nextEl?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevEl = document.getElementById(`otp-${index - 1}`);
      prevEl?.focus();
    }
  };

  // 1. Submit Identity Verification (First Auth Step)
  const submitOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const p = presetAccounts.find((x) => x.role === role) || presetAccounts.find((x) => x.role === "parent")!;
      const otpStr = otp.join("");
      
      const phoneInput = role === "parent" ? "+919656108992" : ""; // Dummy test parent
      const usernameInput = role === "parent" ? "" : p.username;
      const targetId = role === "parent" ? phoneInput : usernameInput;
      
      // Verification call
      const res = await loginRequest(role, usernameInput, phoneInput, otpStr);
      
      setTempUserId(targetId);
      setTempOtp(otpStr);

      if (res.setupRequired) {
        toast.info("First-time setup detected. Please configure your password.");
        setStep("setup_password");
      } else {
        setStep("password");
      }
    } catch (e: any) {
      setError(e.message ?? "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit password configuration (Setup Flow)
  const submitPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await setupCustomPassword(tempUserId, newPassword, tempOtp);
      if (res.ok) {
        login({
          role: res.user.role,
          name: res.user.name,
          username: res.user.username,
          schoolId: res.user.schoolId,
          branding: res.user.branding
        });
        toast.success("Account configured. Logging in!");
        navigate({ to: "/dashboard" });
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to set up password");
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit normal password login
  const submitPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const p = presetAccounts.find((x) => x.role === role) || presetAccounts.find((x) => x.role === "parent")!;
      const phoneInput = role === "parent" ? "+919656108992" : "";
      const usernameInput = role === "parent" ? "" : p.username;

      const res = await loginRequest(
        role,
        usernameInput,
        phoneInput,
        tempOtp || "111111" // fallback OTP
      );
      
      // Standard credentials login request using the API
      const remoteLogin = await fetch(`http://${window.location.hostname}:5001/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          username: usernameInput,
          phone: phoneInput,
          password: loginPassword
        })
      });
      
      const loginRes = await remoteLogin.json();
      if (!remoteLogin.ok) {
        throw new Error(loginRes.error || "Incorrect credentials");
      }

      login({
        role: loginRes.user.role,
        name: loginRes.user.name,
        username: loginRes.user.username,
        schoolId: loginRes.user.schoolId,
        branding: loginRes.user.branding
      });
      
      toast.success(`Welcome back, ${loginRes.user.name}!`);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setError(e.message ?? "Login failed. Check your password.");
    } finally {
      setLoading(false);
    }
  };

  const quickSelectRole = (r: Role) => {
    setRole(r);
    setOtp(["1", "1", "1", "1", "1", "1"]);
    setStep("otp");
    setError(null);
  };

  return (
    <div className="text-slate-800 min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden font-sans select-none bg-cover bg-center" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
      
      {/* Wave & Watermark Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-100 pointer-events-none" 
          style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "auth_background.png" : "/auth_background.png"})` }}
        />
      </div>

      {/* Top mykard Brand Logo */}
      <div className="w-full max-w-md flex justify-end pt-4 z-10">
        <span className="font-serif text-[28px] font-black text-[#2B3990] tracking-tight select-none">
          my<span className="text-[#4F54C4]">kard</span>
        </span>
      </div>

      <main className="w-full max-w-md flex flex-col items-center text-center space-y-8 animate-in fade-in duration-300 z-10 flex-grow justify-center pb-12">
        
        {/* OTP Step View */}
        {step === "otp" && (
          <form onSubmit={submitOtpVerification} className="w-full flex flex-col items-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-[28px] font-extrabold text-[#0E1630] tracking-tight">
                Enter verification code
              </h2>
              <p className="text-[13px] text-slate-400 font-bold max-w-[300px] mx-auto leading-relaxed">
                We've sent a 6-digit code to your registered mobile number
              </p>
            </div>

            <div className="flex justify-center gap-2.5 w-full max-w-[320px]">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="number"
                  pattern="[0-9]*"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-14 bg-white text-slate-800 rounded-xl text-center text-xl font-extrabold focus:outline-none focus:border-[#4F54C4] focus:ring-1 focus:ring-[#4F54C4]/30 border border-slate-200 shadow-[0_4px_12px_rgba(240,244,255,0.7)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  required
                />
              ))}
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 max-w-[320px]">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full max-w-[200px] h-12 bg-gradient-to-r from-[#4D69D6] to-[#6366F1] text-white font-extrabold uppercase text-[13px] tracking-widest rounded-full shadow-[0_6px_20px_rgba(77,105,214,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? "Verifying..." : "VERIFY CODE"}</span>
            </button>
          </form>
        )}

        {/* Setup Password Step View */}
        {step === "setup_password" && (
          <form onSubmit={submitPasswordSetup} className="w-full flex flex-col items-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-[24px] font-extrabold text-[#0E1630] tracking-tight">
                Create your password
              </h2>
              <p className="text-[13px] text-slate-400 font-bold max-w-[300px] mx-auto leading-relaxed">
                Set a secure password for future logins.
              </p>
            </div>

            <div className="w-full max-w-[300px] space-y-4">
              <input
                type="password"
                placeholder="Choose Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 bg-white text-slate-800 rounded-xl px-4 text-sm font-semibold border border-slate-200 shadow-sm focus:outline-none focus:border-[#4F54C4]"
                required
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 bg-white text-slate-800 rounded-xl px-4 text-sm font-semibold border border-slate-200 shadow-sm focus:outline-none focus:border-[#4F54C4]"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 max-w-[300px]">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full max-w-[200px] h-12 bg-gradient-to-r from-[#4D69D6] to-[#6366F1] text-white font-extrabold uppercase text-[13px] tracking-widest rounded-full shadow-[0_6px_20px_rgba(77,105,214,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? "Saving..." : "CREATE PASSWORD"}</span>
            </button>
          </form>
        )}

        {/* Normal Password Challenge Step View */}
        {step === "password" && (
          <form onSubmit={submitPasswordLogin} className="w-full flex flex-col items-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-[26px] font-extrabold text-[#0E1630] tracking-tight">
                Enter your password
              </h2>
              <p className="text-[13px] text-slate-400 font-bold max-w-[300px] mx-auto leading-relaxed">
                Provide your custom account password to continue.
              </p>
            </div>

            <div className="w-full max-w-[300px]">
              <input
                type="password"
                placeholder="Enter Account Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-12 bg-white text-slate-800 rounded-xl px-4 text-sm font-semibold border border-slate-200 shadow-sm focus:outline-none focus:border-[#4F54C4]"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 max-w-[300px]">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <button 
                type="submit"
                disabled={loading}
                className="w-full min-w-[200px] h-12 bg-gradient-to-r from-[#4D69D6] to-[#6366F1] text-white font-extrabold uppercase text-[13px] tracking-widest rounded-full shadow-[0_6px_20px_rgba(77,105,214,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{loading ? "Authenticating..." : "LOGIN"}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setStep("otp")}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Back to OTP validation
              </button>
            </div>
          </form>
        )}

        {/* Developer testing selector (TEST ACCOUNTS) */}
        <div className="w-full max-w-[320px] pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] bg-slate-200 flex-grow"></div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Test Accounts
            </span>
            <div className="h-[1px] bg-slate-200 flex-grow"></div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <button
              type="button"
              onClick={() => quickSelectRole("parent")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                role === "parent" && step === "otp"
                  ? "bg-[#EEF2FF] border-[#4F54C4] text-[#4F54C4]"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">person</span>
              <span>Parent</span>
            </button>

            <button
              type="button"
              onClick={() => quickSelectRole("teacher")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                role === "teacher" && step === "otp"
                  ? "bg-[#F5F3FF] border-[#7C3AED] text-[#7C3AED]"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">school</span>
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => quickSelectRole("principal")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                role === "principal" && step === "otp"
                  ? "bg-[#ECFDF5] border-[#10B981] text-[#10B981]"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>Admin</span>
            </button>
          </div>
        </div>

      </main>

      {/* End-to-end encryption footer */}
      <footer className="w-full flex items-center justify-center gap-2 pb-4 opacity-70">
        <span className="material-symbols-outlined text-[#4F54C4] text-[18px]">security</span>
        <span className="text-[10px] font-semibold text-slate-500 tracking-wide">
          Your data is secure and encrypted end-to-end.
        </span>
      </footer>

    </div>
  );
}
