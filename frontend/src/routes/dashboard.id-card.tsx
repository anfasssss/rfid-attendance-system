import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { fetchStudents } from "@/lib/api";
import type { Student } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/id-card")({ component: IdCardPage });

function IdCardPage() {
  const { session } = useAuth();
  const [me, setMe] = useState<Student | undefined>();
  useEffect(() => {
    fetchStudents().then((all) => setMe(all.find((s) => s.id === session?.studentId)));
  }, [session]);
  if (!me) return null;
  return (
    <Card className="p-6 max-w-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
      <div className="text-xs opacity-80">Student ID Card</div>
      <div className="mt-6 text-2xl font-semibold">{me.name}</div>
      <div className="text-sm opacity-80 mt-1">Grade {me.grade}</div>
      <div className="mt-8 rounded-lg bg-white/10 backdrop-blur p-3">
        <div className="text-[10px] uppercase tracking-widest opacity-80">RFID</div>
        <div className="text-xl tracking-[0.3em] font-mono mt-1">{me.rfid}</div>
      </div>
      <div className="mt-3 text-xs opacity-70">Issued Aug 2024 · Valid through Jun 2027</div>
    </Card>
  );
}