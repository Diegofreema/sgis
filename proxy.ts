import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Maintenance mode — production only, bypass in dev
  const maintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const isProduction = process.env.NODE_ENV === "production";

  if (maintenanceMode && isProduction && pathname !== "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  // Refresh Supabase session cookies on every request
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|maintenance|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
