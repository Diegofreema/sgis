"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  CreditCard,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reviewApplication } from "@/server/actions/application.actions";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import type { Application } from "@/db/schema/applications";
import type { Profile } from "@/db/schema/users";
import type { Payment } from "@/db/schema/payments";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-warning/20 text-warning",
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-primary/20 text-primary",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

type Props = {
  application: Application;
  profile: Profile;
  payments: Payment[];
};

export function ApplicantDetailClient({ application, profile, payments }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState(
    application.rejectionReason ?? ""
  );
  const [submitting, setSubmitting] = useState<
    "approve" | "reject" | "review" | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState(application.status);

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ") || "Unnamed Applicant";

  async function handleReview(
    action: "approved" | "rejected" | "under_review"
  ) {
    if (action === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setSubmitting(
      action === "approved"
        ? "approve"
        : action === "rejected"
        ? "reject"
        : "review"
    );
    const result = await reviewApplication(application.id, {
      status: action,
      rejectionReason: action === "rejected" ? rejectionReason : undefined,
      notes: notes || undefined,
    });
    setSubmitting(null);
    if (result.success) {
      setCurrentStatus(action);
      toast.success(
        action === "approved"
          ? "Application approved!"
          : action === "rejected"
          ? "Application rejected."
          : "Application marked as under review."
      );
    } else {
      toast.error(result.error ?? "Failed to update application.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/applicants")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>
              {getInitials(`${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim())}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-foreground truncate">
              {fullName}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <Badge className={`ml-2 ${STATUS_COLORS[currentStatus] ?? ""}`}>
            {currentStatus.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Application Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Intended Class</dt>
                  <dd className="font-medium mt-0.5">
                    {application.intendedClass}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Previous School</dt>
                  <dd className="font-medium mt-0.5">
                    {application.previousSchool ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Guardian Name</dt>
                  <dd className="font-medium mt-0.5">
                    {application.guardianName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Guardian Phone</dt>
                  <dd className="font-medium mt-0.5">
                    {application.guardianPhone ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Guardian Email</dt>
                  <dd className="font-medium mt-0.5">
                    {application.guardianEmail ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="font-medium mt-0.5">
                    {application.submittedAt
                      ? formatDate(application.submittedAt)
                      : "Not yet submitted"}
                  </dd>
                </div>
              </dl>

              {application.rejectionReason && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive font-medium mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {application.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Date of Birth</dt>
                  <dd className="font-medium mt-0.5">
                    {profile.dateOfBirth ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gender</dt>
                  <dd className="font-medium mt-0.5 capitalize">
                    {profile.gender ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium mt-0.5">{profile.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium mt-0.5">
                    {profile.address ?? "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Registered</dt>
                  <dd className="font-medium mt-0.5">
                    {formatDate(profile.createdAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment records found.
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg bg-muted/30 px-3 py-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {p.purpose.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {p.reference}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">
                            {formatCurrency(Number(p.amount), p.currency)}
                          </p>
                          <Badge
                            className={`text-[10px] ${
                              PAYMENT_STATUS_COLORS[p.status] ?? ""
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                      {p.transactionRef && (
                        <p className="text-xs text-muted-foreground">
                          Bank ref:{" "}
                          <span className="font-mono font-medium text-foreground">
                            {p.transactionRef}
                          </span>
                        </p>
                      )}
                      {p.proofNote && (
                        <p className="text-xs text-muted-foreground italic">"{p.proofNote}"</p>
                      )}
                      {p.proofOfPaymentUrl && (
                        <a
                          href={p.proofOfPaymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View receipt →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Review sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Review Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStatus === "approved" || currentStatus === "rejected" ? (
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <p className="text-sm font-medium">
                    Application {currentStatus}.
                  </p>
                  {application.reviewedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(application.reviewedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Internal Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes visible only to admins…"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Rejection Reason{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        (required if rejecting)
                      </span>
                    </Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why the application is rejected…"
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      className="w-full gap-1.5 font-medium"
                      onClick={() => handleReview("approved")}
                      disabled={!!submitting}
                    >
                      {submitting === "approve" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve Application
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={() => handleReview("under_review")}
                      disabled={!!submitting}
                    >
                      {submitting === "review" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      Mark Under Review
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleReview("rejected")}
                      disabled={!!submitting}
                    >
                      {submitting === "reject" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject Application
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
