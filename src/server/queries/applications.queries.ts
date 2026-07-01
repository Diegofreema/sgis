import { db, applications, applicationPeriods, profiles } from "@/db";
import { count, eq, and, desc, ilike, or, sql, type SQL } from "drizzle-orm";
import type { ApplicationStatus } from "@/constants/statuses";
import { isApplicationPeriodActive } from "@/lib/application-periods";

const legacyApplicationColumns = {
  id: applications.id,
  userId: applications.userId,
  applicationPeriodId: applications.applicationPeriodId,
  applicationCode: sql<string>`'SGIS-' || upper(substr(replace(${applications.id}::text, '-', ''), 1, 10))`,
  firstName: sql<string>`coalesce(${profiles.firstName}, ${applications.guardianName}, 'Applicant')`,
  lastName: sql<string>`coalesce(${profiles.lastName}, '')`,
  email: sql<string>`coalesce(${profiles.email}, ${applications.guardianEmail}, 'Not provided')`,
  phone: sql<string>`coalesce(${profiles.phone}, ${applications.guardianPhone}, 'Not provided')`,
  dateOfBirth: sql<string>`coalesce(${profiles.dateOfBirth}, 'Not provided')`,
  gender: sql<string>`coalesce(${profiles.gender}::text, 'Not provided')`,
  address: sql<string>`coalesce(${profiles.address}, 'Not provided')`,
  state: sql<string | null>`null`,
  lga: sql<string | null>`null`,
  intendedClass: applications.intendedClass,
  previousSchool: applications.previousSchool,
  guardianName: applications.guardianName,
  guardianPhone: applications.guardianPhone,
  guardianEmail: applications.guardianEmail,
  passportPhotoUrl: sql<string | null>`null`,
  passportPhotoPath: sql<string | null>`null`,
  receiptUrl: sql<string | null>`null`,
  receiptPath: sql<string | null>`null`,
  paymentReference: sql<string | null>`null`,
  paymentNote: sql<string | null>`null`,
  documentUrls: applications.documentUrls,
  status: applications.status,
  submittedAt: applications.submittedAt,
  reviewedAt: applications.reviewedAt,
  reviewedBy: applications.reviewedBy,
  rejectionReason: applications.rejectionReason,
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
};

function isMissingColumnError(error: unknown) {
  return (error as { cause?: { code?: string } }).cause?.code === "42703";
}

function isInvalidEnumError(error: unknown) {
  const cause = (error as { cause?: { code?: string; routine?: string } }).cause;
  return cause?.code === "22P02" && cause.routine === "enum_in";
}

export async function getActiveApplicationPeriod() {
  if (!db) return null;

  const result = await getOpenApplicationPeriods();
  return result.find((period) => isApplicationPeriodActive(period)) ?? null;
}

export async function getLatestOpenApplicationPeriod() {
  if (!db) return null;
  const result = await getOpenApplicationPeriods();
  return result[0] ?? null;
}

export async function getAllApplicationPeriods() {
  if (!db) return [];
  return db
    .select()
    .from(applicationPeriods)
    .orderBy(desc(applicationPeriods.createdAt));
}

async function getOpenApplicationPeriods() {
  if (!db) return [];

  // DB access must come before new Date() in cacheComponents mode.
  return db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.status, "open"))
    .orderBy(desc(applicationPeriods.applicationStartDate))
    .limit(10);
}

export async function getApplicationByUser(userId: string) {
  if (!db) return null;
  let result;
  try {
    result = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt))
      .limit(1);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await db
      .select(legacyApplicationColumns)
      .from(applications)
      .leftJoin(profiles, eq(applications.userId, profiles.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt))
      .limit(1);
  }
  return result[0] ?? null;
}

export async function getApplicationById(id: string) {
  if (!db) return null;
  let result;
  try {
    result = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    result = await db
      .select(legacyApplicationColumns)
      .from(applications)
      .leftJoin(profiles, eq(applications.userId, profiles.id))
      .where(eq(applications.id, id))
      .limit(1);
  }
  return result[0] ?? null;
}

export async function getApplicationByCodeAndEmail(applicationCode: string, email: string) {
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.applicationCode, applicationCode.trim().toUpperCase()),
          eq(applications.email, email.trim().toLowerCase())
        )
      )
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return null;
  }
}

export async function getApplicationWithPeriodByCode(applicationCode: string) {
  if (!db) return null;
  try {
    const result = await db
      .select({ application: applications, period: applicationPeriods })
      .from(applications)
      .innerJoin(applicationPeriods, eq(applications.applicationPeriodId, applicationPeriods.id))
      .where(eq(applications.applicationCode, applicationCode.trim().toUpperCase()))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return null;
  }
}

type ListApplicationsFilters = {
  status?: ApplicationStatus;
  periodId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

function buildApplicationFilters(filters?: ListApplicationsFilters) {
  const conditions: SQL[] = [];
  const legacyConditions: SQL[] = [];

  if (filters?.status) {
    conditions.push(eq(applications.status, filters.status));
    if (filters.status === "pending") {
      legacyConditions.push(
        or(
          eq(applications.status, "draft"),
          eq(applications.status, "pending_payment"),
          eq(applications.status, "submitted"),
          eq(applications.status, "under_review")
        )!
      );
    } else {
      legacyConditions.push(eq(applications.status, filters.status));
    }
  }

  if (filters?.periodId) {
    const condition = eq(applications.applicationPeriodId, filters.periodId);
    conditions.push(condition);
    legacyConditions.push(condition);
  }

  if (filters?.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(applications.applicationCode, q),
        ilike(applications.firstName, q),
        ilike(applications.lastName, q),
        ilike(applications.email, q),
        ilike(applications.phone, q)
      )!
    );
    legacyConditions.push(
      or(
        ilike(profiles.firstName, q),
        ilike(profiles.lastName, q),
        ilike(profiles.email, q),
        ilike(profiles.phone, q),
        ilike(applications.guardianName, q),
        ilike(applications.guardianPhone, q),
        ilike(applications.guardianEmail, q)
      )!
    );
  }

  return { conditions, legacyConditions };
}

function applyPagination<T>(query: T, filters?: ListApplicationsFilters) {
  if (!filters?.pageSize) return query;
  const page = Math.max(filters.page ?? 1, 1);
  return (query as { limit: (value: number) => { offset: (value: number) => T } })
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);
}

export async function countApplications(filters?: ListApplicationsFilters) {
  if (!db) return 0;
  const { conditions, legacyConditions } = buildApplicationFilters(filters);

  try {
    const result = conditions.length > 0
      ? await db
          .select({ count: count() })
          .from(applications)
          .where(and(...conditions))
      : await db.select({ count: count() }).from(applications);

    return Number(result[0]?.count ?? 0);
  } catch (error) {
    if (!isMissingColumnError(error) && !isInvalidEnumError(error)) throw error;

    const result = legacyConditions.length > 0
      ? await db
          .select({ count: count() })
          .from(applications)
          .leftJoin(profiles, eq(applications.userId, profiles.id))
          .where(and(...legacyConditions))
      : await db
          .select({ count: count() })
          .from(applications)
          .leftJoin(profiles, eq(applications.userId, profiles.id));

    return Number(result[0]?.count ?? 0);
  }
}

export async function listApplications(filters?: ListApplicationsFilters) {
  if (!db) return [];
  const { conditions, legacyConditions } = buildApplicationFilters(filters);

  try {
    return conditions.length > 0
      ? await applyPagination(
          db
            .select()
            .from(applications)
            .where(and(...conditions))
            .orderBy(desc(applications.createdAt)),
          filters
        )
      : await applyPagination(
          db.select().from(applications).orderBy(desc(applications.createdAt)),
          filters
        );
  } catch (error) {
    if (!isMissingColumnError(error) && !isInvalidEnumError(error)) throw error;

    return legacyConditions.length > 0
      ? applyPagination(
          db
            .select(legacyApplicationColumns)
            .from(applications)
            .leftJoin(profiles, eq(applications.userId, profiles.id))
            .where(and(...legacyConditions))
            .orderBy(desc(applications.createdAt)),
          filters
        )
      : applyPagination(
          db
            .select(legacyApplicationColumns)
            .from(applications)
            .leftJoin(profiles, eq(applications.userId, profiles.id))
            .orderBy(desc(applications.createdAt)),
          filters
        );
  }
}
