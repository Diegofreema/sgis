import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/auth";

/**
 * Client-side auth helpers for the Vite SPA.
 * Session lives in the browser (supabase-js). Profile is read from the
 * `profiles` table via RLS. Server-side redirect guards from the legacy
 * app are recreated as route `beforeLoad` guards where needed.
 */

const PROFILE_COLS =
  "id, authUserId:auth_user_id, parentProfileId:parent_profile_id, role, firstName:first_name, lastName:last_name, email, phone, dateOfBirth:date_of_birth, gender, address, avatarUrl:avatar_url, emailVerifiedAt:email_verified_at, requiresPasswordChange:requires_password_change, passwordChangedAt:password_changed_at, previousSchool:previous_school, state, lga, guardianName:guardian_name, guardianPhone:guardian_phone, guardianEmail:guardian_email, notes, createdAt:created_at, updatedAt:updated_at";

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("auth_user_id", user.id)
    .limit(1);
  if (error) {
    console.error("[getCurrentProfile]", error);
    return null;
  }
  return (data?.[0] as unknown as UserProfile) ?? null;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = "/";
}

// ─── Auth actions (client equivalents of server/actions/auth.actions) ──

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Where to send an authenticated user (legacy getPostAuthPath → /admin). */
export function getPostAuthPath(): string {
  return "/admin";
}

function isEmailVerificationError(message: string): boolean {
  return /confirm|verif/i.test(message);
}

/**
 * Client sign-in. Preserves the legacy admin-only gate: non-admin or
 * profile-less accounts are signed back out and rejected. Server-only extras
 * (activity audit log, markProfileEmailVerified) are omitted — they require
 * service-role/DB access. Unverified emails route to /verify-email.
 */
export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ActionResult<{ redirectTo: string; message: string }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isEmailVerificationError(error.message)) {
      return {
        success: true,
        data: {
          redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
          message: "Verify your email before signing in.",
        },
      };
    }
    return { success: false, error: error.message };
  }
  if (!data.user) return { success: false, error: "Unable to sign you in right now." };

  const profile = await getCurrentProfile();
  if (!profile) {
    await supabase.auth.signOut();
    return { success: false, error: "Your profile could not be found. Please contact support." };
  }
  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    return { success: false, error: "Only admin accounts can sign in here." };
  }

  return { success: true, data: { redirectTo: getPostAuthPath(), message: "Welcome back!" } };
}

export async function resetPassword(email: string): Promise<ActionResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updatePassword({
  password,
}: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, error: error.message };
  return { success: true, data: { redirectTo: getPostAuthPath() } };
}

export async function resendVerification(email: string): Promise<ActionResult> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

/**
 * Reactive profile hook — resolves the current profile and re-resolves on
 * auth state changes (login/logout in this or another tab).
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentProfile().then((p) => {
      if (active) {
        setProfile(p);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getCurrentProfile().then((p) => active && setProfile(p));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
