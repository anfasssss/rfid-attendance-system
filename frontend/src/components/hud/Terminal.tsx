import { useEffect, useRef, useState } from "react";

const seed = [
  "[SYS.OK] boot sequence complete",
  "[NET.OK] uplink → wss://gate.brahmagupta.edu",
  "[RFID.READ] UID: 2461C901 matched → Sahal Jenkins",
  "[AUTH.OK] session token issued",
  "[GATE.A] check-in acknowledged",
  "[RFID.READ] UID: 2461D7F0 matched → Anfas Jenkins",
  "[SYNC] roster hash a7f2 verified",
  "[RFID.READ] UID: FFFFFFFF unregistered → alert raised",
  "[GATE.B] check-in acknowledged",
  "[HEARTBEAT] esp32-node-3 latency 42ms",
];

export function Terminal({ extra }: { extra?: string[] }) {
  const [lines, setLines] = useState<string[]>(seed);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const uid = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
      const kinds = [
        `[RFID.READ] UID: 2462${uid} matched → Student ${Math.floor(Math.random() * 190) + 1}`,
        `[HEARTBEAT] esp32-node-${Math.floor(Math.random() * 4) + 1} latency ${20 + Math.floor(Math.random() * 60)}ms`,
        `[GATE.${["A", "B", "C"][Math.floor(Math.random() * 3)]}] check-in acknowledged`,
        `[SYNC] roster hash ${uid.slice(0, 4).toLowerCase()} verified`,
      ];
      setLines((l) => [...l.slice(-40), kinds[Math.floor(Math.random() * kinds.length)]]);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (extra?.length) setLines((l) => [...l, ...extra]);
  }, [extra]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="font-mono text-[11px] leading-relaxed text-hud-terminal/90 overflow-y-auto max-h-[420px] pr-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {lines.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-all">
          <span className="text-white/30 mr-2">
            {new Date().toLocaleTimeString([], { hour12: false })}
          </span>
          {l}
        </div>
      ))}
      <div>
        <span className="text-white/40">$</span>{" "}
        <span
          className="inline-block w-2 h-3 bg-hud-terminal align-middle"
          style={{ animation: "cursor-blink 1s steps(1) infinite" }}
        />
      </div>
    </div>
  );
}