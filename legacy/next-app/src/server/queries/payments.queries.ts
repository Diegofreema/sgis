import { db, payments } from "@/db";
import { eq, and, desc, inArray, sql, type SQL } from "drizzle-orm";
import type { PaymentStatus, PaymentPurpose } from "@/constants/payment";

const legacyPaymentColumns = {
  id: payments.id,
  userId: payments.userId,
  applicationId: payments.applicationId,
  purpose: payments.purpose,
  amount: payments.amount,
  currency: payments.currency,
  status: payments.status,
  reference: payments.reference,
  transactionRef: sql<string | null>`null`,
  proofOfPaymentUrl: sql<string | null>`null`,
  proofNote: sql<string | null>`null`,
  adminNote: sql<string | null>`null`,
  approvedBy: sql<string | null>`null`,
  paidAt: sql<Date | null>`null`,
  createdAt: payments.createdAt,
  updatedAt: payments.updatedAt,
};

function isMissingColumnError(error: unknown) {
  return (error as { cause?: { code?: string } }).cause?.code === "42703";
}

function isInvalidEnumError(error: unknown) {
  const cause = (error as { cause?: { code?: string; routine?: string } }).cause;
  return cause?.code === "22P02" && cause.routine === "enum_in";
}

export async function getPaymentByReference(reference: string) {
  if (!db) return null;
  let result;
  try {
    result = await db
      .select()
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await db
      .select(legacyPaymentColumns)
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);
  }
  return result[0] ?? null;
}

export async function getPaymentById(id: string) {
  if (!db) return null;
  let result;
  try {
    result = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await db
      .select(legacyPaymentColumns)
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
  }
  return result[0] ?? null;
}

export async function getPaymentsByUser(userId: string) {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return db
      .select(legacyPaymentColumns)
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }
}

export async function listPayments(filters?: {
  status?: PaymentStatus;
  purpose?: PaymentPurpose;
  userId?: string;
}) {
  if (!db) return [];
  const conditions: SQL[] = [];
  if (filters?.status) conditions.push(eq(payments.status, filters.status));
  if (filters?.purpose) conditions.push(eq(payments.purpose, filters.purpose));
  if (filters?.userId) conditions.push(eq(payments.userId, filters.userId));

  try {
    return conditions.length > 0
      ? await db
          .select()
          .from(payments)
          .where(and(...conditions))
          .orderBy(desc(payments.createdAt))
      : await db.select().from(payments).orderBy(desc(payments.createdAt));
  } catch (error) {
    if (isInvalidEnumError(error) && filters?.status === "rejected") return [];
    if (!isMissingColumnError(error)) throw error;

    return conditions.length > 0
      ? db
          .select(legacyPaymentColumns)
          .from(payments)
          .where(and(...conditions))
          .orderBy(desc(payments.createdAt))
      : db.select(legacyPaymentColumns).from(payments).orderBy(desc(payments.createdAt));
  }
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

  let result;
  try {
    result = await db
      .select()
      .from(payments)
      .where(and(...conditions))
      .limit(1);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await db
      .select(legacyPaymentColumns)
      .from(payments)
      .where(and(...conditions))
      .limit(1);
  }

  return result[0] ?? null;
}

/** Payments awaiting admin review (status = submitted) */
export async function getPendingReviewPayments() {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.status, "submitted"))
      .orderBy(desc(payments.updatedAt));
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return db
      .select(legacyPaymentColumns)
      .from(payments)
      .where(eq(payments.status, "submitted"))
      .orderBy(desc(payments.updatedAt));
  }
}
