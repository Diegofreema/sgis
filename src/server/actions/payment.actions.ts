"use server";

import { requireRole } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { db, applications, payments } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { generateReference } from "@/lib/utils";
import { ACTIVE_PAYMENT_STATUSES } from "@/constants/payment";
import type { PaymentPurpose } from "@/constants/payment";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a pending payment record for a given purpose.
 * Idempotent: returns the existing active payment if one already exists.
 */
export async function createPaymentRecord(input: {
  purpose: PaymentPurpose;
  applicationId?: string;
  amount: number;
  currency?: string;
  targetStudentProfileId?: string;
}): Promise<ActionResult<{ paymentId: string; reference: string; isExisting: boolean }>> {
  const context = await resolveManagedProfileContext(input.targetStudentProfileId);
  if (context.target.role === "parent") {
    return {
      success: false,
      error: "Select one of your students before managing payments.",
    };
  }
  if (!db) return { success: false, error: "Service unavailable" };
  if (
    !context.isManagingStudent &&
    context.target.role === "student" &&
    context.target.requiresPasswordChange
  ) {
    return {
      success: false,
      error: "Change your password before managing payments.",
    };
  }

  // Idempotency: return existing active payment to avoid duplicates
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, context.target.id),
        eq(payments.purpose, input.purpose),
        inArray(payments.status, ACTIVE_PAYMENT_STATUSES)
      )
    )
    .limit(1);

  if (existing[0]) {
    return {
      success: true,
      data: {
        paymentId: existing[0].id,
        reference: existing[0].reference,
        isExisting: true,
      },
    };
  }

  const reference = generateReference("SGIS");

  const [payment] = await db
    .insert(payments)
    .values({
      userId: context.target.id,
      applicationId: input.applicationId ?? null,
      purpose: input.purpose,
      amount: String(input.amount),
      currency: input.currency ?? "NGN",
      status: "pending",
      reference,
    })
    .returning();

  // If exam application, mark it as pending_payment
  if (
    input.purpose === "entrance_exam_registration" &&
    input.applicationId
  ) {
    await db
      .update(applications)
      .set({ status: "pending_payment", updatedAt: new Date() })
      .where(
        and(
          eq(applications.id, input.applicationId),
          eq(applications.userId, context.target.id)
        )
      );
  }

  await logActivity({
    actorId: context.target.id,
    actorRole: context.target.role,
    action: "payment.created",
    entityType: "payment",
    entityId: payment.id,
    metadata: { purpose: input.purpose, amount: input.amount, currency: input.currency ?? "NGN" },
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/students");

  return {
    success: true,
    data: { paymentId: payment.id, reference: payment.reference, isExisting: false },
  };
}

/**
 * User submits proof of payment (bank transfer receipt / transaction reference).
 */
export async function submitPaymentProof(input: {
  paymentId: string;
  transactionRef?: string;
  proofOfPaymentUrl?: string;
  proofNote?: string;
  targetStudentProfileId?: string;
}): Promise<ActionResult> {
  const context = await resolveManagedProfileContext(input.targetStudentProfileId);
  if (context.target.role === "parent") {
    return {
      success: false,
      error: "Select one of your students before submitting payment proof.",
    };
  }
  if (!db) return { success: false, error: "Service unavailable" };
  if (
    !context.isManagingStudent &&
    context.target.role === "student" &&
    context.target.requiresPasswordChange
  ) {
    return {
      success: false,
      error: "Change your password before submitting payment proof.",
    };
  }

  // Make sure the payment belongs to this user and is still pending
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, input.paymentId),
        eq(payments.userId, context.target.id)
      )
    )
    .limit(1);

  const payment = existing[0];
  if (!payment) return { success: false, error: "Payment not found" };

  if (payment.status === "approved") {
    return { success: false, error: "This payment has already been approved." };
  }
  if (payment.status === "submitted") {
    return {
      success: false,
      error: "Proof already submitted. Please wait for admin review.",
    };
  }

  if (!input.transactionRef && !input.proofOfPaymentUrl && !input.proofNote) {
    return {
      success: false,
      error: "Please provide at least a transaction reference, note, or receipt image.",
    };
  }

  await db
    .update(payments)
    .set({
      status: "submitted",
      transactionRef: input.transactionRef ?? null,
      proofOfPaymentUrl: input.proofOfPaymentUrl ?? null,
      proofNote: input.proofNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, input.paymentId));

  await logActivity({
    actorId: context.target.id,
    actorRole: context.target.role,
    action: "payment.proof_submitted",
    entityType: "payment",
    entityId: input.paymentId,
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/students");

  return { success: true, data: undefined };
}

/**
 * Admin approves a payment proof. Marks the payment as approved
 * and, for exam registrations, advances the application to submitted.
 */
export async function approvePayment(
  paymentId: string,
  adminNote?: string
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  const payment = paymentRows[0];
  if (!payment) return { success: false, error: "Payment not found" };

  await db
    .update(payments)
    .set({
      status: "approved",
      adminNote: adminNote ?? null,
      approvedBy: admin.id,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  // Advance application if this was an exam registration
  if (
    payment.purpose === "entrance_exam_registration" &&
    payment.applicationId
  ) {
    await db
      .update(applications)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applications.id, payment.applicationId),
          eq(applications.status, "pending_payment")
        )
      );
  }

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "payment.approved",
    entityType: "payment",
    entityId: paymentId,
    metadata: { adminNote },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/applicants");
  revalidatePath("/dashboard/payments");

  return { success: true, data: undefined };
}

/**
 * Admin rejects a payment proof, sending it back to pending so the user
 * can re-submit with correct proof.
 */
export async function rejectPayment(
  paymentId: string,
  adminNote?: string
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(payments)
    .set({
      status: "rejected",
      adminNote: adminNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "payment.rejected",
    entityType: "payment",
    entityId: paymentId,
    metadata: { adminNote },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/payments");

  return { success: true, data: undefined };
}
