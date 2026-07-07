"use client";

import { useAuthStore } from "@/store/auth-store";
import { isAdminRole } from "@/constants/roles";

/** Access current user profile from the client. */
export function useAuth() {
  const { profile, isLoading } = useAuthStore();

  return {
    profile,
    isLoading,
    isAuthenticated: !!profile,
    isAdmin: isAdminRole(profile?.role),
    role: profile?.role ?? null,
  };
}
