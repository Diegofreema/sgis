import { requireRole } from "@/lib/auth";
import { db, profiles, applications, payments } from "@/db";
import { desc, eq } from "drizzle-orm";
import { UsersAdminClient } from "./UsersAdminClient";

export default async function AdminUsersPage() {
  await requireRole(["admin"]);

  const rows = db
    ? await db
        .select({
          id: profiles.id,
          authUserId: profiles.authUserId,
          role: profiles.role,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          email: profiles.email,
          phone: profiles.phone,
          parentProfileId: profiles.parentProfileId,
          state: profiles.state,
          lga: profiles.lga,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .orderBy(desc(profiles.createdAt))
    : [];

  // Fetch application and payment status for students
  const studentIds = rows.filter((r) => r.role === "student").map((r) => r.id);

  const appStatuses = db && studentIds.length > 0
    ? await db
        .select({
          userId: applications.userId,
          status: applications.status,
        })
        .from(applications)
        .orderBy(desc(applications.createdAt))
    : [];

  const paymentStatuses = db && studentIds.length > 0
    ? await db
        .select({
          userId: payments.userId,
          status: payments.status,
        })
        .from(payments)
        .orderBy(desc(payments.createdAt))
    : [];

  const appMap = new Map<string, string>();
  for (const a of appStatuses) {
    if (!appMap.has(a.userId)) appMap.set(a.userId, a.status);
  }

  const paymentMap = new Map<string, string>();
  for (const p of paymentStatuses) {
    if (!paymentMap.has(p.userId)) paymentMap.set(p.userId, p.status);
  }

  const enriched = rows.map((r) => ({
    ...r,
    applicationStatus: r.role === "student" ? (appMap.get(r.id) ?? null) : null,
    paymentStatus: r.role === "student" ? (paymentMap.get(r.id) ?? null) : null,
  }));

  return <UsersAdminClient users={enriched} />;
}
