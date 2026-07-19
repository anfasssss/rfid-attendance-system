export function Equalizer({ bars = 24 }: { bars?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-14">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-gradient-to-t from-hud-indigo via-hud-magenta to-hud-cyan origin-bottom"
          style={{
            height: "100%",
            animation: `eq-bar ${0.6 + (i % 5) * 0.15}s ease-in-out ${(i * 0.05).toFixed(2)}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}