import { useEffect, useState } from "react";

export function SystemClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) {
    return <div className="text-sm text-muted-foreground tabular-nums">--:--:--</div>;
  }
  const time = now.toLocaleTimeString([], { hour12: false });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" });
  return (
    <div className="text-right">
      <div className="text-sm font-medium text-foreground tabular-nums">{time}</div>
      <div className="text-[11px] text-muted-foreground">{date}</div>
    </div>
  );
}