import Link from "next/link";
import { BookOpen, Clock, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Exam } from "@/db/schema/exams";
import type { ExamAttempt } from "@/db/schema/attempts";
import type { Application } from "@/db/schema/applications";

type Props = {
  exam: Exam | null;
  attempt: ExamAttempt | null;
  application: Application | null;
};

export function ExamAccessCard({ exam, attempt, application }: Props) {
  const isApproved = application?.status === "approved";
  const hasSubmitted =
    attempt?.status === "submitted" || attempt?.status === "graded";
  const inProgress = attempt?.status === "in_progress";

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-serif">Entrance Examination</CardTitle>
        {exam && (
          <Badge variant="secondary" className="text-xs">
            {exam.durationMinutes} min
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isApproved ? (
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Not Yet Available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your application must be approved before you can access the examination.
              </p>
            </div>
          </div>
        ) : !exam ? (
          <p className="text-sm text-muted-foreground">
            No examination scheduled yet. You&apos;ll be notified when one is available.
          </p>
        ) : hasSubmitted ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Exam Completed</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {attempt?.submittedAt ? formatDate(attempt.submittedAt.toISOString()) : "—"}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2 gap-2 text-xs h-7">
                <Link href="/dashboard/results">View Results</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{exam.title}</p>
              {exam.instructions && (
                <p className="text-xs text-muted-foreground line-clamp-2">{exam.instructions}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {exam.durationMinutes} minutes
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {exam.totalMarks} marks
              </span>
            </div>

            {inProgress ? (
              <Button asChild size="sm" className="w-full gap-2 font-medium">
                <Link href={`/dashboard/exam/${attempt?.id}`}>
                  Continue Exam
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="w-full gap-2 font-medium">
                <Link href="/dashboard/exam">
                  Start Examination
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
