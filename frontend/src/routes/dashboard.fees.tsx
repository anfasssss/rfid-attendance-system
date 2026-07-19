import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchFeesSummary, fetchStudents, fetchTransactions } from "@/lib/api";
import type { Student, Transaction } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/fees")({ component: FeesPage });

function FeesPage() {
  const { session } = useAuth();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [fees, setFees] = useState({ collected: 0, outstanding: 0, target: 1 });
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchTransactions().then(setTxs);
    fetchFeesSummary().then(setFees);
    fetchStudents().then(setStudents);
  }, []);

  const feePct = Math.round((fees.collected / fees.target) * 100);
  const classStudents = useMemo(
    () => (session?.role === "teacher" ? students.filter((s) => s.grade === (session.grade ?? "8-B")) : []),
    [students, session],
  );

  if (session?.role === "teacher") {
    return (
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Fee Status · Grade {session.grade}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Payment overview for your class</p>
        </div>
        <div className="divide-y divide-border">
          {classStudents.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm py-2.5">
              <span className="font-medium">{s.name}</span>
              {s.feeStatus === "paid"
                ? <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">Paid</Badge>
                : <Badge variant="secondary" className="bg-rose-500/15 text-rose-700">₹{s.feeDue} due</Badge>}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Fee Collection</h2>
        <p className="text-xs text-muted-foreground mt-0.5">This term</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-emerald-500/10 p-3">
          <div className="text-xs font-medium text-emerald-700">Collected</div>
          <div className="text-xl font-semibold mt-1 tabular-nums">₹{fees.collected.toLocaleString()}</div>
        </div>
        <div className="rounded-lg bg-rose-500/10 p-3">
          <div className="text-xs font-medium text-rose-700">Outstanding</div>
          <div className="text-xl font-semibold mt-1 tabular-nums">₹{fees.outstanding.toLocaleString()}</div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
        <div className="h-full bg-emerald-500" style={{ width: `${feePct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{feePct}% of target</div>
      <div className="mt-6">
        <div className="text-sm font-semibold mb-2">Recent transactions</div>
        <div className="divide-y divide-border">
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2.5">
              <span className="font-medium">{t.studentName}</span>
              <span className="text-xs text-muted-foreground">{t.method} · {t.date}</span>
              <span className="text-emerald-600 tabular-nums font-medium">₹{t.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}