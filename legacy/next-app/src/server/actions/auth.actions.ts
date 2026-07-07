"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { env } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import { getProfileByAuthId } from "@/server/queries/users.queries";
import {
  markPasswordChanged,
  markProfileEmailVerified,
} from "@/server/auth/profile-state";
import { logActivity } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function getAuthConfirmUrl(next: string) {
  const nextPath = next.startsWith("/") ? next : `/${next}`;
  return `${env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
}

function getVerifyEmailUrl(email: string) {
  return `/verify-email?email=${encodeURIComponent(email)}`;
}

function getPostLoginRedirect(profile: NonNullable<Awaited<ReturnType<typeof getProfileByAuthId>>>) {
  void profile;
  return "/admin";
}

function isEmailVerificationError(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

export async function register(
  input: { email: string; password: string; firstName: string; lastName: string }
): Promise<ActionResult<{ redirectTo: string; message: string }>> {
  void input;
  return {
    success: false,
    error: "Admin account creation is disabled.",
  };
}

export async function login(
  input: z.infer<typeof loginSchema>
): Promise<ActionResult<{ redirectTo: string; message: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (isEmailVerificationError(error.message)) {
      return {
        success: true,
        data: {
          redirectTo: getVerifyEmailUrl(email),
          message: "Verify your email before signing in.",
        },
      };
    }

    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: "Unable to sign you in right now." };
  }

  if (data.user.email_confirmed_at) {
    await markProfileEmailVerified(data.user.id, new Date(data.user.email_confirmed_at));
  }

  const profile = await getProfileByAuthId(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Your profile could not be found. Please contact support.",
    };
  }

  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Only admin accounts can sign in here.",
    };
  }

  await logActivity({
    actorId: profile.id,
    actorRole: profile.role,
    action: "user.login",
    entityType: "profile",
    entityId: profile.id,
  });

  return {
    success: true,
    data: {
      redirectTo: getPostLoginRedirect(profile),
      message: "Welcome back!",
    },
  };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(email: string): Promise<ActionResult> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: getAuthConfirmUrl("/reset-password"),
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function resendVerification(email: string): Promise<ActionResult> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: getAuthConfirmUrl("/admin"),
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updatePassword(
  input: z.infer<typeof updatePasswordSchema>
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const profile = await requireRole(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await markPasswordChanged(profile.authUserId);

  await logActivity({
    actorId: profile.id,
    actorRole: profile.role,
    action: "password.changed",
    entityType: "profile",
    entityId: profile.id,
  });

  revalidatePath("/admin");

  return {
    success: true,
    data: { redirectTo: "/admin" },
  };
}

export async function updateProfile(
  input: unknown
): Promise<ActionResult> {
  void input;
  return { success: false, error: "Profile editing is not available here." };
}

export async function createStudentAccount(
  input: unknown
): Promise<ActionResult<{ studentId: string; delivery: "smtp" | "outbox"; filePath?: string }>> {
  void input;
  return {
    success: false,
    error: "Student accounts have been removed.",
  };
}
