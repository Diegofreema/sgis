"use server";

import { requireRole } from "@/lib/auth";
import { db, applications, payments } from "@/db";
import { eq, and } from "drizzle-orm";
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
  purpose: string;
  applicationId?: string;
  amount: number;
  currency?: string;
  targetStudentProfileId?: string;
}): Promise<ActionResult<{ paymentId: string; reference: string; isExisting: boolean }>> {
  void input;
  return { success: false, error: "Student payment flow has been removed." };
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
  void input;
  return { success: false, error: "Student payment flow has been removed." };
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

  return { success: true, data: undefined };
}
