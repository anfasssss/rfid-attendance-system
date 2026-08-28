import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Use hash routing in Capacitor native shells to prevent routing mismatches
  const history = typeof window !== "undefined" && (
    (window as any).Capacitor ||
    window.location.pathname.includes("index.html") ||
    window.location.href.startsWith("file:") ||
    window.location.hostname === "localhost" && !window.location.port // capacitor default is http://localhost/
  ) ? createHashHistory() : undefined;

  const container = typeof document !== "undefined" ? document.getElementById("app") : null;

  const isSPA = typeof window !== "undefined" && (
    (window as any).Capacitor ||
    window.location.pathname.includes("index.html") ||
    window.location.href.startsWith("file:") ||
    (window.location.hostname === "localhost" && !window.location.port) ||
    !container?.innerHTML ||
    container.innerHTML.trim().length === 0
  );

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ssr: isSPA ? undefined : {},
  });

  return router;
};
