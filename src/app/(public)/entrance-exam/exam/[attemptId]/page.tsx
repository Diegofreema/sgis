import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { db, examAttempts } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getExamForStudent, getVerifiedPublicExamAccess } from "@/server/queries/exams.queries";
import { ExamPortalClient } from "@/app/(dashboard)/dashboard/exam/[attemptId]/ExamPortalClient";

type Props = {
  params: Promise<{ attemptId: string }>;
};

export default async function PublicExamPage({ params }: Props) {
  await connection();
  const { attemptId } = await params;
  if (!db) redirect("/entrance-exam");

  const access = await getVerifiedPublicExamAccess();
  if (access.state !== "ready" || !access.application || !access.exam) {
    return <PublicExamAccessState state={access.state} />;
  }

  const attempt = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.applicationId, access.application.id),
        eq(examAttempts.examId, access.exam.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!attempt) notFound();
  if (attempt.status === "graded" || attempt.status === "submitted" || attempt.status === "expired") {
    redirect(`/entrance-exam?applicationId=${encodeURIComponent(access.application.applicationCode)}#status`);
  }
  if (new Date() > attempt.expiresAt && attempt.status === "in_progress") {
    redirect(`/entrance-exam?applicationId=${encodeURIComponent(access.application.applicationCode)}#status`);
  }

  const examData = await getExamForStudent(attempt.examId, attempt.questionOrder);
  if (!examData) notFound();

  const secondsRemaining = Math.max(
    0,
    Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)
  );

  return (
    <ExamPortalClient
      attemptId={attempt.id}
      applicationId={access.application.applicationCode}
      exam={examData.exam}
      questions={examData.questions}
      secondsRemaining={secondsRemaining}
      accessMode="public"
    />
  );
}

function PublicExamAccessState({
  state,
}: {
  state: "missing" | "invalid" | "expired" | "ready";
}) {
  if (state === "ready") return null;

  const title =
    state === "expired"
      ? "Exam access expired"
      : state === "missing"
        ? "Verification required"
        : "Exam access is no longer valid";
  const description =
    state === "expired"
      ? "Verify your email again to continue or resume your exam."
      : "Return to the exam access section and verify your email to continue.";

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              {state === "expired" ? (
                <AlertCircle className="h-6 w-6 text-destructive" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-destructive" />
              )}
            </div>
            <div className="space-y-1">
              <h1 className="font-serif text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/entrance-exam#exam-access">Back to exam access</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
