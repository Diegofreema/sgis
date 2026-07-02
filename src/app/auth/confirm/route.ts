import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getProfileByAuthId } from "@/server/queries/users.queries";
import { markProfileEmailVerified } from "@/server/auth/profile-state";

function getRedirectDestination(nextPath: string, profile: Awaited<ReturnType<typeof getProfileByAuthId>>) {
  if (nextPath === "/reset-password") return nextPath;
  void profile;
  return "/admin";
}

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/admin";
  }

  return nextPath;
}

function isSupportedOtpType(type: string | null): type is EmailOtpType {
  return type === "signup" || type === "recovery" || type === "invite" || type === "magiclink";
}

function createRedirectResponse(
  request: NextRequest,
  nextPath: string,
  cookiesToSet: Array<{ name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }>
) {
  const response = NextResponse.redirect(new URL(nextPath, request.url));
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  let response = createRedirectResponse(request, nextPath, pendingCookies);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
          response = createRedirectResponse(request, nextPath, pendingCookies);
        },
      },
    }
  );

  if (!code && !(tokenHash && isSupportedOtpType(type))) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", request.url));
  }

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type!,
      });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    await markProfileEmailVerified(user.id, new Date(user.email_confirmed_at));
  }

  const profile = user ? await getProfileByAuthId(user.id) : null;
  const destination = getRedirectDestination(nextPath, profile);

  response = createRedirectResponse(request, destination, pendingCookies);
  return response;
}
