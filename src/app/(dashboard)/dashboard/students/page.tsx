import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, applications, examAttempts, payments } from "@/db";
import { listProfiles } from "@/server/queries/users.queries";
import { StudentsDashboardClient } from "./StudentsDashboardClient";

type StudentSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  requiresPasswordChange: boolean;
  applicationStatus: string | null;
  paymentStatus: string | null;
  examStatus: string | null;
  createdAt: string;
};

export default async function StudentsPage() {
  const parent = await requireRole(["parent"]);
  const students = await listProfiles({ parentProfileId: parent.id });

  const summaries: StudentSummary[] = await Promise.all(
    students
      .filter((profile) => profile.role === "student")
      .map(async (student) => {
        if (!db) {
          return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            requiresPasswordChange: student.requiresPasswordChange,
            applicationStatus: null,
            paymentStatus: null,
            examStatus: null,
            createdAt: student.createdAt,
          };
        }

        const [application, payment, attempt] = await Promise.all([
          db
            .select({ status: applications.status })
            .from(applications)
            .where(eq(applications.userId, student.id))
            .orderBy(desc(applications.createdAt))
            .limit(1)
            .then((rows) => rows[0] ?? null),
          db
            .select({ status: payments.status })
            .from(payments)
            .where(eq(payments.userId, student.id))
            .orderBy(desc(payments.createdAt))
            .limit(1)
            .then((rows) => rows[0] ?? null),
          db
            .select({ status: examAttempts.status })
            .from(examAttempts)
            .where(eq(examAttempts.userId, student.id))
            .orderBy(desc(examAttempts.createdAt))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        ]);

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          requiresPasswordChange: student.requiresPasswordChange,
          applicationStatus: application?.status ?? null,
          paymentStatus: payment?.status ?? null,
          examStatus: attempt?.status ?? null,
          createdAt: student.createdAt,
        };
      })
  );

  return <StudentsDashboardClient students={summaries} />;
}
