import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./mock-data";

export interface Session {
  role: Role;
  name: string;
  username: string;
  grade?: string;
  parentId?: string;
  studentId?: string;
  schoolId?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    schoolName?: string;
  };
}

interface AuthCtx {
  session: Session | null;
  login: (s: Session) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "brahmagupta.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  const login = (s: Session) => {
    setSession(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  };
  const logout = () => {
    setSession(null);
    try { localStorage.removeItem(KEY); } catch {}
  };

  return <Ctx.Provider value={{ session, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}