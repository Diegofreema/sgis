import type { UserProfile } from "@/types/auth";

export function getPostAuthPath(profile: UserProfile | null) {
  if (!profile) return "/dashboard";
  if (profile.role === "admin") return "/admin";
  if (profile.role === "student" && profile.requiresPasswordChange) {
    return "/dashboard/profile?password=required";
  }
  return "/dashboard";
}
