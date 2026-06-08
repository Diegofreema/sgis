"use server";

import { z } from "zod";
import { db, applications, applicationPeriods, profiles } from "@/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { canApplyForEntranceExam } from "@/lib/permissions";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import type { ApplicationPeriod } from "@/types/application";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const applicationSchema = z.object({
  targetStudentProfileId: z.string().uuid().optional(),
  intendedClass: z.string().min(1, "Intended class is required"),
  previousSchool: z.string().optional(),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  guardianEmail: z.string().email("Valid email required"),
});

export async function createOrUpdateApplication(
  input: z.infer<typeof applicationSchema>
): Promise<ActionResult<{ applicationId: string }>> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const context = await resolveManagedProfileContext(parsed.data.targetStudentProfileId);
  if (context.target.role === "parent") {
    return {
      success: false,
      error: "Select one of your students before starting an application.",
    };
  }
  if (
    !context.isManagingStudent &&
    context.target.role === "student" &&
    context.target.requiresPasswordChange
  ) {
    return {
      success: false,
      error: "Change your password before updating your application.",
    };
  }

  const period = await getActiveApplicationPeriod();

  // Convert DB period to type
  const typedPeriod: ApplicationPeriod | null = period
    ? {
        id: period.id,
        title: period.title,
        description: period.description,
        applicationStartDate: period.applicationStartDate.toISOString(),
        applicationEndDate: period.applicationEndDate.toISOString(),
        examStartDate: period.examStartDate.toISOString(),
        examEndDate: period.examEndDate.toISOString(),
        registrationFee: Number(period.registrationFee),
        currency: period.currency,
        eligibleClasses: period.eligibleClasses as string[],
        status: period.status,
        createdBy: period.createdBy ?? "",
        createdAt: period.createdAt.toISOString(),
        updatedAt: period.updatedAt.toISOString(),
      }
    : null;

  if (!canApplyForEntranceExam(context.target, typedPeriod)) {
    return {
      success: false,
      error: "Entrance examination applications are currently closed.",
    };
  }

  if (!db || !period) {
    return { success: false, error: "Service unavailable" };
  }

  // Check for existing application in this period
  const existing = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.userId, context.target.id),
        eq(applications.applicationPeriodId, period.id)
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing
    await db
      .update(applications)
      .set({
        intendedClass: parsed.data.intendedClass,
        previousSchool: parsed.data.previousSchool,
        guardianName: parsed.data.guardianName,
        guardianPhone: parsed.data.guardianPhone,
        guardianEmail: parsed.data.guardianEmail,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, existing[0].id));

    return { success: true, data: { applicationId: existing[0].id } };
  }

  // Create new
  const [newApp] = await db
    .insert(applications)
    .values({
      userId: context.target.id,
      applicationPeriodId: period.id,
      intendedClass: parsed.data.intendedClass,
      previousSchool: parsed.data.previousSchool,
      guardianName: parsed.data.guardianName,
      guardianPhone: parsed.data.guardianPhone,
      guardianEmail: parsed.data.guardianEmail,
      status: "draft",
    })
    .returning({ id: applications.id });

  return { success: true, data: { applicationId: newApp.id } };
}

export async function submitApplication(
  applicationId: string,
  targetStudentProfileId?: string
): Promise<ActionResult> {
  const context = await resolveManagedProfileContext(targetStudentProfileId);
  if (context.target.role === "parent") {
    return {
      success: false,
      error: "Select one of your students before submitting an application.",
    };
  }
  if (!db) return { success: false, error: "Service unavailable" };

  const result = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, context.target.id)
      )
    )
    .limit(1);

  const app = result[0];
  if (!app) return { success: false, error: "Application not found" };
  if (app.status !== "pending_payment") {
    return { success: false, error: "Payment must be completed before submission" };
  }

  await db
    .update(applications)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  return { success: true, data: undefined };
}

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected", "under_review"]),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function reviewApplication(
  applicationId: string,
  input: z.infer<typeof reviewSchema>
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(applications)
    .set({
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason ?? null,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Update admin notes on profile if provided
  if (parsed.data.notes) {
    const app = await db
      .select({ userId: applications.userId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (app[0]) {
      await db
        .update(profiles)
        .set({ notes: parsed.data.notes, updatedAt: new Date() })
        .where(eq(profiles.id, app[0].userId));
    }
  }

  return { success: true, data: undefined };
}

export async function createApplicationPeriod(input: {
  title: string;
  description?: string;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate: string;
  examEndDate: string;
  registrationFee: number;
  currency: string;
  eligibleClasses: string[];
}): Promise<ActionResult<{ periodId: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const [period] = await db
    .insert(applicationPeriods)
    .values({
      ...input,
      applicationStartDate: new Date(input.applicationStartDate),
      applicationEndDate: new Date(input.applicationEndDate),
      examStartDate: new Date(input.examStartDate),
      examEndDate: new Date(input.examEndDate),
      registrationFee: String(input.registrationFee),
      status: "upcoming",
      createdBy: admin.id,
    })
    .returning({ id: applicationPeriods.id });

  return { success: true, data: { periodId: period.id } };
}
