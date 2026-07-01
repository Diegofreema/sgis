import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, examAttempts, exams } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getApplicationById } from "@/server/queries/applications.queries";
import { env } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPLICATION_SUPPORTING_DOCUMENTS } from "@/lib/application-documents";
import { ApplicantDetailClient } from "./ApplicantDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

async function getSignedDocumentUrl(path: string | null) {
  if (!path) return null;

  try {
    const supabase = createAdminClient();
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET_DOCUMENTS ?? "documents";
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error("[storage] Failed to sign document URL:", error.message);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    if (env.NODE_ENV !== "production") {
      console.error("[storage] Failed to create document URL:", error);
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
    ? await getSignedDocumentUrl(application.receiptPath)
    : application.receiptUrl;
  const supportingDocumentUrls = await Promise.all(
    APPLICATION_SUPPORTING_DOCUMENTS.map(async (document, index) => ({
      label: document.label,
      url: await getSignedDocumentUrl(application.documentUrls?.[index] ?? null),
    }))
  );

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
      supportingDocuments={supportingDocumentUrls}
      examAttempt={attempt}
    />
  );
}
