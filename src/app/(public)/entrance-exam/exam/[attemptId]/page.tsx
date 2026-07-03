import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { AlertCircle, CircleHelp, ShieldAlert } from "lucide-react";
import { db, examAttempts } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getExamForStudent, getVerifiedPublicExamAccess } from "@/server/queries/exams.queries";
import { ExamPortalClient } from "@/components/exam/ExamPortalClient";

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
    redirect(`/entrance-exam/exam/${attemptId}/result`);
  }
  if (new Date() > attempt.expiresAt && attempt.status === "in_progress") {
    redirect(`/entrance-exam?applicationId=${encodeURIComponent(access.application.applicationCode)}#status`);
  }

  const examData = await getExamForStudent(attempt.examId, attempt.questionOrder);
  if (!examData) {
    return (
      <PublicExamStateCard
        title="Exam not available"
        description="This exam could not be loaded right now. Return to exam access and try again."
        actionHref="/entrance-exam#exam-access"
        actionLabel="Back to exam access"
      />
    );
  }
  if (examData.questions.length === 0) {
    return (
      <PublicExamStateCard
        title="No questions available"
        description="This attempt has no questions assigned yet. Contact an administrator before continuing."
        actionHref="/entrance-exam#exam-access"
        actionLabel="Back to exam access"
        icon={<CircleHelp className="h-6 w-6 text-muted-foreground" />}
        tone="neutral"
      />
    );
  }

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

function PublicExamStateCard({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  tone = "error",
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  icon?: React.ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                tone === "error" ? "bg-destructive/10" : "bg-muted"
              }`}
            >
              {icon ?? <AlertCircle className="h-6 w-6 text-destructive" />}
            </div>
            <div className="space-y-1">
              <h1 className="font-serif text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button asChild className="w-full">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
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
