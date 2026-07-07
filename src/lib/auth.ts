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
