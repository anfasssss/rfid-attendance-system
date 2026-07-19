import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { fetchAttendanceLogs } from "@/lib/api";
import type { AttendanceLog } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/activity")({ component: ActivityPage });

function ActivityPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  useEffect(() => {
    fetchAttendanceLogs().then((all) => setLogs(all.filter((l) => l.studentId === session?.studentId)));
  }, [session]);
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">Recent Activity</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">Your latest gate scans</p>
      {logs.length === 0 && <div className="text-sm text-muted-foreground">No scans logged yet.</div>}
      <div className="divide-y divide-border">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground tabular-nums">
              {new Date(l.timestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
            </span>
            <span className="font-medium">{l.gate}</span>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 capitalize">{l.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}