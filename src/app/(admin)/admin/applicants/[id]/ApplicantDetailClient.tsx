'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Printer,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reviewApplication } from '@/server/actions/application.actions';
import { formatDate } from '@/lib/utils';
import type { Application } from '@/db/schema/applications';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
  draft: 'bg-muted text-muted-foreground',
  pending_payment: 'bg-warning/20 text-warning',
  submitted: 'bg-primary/10 text-primary',
  under_review: 'bg-primary/20 text-primary',
};

type Props = {
  application: Application;
  supportingDocuments: Array<{
    label: string;
    url: string | null;
  }>;
  examAttempt: {
    attempt: {
      score: string | null;
      totalMarks: number | null;
      passed: boolean | null;
      status: string;
      submittedAt: Date | null;
    };
    exam: {
      title: string;
      passingScore: number;
    };
  } | null;
};

export function ApplicantDetailClient({ application, supportingDocuments, examAttempt }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState(
    application.rejectionReason ?? '',
  );
  const [submitting, setSubmitting] = useState<
    'pending' | 'approved' | 'rejected' | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState(application.status);
  const fullName = `${application.firstName} ${application.lastName}`;

  async function handleReview(status: 'pending' | 'approved' | 'rejected') {
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }

    setSubmitting(status);
    const result = await reviewApplication(application.id, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      notes: notes || undefined,
    });
    setSubmitting(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setCurrentStatus(status);
    toast.success('Application updated.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/applicants')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-serif text-xl font-semibold text-foreground">
              {fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {application.applicationCode}
            </p>
          </div>
          <Badge className={STATUS_COLORS[currentStatus] ?? ''}>
            {currentStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Application Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Info label="Name" value={fullName} />
                  <Info
                    label="Application ID"
                    value={application.applicationCode}
                  />
                  <Info label="Email" value={application.email} />
                  <Info label="Phone" value={application.phone} />
                  <Info label="Date of Birth" value={application.dateOfBirth} />
                  <Info label="Gender" value={application.gender} />
                  <Info
                    label="Intended Class"
                    value={application.intendedClass}
                  />
                  <Info
                    label="Previous School"
                    value={application.previousSchool ?? 'Not provided'}
                  />
                  <Info label="Address" value={application.address} wide />
                  <Info
                    label="State / LGA"
                    value={
                      [application.state, application.lga]
                        .filter(Boolean)
                        .join(' / ') || 'Not provided'
                    }
                  />
                  <Info
                    label="Submitted"
                    value={
                      application.submittedAt
                        ? formatDate(application.submittedAt)
                        : 'Not submitted'
                    }
                  />
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Guardian and Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Info
                  label="Guardian Name"
                  value={application.guardianName ?? 'Not provided'}
                />
                <Info
                  label="Guardian Phone"
                  value={application.guardianPhone ?? 'Not provided'}
                />
                <Info
                  label="Guardian Email"
                  value={application.guardianEmail ?? 'Not provided'}
                />
              </dl>
              <div className="space-y-3">
                {application.receiptUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={application.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View payment receipt
                    </a>
                  </Button>
                )}

                {supportingDocuments.some((document) => document.url) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {supportingDocuments
                      .filter((document) => document.url)
                      .map((document) => (
                        <Button key={document.label} asChild variant="outline" size="sm">
                          <a
                            href={document.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {document.label}
                          </a>
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Exam Outcome
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!examAttempt ? (
                <p className="text-sm text-muted-foreground">
                  No exam attempt recorded yet.
                </p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Info label="Exam" value={examAttempt.exam.title} wide />
                  <Info label="Attempt status" value={examAttempt.attempt.status.replace(/_/g, " ")} />
                  <Info label="Submitted" value={examAttempt.attempt.submittedAt ? formatDate(examAttempt.attempt.submittedAt) : "Not submitted"} />
                  <Info label="Score" value={examAttempt.attempt.score ?? "—"} />
                  <Info label="Total marks" value={String(examAttempt.attempt.totalMarks ?? "—")} />
                  <Info
                    label="Percentage"
                    value={
                      examAttempt.attempt.score !== null && (examAttempt.attempt.totalMarks ?? 0) > 0
                        ? `${Math.round((Number(examAttempt.attempt.score) / Number(examAttempt.attempt.totalMarks)) * 100)}%`
                        : "—"
                    }
                  />
                  <Info label="Pass threshold" value={`${examAttempt.exam.passingScore}%`} />
                  <Info
                    label="Outcome"
                    value={
                      examAttempt.attempt.passed === null
                        ? "Pending"
                        : examAttempt.attempt.passed
                          ? "Passed"
                          : "Failed"
                    }
                  />
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Review Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleReview('approved')}
                  disabled={!!submitting}
                >
                  {submitting === 'approved' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve Application
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleReview('pending')}
                  disabled={!!submitting}
                >
                  {submitting === 'pending' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  Mark Pending
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleReview('rejected')}
                  disabled={!!submitting}
                >
                  {submitting === 'rejected' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Reject Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5 break-words">{value}</dd>
    </div>
  );
}
