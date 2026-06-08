import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { db, applications, exams, examAttempts, applicationPeriods } from "@/db";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, Lock, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { formatDate } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function ExamEntryPage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);
  const studentQuery = context.isManagingStudent ? `?student=${context.target.id}` : "";

  if (context.target.role === "parent" && !context.isManagingStudent) {
    return (
      <div className="space-y-8 max-w-2xl">
        <FadeIn>
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center space-y-4">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Choose a student first</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Parent accounts can review exam readiness only after selecting a linked student.
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

  let exam = null;
  let attempt = null;
  let application = null;

  if (db) {
    application = await db
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

    if (application) {
      const period = await db
        .select()
        .from(applicationPeriods)
        .where(eq(applicationPeriods.id, application.applicationPeriodId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (period) {
        exam = await db
          .select()
          .from(exams)
          .where(
            and(
              eq(exams.applicationPeriodId, period.id),
              eq(exams.status, "active")
            )
          )
          .limit(1)
          .then((r) => r[0] ?? null);

        if (exam) {
          attempt = await db
            .select()
            .from(examAttempts)
            .where(
              and(
                eq(examAttempts.userId, context.target.id),
                eq(examAttempts.examId, exam.id)
              )
            )
            .limit(1)
            .then((r) => r[0] ?? null);
        }
      }
    }
  }

  const hasSubmitted =
    attempt?.status === "submitted" || attempt?.status === "graded";
  const inProgress = attempt?.status === "in_progress";

  return (
    <div className="space-y-8 max-w-2xl">
      {context.isManagingStudent && (
        <FadeIn>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Viewing exam readiness for {context.target.firstName ?? "student"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Students must sign in with their own account to start or continue the examination.
            </p>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <h1 className="font-serif text-h3 font-bold text-foreground">Entrance Examination</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your examination portal.
        </p>
      </FadeIn>

      <FadeIn>
        {!application ? (
          <Card className="border-muted">
            <CardContent className="py-12 text-center space-y-4">
              <Lock className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="font-medium text-foreground">Application Not Approved</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your application must be approved before you can access the examination.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/application${studentQuery}`}>View Application</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !exam ? (
          <Card className="border-muted">
            <CardContent className="py-12 text-center space-y-3">
              <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">No Active Examination</p>
              <p className="text-sm text-muted-foreground">
                No examination is currently scheduled. You&apos;ll be notified when one is available.
              </p>
            </CardContent>
          </Card>
        ) : hasSubmitted ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-8 text-center space-y-4">
              <div className="text-4xl">✅</div>
              <div>
                <p className="font-serif font-semibold text-foreground">Examination Submitted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have already completed this examination.
                  {attempt?.submittedAt && <> Submitted on {formatDate(attempt.submittedAt.toISOString())}.</>}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/results${studentQuery}`}>View Results</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif font-semibold text-foreground text-lg">{exam.title}</h2>
                  <Badge variant="secondary">{exam.status}</Badge>
                </div>
                {exam.description && (
                  <p className="text-sm text-muted-foreground">{exam.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{exam.durationMinutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>{exam.totalMarks} total marks</span>
                </div>
              </div>

              {exam.instructions && (
                <div className="rounded-xl bg-muted/40 border border-border/60 p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Instructions
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {exam.instructions}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="text-xs text-warning-foreground font-medium">
                  ⚠️ Once you start, the timer cannot be paused. Ensure you have a stable
                  internet connection before beginning.
                </p>
              </div>

              {inProgress ? (
                context.isManagingStudent ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    This exam attempt is already in progress. The student must continue it from
                    their own dashboard.
                  </div>
                ) : (
                  <Button asChild className="w-full font-medium gap-2 shadow-brand-sm">
                    <Link href={`/dashboard/exam/${attempt?.id}`}>
                      Continue Exam <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )
              ) : (
                context.isManagingStudent ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    This student is approved and ready. They can start the exam after signing in
                    and completing any required password change.
                  </div>
                ) : (
                  <form action={`/dashboard/exam/start`} method="POST">
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="applicationId" value={application.id} />
                    <Button
                      asChild
                      className="w-full font-medium gap-2 shadow-brand-sm"
                      size="lg"
                    >
                      <Link href={`/dashboard/exam/start?examId=${exam.id}&applicationId=${application.id}`}>
                        Start Examination <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </form>
                )
              )}
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
