import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { db, payments, applications } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { ProfileFormClient } from "./ProfileFormClient";

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);

  // Profile is locked once payment or application is approved for the student
  let isProfileLocked = false;
  if (context.target.role === "student" && db) {
    const [approvedPayment, approvedApp] = await Promise.all([
      db
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            eq(payments.userId, context.target.id),
            eq(payments.status, "approved")
          )
        )
        .limit(1),
      db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.userId, context.target.id),
            inArray(applications.status, ["approved", "submitted", "under_review"])
          )
        )
        .limit(1),
    ]);
    isProfileLocked = approvedPayment.length > 0 || approvedApp.length > 0;
  }

  return (
    <ProfileFormClient
      actor={context.actor}
      profile={context.target}
      isManagingStudent={context.isManagingStudent}
      isProfileLocked={isProfileLocked}
    />
  );
}
