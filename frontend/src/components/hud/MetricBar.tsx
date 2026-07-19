import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  display?: string;
  tone?: "indigo" | "cyan" | "magenta" | "terminal";
}

const toneMap = {
  indigo: "from-hud-indigo to-hud-magenta",
  cyan: "from-hud-cyan to-hud-indigo",
  magenta: "from-hud-magenta to-hud-indigo",
  terminal: "from-hud-terminal to-hud-cyan",
};

export function MetricBar({ label, value, display, tone = "indigo" }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{display ?? `${value.toFixed(1)}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden border border-border">
        <div
          className={cn("h-full bg-gradient-to-r rounded-full", toneMap[tone])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}