"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, applications, applicationPeriods, profiles } from "@/db";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReference } from "@/lib/utils";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import { isValidAcademicSession } from "@/lib/application-periods";
import {
  sendApplicationReceivedEmail,
  sendApplicationStatusEmail,
} from "@/lib/email";
import { logActivity } from "@/lib/audit";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function isOutdatedApplicationsSchemaError(error: unknown) {
  const cause = (error as {
    cause?: { code?: string; column?: string };
  }).cause;
  return (
    cause?.code === "42P01" ||
    cause?.code === "42703" ||
    (cause?.code === "23502" && cause.column === "user_id")
  );
}

const publicApplicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(7, "Valid phone number is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  gender: z.string().trim().min(1, "Gender is required"),
  address: z.string().trim().min(1, "Address is required"),
  state: z.string().trim().optional(),
  lga: z.string().trim().optional(),
  intendedClass: z.string().trim().min(1, "Intended class is required"),
  previousSchool: z.string().trim().optional(),
  guardianName: z.string().trim().min(1, "Guardian name is required"),
  guardianPhone: z.string().trim().min(7, "Guardian phone is required"),
  guardianEmail: z.string().trim().email("Valid guardian email is required"),
});

const reviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  rejectionReason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const trackSchema = z.object({
  applicationCode: z.string().trim().min(1),
});

const MAX_RECEIPT_UPLOAD_BYTES = 100 * 1024;
const RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

type DetectedReceiptType =
  | { ext: "jpg"; mime: "image/jpeg" }
  | { ext: "png"; mime: "image/png" }
  | { ext: "webp"; mime: "image/webp" }
  | { ext: "pdf"; mime: "application/pdf" };

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function detectReceiptType(bytes: Uint8Array): DetectedReceiptType | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { ext: "pdf", mime: "application/pdf" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

function validateUpload(
  file: File | null,
  detectedType: DetectedReceiptType | null,
  label: string,
  maxBytes: number,
  maxSizeLabel: string
) {
  if (!file) return `${label} is required.`;
  if (!detectedType || !RECEIPT_TYPES.has(detectedType.mime)) {
    return `${label} must be a real JPG, PNG, WebP, or PDF file.`;
  }
  if (file.size > maxBytes) return `${label} must be ${maxSizeLabel} or smaller.`;
  return null;
}

function validateApplicationWindow(input: {
  title: string;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate?: string;
  examEndDate?: string;
}) {
  if (!isValidAcademicSession(input.title)) {
    return "Academic session must look like 2026/2027.";
  }

  const applicationStartDate = new Date(input.applicationStartDate);
  const applicationEndDate = new Date(input.applicationEndDate);
  if (Number.isNaN(applicationStartDate.getTime()) || Number.isNaN(applicationEndDate.getTime())) {
    return "Enter valid application dates.";
  }
  if (applicationStartDate >= applicationEndDate) {
    return "Application close date must be after the open date.";
  }

  if (input.examStartDate && input.examEndDate) {
    const examStartDate = new Date(input.examStartDate);
    const examEndDate = new Date(input.examEndDate);
    if (Number.isNaN(examStartDate.getTime()) || Number.isNaN(examEndDate.getTime())) {
      return "Enter valid exam dates.";
    }
    if (examStartDate >= examEndDate) {
      return "Exam end date must be after the exam start date.";
    }
  }

  return null;
}

function revalidateApplicationPeriodPaths() {
  revalidatePath("/");
  revalidatePath("/admissions");
  revalidatePath("/entrance-exam");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/application");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

async function uploadApplicationFile(input: {
  applicationCode: string;
  kind: "receipt";
  bytes: Uint8Array;
  detectedType: DetectedReceiptType;
}) {
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET_DOCUMENTS ?? "documents";
  const path = `applications/${input.applicationCode}/${input.kind}.${input.detectedType.ext}`;
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.detectedType.mime,
  });

  if (error) throw new Error(error.message);
  return { path, url: null as string | null };
}

async function generateApplicationCode() {
  if (!db) throw new Error("Service unavailable");

  for (let i = 0; i < 5; i += 1) {
    const code = generateReference("SGIS-APP").replace(/-/g, "").slice(0, 16);
    const existing = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.applicationCode, code))
      .limit(1);
    if (!existing[0]) return code;
  }

  throw new Error("Could not generate an application ID. Try again.");
}

export async function createPublicApplication(
  formData: FormData
): Promise<ActionResult<{ applicationCode: string; emailDeliveryMode: "resend" | "outbox" | "failed" }>> {
  if (!db) return { success: false, error: "Service unavailable" };

  const period = await getActiveApplicationPeriod();

  if (!period) {
    return { success: false, error: "Applications are currently closed." };
  }

  const parsed = publicApplicationSchema.safeParse({
    firstName: formValue(formData, "firstName"),
    lastName: formValue(formData, "lastName"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    dateOfBirth: formValue(formData, "dateOfBirth"),
    gender: formValue(formData, "gender"),
    address: formValue(formData, "address"),
    state: formValue(formData, "state"),
    lga: formValue(formData, "lga"),
    intendedClass: formValue(formData, "intendedClass"),
    previousSchool: formValue(formData, "previousSchool"),
    guardianName: formValue(formData, "guardianName"),
    guardianPhone: formValue(formData, "guardianPhone"),
    guardianEmail: formValue(formData, "guardianEmail"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const receipt = fileValue(formData, "receipt");
  const receiptBytes = receipt ? new Uint8Array(await receipt.arrayBuffer()) : null;
  const detectedReceiptType = receiptBytes ? detectReceiptType(receiptBytes) : null;
  const receiptError = validateUpload(
    receipt,
    detectedReceiptType,
    "Payment receipt",
    MAX_RECEIPT_UPLOAD_BYTES,
    "100KB"
  );
  if (receiptError) return { success: false, error: receiptError };

  const applicationCode = await generateApplicationCode();
  let duplicate;

  try {
    duplicate = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.applicationPeriodId, period.id),
          eq(applications.email, parsed.data.email.toLowerCase())
        )
      )
      .limit(1);
  } catch (error) {
    if (isOutdatedApplicationsSchemaError(error)) {
      return {
        success: false,
        error: "Application database is out of date. Apply the latest Supabase migration and try again.",
      };
    }
    throw error;
  }

  if (duplicate[0]) {
    return {
      success: false,
      error: "An application already exists for this email in the current session.",
    };
  }

  let receiptUpload;
  try {
    receiptUpload = await uploadApplicationFile({
      applicationCode,
      kind: "receipt",
      bytes: receiptBytes!,
      detectedType: detectedReceiptType!,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt upload failed.";
    return { success: false, error: message };
  }


  try {
    await db.insert(applications).values({
      applicationCode,
      applicationPeriodId: period.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      dateOfBirth: parsed.data.dateOfBirth,
      gender: parsed.data.gender,
      address: parsed.data.address,
      state: parsed.data.state || null,
      lga: parsed.data.lga || null,
      intendedClass: parsed.data.intendedClass,
      previousSchool: parsed.data.previousSchool || null,
      guardianName: parsed.data.guardianName,
      guardianPhone: parsed.data.guardianPhone,
      guardianEmail: parsed.data.guardianEmail,
      receiptPath: receiptUpload.path,
      receiptUrl: receiptUpload.url,
      status: "pending",
      submittedAt: new Date(),
    });
  } catch (error) {
    if (isOutdatedApplicationsSchemaError(error)) {
      return {
        success: false,
        error: "Application database is out of date. Apply the latest Supabase migration and try again.",
      };
    }
    throw error;
  }

  let emailDeliveryMode: "resend" | "outbox" | "failed" = "failed";

  try {
    const delivery = await sendApplicationReceivedEmail({
      to: parsed.data.email.toLowerCase(),
      applicantName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      applicationCode,
      sessionTitle: period.title,
    });
    emailDeliveryMode = delivery.mode;
  } catch (error) {
    console.error("[mail] Failed to send application received email:", error);
  }

  await logActivity({
    action: "application.public_created",
    entityType: "application",
    metadata: {
      applicationCode,
      email: parsed.data.email.toLowerCase(),
      periodId: period.id,
      emailDeliveryMode,
    },
  });

  revalidateApplicationPeriodPaths();
  revalidatePath("/admin/applicants");

  return { success: true, data: { applicationCode, emailDeliveryMode } };
}

export async function trackApplication(input: {
  applicationCode: string;
}): Promise<ActionResult<{ applicationId: string }>> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter your application ID." };
  if (!db) return { success: false, error: "Service unavailable" };

  const app = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.applicationCode, parsed.data.applicationCode.toUpperCase()))
    .limit(1);

  if (!app[0]) return { success: false, error: "Application not found." };
  return { success: true, data: { applicationId: app[0].id } };
}

export async function reviewApplication(
  applicationId: string,
  input: z.infer<typeof reviewSchema>
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.status === "rejected" && !parsed.data.rejectionReason) {
    return { success: false, error: "Rejection reason is required." };
  }
  if (!db) return { success: false, error: "Service unavailable" };

  const current = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!current) return { success: false, error: "Application not found." };

  await db
    .update(applications)
    .set({
      status: parsed.data.status,
      rejectionReason: parsed.data.status === "rejected" ? parsed.data.rejectionReason : null,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  if (parsed.data.notes && current.userId) {
    await db
      .update(profiles)
      .set({ notes: parsed.data.notes, updatedAt: new Date() })
      .where(eq(profiles.id, current.userId));
  }

  await sendApplicationStatusEmail({
    to: current.email,
    applicantName: `${current.firstName} ${current.lastName}`,
    applicationCode: current.applicationCode,
    status: parsed.data.status,
    rejectionReason: parsed.data.rejectionReason,
  });

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: `application.${parsed.data.status}`,
    entityType: "application",
    entityId: applicationId,
    metadata: { applicationCode: current.applicationCode },
  });

  revalidatePath("/admin/applicants");
  revalidatePath(`/admin/applicants/${applicationId}`);
  revalidatePath("/admin");

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
  eligibleClasses?: string[];
}): Promise<ActionResult<{ periodId: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };
  const validationError = validateApplicationWindow(input);
  if (validationError) return { success: false, error: validationError };

  const [period] = await db
    .insert(applicationPeriods)
    .values({
      ...input,
      eligibleClasses: input.eligibleClasses ?? [],
      applicationStartDate: new Date(input.applicationStartDate),
      applicationEndDate: new Date(input.applicationEndDate),
      examStartDate: new Date(input.examStartDate),
      examEndDate: new Date(input.examEndDate),
      registrationFee: String(input.registrationFee),
      status: "upcoming",
      createdBy: admin.id,
    })
    .returning({ id: applicationPeriods.id });

  revalidateApplicationPeriodPaths();

  return { success: true, data: { periodId: period.id } };
}

export async function updateApplicationPeriod(input: {
  periodId: string;
  title: string;
  applicationStartDate: string;
  applicationEndDate: string;
}): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const validationError = validateApplicationWindow(input);
  if (validationError) return { success: false, error: validationError };

  await db
    .update(applicationPeriods)
    .set({
      title: input.title.trim(),
      applicationStartDate: new Date(input.applicationStartDate),
      applicationEndDate: new Date(input.applicationEndDate),
      updatedAt: new Date(),
    })
    .where(eq(applicationPeriods.id, input.periodId));

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "application_period.updated",
    entityType: "application_period",
    entityId: input.periodId,
    metadata: {
      title: input.title.trim(),
      applicationStartDate: input.applicationStartDate,
      applicationEndDate: input.applicationEndDate,
    },
  });

  revalidateApplicationPeriodPaths();

  return { success: true, data: undefined };
}

export async function updateApplicationPeriodStatus(
  periodId: string,
  status: "upcoming" | "open" | "closed" | "archived"
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  if (status === "open") {
    const period = await db
      .select({
        applicationEndDate: applicationPeriods.applicationEndDate,
      })
      .from(applicationPeriods)
      .where(eq(applicationPeriods.id, periodId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!period) {
      return { success: false, error: "Application session not found." };
    }

    if (new Date() > period.applicationEndDate) {
      return { success: false, error: "Past sessions cannot be opened. Extend the closing date first." };
    }

    await db
      .update(applicationPeriods)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(applicationPeriods.status, "open"));
  }

  await db
    .update(applicationPeriods)
    .set({ status, updatedAt: new Date() })
    .where(eq(applicationPeriods.id, periodId));

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: `application_period.${status}`,
    entityType: "application_period",
    entityId: periodId,
  });

  revalidateApplicationPeriodPaths();

  return { success: true, data: undefined };
}

// Legacy dashboard compatibility. The live product no longer exposes these flows.
export async function createOrUpdateApplication(
  _input?: unknown
): Promise<ActionResult<{ applicationId: string }>> {
  void _input;
  return { success: false, error: "Applicant account applications are disabled. Use the public entrance exam form." };
}

export async function submitApplication(
  _applicationId?: string,
  _targetStudentProfileId?: string
): Promise<ActionResult> {
  void _applicationId;
  void _targetStudentProfileId;
  return { success: false, error: "Applicant account applications are disabled. Use the public entrance exam form." };
}
