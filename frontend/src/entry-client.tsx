import { RouterProvider } from "@tanstack/react-router";
import { hydrateRoot, createRoot } from "react-dom/client";
import { getRouter } from "./router";

const container = document.getElementById("app");

const isSPA = typeof window !== "undefined" && (
  (window as any).Capacitor ||
  window.location.protocol === "file:" ||
  window.location.pathname.includes("index.html") ||
  (window.location.hostname === "localhost" && !window.location.port)
);

if (container && isSPA) {
  // Standalone client-only SPA mode (for APK share / Capacitor native shell)
  const router = getRouter();
  const root = createRoot(container);
  root.render(<RouterProvider router={router} />);
} else if (container) {
  // Hydration mode (for Dev Server / SSR)
  import("@tanstack/react-start/client").then(({ StartClient }) => {
    hydrateRoot(document, <StartClient />);
  });
}
