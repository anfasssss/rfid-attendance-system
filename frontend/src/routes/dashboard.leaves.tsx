import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { fetchLeaves, resolveLeave } from "@/lib/api";
import type { LeaveRequest } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/leaves")({ component: LeavesPage });

function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  useEffect(() => { fetchLeaves().then(setLeaves); }, []);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Leave Requests</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting your approval</p>
        </div>
        <Badge variant="secondary">{leaves.filter((l) => l.status === "pending").length} open</Badge>
      </div>
      <div className="space-y-3">
        {leaves.map((l) => (
          <div key={l.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{l.studentName} <span className="text-muted-foreground font-normal">· {l.grade}</span></div>
                <div className="text-xs text-muted-foreground">Requested by {l.parentName}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.reason} · {l.dates}</div>
              </div>
              {l.status === "pending" ? (
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                    onClick={async () => { await resolveLeave(l.id, "approved"); fetchLeaves().then(setLeaves); }}
                    aria-label="Approve"><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={async () => { await resolveLeave(l.id, "denied"); fetchLeaves().then(setLeaves); }}
                    aria-label="Deny"><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Badge variant={l.status === "approved" ? "secondary" : "destructive"} className="capitalize">{l.status}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}