import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchParentStudents, fetchTransactions } from "@/lib/api";
import type { Student, Transaction } from "@/lib/mock-data";
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Receipt, 
  ArrowRight, 
  Loader2, 
  Smartphone, 
  QrCode, 
  Lock,
  Download
} from "lucide-react";

export const Route = createFileRoute("/dashboard/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { session } = useAuth();
  if (!session) return null;
  const [kids, setKids] = useState<Student[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  
  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeKid, setActiveKid] = useState<Student | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [amountToPay, setAmountToPay] = useState<number>(0);

  useEffect(() => {
    if (session?.parentId) fetchParentStudents(session.parentId).then(setKids);
    fetchTransactions().then(setTxs);
  }, [session]);

  const totalOutstanding = kids.reduce((acc, k) => acc + (k.feeStatus === "outstanding" ? k.feeDue : 0), 0);
  const totalPaid = txs.reduce((acc, t) => acc + t.amount, 0);

  const handlePayClick = (kid: Student) => {
    setActiveKid(kid);
    setAmountToPay(kid.feeDue); // Pre-fill with the full outstanding amount
    setPaymentSuccess(false);
    setIsProcessing(false);
    setIsCheckoutOpen(true);
  };

  const handleProcessPayment = () => {
    if (amountToPay <= 0 || (activeKid && amountToPay > activeKid.feeDue)) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      
      // Update local state to reflect paid status
      if (activeKid) {
        setKids(prev => prev.map(k => {
          if (k.id === activeKid.id) {
            const nextDue = Math.max(0, k.feeDue - amountToPay);
            return {
              ...k,
              feeDue: nextDue,
              feeStatus: nextDue === 0 ? "paid" : "outstanding"
            };
          }
          return k;
        }));
        
        // Add transaction record
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          studentName: activeKid.name,
          amount: amountToPay,
          date: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
          method: paymentMethod.toUpperCase()
        };
        setTxs(prev => [newTx, ...prev]);
      }
      
      // Keep modal open for a success message, then close
      setTimeout(() => {
        setIsCheckoutOpen(false);
      }, 1500);
    }, 2000);
  };

  const isParent = session?.role === "parent";

  if (isParent) {
    const parentFirstName = session?.name.split(" ")[0] || "Parent";
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Find the first unpaid kid for quick pay
    const firstUnpaidKid = kids.find(k => k.feeStatus === "outstanding");

    return (
      <div className="min-h-screen w-screen text-slate-800 flex justify-center relative font-sans bg-cover bg-center pb-28" style={{ backgroundImage: `url(${(typeof window !== "undefined" && (window as any).Capacitor) ? "background.png" : "/background.png"})` }}>
        <div className="w-full max-w-md flex flex-col relative z-10">
        <style>{`
          .premium-card {
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.8);
          }
          .glass-nav {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px) saturate(180%);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
          }
          .balance-gradient {
            background: linear-gradient(135deg, #0C0F1D 0%, #1e293b 100%);
          }
        `}</style>

        {/* Top Header section */}
        <header className="px-6 pt-6 pb-2 flex justify-between items-start relative max-w-xl mx-auto w-full">
          {/* Back Home navigation button */}
          <Link 
            to="/dashboard"
            className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(240,244,255,0.8)] cursor-pointer hover:bg-slate-50 relative"
            title="Back to Home"
          >
            <span className="material-symbols-outlined text-[#0E1630] text-[20px]">arrow_back</span>
          </Link>

          {/* Title / School Header */}
          <div className="text-right">
            <span className="text-[12px] font-black uppercase tracking-wide text-[#0E1630] block leading-none">
              Fees & Payments
            </span>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
              St. Mary's Public School
            </span>
          </div>
        </header>

        <main className="px-6 max-w-xl mx-auto mt-8 space-y-8 flex-grow">
          {/* Dashboard Header */}
          <section className="space-y-2">
            <h2 className="font-serif text-[42px] leading-tight text-slate-900 font-extrabold">Fee Management</h2>
            <p className="text-base text-slate-600 font-light leading-relaxed">
              Overview of your student's financial status and payment schedules.
            </p>
          </section>

          {/* Balance Card (Bento Style) */}
          <div className="premium-card rounded-3xl overflow-hidden bg-white">
            <div className="balance-gradient p-8 text-white relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-[#0058be]/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <span className="text-[10px] text-white/60 tracking-widest uppercase font-bold">Total Outstanding</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-[42px] text-white font-extrabold">₹{totalOutstanding.toLocaleString()}</span>
                  <span className="text-white/50 font-serif text-[18px]">INR</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 bg-white">
              {kids.map((k) => (
                <div key={k.id} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50 flex flex-col justify-between">
                  <div>
                    <p className="uppercase text-[10px] text-slate-400 font-bold tracking-wider mb-1">
                      {k.name.split(" ")[0]}
                    </p>
                    <p className="text-lg font-bold text-slate-800">₹{k.feeDue.toLocaleString()}</p>
                  </div>
                  {k.feeStatus === "outstanding" ? (
                    <button 
                      onClick={() => handlePayClick(k)}
                      className="mt-3 text-[12px] font-bold text-[#0058be] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Pay Now <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  ) : (
                    <span className="mt-3 text-[12px] font-bold text-emerald-600 flex items-center gap-1">
                      Cleared ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Due Date */}
          <section className="premium-card rounded-3xl p-6 bg-rose-50/50 border-rose-100 bg-white">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="material-symbols-outlined text-[20px]">event_repeat</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Deadline</span>
                </div>
                <div>
                  <h3 className="font-serif text-[20px] font-bold text-slate-800">October 15, 2026</h3>
                  <p className="text-slate-500 text-[13px] mt-1">Term 2 Tuition & Transportation Installment</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-rose-600 text-[12px] font-bold">Registration Deadline Approaching</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment History List */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-serif text-[20px] font-bold text-slate-800 tracking-tight">Payment History</h3>
              <div className="flex gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {txs.map((t, idx) => (
                <div key={t.id || idx} className="premium-card p-5 rounded-2xl flex items-center justify-between bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-slate-800">{t.date}</p>
                      <p className="text-[12px] text-slate-500">{t.studentName} · {t.method}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-emerald-600 text-right">₹{t.amount.toLocaleString()}</p>
                </div>
              ))}
              {txs.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-sm">No transaction receipt logs found.</p>
              )}
            </div>
          </section>
        </main>

        {/* Floating Action Bar (Premium Style) */}
        {firstUnpaidKid && (
          <div className="fixed bottom-24 left-0 right-0 px-6 z-40">
            <div className="max-w-xl mx-auto">
              <div className="bg-[#181b29] shadow-2xl rounded-2xl p-4 flex items-center justify-between">
                <div className="pl-2">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold">Next Payment</p>
                  <p className="text-white text-[18px] font-bold">₹{firstUnpaidKid.feeDue.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handlePayClick(firstUnpaidKid)}
                  className="bg-[#0058be] text-white py-3 px-8 rounded-xl font-serif text-[16px] font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-lg cursor-pointer"
                >
                  <span>Pay Now</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation (Exact Mockup Alignment) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-45 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(240,244,255,0.6)] rounded-t-[28px] overflow-hidden">
          <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center pb-6">
            {/* Link 1: Home */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-slate-600 transition-colors" to="/dashboard">
              <span className="material-symbols-outlined text-[24px]">home</span>
              <span className="text-[10px] font-bold tracking-tight">Home</span>
            </Link>

            {/* Link 2: Attendance */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-slate-600 transition-colors" to="/dashboard/attendance">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
              <span className="text-[10px] font-bold tracking-tight">Attendance</span>
            </Link>

            {/* Link 3: Profile */}
            <Link className="flex flex-col items-center justify-center gap-1 px-4 py-1 text-slate-400 hover:text-[#4F54C4] transition-colors" to="/dashboard/account">
              <span className="material-symbols-outlined text-[24px]">person</span>
              <span className="text-[10px] font-bold tracking-tight">Profile</span>
            </Link>
          </div>
        </nav>
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 border-border/80 bg-card/50 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-4 top-4 text-amber-500/10">
            <AlertCircle className="w-16 h-16" />
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Outstanding</div>
          <div className="text-3xl font-bold tracking-tight mt-1 text-amber-500 tabular-nums">
            ₹{totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            {totalOutstanding > 0 ? "Please complete payment before term starts" : "All school fees are fully paid"}
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card/50 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-500/10">
            <CheckCircle className="w-16 h-16" />
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Paid This Year</div>
          <div className="text-3xl font-bold tracking-tight mt-1 text-emerald-500 tabular-nums">
            ₹{totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            Receipts successfully processed & registered
          </div>
        </Card>
      </div>

      {/* 2. Dues Breakdown Cards */}
      <Card className="p-5 border-border/80 bg-card/50 backdrop-blur-md">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Tuition breakdown by student</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kids.map((k) => (
            <div key={k.id} className="relative rounded-xl border border-border bg-muted/20 p-4 transition-all hover:border-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-sm">
                  {k.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{k.name}</div>
                  <div className="text-xs text-muted-foreground">Grade {k.grade}</div>
                </div>
                {k.feeStatus === "paid" ? (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Paid
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Dues Outstanding</div>
                  <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
                    ₹{k.feeDue.toLocaleString()}
                  </div>
                </div>
                <Button 
                  disabled={k.feeStatus === "paid"} 
                  onClick={() => handlePayClick(k)}
                  size="sm"
                  className="h-8 text-xs font-semibold px-4 cursor-pointer"
                >
                  {k.feeStatus === "paid" ? "No Dues" : "Pay now"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Receipts Log */}
      <Card className="p-5 border-border/80 bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Transaction Receipts</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Student Name</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No transaction history found.
                  </td>
                </tr>
              ) : (
                txs.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/30 transition text-sm">
                    <td className="py-3 font-medium text-foreground">{t.studentName}</td>
                    <td className="py-3 text-muted-foreground tabular-nums">{t.date}</td>
                    <td className="py-3">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                        {t.method}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-emerald-500 text-right tabular-nums">
                      ₹{t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" title="Download Receipt">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Payment Checkout Sheet (Custom Modal overlay) */}
      {isCheckoutOpen && activeKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 border-border shadow-2xl relative overflow-hidden">
            {/* Modal Exit */}
            <button 
              disabled={isProcessing}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-sm cursor-pointer disabled:opacity-50"
            >
              ✕
            </button>

            {paymentSuccess ? (
              /* Success View */
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-foreground">Payment Successful</h4>
                <p className="text-xs text-muted-foreground mt-2 max-w-[280px]">
                  Receipt logged for {activeKid.name}. Redirecting back to portals...
                </p>
              </div>
            ) : (
              /* Checkout Form */
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground">Tuition Checkout</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Simulate fee payment for {activeKid.name} (Grade {activeKid.grade})
                  </p>
                </div>

                {/* Amount detail */}
                <div className="space-y-1 bg-muted/40 border border-border p-3.5 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">Outstanding Dues:</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">₹{activeKid.feeDue.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <label className="text-[10px] font-medium uppercase text-muted-foreground block mb-1">Enter payment amount (₹)</label>
                    <input
                      type="number"
                      min={1}
                      max={activeKid.feeDue}
                      value={amountToPay === 0 ? "" : amountToPay}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setAmountToPay(Math.min(activeKid.feeDue, Math.max(0, val)));
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-bold tabular-nums"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                {/* Method selector tabs */}
                <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition ${
                      paymentMethod === "upi"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted/30 border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    UPI / QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition ${
                      paymentMethod === "card"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted/30 border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Debit/Credit Card
                  </button>
                </div>

                {/* Payment form contents */}
                {paymentMethod === "upi" ? (
                  /* UPI QR view */
                  <div className="flex flex-col items-center justify-center py-2 space-y-3">
                    <div className="p-3 border border-border rounded-xl bg-white text-black relative">
                      <QrCode className="w-32 h-32" />
                      <div className="absolute inset-0 bg-primary/5 rounded-xl border-2 border-dashed border-primary animate-pulse pointer-events-none" />
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center">
                      Scan the simulated QR code using any UPI app (GPay, PhonePe, Paytm)
                    </div>
                  </div>
                ) : (
                  /* Card view */
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium uppercase text-muted-foreground">Card number</label>
                      <input 
                        disabled
                        type="text" 
                        value="••••  ••••  ••••  5421" 
                        className="w-full h-9 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Expiry</label>
                        <input 
                          disabled
                          type="text" 
                          value="12/29" 
                          className="w-full h-9 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">CVC</label>
                        <input 
                          disabled
                          type="text" 
                          value="***" 
                          className="w-full h-9 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing and confirm button */}
                <div className="pt-2 flex flex-col gap-2">
                  <Button 
                    onClick={handleProcessPayment} 
                    disabled={isProcessing}
                    className="w-full h-10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Simulating Authorization...
                      </>
                    ) : (
                      <>
                        Confirm Payment
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Secured by Brahmagupta payment sandbox
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}