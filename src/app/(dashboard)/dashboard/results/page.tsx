import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { db, examAttempts, exams, applications } from "@/db";
import { eq, and } from "drizzle-orm";
import { canViewResult } from "@/lib/permissions";
import type { ExamStatus } from "@/constants/exam";
import type { ExamAttemptStatus } from "@/constants/statuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function ResultsPage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);

  if (context.target.role === "parent" && !context.isManagingStudent) {
    return (
      <div className="space-y-8 max-w-2xl">
        <FadeIn>
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center space-y-4">
            <Trophy className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Choose a student first</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Parent accounts can review results only after selecting a linked student.
              </p>
            </div>
            <Button asChild className="gap-1.5">
              <Link href="/dashboard/students">
                Open My Students <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Find approved application and attempt
  let attempt = null;
  let exam = null;
  let canView = false;

  if (db) {
    const app = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.userId, context.target.id),
          eq(applications.status, "approved")
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (app) {
      attempt = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.userId, context.target.id))
        .orderBy(examAttempts.createdAt)
        .limit(1)
        .then((r) => r[0] ?? null);

      if (attempt) {
        exam = await db
          .select()
          .from(exams)
          .where(eq(exams.id, attempt.examId))
          .limit(1)
          .then((r) => r[0] ?? null);

        if (exam) {
          canView = canViewResult(
            {
              ...exam,
              status: exam.status as ExamStatus,
              resultReleaseDate: exam.resultReleaseDate?.toISOString() ?? null,
              createdAt: exam.createdAt.toISOString(),
              updatedAt: exam.updatedAt.toISOString(),
            },
            attempt
              ? {
                  ...attempt,
                  questionOrder: attempt.questionOrder,
                  status: attempt.status as ExamAttemptStatus,
                  startedAt: attempt.startedAt.toISOString(),
                  submittedAt: attempt.submittedAt?.toISOString() ?? null,
                  expiresAt: attempt.expiresAt.toISOString(),
                  score: attempt.score !== null ? Number(attempt.score) : null,
                  totalMarks: attempt.totalMarks,
                  passed: attempt.passed,
                  createdAt: attempt.createdAt.toISOString(),
                  updatedAt: attempt.updatedAt.toISOString(),
                }
              : null
          );
        }
      }
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {context.isManagingStudent && (
        <FadeIn>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Viewing results for {context.target.firstName ?? "student"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This is a parent read-only view of the student’s exam outcome.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard/students">
                Back to Students <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <h1 className="font-serif text-h3 font-bold text-foreground">Examination Results</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your entrance examination score and performance.
        </p>
      </FadeIn>

      <FadeIn>
        {!attempt ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No examination results yet.</p>
            <p className="text-xs text-muted-foreground">
              Results will appear here once you have completed the entrance examination.
            </p>
          </div>
        ) : !canView ? (
          <Card className="border-muted">
            <CardContent className="py-12 text-center space-y-3">
              <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">Results Not Yet Released</p>
              <p className="text-sm text-muted-foreground">
                Your result will be available once the school releases it.
                {exam?.resultReleaseDate && (
                  <> Expected: {formatDate(exam.resultReleaseDate.toISOString())}</>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg">{exam?.title}</CardTitle>
                <Badge
                  className={
                    attempt.passed
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }
                >
                  {attempt.passed ? "Passed" : "Failed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <p className="font-serif text-4xl font-bold text-primary">
                    {attempt.score ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Your Score</p>
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-4xl font-bold text-muted-foreground">
                    {attempt.totalMarks ?? exam?.totalMarks ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-4xl font-bold text-muted-foreground">
                    {exam?.passingScore ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Pass %</p>
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-4xl font-bold text-muted-foreground">
                    {attempt.score !== null && (attempt.totalMarks ?? exam?.totalMarks ?? 0) > 0
                      ? `${Math.round((Number(attempt.score) / Number(attempt.totalMarks ?? exam?.totalMarks ?? 1)) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
              </div>

              {attempt.submittedAt && (
                <p className="text-xs text-muted-foreground text-center">
                  Submitted on {formatDate(attempt.submittedAt.toISOString())}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
