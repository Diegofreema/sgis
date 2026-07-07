import { createRouter, createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";

// ─── Placeholder index route (replaced during page migration) ──────────
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <div className="p-8 text-foreground">Vite migration scaffold — routing online.</div>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
