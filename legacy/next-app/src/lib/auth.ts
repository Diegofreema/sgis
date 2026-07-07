/**
 * Server-side auth helpers.
 * Use these in Server Components and Server Actions.
 *
 * Both `getCurrentUser` and `getCurrentProfile` are wrapped in React's
 * `cache()`, which deduplicates calls within a single request.  This means
 * calling them from the layout AND the page costs only one Supabase round-trip
 * and one DB query — not two.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db, profiles } from "@/db";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/constants/roles";
import type { UserProfile } from "@/types/auth";
import { toUserProfile } from "@/server/queries/users.queries";

/**
 * Returns the currently authenticated Supabase user, or null.
 * Deduplicated per request via React cache().
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the user's profile from the database, or null.
 * Deduplicated per request via React cache().
 */
export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user || !db) return null;

  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, user.id))
    .limit(1);

  if (!result[0]) return null;

  return toUserProfile(result[0]);
});

/**
 * Requires authentication. Redirects to /login if not authenticated.
 * Returns the profile. Deduplicated per request.
 */
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

/**
 * Requires a specific role. Redirects if the user doesn't have it.
 * Deduplicated per request (calls getCurrentProfile which is cached).
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo = "/admin"
): Promise<UserProfile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) {
    redirect(redirectTo);
  }
  return profile;
}
