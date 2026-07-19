import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

const accentBg: Record<string, string> = {
  indigo: "bg-primary/10 text-primary",
  cyan: "bg-sky-500/10 text-sky-600",
  magenta: "bg-rose-500/10 text-rose-600",
  terminal: "bg-emerald-500/10 text-emerald-600",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "indigo",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "indigo" | "cyan" | "magenta" | "terminal";
  icon?: ReactNode;
}) {
  return (
    <div className="premium-card p-5 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">
          {value}
        </div>
        {hint && <div className="mt-1 text-[11px] font-light text-slate-500">{hint}</div>}
      </div>
      {icon && (
        <div className={`shrink-0 w-11 h-11 rounded-xl grid place-items-center ${accentBg[accent]}`}>
          {icon}
        </div>
      )}
    </div>
  );
}