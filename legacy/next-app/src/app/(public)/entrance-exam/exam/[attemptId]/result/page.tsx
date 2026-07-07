import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { LockKeyhole } from "lucide-react";
import { getVerifiedPublicExamAccess, getExamResult } from "@/server/queries/exams.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExamResultClient } from "@/components/exam/ExamResultClient";

type Props = {
  params: Promise<{ attemptId: string }>;
};

export default async function ExamResultPage({ params }: Props) {
  await connection();
  const { attemptId } = await params;

  const access = await getVerifiedPublicExamAccess();
  if (access.state !== "ready" || !access.application || !access.exam) {
    redirect("/entrance-exam");
  }

  const result = await getExamResult(attemptId);
  if (!result) notFound();

  if (result.attempt.status !== "graded") {
    redirect(
      `/entrance-exam?applicationId=${encodeURIComponent(access.application.applicationCode)}#status`
    );
  }

  const applicationCode = access.application.applicationCode;

  const isReleased =
    result.exam.showResultImmediately ||
    (result.exam.resultReleaseDate != null && new Date() >= result.exam.resultReleaseDate);

  if (!isReleased) {
    return (
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <LockKeyhole className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h1 className="font-serif text-xl font-semibold text-foreground">Results pending</h1>
                <p className="text-sm text-muted-foreground">
                  Your exam has been submitted. Results will be available once released by the administrator.
                </p>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link
                  href={`/entrance-exam?applicationId=${encodeURIComponent(applicationCode)}#status`}
                >
                  Back to status
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ExamResultClient
      applicationCode={applicationCode}
      examTitle={result.exam.title}
      score={result.attempt.score != null ? Number(result.attempt.score) : 0}
      totalMarks={result.attempt.totalMarks ?? result.exam.totalMarks}
      passingScore={result.exam.passingScore}
      passed={result.attempt.passed ?? false}
      answers={result.answers}
    />
  );
}
