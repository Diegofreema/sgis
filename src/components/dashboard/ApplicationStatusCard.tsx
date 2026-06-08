import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS } from "@/constants/statuses";
import type { Application } from "@/db/schema/applications";

type Props = {
  application: Application | null;
  hasActivePeriod: boolean;
};

const steps = [
  { key: "draft", label: "Profile Completed" },
  { key: "pending_payment", label: "Fee Payment" },
  { key: "submitted", label: "Application Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
];

const ORDER = ["draft", "pending_payment", "submitted", "under_review", "approved", "rejected"];

function getStepIndex(status: string) {
  return ORDER.indexOf(status);
}

export function ApplicationStatusCard({ application, hasActivePeriod }: Props) {
  if (!application) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif">Application Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActivePeriod ? (
            <>
              <p className="text-sm text-muted-foreground">
                Applications are currently open. Start your application today.
              </p>
              <Button asChild size="sm" className="gap-2 font-medium">
                <Link href="/dashboard/application">
                  Apply Now <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active application period. Check back for announcements.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentIndex = getStepIndex(application.status);
  const isRejected = application.status === "rejected";

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-serif">Application Status</CardTitle>
        <Badge
          variant={isRejected ? "destructive" : application.status === "approved" ? "default" : "secondary"}
          className={application.status === "approved" ? "bg-success/20 text-success border-success/30" : ""}
        >
          {APPLICATION_STATUS_LABELS[application.status as keyof typeof APPLICATION_STATUS_LABELS]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isRejected && (
          <ol className="space-y-2">
            {steps.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const pending = i > currentIndex;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : active ? (
                    <Clock className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-xs ${done ? "text-foreground" : active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {isRejected && application.rejectionReason && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive font-medium mb-1">Reason for rejection:</p>
            <p className="text-xs text-muted-foreground">{application.rejectionReason}</p>
          </div>
        )}

        {application.submittedAt && (
          <p className="text-xs text-muted-foreground">
            Submitted {formatDate(application.submittedAt.toISOString())}
          </p>
        )}

        {application.status === "pending_payment" && (
          <Button asChild size="sm" className="gap-2 w-full font-medium">
            <Link href="/dashboard/payments">
              Complete Payment <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
