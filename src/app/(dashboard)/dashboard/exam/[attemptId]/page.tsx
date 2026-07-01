import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db, examAttempts } from "@/db";
import { eq, and } from "drizzle-orm";
import { getExamForStudent } from "@/server/queries/exams.queries";
import { ExamPortalClient } from "./ExamPortalClient";

type Props = {
  params: Promise<{ attemptId: string }>;
};

export default async function ExamAttemptPage({ params }: Props) {
  const { attemptId } = await params;
  const profile = await requireAuth();

  if (!db) redirect("/dashboard/exam");

  // Verify attempt ownership and status
  const attempt = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.userId, profile.id)
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!attempt) redirect("/dashboard/exam");

  if (attempt.status === "submitted" || attempt.status === "graded" || attempt.status === "expired") {
    redirect("/dashboard/results");
  }

  // Check if time has expired
  if (new Date() > attempt.expiresAt && attempt.status === "in_progress") {
    redirect("/dashboard/results");
  }

  // Fetch exam questions WITHOUT correct answers
  const examData = await getExamForStudent(attempt.examId, attempt.questionOrder);
  if (!examData) redirect("/dashboard/exam");

  const secondsRemaining = Math.max(
    0,
    Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)
  );

  return (
    <ExamPortalClient
      attemptId={attemptId}
      applicationId={attempt.applicationId}
      exam={examData.exam}
      questions={examData.questions}
      secondsRemaining={secondsRemaining}
    />
  );
}
