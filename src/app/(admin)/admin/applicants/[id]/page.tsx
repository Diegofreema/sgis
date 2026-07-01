import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, examAttempts, exams } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getApplicationById } from "@/server/queries/applications.queries";
import { env } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApplicantDetailClient } from "./ApplicantDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

async function getReceiptUrl(receiptPath: string | null) {
  if (!receiptPath) return null;

  try {
    const supabase = createAdminClient();
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET_DOCUMENTS ?? "documents";
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(receiptPath, 3600);

    if (error) {
      console.error("[storage] Failed to sign receipt URL:", error.message);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    if (env.NODE_ENV !== "production") {
      console.error("[storage] Failed to create receipt URL:", error);
    }
    return null;
  }
}

export default async function ApplicantDetailPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin"]);

  if (!db) redirect("/admin/applicants");

  const application = await getApplicationById(id);

  if (!application) notFound();

  const receiptUrl = application.receiptPath
    ? await getReceiptUrl(application.receiptPath)
    : application.receiptUrl;

  const attempt = await db
    .select({ attempt: examAttempts, exam: exams })
    .from(examAttempts)
    .innerJoin(exams, eq(examAttempts.examId, exams.id))
    .where(eq(examAttempts.applicationId, application.id))
    .orderBy(desc(examAttempts.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return (
    <ApplicantDetailClient
      application={{
        ...application,
        receiptUrl,
      }}
      examAttempt={attempt}
    />
  );
}
