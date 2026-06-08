import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, applications, profiles, payments } from "@/db";
import { eq } from "drizzle-orm";
import { ApplicantDetailClient } from "./ApplicantDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ApplicantDetailPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin"]);

  if (!db) redirect("/admin/applicants");

  // Fetch application with profile
  const rows = await db
    .select({
      application: applications,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(profiles, eq(applications.userId, profiles.id))
    .where(eq(applications.id, id))
    .limit(1);

  if (!rows[0]) notFound();

  const { application, profile } = rows[0];

  // Fetch payment records for this applicant
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, profile.id));

  return (
    <ApplicantDetailClient
      application={application}
      profile={profile}
      payments={paymentRows}
    />
  );
}
