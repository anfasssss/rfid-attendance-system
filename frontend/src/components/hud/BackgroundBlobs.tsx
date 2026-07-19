export function BackgroundBlobs() {
  return (
    <>
      <div
        className="blob"
        style={{
          top: "-10%",
          left: "-10%",
          width: "55vw",
          height: "55vw",
          background: "radial-gradient(circle at 30% 30%, hsl(252 100% 65%), transparent 70%)",
          animation: "blob-drift-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "55vw",
          height: "55vw",
          background: "radial-gradient(circle at 60% 60%, hsl(171 100% 55%), transparent 70%)",
          animation: "blob-drift-2 28s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          top: "20%",
          left: "40%",
          width: "45vw",
          height: "45vw",
          background: "radial-gradient(circle at 50% 50%, hsl(320 100% 60%), transparent 70%)",
          animation: "blob-drift-3 34s ease-in-out infinite",
          opacity: 0.35,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
    </>
  );
}