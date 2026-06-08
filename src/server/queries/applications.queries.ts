import { db, applications, applicationPeriods } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import type { ApplicationPeriodStatus, ApplicationStatus } from "@/constants/statuses";

export async function getActiveApplicationPeriod() {
  if (!db) return null;

  // DB access must come before new Date() in cacheComponents mode.
  const result = await db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.status, "open"))
    .limit(1);

  const period = result[0];
  if (!period) return null;

  // Double-check dates — new Date() is safe after the DB query above.
  const now = new Date();
  if (now < period.applicationStartDate || now > period.applicationEndDate) {
    return null;
  }

  return period;
}

export async function getAllApplicationPeriods() {
  if (!db) return [];
  return db
    .select()
    .from(applicationPeriods)
    .orderBy(desc(applicationPeriods.createdAt));
}

export async function getApplicationByUser(userId: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getApplicationById(id: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function listApplications(filters?: {
  status?: ApplicationStatus;
  periodId?: string;
}) {
  if (!db) return [];
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(applications.status, filters.status));
  }
  if (filters?.periodId) {
    conditions.push(
      eq(applications.applicationPeriodId, filters.periodId)
    );
  }

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(applications)
          .where(and(...conditions))
          .orderBy(desc(applications.createdAt))
      : db.select().from(applications).orderBy(desc(applications.createdAt));

  return query;
}
