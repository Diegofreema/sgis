"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, profiles } from "@/db";
import { requireRole } from "@/lib/auth";
import { env } from "@/config/env";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertMailConfigured, sendStudentCredentialsEmail } from "@/lib/email";
import { generateTemporaryPassword } from "@/lib/utils";
import { getProfileByAuthId } from "@/server/queries/users.queries";
import {
  markPasswordChanged,
  markProfileEmailVerified,
} from "@/server/auth/profile-state";
import { logActivity } from "@/lib/audit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

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

const updateProfileSchema = z.object({
  targetStudentProfileId: z.string().uuid().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Valid guardian email required",
    }),
});

const createStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
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
  if (profile.role === "admin") return "/admin";
  if (profile.role === "student" && profile.requiresPasswordChange) {
    return "/dashboard/profile?password=required";
  }
  return "/dashboard";
}

function isEmailVerificationError(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

function getSupabaseAdminAuthErrorMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";

  if (
    normalized.includes("user not allowed") ||
    normalized.includes("not_admin") ||
    normalized.includes("service_role") ||
    normalized.includes("supabase_admin")
  ) {
    return "SUPABASE_SERVICE_ROLE_KEY is not authorized for Supabase admin auth operations. Update it with the project's real service-role key before creating students or admins.";
  }

  return message ?? "Unable to complete the admin auth request.";
}

export async function register(
  input: z.infer<typeof registerSchema>
): Promise<ActionResult<{ redirectTo: string; message: string }>> {
  void input;
  return {
    success: false,
    error: "Account creation is disabled. Applicants should use the public entrance exam form.",
  };
/*
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password, firstName, lastName } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthConfirmUrl("/dashboard"),
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user && db) {
    await db
      .insert(profiles)
      .values({
        authUserId: data.user.id,
        email,
        firstName,
        lastName,
        role: "parent",
        emailVerifiedAt: data.user.email_confirmed_at
          ? new Date(data.user.email_confirmed_at)
          : null,
      })
      .onConflictDoUpdate({
        target: profiles.authUserId,
        set: {
          email,
          firstName,
          lastName,
          role: "parent",
          emailVerifiedAt: data.user.email_confirmed_at
            ? new Date(data.user.email_confirmed_at)
            : null,
          updatedAt: new Date(),
        },
      });
  }

  if (data.user) {
    await logActivity({
      action: "user.registered",
      entityType: "profile",
      metadata: { email, role: "parent" },
    });
  }

  return {
    success: true,
    data: {
      redirectTo: getVerifyEmailUrl(email),
      message: "Account created. Verify your email to continue.",
    },
  };
*/
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
      emailRedirectTo: getAuthConfirmUrl("/dashboard"),
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

  const { target: profile } = await resolveManagedProfileContext();
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/students");

  return {
    success: true,
    data: { redirectTo: profile.role === "admin" ? "/admin" : "/dashboard" },
  };
}

export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const context = await resolveManagedProfileContext(parsed.data.targetStudentProfileId);
  if (
    !context.isManagingStudent &&
    context.target.role === "student" &&
    context.target.requiresPasswordChange
  ) {
    return {
      success: false,
      error: "Change your password first before editing your profile.",
    };
  }
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(profiles)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      dateOfBirth: parsed.data.dateOfBirth || null,
      gender: parsed.data.gender ?? null,
      address: parsed.data.address || null,
      previousSchool: parsed.data.previousSchool || null,
      state: parsed.data.state || null,
      lga: parsed.data.lga || null,
      guardianName: parsed.data.guardianName || null,
      guardianPhone: parsed.data.guardianPhone || null,
      guardianEmail: parsed.data.guardianEmail || null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, context.target.id));

  await logActivity({
    actorId: context.target.id,
    actorRole: context.target.role,
    action: "profile.updated",
    entityType: "profile",
    entityId: context.target.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/students");

  return { success: true, data: undefined };
}

export async function createStudentAccount(
  input: z.infer<typeof createStudentSchema>
): Promise<ActionResult<{ studentId: string; delivery: "smtp" | "outbox"; filePath?: string }>> {
  void input;
  return {
    success: false,
    error: "Student account creation is disabled. Applicants should use the public entrance exam form.",
  };
/*
  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const parent = await requireRole(["parent"]);
  if (!db) return { success: false, error: "Service unavailable" };

  assertMailConfigured();

  const adminClient = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { email, firstName, lastName, phone, dateOfBirth } = parsed.data;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "student" },
  });

  if (error || !data.user) {
    return {
      success: false,
      error: getSupabaseAdminAuthErrorMessage(error?.message),
    };
  }

  try {
    const inserted = await db
      .insert(profiles)
      .values({
        authUserId: data.user.id,
        parentProfileId: parent.id,
        role: "student",
        firstName,
        lastName,
        email,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        guardianName: `${parent.firstName ?? ""} ${parent.lastName ?? ""}`.trim() || null,
        guardianPhone: parent.phone,
        guardianEmail: parent.email,
        emailVerifiedAt: new Date(),
        requiresPasswordChange: true,
      })
      .returning({ id: profiles.id });

    const delivery = await sendStudentCredentialsEmail({
      studentEmail: email,
      studentName: `${firstName} ${lastName}`.trim(),
      parentName: `${parent.firstName ?? ""} ${parent.lastName ?? ""}`.trim() || "Your parent",
      password: temporaryPassword,
    });

    await logActivity({
      actorId: parent.id,
      actorRole: "parent",
      action: "student.created",
      entityType: "profile",
      entityId: inserted[0].id,
      metadata: { studentEmail: email },
    });

    revalidatePath("/dashboard/students");

    return {
      success: true,
      data:
        delivery.mode === "outbox"
          ? { studentId: inserted[0].id, delivery: "outbox", filePath: delivery.filePath }
          : { studentId: inserted[0].id, delivery: "smtp" },
    };
  } catch (cause) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    return {
      success: false,
      error:
        cause instanceof Error
          ? cause.message
          : "The student account could not be created.",
    };
  }
*/
}
