import type { AttendanceLog } from "@/lib/mock-data";

export function StatusPill({ status }: { status: AttendanceLog["status"] }) {
  const map: Record<AttendanceLog["status"], { tone: string; text: string }> = {
    "check-in": { tone: "bg-emerald-500/10 text-emerald-700", text: "Checked in" },
    "check-out": { tone: "bg-sky-500/10 text-sky-700", text: "Checked out" },
    late: { tone: "bg-amber-500/10 text-amber-700", text: "Late" },
    unregistered: { tone: "bg-destructive/10 text-destructive", text: "Unknown" },
  };
  const m = map[status];
  return (
    <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${m.tone}`}>
      {m.text}
    </span>
  );
}