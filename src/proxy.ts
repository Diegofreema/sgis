import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { db, profiles } from "@/db";
import { eq } from "drizzle-orm";
import { normalizeUserRole } from "@/constants/roles";

/** Auth-only paths — authenticated users are sent to /dashboard instead. */
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  let currentProfile:
    | {
        role: string;
        requiresPasswordChange: boolean;
      }
    | undefined;

  if (user && db) {
    currentProfile = await db
      .select({
        role: profiles.role,
        requiresPasswordChange: profiles.requiresPasswordChange,
      })
      .from(profiles)
      .where(eq(profiles.authUserId, user.id))
      .limit(1)
      .then((rows) => rows[0]);
  }

  // ─── Redirect authenticated users away from all auth pages ──────────
  if (user && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const role = normalizeUserRole(currentProfile?.role);
    const redirectTo =
      role === "admin"
        ? "/admin"
        : role === "student" && currentProfile?.requiresPasswordChange
          ? "/dashboard/profile?password=required"
          : "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // ─── Protect dashboard routes ────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (
      normalizeUserRole(currentProfile?.role) === "student" &&
      currentProfile?.requiresPasswordChange &&
      pathname !== "/dashboard/profile"
    ) {
      return NextResponse.redirect(
        new URL("/dashboard/profile?password=required", request.url)
      );
    }

    return response;
  }

  // ─── Protect admin routes ────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    try {
      const role = normalizeUserRole(currentProfile?.role);
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request except:
     * - Next.js internals (_next/static, _next/image)
     * - favicon.ico
     * - Static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
