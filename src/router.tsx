import { createRouter, createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { PublicLayout } from "@/components/public/PublicLayout";
import { HomePage } from "@/pages/HomePage";

// ─── Public route group (app/(public)/layout.tsx) ──────────────────────
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  component: PublicLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/",
  component: HomePage,
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([homeRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
