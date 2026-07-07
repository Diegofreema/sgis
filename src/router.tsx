import { createRouter, createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { PublicLayout } from "@/components/public/PublicLayout";
import { NotFound } from "@/components/shared/NotFound";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { GalleryError } from "@/components/gallery/GalleryError";
import { HomePage } from "@/pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { AdmissionsPage } from "@/pages/AdmissionsPage";
import { ContactPage } from "@/pages/ContactPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { NewsArticlePage } from "@/pages/NewsArticlePage";

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

const aboutRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/about",
  component: AboutPage,
});

const admissionsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/admissions",
  component: AdmissionsPage,
});

const contactRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/contact",
  component: ContactPage,
});

const galleryRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/gallery",
  validateSearch: (search: Record<string, unknown>): { page?: number } => ({
    page: search.page ? Number(search.page) : undefined,
  }),
  component: GalleryPage,
  errorComponent: GalleryError,
});

// Note: legacy /news list is intentionally 404 (hide=true → notFound()); we
// preserve that by not defining a /news route — it falls to NotFound.
const newsArticleRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/news/$slug",
  component: NewsArticlePage,
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    homeRoute,
    aboutRoute,
    admissionsRoute,
    contactRoute,
    galleryRoute,
    newsArticleRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: ErrorBoundary,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
