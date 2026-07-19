import { cn } from "@/lib/utils";

export function StatDot({
  tone = "cyan",
  label,
}: {
  tone?: "cyan" | "indigo" | "terminal" | "magenta" | "danger";
  label?: string;
}) {
  const toneClass = {
    cyan: "text-primary",
    indigo: "text-primary",
    terminal: "text-emerald-600",
    magenta: "text-rose-600",
    danger: "text-destructive",
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
      <span
        className={cn("w-1.5 h-1.5 rounded-full bg-current", toneClass)}
        style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
      />
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  );
}