import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { fetchAttendanceLogs, fetchParentStudents } from "@/lib/api";
import type { AttendanceLog, Student } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/children")({ component: ChildrenPage });

function ChildrenPage() {
  const { session } = useAuth();
  const [kids, setKids] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    if (session?.parentId) fetchParentStudents(session.parentId).then(setKids);
    fetchAttendanceLogs().then(setLogs);
  }, [session]);

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold mb-4">My Children</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {kids.map((k) => {
          const last = logs.find((l) => l.studentId === k.id);
          return (
            <div key={k.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">{k.avatar}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.name}</div>
                  <div className="text-xs text-muted-foreground">Grade {k.grade} · <span className="font-mono">{k.rfid}</span></div>
                </div>
                <Badge variant="secondary"
                  className={`ml-auto ${last?.status === "check-in" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {last?.status === "check-in" ? "On campus" : "Off campus"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Last scan</div>
                  <div className="font-medium tabular-nums">
                    {last ? new Date(last.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Gate</div>
                  <div className="font-medium">{last?.gate ?? "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}