import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicExamVerificationCard } from '../ApplicationClient';
import { ExamPreviewCountdown } from './ExamPreviewClient';
import {
  getPublicExamDiscovery,
  getVerifiedPublicExamAccess,
} from '@/server/queries/exams.queries';
import { formatDate } from '@/lib/utils';

type Props = {
  searchParams: Promise<{
    session?: string;
    error?: string;
  }>;
};

export default async function PublicExamPreviewPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const access = await getVerifiedPublicExamAccess();
  const verifiedSessionId =
    access.state === 'ready' && access.period ? access.period.id : null;
  const sessionId = params.session ?? verifiedSessionId;

  if (!sessionId) {
    redirect('/entrance-exam#exam-access');
  }

  const discovery = await getPublicExamDiscovery(sessionId);
  if (discovery.state === 'not_found' || !discovery.period) {
    return (
      <PreviewShell>
        <StateCard
          title="Session not found"
          description="Choose a valid session from the exam access section."
        />
      </PreviewShell>
    );
  }

  if (discovery.state === 'no_exam_for_session' || !discovery.exam) {
    return (
      <PreviewShell>
        <StateCard
          title="No exam for this session"
          description="There is no active exam attached to this session yet."
        />
      </PreviewShell>
    );
  }

  const verifiedForSession =
    access.state === 'ready' && access.period?.id === discovery.period.id;
  const applicationCode = verifiedForSession
    ? access.application?.applicationCode ?? null
    : null;
  const attempt = verifiedForSession ? access.attempt : null;
  const attemptSubmitted =
    attempt?.status === 'submitted' ||
    attempt?.status === 'graded' ||
    attempt?.status === 'expired';
  const attemptInProgress = attempt?.status === 'in_progress';
  const showVerificationForm =
    (discovery.state === 'verification_open' || discovery.state === 'live') &&
    !verifiedForSession &&
    !attemptSubmitted;

  const previewHref = `/entrance-exam/exam?session=${encodeURIComponent(
    discovery.period.id,
  )}`;

  return (
    <PreviewShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Exam Preview
            </p>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              {discovery.exam.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {discovery.period.title}
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/entrance-exam#exam-access">
              <ArrowLeft className="h-4 w-4" />
              Back to sessions
            </Link>
          </Button>
        </div>

        {params.error && !showVerificationForm && (
          <StateCard title="Could not continue" description={params.error} tone="error" />
        )}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Exam summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{discovery.period.title}</Badge>
                <Badge variant="outline">{discovery.exam.durationMinutes} minutes</Badge>
                <Badge variant="outline">{discovery.exam.totalMarks} marks</Badge>
                <Badge variant="outline">
                  {discovery.exam.passingScore}% to pass
                </Badge>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Info
                  label="Preview opens"
                  value={formatDate(
                    discovery.previewOpensAt ?? discovery.period.examStartDate,
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                />
                <Info
                  label="Verification opens"
                  value={formatDate(
                    discovery.verificationOpensAt ??
                      discovery.period.examStartDate,
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                />
                <Info
                  label="Exam starts"
                  value={formatDate(
                    discovery.period.examStartDate,
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                />
                <Info
                  label="Exam closes"
                  value={formatDate(
                    discovery.period.examEndDate,
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                />
              </dl>

              {discovery.exam.instructions && (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  {discovery.exam.instructions}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            {discovery.state === 'preview_locked' && (
              <StateCard
                title="Preview is not open yet"
                description={`Come back on ${formatDate(
                  discovery.previewOpensAt ?? discovery.period.examStartDate,
                  "MMMM d, yyyy 'at' h:mm a",
                )}.`}
              />
            )}

            {discovery.state === 'preview_open' && (
              <ExamPreviewCountdown
                label="Exam starts in"
                targetDate={discovery.period.examStartDate}
                refreshAt={discovery.verificationOpensAt}
                caption="Stay on this page. Verification opens 5 minutes before the exam starts."
              />
            )}

            {discovery.state === 'verification_open' && (
              <ExamPreviewCountdown
                label="Exam starts in"
                targetDate={discovery.period.examStartDate}
                refreshAt={discovery.period.examStartDate}
                caption="Verification is now open. The exam begins shortly."
              />
            )}

            {discovery.state === 'live' && (
              <ExamPreviewCountdown
                label="Exam closes in"
                targetDate={discovery.period.examEndDate}
                refreshAt={discovery.period.examEndDate}
                caption="The exam timer starts only after you begin your attempt."
              />
            )}

            {discovery.state === 'exam_closed' && (
              <StateCard
                title="Exam window has closed"
                description={`This exam closed on ${formatDate(
                  discovery.period.examEndDate,
                  "MMMM d, yyyy 'at' h:mm a",
                )}.`}
              />
            )}

            {attemptSubmitted ? (
              <ActionCard
                title="Exam already completed"
                description="This exam attempt has already been submitted."
                actionHref={
                  applicationCode
                    ? `/entrance-exam?applicationId=${encodeURIComponent(
                        applicationCode,
                      )}#status`
                    : '/entrance-exam#status'
                }
                actionLabel="View application status"
              />
            ) : attemptInProgress && verifiedForSession ? (
              <ActionCard
                title="Resume your exam"
                description="Your attempt is already in progress. Continue from where you stopped."
                actionHref="/entrance-exam/exam/start"
                actionLabel="Resume exam"
              />
            ) : discovery.state === 'preview_open' ? (
              <StateCard
                title="Waiting for verification"
                description={`Verification opens at ${formatDate(
                  discovery.verificationOpensAt ??
                    discovery.period.examStartDate,
                  "MMMM d, yyyy 'at' h:mm a",
                )}.`}
              />
            ) : verifiedForSession && discovery.state === 'verification_open' ? (
              <StateCard
                title="Verification complete"
                description="You are verified. The start button appears as soon as the exam goes live."
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            ) : verifiedForSession && discovery.state === 'live' ? (
              <ActionCard
                title="You are verified"
                description="Your access is ready. Start the exam when you are prepared."
                actionHref="/entrance-exam/exam/start"
                actionLabel="Start exam"
              />
            ) : showVerificationForm ? (
              <PublicExamVerificationCard
                periodId={discovery.period.id}
                examError={params.error}
              />
            ) : discovery.state === 'preview_locked' ? null : (
              <ActionCard
                title="Refresh preview"
                description="Open the latest preview state for this session."
                actionHref={previewHref}
                actionLabel="Refresh"
              />
            )}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20 pb-10 pt-28">
      <div className="container mx-auto max-w-6xl container-padding">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StateCard({
  title,
  description,
  tone = 'neutral',
  icon,
}: {
  title: string;
  description: string;
  tone?: 'neutral' | 'error';
  icon?: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/5'
          : 'bg-background'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">
          {icon ?? <Clock className="h-5 w-5" />}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button asChild className="mt-5 w-full gap-2">
        <Link href={actionHref}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
