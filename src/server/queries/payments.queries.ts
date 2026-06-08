import { db, payments } from "@/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { PaymentStatus, PaymentPurpose } from "@/constants/payment";

export async function getPaymentByReference(reference: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, reference))
    .limit(1);
  return result[0] ?? null;
}

export async function getPaymentById(id: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getPaymentsByUser(userId: string) {
  if (!db) return [];
  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
}

export async function listPayments(filters?: {
  status?: PaymentStatus;
  purpose?: PaymentPurpose;
  userId?: string;
}) {
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(payments.status, filters.status));
  if (filters?.purpose) conditions.push(eq(payments.purpose, filters.purpose));
  if (filters?.userId) conditions.push(eq(payments.userId, filters.userId));

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(payments)
          .where(and(...conditions))
          .orderBy(desc(payments.createdAt))
      : db.select().from(payments).orderBy(desc(payments.createdAt));

  return query;
}

export async function getActivePayment(
  userId: string,
  purpose: PaymentPurpose,
  applicationId?: string
) {
  if (!db) return null;
  const conditions = [
    eq(payments.userId, userId),
    eq(payments.purpose, purpose),
    inArray(payments.status, ["pending", "submitted", "approved"]),
  ];
  if (applicationId) {
    conditions.push(eq(payments.applicationId, applicationId));
  }

  const result = await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .limit(1);

  return result[0] ?? null;
}

/** Payments awaiting admin review (status = submitted) */
export async function getPendingReviewPayments() {
  if (!db) return [];
  return db
    .select()
    .from(payments)
    .where(eq(payments.status, "submitted"))
    .orderBy(desc(payments.updatedAt));
}
