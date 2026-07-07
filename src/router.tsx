import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { PublicLayout } from "@/components/public/PublicLayout";
import { AuthShell } from "@/components/auth/AuthShell";
import { NotFound } from "@/components/shared/NotFound";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { GalleryError } from "@/components/gallery/GalleryError";
import { getCurrentProfile } from "@/lib/auth";
import { HomePage } from "@/pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { AdmissionsPage } from "@/pages/AdmissionsPage";
import { ContactPage } from "@/pages/ContactPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { NewsArticlePage } from "@/pages/NewsArticlePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AnnouncementsPage } from "@/pages/admin/AnnouncementsPage";
import { AdminGalleryPage } from "@/pages/admin/AdminGalleryPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminApplicantsPage } from "@/pages/admin/AdminApplicantsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminQuestionBankPage } from "@/pages/admin/AdminQuestionBankPage";
import { AdminExamsPage } from "@/pages/admin/AdminExamsPage";
import { AdminExamDetailPage } from "@/pages/admin/AdminExamDetailPage";
import { AdminExamResultsPage } from "@/pages/admin/AdminExamResultsPage";
import { AdminError } from "@/components/admin/AdminError";

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

// ─── Auth route group (app/(auth)/layout.tsx) ──────────────────────────
// Guard: authenticated users are redirected away from auth pages. Legacy
// sent them to /admin (legacy-only); the SPA sends them home.
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  component: AuthShell,
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (profile) throw redirect({ to: "/" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/login",
  component: LoginPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const registerRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/register",
  component: RegisterPage,
});

// ─── Account route group (app/(account)/layout.tsx) — no guard ─────────
const accountLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "account",
  component: AuthShell,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: "/verify-email",
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: VerifyEmailPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

// ─── Admin route group (app/(admin)/layout.tsx) — admin-only guard ─────
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
  errorComponent: AdminError,
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): { period?: string } => ({
    period: typeof search.period === "string" ? search.period : undefined,
  }),
  component: AdminDashboard,
});

const adminAnnouncementsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/announcements",
  component: AnnouncementsPage,
});

const adminGalleryRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/gallery",
  validateSearch: (search: Record<string, unknown>): { page?: number } => ({
    page: search.page ? Number(search.page) : undefined,
  }),
  component: AdminGalleryPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/settings",
  component: AdminSettingsPage,
});

const adminApplicantsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/applicants",
  validateSearch: (search: Record<string, unknown>): { page?: number; period?: string; q?: string } => ({
    page: search.page ? Number(search.page) : undefined,
    period: typeof search.period === "string" ? search.period : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: AdminApplicantsPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/users",
  component: AdminUsersPage,
});

const adminQuestionBankRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/question-bank",
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; subject?: string; difficulty?: string; page?: number } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    subject: typeof search.subject === "string" ? search.subject : undefined,
    difficulty: typeof search.difficulty === "string" ? search.difficulty : undefined,
    page: search.page ? Number(search.page) : undefined,
  }),
  component: AdminQuestionBankPage,
});

const adminExamsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/exams",
  component: AdminExamsPage,
});

const adminExamDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/exams/$id",
  component: AdminExamDetailPage,
});

const adminExamResultsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/exams/$id/results",
  validateSearch: (search: Record<string, unknown>): { page?: number } => ({
    page: search.page ? Number(search.page) : undefined,
  }),
  component: AdminExamResultsPage,
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
  authLayoutRoute.addChildren([loginRoute, forgotPasswordRoute, registerRoute]),
  accountLayoutRoute.addChildren([verifyEmailRoute, resetPasswordRoute]),
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminAnnouncementsRoute,
    adminGalleryRoute,
    adminSettingsRoute,
    adminApplicantsRoute,
    adminUsersRoute,
    adminQuestionBankRoute,
    adminExamsRoute,
    adminExamDetailRoute,
    adminExamResultsRoute,
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
